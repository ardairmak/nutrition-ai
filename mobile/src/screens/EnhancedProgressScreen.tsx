import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../contexts/AuthContext";
import analyticsService, { AnalyticsData } from "../services/analyticsService";
import weightService from "../services/weightService";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { MainTabsParamList } from "../navigation/types";

const screenWidth = Dimensions.get("window").width;

export function EnhancedProgressScreen() {
  const { user } = useAuth();
  const route = useRoute<RouteProp<MainTabsParamList, "Progress">>();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [activeTimeframe, setActiveTimeframe] = useState<
    "1W" | "1M" | "3M" | "6M" | "1Y"
  >("1M");
  const [activeTab, setActiveTab] = useState<
    "overview" | "weight" | "calories" | "insights"
  >("overview");
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState<string>(
    String(Math.round(user?.weight || 70))
  ); // Convert to string for picker
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []); // Only fetch on initial load

  // Update charts when timeframe changes (lightweight)
  useEffect(() => {
    if (analyticsData) {
      updateChartsForTimeframe();
    }
  }, [activeTimeframe]);

  // Open weight modal if requested via navigation param
  useEffect(() => {
    if (route.params?.openWeightModal) {
      setWeightModalVisible(true);
      setNewWeight(String(Math.round(user?.weight || 70))); // Set current weight when opening
      if (navigation.setParams) {
        navigation.setParams({ openWeightModal: false } as any);
      }
    }
  }, [route.params]);

  // Update weight value when modal opens
  useEffect(() => {
    if (weightModalVisible) {
      setNewWeight(String(Math.round(user?.weight || 70)));
    }
  }, [weightModalVisible, user?.weight]);

  // Fetch AI insights when user switches to insights tab
  useEffect(() => {
    if (
      activeTab === "insights" &&
      analyticsData &&
      !analyticsData.aiInsights
    ) {
      fetchAIInsights();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getAnalytics({
        timeframe: activeTimeframe,
        includeAI: false, // Don't include AI by default
        includeFoodRecommendations: false,
      });

      if (response.success && response.data) {
        setAnalyticsData(response.data);
      } else {
        Alert.alert("Error", response.error || "Failed to load analytics");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    if (!analyticsData) return;

    try {
      setAiLoading(true);
      const response = await analyticsService.getAnalytics({
        timeframe: activeTimeframe,
        includeAI: true,
        includeFoodRecommendations: true,
      });

      if (response.success && response.data) {
        setAnalyticsData(response.data);
      } else {
        Alert.alert("Error", response.error || "Failed to load AI insights");
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      Alert.alert("Error", "Failed to load AI insights");
    } finally {
      setAiLoading(false);
    }
  };

  const updateChartsForTimeframe = async () => {
    try {
      setChartLoading(true);
      const response = await analyticsService.getAnalytics({
        timeframe: activeTimeframe,
        includeAI: false,
        includeFoodRecommendations: false,
      });

      if (response.success && response.data) {
        // Only update weight and calorie analytics (chart data)
        setAnalyticsData((prev) =>
          prev
            ? {
                ...prev,
                weightAnalytics: response.data.weightAnalytics,
                calorieAnalytics: response.data.calorieAnalytics,
                // Keep existing goal progress and AI insights
              }
            : response.data
        );
      }
    } catch (error) {
      // Error updating charts - will show stale data
    } finally {
      setChartLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleLogWeight = async () => {
    const weight = parseFloat(newWeight);
    if (!newWeight || isNaN(weight)) {
      Alert.alert("Error", "Please select a valid weight");
      return;
    }

    try {
      const response = await weightService.logWeight(weight);
      if (response.success) {
        setWeightModalVisible(false);
        setNewWeight(String(Math.round(user?.weight || 70))); // Reset to default
        await fetchAnalytics(); // Refresh analytics
        Alert.alert("Success", "Weight logged successfully!");
      } else {
        Alert.alert("Error", response.error || "Failed to log weight");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to log weight");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "#34C759";
      case "good":
        return "#30D158";
      case "concerning":
        return "#FF9500";
      case "off_track":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "improving":
        return "trending-up";
      case "declining":
        return "trending-down";
      default:
        return "trending-neutral";
    }
  };

  const getTrendColor = (direction: string, goalType: string) => {
    if (direction === "stable") return "#8E8E93";

    // For weight loss goals, declining weight is good
    if (goalType === "weight_loss") {
      return direction === "improving" ? "#34C759" : "#FF3B30";
    }

    // For weight gain goals, increasing weight is good
    if (goalType === "weight_gain") {
      return direction === "improving" ? "#34C759" : "#FF3B30";
    }

    return "#8E8E93";
  };

  const formatGoalName = (goalName: string) => {
    const goalMap: { [key: string]: string } = {
      build_muscle: "Build Muscle",
      muscle_gain: "Build Muscle",
      weight_loss: "Weight Loss",
      lose_weight: "Weight Loss",
      weight_gain: "Weight Gain",
      gain_weight: "Weight Gain",
      maintenance: "Maintain Weight",
      general_fitness: "General Fitness",
      improve_endurance: "Improve Endurance",
      increase_strength: "Increase Strength",
    };

    return (
      goalMap[goalName] ||
      goalName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analyticsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="chart-line" size={64} color="#8E8E93" />
          <Text style={styles.errorTitle}>No Data Available</Text>
          <Text style={styles.errorText}>
            Start logging your meals and weight to see insights
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    weightAnalytics,
    calorieAnalytics,
    goalProgress,
    aiInsights,
    recommendations,
  } = analyticsData;

  // Safety checks for required data
  if (!weightAnalytics || !calorieAnalytics || !goalProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="chart-line" size={64} color="#8E8E93" />
          <Text style={styles.errorTitle}>Loading Analytics...</Text>
          <Text style={styles.errorText}>
            Please wait while we process your data
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Track your journey with detailed insights
          </Text>
        </View>

        {/* Goal Status Card */}
        <View
          style={[
            styles.goalStatusCard,
            { borderLeftColor: getStatusColor(goalProgress?.status || "good") },
          ]}
        >
          <View style={styles.goalStatusHeader}>
            <View>
              <Text style={styles.goalStatusTitle}>Goal Progress</Text>
              <Text style={styles.goalStatusSubtitle}>
                {formatGoalName(goalProgress?.primaryGoal || "health_fitness")}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(
                    goalProgress?.status || "good"
                  ),
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {(goalProgress?.status || "good").toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.goalMetrics}>
            <View style={styles.goalMetric}>
              <Text style={styles.goalMetricValue}>
                {goalProgress?.successProbability || 0}%
              </Text>
              <Text style={styles.goalMetricLabel}>Success Rate</Text>
            </View>
            <View style={styles.goalMetric}>
              <Text style={styles.goalMetricValue}>
                {Math.round(goalProgress?.daysToGoal || 0)}
              </Text>
              <Text style={styles.goalMetricLabel}>Days to Goal</Text>
            </View>
            <View style={styles.goalMetric}>
              <Text style={styles.goalMetricValue}>
                {goalProgress?.actualProgress > 0 ? "+" : ""}
                {(goalProgress?.actualProgress || 0).toFixed(1)}kg
              </Text>
              <Text style={styles.goalMetricLabel}>Progress</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {[
            { key: "overview", label: "Overview", icon: "view-dashboard" },
            { key: "weight", label: "Weight", icon: "scale-bathroom" },
            { key: "calories", label: "Calories", icon: "fire" },
            { key: "insights", label: "AI Insights", icon: "brain" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? "#FFFFFF" : "#666666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Quick Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatCard}>
                  <Icon name="scale-bathroom" size={24} color="#5E60CE" />
                  <Text style={styles.quickStatValue}>
                    {weightAnalytics.currentWeight}kg
                  </Text>
                  <Text style={styles.quickStatLabel}>Current Weight</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Icon name="fire" size={24} color="#F72585" />
                  <Text style={styles.quickStatValue}>
                    {Math.round(calorieAnalytics.averageDailyCalories)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Avg Calories</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Icon name="chart-line" size={24} color="#4CC9F0" />
                  <Text style={styles.quickStatValue}>
                    {weightAnalytics.progressPercentage.toFixed(0)}%
                  </Text>
                  <Text style={styles.quickStatLabel}>Progress</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Icon name="target" size={24} color="#7209B7" />
                  <Text style={styles.quickStatValue}>
                    {calorieAnalytics.adherenceRate.toFixed(0)}%
                  </Text>
                  <Text style={styles.quickStatLabel}>Adherence</Text>
                </View>
              </View>
            </View>

            {/* Weekly Score */}
            {aiInsights && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Score</Text>
                <View style={styles.scoreCard}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreValue}>
                      {aiInsights.weeklyScore}
                    </Text>
                    <Text style={styles.scoreLabel}>/ 100</Text>
                  </View>
                  <View style={styles.scoreDetails}>
                    <Text style={styles.scoreTitle}>Overall Performance</Text>
                    <Text style={styles.scoreDescription}>
                      {aiInsights.summary}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Weight Tab */}
        {activeTab === "weight" && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Weight Analysis</Text>
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={() => setWeightModalVisible(true)}
                >
                  <Icon name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.logButtonText}>Log Weight</Text>
                </TouchableOpacity>
              </View>

              {/* Weight Trend Card */}
              <View style={styles.trendCard}>
                <View style={styles.trendHeader}>
                  <View>
                    <Text style={styles.trendTitle}>Weight Trend</Text>
                    <Text style={styles.trendSubtitle}>
                      {weightAnalytics.weeklyTrend > 0 ? "+" : ""}
                      {weightAnalytics.weeklyTrend.toFixed(2)}kg/week
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.trendIcon,
                      {
                        backgroundColor:
                          getTrendColor(
                            weightAnalytics.trendDirection,
                            goalProgress?.goalType || "maintenance"
                          ) + "20",
                      },
                    ]}
                  >
                    <Icon
                      name={getTrendIcon(weightAnalytics.trendDirection)}
                      size={24}
                      color={getTrendColor(
                        weightAnalytics.trendDirection,
                        goalProgress?.goalType || "maintenance"
                      )}
                    />
                  </View>
                </View>
              </View>

              {/* Timeframe Selector */}
              <View style={styles.timeframeContainer}>
                {(["1W", "1M", "3M", "6M", "1Y"] as const).map((timeframe) => (
                  <TouchableOpacity
                    key={timeframe}
                    style={[
                      styles.timeframeButton,
                      activeTimeframe === timeframe && styles.activeTimeframe,
                    ]}
                    onPress={() => setActiveTimeframe(timeframe)}
                    disabled={chartLoading}
                  >
                    {chartLoading && activeTimeframe === timeframe ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.timeframeText,
                          activeTimeframe === timeframe &&
                            styles.activeTimeframeText,
                        ]}
                      >
                        {timeframe}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Weight Chart */}
              {weightAnalytics.chartData.weights.length > 1 && (
                <View style={styles.chartContainer}>
                  <LineChart
                    key={`weight-chart-${activeTimeframe}-${weightAnalytics.chartData.weights.length}`}
                    data={{
                      labels: weightAnalytics.chartData.labels
                        .slice(-7)
                        .map((label) => {
                          // Remove year from labels (e.g., "12/31/2023" -> "12/31")
                          return label.replace(/\/\d{4}$/, "");
                        }),
                      datasets: [
                        {
                          data: weightAnalytics.chartData.weights.slice(-7),
                          color: (opacity = 1) =>
                            `rgba(94, 96, 206, ${opacity})`,
                          strokeWidth: 3,
                        },
                        {
                          data: weightAnalytics.chartData.trendLine.slice(-7),
                          color: (opacity = 1) =>
                            `rgba(247, 37, 133, ${opacity})`,
                          strokeWidth: 2,
                          withDots: false,
                        },
                      ],
                    }}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                      backgroundColor: "#FFFFFF",
                      backgroundGradientFrom: "#FFFFFF",
                      backgroundGradientTo: "#FFFFFF",
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(102, 102, 102, ${opacity})`,
                      style: { borderRadius: 16 },
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#5E60CE",
                        fill: "#FFFFFF",
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              )}
            </View>
          </>
        )}

        {/* Calories Tab */}
        {activeTab === "calories" && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calorie Analysis</Text>

              {/* Calorie Chart */}
              {calorieAnalytics.chartData.calories.length > 0 && (
                <View style={styles.chartContainer}>
                  <BarChart
                    key={`calorie-chart-${activeTimeframe}-${calorieAnalytics.chartData.calories.length}`}
                    data={{
                      labels: calorieAnalytics.chartData.labels
                        .slice(-7)
                        .map((label) => {
                          // Remove year from labels (e.g., "12/31/2023" -> "12/31")
                          return label.replace(/\/\d{4}$/, "");
                        }),
                      datasets: [
                        {
                          data: calorieAnalytics.chartData.calories.slice(-7),
                          color: (opacity = 1) =>
                            `rgba(247, 37, 133, ${opacity})`,
                        },
                      ],
                    }}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=" cal"
                    chartConfig={{
                      backgroundColor: "#FFFFFF",
                      backgroundGradientFrom: "#FFFFFF",
                      backgroundGradientTo: "#FFFFFF",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(247, 37, 133, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(102, 102, 102, ${opacity})`,
                      style: { borderRadius: 16 },
                    }}
                    style={styles.chart}
                  />
                </View>
              )}

              {/* Macro Breakdown */}
              <View style={styles.macroSection}>
                <Text style={styles.macroTitle}>Macro Trends</Text>
                {Object.entries(calorieAnalytics.macroTrends).map(
                  ([macro, data]) => (
                    <View key={macro} style={styles.macroItem}>
                      <View style={styles.macroHeader}>
                        <Text style={styles.macroName}>
                          {macro.charAt(0).toUpperCase() + macro.slice(1)}
                        </Text>
                        <Text style={styles.macroValue}>
                          {data.average.toFixed(0)}g / {data.goal}g
                        </Text>
                      </View>
                      <View style={styles.macroProgressContainer}>
                        <View
                          style={[
                            styles.macroProgressBar,
                            {
                              width: `${Math.min(
                                (data.average / data.goal) * 100,
                                100
                              )}%`,
                              backgroundColor:
                                macro === "protein"
                                  ? "#5E60CE"
                                  : macro === "carbs"
                                  ? "#4CC9F0"
                                  : "#F72585",
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )
                )}
              </View>
            </View>
          </>
        )}

        {/* AI Insights Tab */}
        {activeTab === "insights" && (
          <>
            {aiLoading ? (
              <View style={styles.section}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#7209B7" />
                  <Text style={styles.loadingText}>
                    Generating AI insights...
                  </Text>
                </View>
              </View>
            ) : !aiInsights ? (
              <View style={styles.section}>
                <View style={styles.aiPlaceholder}>
                  <Icon name="brain" size={64} color="#7209B7" />
                  <Text style={styles.aiPlaceholderTitle}>AI Insights</Text>
                  <Text style={styles.aiPlaceholderText}>
                    Get personalized insights and recommendations based on your
                    progress data
                  </Text>
                  <TouchableOpacity
                    style={styles.generateInsightsButton}
                    onPress={fetchAIInsights}
                  >
                    <Icon name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.generateInsightsButtonText}>
                      Generate Insights
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* AI Summary */}
                <View style={styles.section}>
                  <View style={styles.aiHeader}>
                    <Icon name="brain" size={24} color="#7209B7" />
                    <Text style={styles.sectionTitle}>AI Insights</Text>
                    <TouchableOpacity
                      style={styles.refreshInsightsButton}
                      onPress={fetchAIInsights}
                    >
                      <Icon name="refresh" size={16} color="#7209B7" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.aiSummaryCard}>
                    <Text style={styles.aiSummaryText}>
                      {aiInsights.summary}
                    </Text>
                  </View>

                  {/* Key Findings */}
                  {aiInsights.keyFindings.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>
                        Key Findings
                      </Text>
                      {aiInsights.keyFindings.map((finding, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Icon name="lightbulb" size={16} color="#FF9500" />
                          <Text style={styles.insightText}>{finding}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Achievements */}
                  {aiInsights.achievements.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>
                        Achievements
                      </Text>
                      {aiInsights.achievements.map((achievement, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Icon name="trophy" size={16} color="#34C759" />
                          <Text style={styles.insightText}>{achievement}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Concerns */}
                  {aiInsights.concerns.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>
                        Areas for Improvement
                      </Text>
                      {aiInsights.concerns.map((concern, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Icon name="alert-circle" size={16} color="#FF3B30" />
                          <Text style={styles.insightText}>{concern}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Items */}
                  {aiInsights.actionItems.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>
                        Recommended Actions
                      </Text>
                      {aiInsights.actionItems.map((action, index) => (
                        <View key={index} style={styles.actionItem}>
                          <Icon name="check-circle" size={16} color="#007AFF" />
                          <Text style={styles.insightText}>{action}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Motivational Message */}
                  <View style={styles.motivationCard}>
                    <Icon name="heart" size={20} color="#FF3B30" />
                    <Text style={styles.motivationText}>
                      {aiInsights.motivationalMessage}
                    </Text>
                  </View>
                </View>

                {/* Food Recommendations */}
                {recommendations && recommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Personalized Recommendations
                    </Text>
                    {recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationCard}>
                        <View style={styles.recommendationHeader}>
                          <Text style={styles.recommendationTitle}>
                            {rec.title}
                          </Text>
                          <View
                            style={[
                              styles.priorityBadge,
                              {
                                backgroundColor:
                                  rec.priority === "high"
                                    ? "#FF3B30"
                                    : rec.priority === "medium"
                                    ? "#FF9500"
                                    : "#8E8E93",
                              },
                            ]}
                          >
                            <Text style={styles.priorityText}>
                              {rec.priority.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.recommendationDescription}>
                          {rec.description}
                        </Text>
                        <Text style={styles.recommendationImpact}>
                          Impact: {rec.estimatedImpact}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Weight Logging Modal */}
      <Modal
        visible={weightModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setWeightModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardView}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Log Weight</Text>

                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Select your weight</Text>
                  <Picker
                    selectedValue={newWeight}
                    onValueChange={(itemValue) => setNewWeight(itemValue)}
                    style={styles.weightPicker}
                  >
                    {Array.from({ length: 101 }, (_, i) => {
                      const weight = i + 30; // Range from 30-130 kg
                      return (
                        <Picker.Item
                          key={weight}
                          label={`${weight} kg`}
                          value={String(weight)}
                        />
                      );
                    })}
                  </Picker>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setWeightModalVisible(false);
                      setNewWeight(String(Math.round(user?.weight || 70))); // Reset to default
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleLogWeight}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666666",
  },
  goalStatusCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  goalStatusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  goalStatusSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  goalMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalMetric: {
    alignItems: "center",
  },
  goalMetricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  goalMetricLabel: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  activeTab: {
    backgroundColor: "#000000",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  logButton: {
    backgroundColor: "#000000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  quickStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#5E60CE",
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5E60CE",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#666666",
  },
  scoreDetails: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  trendCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  trendSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  trendIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  timeframeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
  },
  activeTimeframe: {
    backgroundColor: "#000000",
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
  },
  activeTimeframeText: {
    color: "#FFFFFF",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  macroSection: {
    marginTop: 16,
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  macroItem: {
    marginBottom: 12,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  macroName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  macroValue: {
    fontSize: 12,
    color: "#666666",
  },
  macroProgressContainer: {
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
    overflow: "hidden",
  },
  macroProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  aiSummaryCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#7209B7",
  },
  aiSummaryText: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 24,
    fontStyle: "italic",
  },
  insightSection: {
    marginBottom: 20,
  },
  insightSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
    lineHeight: 20,
  },
  motivationCard: {
    backgroundColor: "#FFF5F5",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  motivationText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
    lineHeight: 22,
  },
  recommendationCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  recommendationDescription: {
    fontSize: 14,
    color: "#000000",
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendationImpact: {
    fontSize: 12,
    color: "#666666",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalKeyboardView: {
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
    color: "#000000",
  },
  pickerContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  weightPicker: {
    width: "100%",
    height: 150,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  saveButton: {
    backgroundColor: "#000000",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  aiPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  aiPlaceholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  aiPlaceholderText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
  },
  generateInsightsButton: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  generateInsightsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  refreshInsightsButton: {
    padding: 8,
  },
});
