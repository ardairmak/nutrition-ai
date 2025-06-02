import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import userService from "../services/userService";
import weightService from "../services/weightService";
import { S3Image } from "../components/S3Image";

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [streak, setStreak] = useState<number | null>(null);
  const [progressData, setProgressData] = useState<{
    value: number;
    label: string;
    unit: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      setLoading(true);
      try {
        // Fetch dashboard data for streak
        const dashboardResponse = await userService.getDashboardData();
        if (dashboardResponse.success && dashboardResponse.dashboardData) {
          setStreak(dashboardResponse.dashboardData.streak);
        }

        // Fetch weight history for accurate progress calculation
        const weightHistoryResponse = await weightService.getWeightHistory();
        let weightHistory: Array<{ weight: number; recordedAt: string }> = [];
        if (
          weightHistoryResponse.success &&
          weightHistoryResponse.weightHistory
        ) {
          weightHistory = weightHistoryResponse.weightHistory;
        }

        // Calculate progress based on user's goals and actual weight history
        if (user) {
          const progress = calculateUserProgress(user, weightHistory);
          setProgressData(progress);
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setStreak(null);
        setProgressData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUserStats();
  }, [user]);

  const calculateUserProgress = (
    user: any,
    weightHistory: Array<{ weight: number; recordedAt: string }> = []
  ) => {
    const currentWeight = user.weight || 0;
    const targetWeight = user.targetWeight || currentWeight;

    // Use first weight history entry as starting weight, fallback to current weight
    const startWeight =
      weightHistory.length > 0 ? weightHistory[0].weight : currentWeight;

    // Determine goal type
    const goals = user.fitnessGoals || [];
    const isWeightLoss = goals.some(
      (goal: string) =>
        goal.includes("weight_loss") || goal.includes("lose_weight")
    );
    const isWeightGain = goals.some(
      (goal: string) =>
        goal.includes("weight_gain") || goal.includes("gain_weight")
    );
    const isMuscleBuilding = goals.some(
      (goal: string) =>
        goal.includes("build_muscle") || goal.includes("muscle_gain")
    );

    if (isWeightLoss) {
      const weightLost = Math.max(0, startWeight - currentWeight);
      return {
        value: weightLost,
        label: "Weight Lost",
        unit: "kg",
      };
    } else if (isWeightGain || isMuscleBuilding) {
      const weightGained = Math.max(0, currentWeight - startWeight);
      return {
        value: weightGained,
        label: isMuscleBuilding ? "Progress" : "Weight Gained",
        unit: "kg",
      };
    } else {
      // Maintenance or general fitness
      const deviation = Math.abs(currentWeight - targetWeight);
      return {
        value: deviation,
        label: "From Target",
        unit: "kg",
      };
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Please log in to view your profile</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Other</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* User Header with Stats */}
        <View style={styles.profileHeader}>
          {/* Profile and Username */}
          <View style={styles.profileSection}>
            {user.profilePicture ? (
              <S3Image
                imageUrl={user.profilePicture}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="account" size={40} color="#666" />
              </View>
            )}
            <Text style={styles.username}>{user.firstName || "User"}</Text>
          </View>

          {/* Enhanced Stats Cards */}
          <View style={styles.statsContainer}>
            {/* Streak Card */}
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Icon name="fire" size={24} color="#FF6B35" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {loading ? "-" : streak !== null ? streak : "0"}
                </Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>

            {/* Progress Card */}
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Icon
                  name={
                    progressData?.label.includes("Lost")
                      ? "trending-down"
                      : progressData?.label.includes("Gained")
                      ? "trending-up"
                      : "target"
                  }
                  size={24}
                  color="#4CAF50"
                />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {loading
                    ? "-"
                    : progressData
                    ? `${progressData.value.toFixed(1)}`
                    : "0"}
                </Text>
                <Text style={styles.statLabel}>
                  {progressData
                    ? `${progressData.label} (${progressData.unit})`
                    : "Progress"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {/* My Profile */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="account" size={24} color="#888" />
            </View>
            <Text style={styles.menuText}>My Profile</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Friends */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Friends")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="account-group" size={24} color="#888" />
            </View>
            <Text style={styles.menuText}>Friends</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Goals */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("EditGoals")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="target" size={24} color="#888" />
            </View>
            <Text style={styles.menuText}>Goals</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Dietary Preferences */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("DietaryPreferences")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="food-variant" size={24} color="#888" />
            </View>
            <Text style={styles.menuText}>Dietary Preferences</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Allergies */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Allergies")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="alert-circle" size={24} color="#888" />
            </View>
            <Text style={styles.menuText}>Allergies & Restrictions</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Activity Level */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("ActivityLevel")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="run" size={24} color="#888" />
            </View>
            <Text style={styles.menuText}>Activity Level</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* AI Chat */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("AIChat")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="robot" size={24} color="#888" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>AI Nutrition Assistant</Text>
              <Text style={styles.menuSubtext}>
                Get personalized nutrition advice and recommendations
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Smart Notifications */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("NotificationSettings")}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="bell" size={24} color="#888" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuSubtext}>
                Customize your reminders and alerts
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Sign Out (at bottom of screen) */}
          <TouchableOpacity
            style={[styles.menuRow, styles.signOutRow]}
            onPress={handleSignOut}
          >
            <View style={styles.menuIconContainer}>
              <Icon name="logout" size={24} color="#FF4444" />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  titleContainer: {
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  profileHeader: {
    padding: 20,
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statContent: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
  },
  menuList: {
    paddingBottom: 20,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuIconContainer: {
    width: 40,
    alignItems: "center",
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
    flex: 1,
    color: "#333",
  },
  signOutRow: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    borderBottomWidth: 0,
  },
  signOutText: {
    color: "#FF4444",
    fontSize: 16,
    fontWeight: "500",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    color: "#888",
  },
});
