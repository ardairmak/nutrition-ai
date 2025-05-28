import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";
import weightService, { WeightEntry } from "../services/weightService";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { MainTabsParamList } from "../navigation/types";

const screenWidth = Dimensions.get("window").width;

interface WeightData {
  labels: string[];
  datasets: { data: number[] }[];
}

interface ProgressPhoto {
  uri: string;
  timestamp: number;
}

interface Measurement {
  value: number;
  unit: string;
  change?: number; // Positive for increase, negative for decrease
}

interface Goals {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  progress: number;
}

export function ProgressScreen() {
  const { user } = useAuth();
  const route = useRoute<RouteProp<MainTabsParamList, "Progress">>();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [weightData, setWeightData] = useState<WeightData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [goals, setGoals] = useState<Goals>({
    currentWeight: 0,
    targetWeight: 0,
    startWeight: 0,
    progress: 0,
  });
  const [measurements, setMeasurements] = useState({
    chest: { value: 0, unit: "cm", change: 0 },
    waist: { value: 0, unit: "cm", change: -2 },
    hips: { value: 0, unit: "cm", change: -1 },
    arms: { value: 0, unit: "cm", change: 1 },
  });
  const [calorieData, setCalorieData] = useState({
    average: 1850,
    goal: 2000,
    progress: 93,
  });
  const [activeTimeframe, setActiveTimeframe] = useState("1M");
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    fetchProgressData();
  }, []);

  // Open weight modal if requested via navigation param
  useEffect(() => {
    if (route.params?.openWeightModal) {
      setWeightModalVisible(true);
      // Reset the param so it doesn't trigger again
      if (navigation.setParams) {
        navigation.setParams({ openWeightModal: false } as any);
      }
    }
  }, [route.params]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      let targetWeight = 0;
      // Fetch user profile for target weight
      try {
        const userData = await userService.getProfile();
        if (userData.success && userData.user) {
          targetWeight = userData.user.targetWeight || 0;
        }
      } catch (error) {
        console.log("Error fetching user data, using mock data instead");
      }

      // Fetch weight history from API
      const weightHistoryResponse = await weightService.getWeightHistory(
        activeTimeframe
      );

      let startWeight = 0;
      let currentWeight = 0;
      if (
        weightHistoryResponse.success &&
        weightHistoryResponse.weightHistory &&
        weightHistoryResponse.weightHistory.length > 0
      ) {
        // Sort by date ascending
        const sorted = [...weightHistoryResponse.weightHistory].sort(
          (a, b) =>
            new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        startWeight = sorted[0].weight;
        currentWeight = sorted[sorted.length - 1].weight;
      }

      // Format the data for the chart
      if (
        weightHistoryResponse.success &&
        weightHistoryResponse.weightHistory
      ) {
        setWeightEntries(weightHistoryResponse.weightHistory);
        const formattedData = weightService.formatWeightDataForChart(
          weightHistoryResponse.weightHistory,
          activeTimeframe
        );
        setWeightData(formattedData);
      } else {
        // If API call fails or no data, use mock data
        const mockWeightData = generateMockWeightData(activeTimeframe);
        setWeightData(mockWeightData);
      }

      // Calculate progress
      let progress = 0;
      if (startWeight && targetWeight && startWeight !== targetWeight) {
        const totalWeightToLose = startWeight - targetWeight;
        const weightLost = startWeight - currentWeight;
        progress = Math.round((weightLost / totalWeightToLose) * 100);
        progress = Math.max(0, Math.min(progress, 100));
      }

      setGoals({
        currentWeight,
        targetWeight,
        startWeight,
        progress,
      });

      // Fetch dashboard data for calories/macros
      try {
        const dashboardResponse = await userService.getDashboardData();
        if (
          dashboardResponse.success &&
          dashboardResponse.dashboardData &&
          dashboardResponse.dashboardData.nutritionData
        ) {
          const nutrition = dashboardResponse.dashboardData.nutritionData;
          const caloriesGoal = nutrition.calories.goal || 2000;
          const caloriesConsumed = nutrition.calories.consumed || 0;
          const progress =
            caloriesGoal > 0
              ? Math.round((caloriesConsumed / caloriesGoal) * 100)
              : 0;
          setCalorieData({
            average: Math.round(caloriesConsumed),
            goal: caloriesGoal,
            progress,
          });
        }
      } catch (error) {
        // If dashboard fetch fails, keep previous or mock data
        console.log("Error fetching dashboard data, using mock calorie data");
      }

      // Mock measurements if real data not available
      const mockMeasurements = {
        chest: { value: 98, unit: "cm", change: 0 },
        waist: { value: 82, unit: "cm", change: -2 },
        hips: { value: 96, unit: "cm", change: -1 },
        arms: { value: 35, unit: "cm", change: 1 },
      };

      // Use mock data as fallback
      if (goals.currentWeight === 0) {
        setGoals({
          currentWeight: 75,
          targetWeight: 70,
          startWeight: 80,
          progress: 50,
        });
      }

      // Set data
      setMeasurements(mockMeasurements);
    } catch (error) {
      Alert.alert("Error", "Failed to load progress data");
      // Use mock data as fallback
      const mockWeightData = generateMockWeightData(activeTimeframe);
      setWeightData(mockWeightData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockWeightData = (timeframe: string): WeightData => {
    let labels: string[] = [];
    let data: number[] = [];

    switch (timeframe) {
      case "1W":
        labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        data = [75.5, 75.3, 75.2, 75.0, 74.8, 74.7, 75.0];
        break;
      case "1M":
        labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
        data = [77, 76, 75.2, 75];
        break;
      case "3M":
        labels = ["Jan", "Feb", "Mar"];
        data = [80, 78, 75];
        break;
      case "1Y":
        labels = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
        data = [83, 81, 79, 78, 76, 75];
        break;
    }

    return {
      labels,
      datasets: [{ data }],
    };
  };

  const handleAddWeight = () => {
    setWeightModalVisible(true);
  };

  const handleSaveWeight = async () => {
    const weightValue = parseFloat(newWeight);

    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight value");
      return;
    }

    setLoading(true);

    // Call the API to log weight
    const response = await weightService.logWeight(weightValue);

    if (response.success) {
      // Update local state with new weight
      setGoals((prev) => ({ ...prev, currentWeight: weightValue }));

      // Update UI optimistically
      const newEntry: WeightEntry = {
        id: response.weightRecord?.id || Date.now().toString(),
        userId: user?.id || "",
        weight: weightValue,
        recordedAt: new Date().toISOString(),
      };

      const updatedEntries = [...weightEntries, newEntry];
      setWeightEntries(updatedEntries);

      // Update chart data
      const updatedChartData = weightService.formatWeightDataForChart(
        updatedEntries,
        activeTimeframe
      );
      setWeightData(updatedChartData);

      Alert.alert("Success", `Weight of ${weightValue}kg has been logged`);
    } else {
      Alert.alert("Error", response.error || "Failed to log weight");
    }

    // Close modal and reset input
    setWeightModalVisible(false);
    setNewWeight("");
    setLoading(false);
  };

  const handleTimeframeChange = async (newTimeframe: string) => {
    setActiveTimeframe(newTimeframe);

    // Fetch data for new timeframe
    try {
      setLoading(true);

      // Try to fetch from API first
      const weightHistoryResponse = await weightService.getWeightHistory(
        newTimeframe
      );

      if (
        weightHistoryResponse.success &&
        weightHistoryResponse.weightHistory
      ) {
        setWeightEntries(weightHistoryResponse.weightHistory);
        const formattedData = weightService.formatWeightDataForChart(
          weightHistoryResponse.weightHistory,
          newTimeframe
        );
        setWeightData(formattedData);
      } else {
        // Fallback to mock data
        setWeightData(generateMockWeightData(newTimeframe));
      }
    } catch (error) {
      console.error("Error fetching weight data for timeframe:", error);
      setWeightData(generateMockWeightData(newTimeframe));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      "Add Progress Photo",
      "This will help you visualize your progress over time",
      [
        {
          text: "Take Photo",
          onPress: () => console.log("Take photo pressed"),
        },
        {
          text: "Choose from Gallery",
          onPress: () => console.log("Gallery pressed"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  // Guard for weightData
  const safeWeightData = {
    labels: Array.isArray(weightData.labels) ? weightData.labels : [],
    datasets: [
      {
        data: Array.isArray(weightData.datasets?.[0]?.data)
          ? weightData.datasets[0].data.map((v) => (Number.isFinite(v) ? v : 0))
          : [],
      },
    ],
  };
  // Ensure at least two points for the chart
  if (safeWeightData.datasets[0].data.length < 2) {
    safeWeightData.labels = ["", ""];
    safeWeightData.datasets[0].data = [0, 0];
  }

  // Guard for calorieData.progress
  const safeCalorieProgress =
    Number.isFinite(calorieData.progress) && calorieData.goal > 0
      ? calorieData.progress
      : 0;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Progress</Text>
          <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
        </View>

        {/* Weight Progress Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weight Progress</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddWeight}
            >
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Log Weight</Text>
            </TouchableOpacity>
          </View>

          {/* Timeframe Selector */}
          <View style={styles.timeframeContainer}>
            {["1W", "1M", "3M", "1Y"].map((timeframe) => (
              <TouchableOpacity
                key={timeframe}
                style={[
                  styles.timeframeButton,
                  activeTimeframe === timeframe && styles.timeframeButtonActive,
                ]}
                onPress={() => handleTimeframeChange(timeframe)}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    activeTimeframe === timeframe && styles.timeframeTextActive,
                  ]}
                >
                  {timeframe}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.chartContainer}>
            {safeWeightData.datasets[0].data.every((v) => v === 0) ? (
              <View style={{ alignItems: "center", marginVertical: 24 }}>
                <Text style={{ color: "#888", fontSize: 16 }}>
                  No weight data to display yet.
                </Text>
              </View>
            ) : (
              <LineChart
                data={safeWeightData}
                width={screenWidth - 48}
                height={220}
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#FFFFFF",
                  backgroundGradientTo: "#FFFFFF",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#000000",
                  },
                }}
                bezier
                style={styles.chart}
              />
            )}
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight Goals</Text>
          <View style={styles.goalsContainer}>
            <View style={styles.goalItem}>
              <Text style={styles.goalLabel}>Starting</Text>
              <Text style={styles.goalValue}>{goals.startWeight} kg</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={styles.goalLabel}>Current</Text>
              <Text style={styles.goalValue}>{goals.currentWeight} kg</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={styles.goalLabel}>Target</Text>
              <Text style={styles.goalValue}>{goals.targetWeight} kg</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${goals.progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {goals.progress}% of goal achieved
            </Text>
          </View>
        </View>

        {/* Calories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calorie Tracking</Text>
          <View style={styles.calorieContainer}>
            <View style={styles.calorieStats}>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatValue}>
                  {calorieData.average}
                </Text>
                <Text style={styles.calorieStatLabel}>Daily Average</Text>
              </View>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatValue}>{calorieData.goal}</Text>
                <Text style={styles.calorieStatLabel}>Daily Goal</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${safeCalorieProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {calorieData.progress}% of calorie goal
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Photos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress Photos</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddPhoto}>
              <Icon name="camera" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photosContainer}>
            {progressPhotos.length === 0 ? (
              <View style={styles.emptyPhotosContainer}>
                <Icon name="camera-outline" size={40} color="#666" />
                <Text style={styles.emptyPhotosText}>
                  No progress photos yet
                </Text>
                <Text style={styles.emptyPhotosSubtext}>
                  Take photos to visually track your progress over time
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {progressPhotos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo.uri }}
                    style={styles.photo}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Add Weight Modal */}
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

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter weight"
                      keyboardType="decimal-pad"
                      value={newWeight}
                      onChangeText={setNewWeight}
                      autoFocus
                    />
                    <Text style={styles.inputLabel}>kg</Text>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setWeightModalVisible(false);
                        setNewWeight("");
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={handleSaveWeight}
                      disabled={loading}
                    >
                      <Text style={styles.saveButtonText}>
                        {loading ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666666",
  },
  header: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666666",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
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
    marginBottom: 16,
  },
  timeframeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeframeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  timeframeButtonActive: {
    backgroundColor: "#000000",
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
  },
  timeframeTextActive: {
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
  goalsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  goalItem: {
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: 16,
    borderRadius: 12,
    minWidth: 100,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    flex: 1,
    marginHorizontal: 4,
  },
  goalLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: "#000000",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  calorieContainer: {
    marginBottom: 8,
  },
  calorieStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  calorieStat: {
    alignItems: "center",
  },
  calorieStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  calorieStatLabel: {
    fontSize: 14,
    color: "#666666",
  },
  photosContainer: {
    marginTop: 8,
  },
  emptyPhotosContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 16,
  },
  emptyPhotosText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#666666",
  },
  emptyPhotosSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
  },
  photo: {
    width: 200,
    height: 200,
    marginRight: 12,
    borderRadius: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
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
    shadowOffset: {
      width: 0,
      height: -4,
    },
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 16,
    color: "#000000",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6C757D",
    marginLeft: 8,
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
});
