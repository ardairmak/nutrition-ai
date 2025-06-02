import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { RootStackParamList, Friend } from "../navigation/types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import userService from "../services/userService";
import { S3Image } from "../components/S3Image";

interface FriendStats {
  joinDate: string;
  loginStreak: number;
  totalMealsLogged: number;
  daysActiveThisMonth: number;
  activityLevel?: string;
  fitnessGoals?: string[];
  achievements?: Array<{
    id: string;
    name: string;
    icon: string;
    earnedAt: string;
  }>;
}

const FriendProfileScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, "FriendProfile">>();
  const navigation = useNavigation();
  const { friend } = route.params;

  const [stats, setStats] = useState<FriendStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriendStats();
  }, []);

  const loadFriendStats = async () => {
    try {
      setLoading(true);
      const response = await userService.getFriendProfile(friend.id);
      setStats(response);
    } catch (error) {
      console.error("Error loading friend stats:", error);
      Alert.alert("Error", "Failed to load friend profile");
    } finally {
      setLoading(false);
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getActivityLevelColor = (level?: string) => {
    switch (level) {
      case "Very Active":
        return "#4CAF50";
      case "Moderately Active":
        return "#FF9800";
      case "Lightly Active":
        return "#2196F3";
      default:
        return "#666666";
    }
  };

  const getActivityLevelIcon = (level?: string) => {
    switch (level) {
      case "Very Active":
        return "run-fast";
      case "Moderately Active":
        return "run";
      case "Lightly Active":
        return "walk";
      default:
        return "chair-rolling";
    }
  };

  const getFitnessGoalIcon = (goal: string) => {
    const goalIconMap: { [key: string]: string } = {
      "Lose Weight": "scale-bathroom",
      "Gain Muscle": "dumbbell",
      "Maintain Weight": "weight-lifter",
      "Improve Endurance": "run",
      "Increase Strength": "arm-flex",
      "Improve Flexibility": "yoga",
      "Healthy Eating": "food-apple",
      "Better Sleep": "sleep",
      "Reduce Stress": "meditation",
      "Improve Overall Health": "heart-pulse",
      "Build Lean Muscle": "muscle",
      "Tone Body": "human-handsup",
      "Improve Cardiovascular Health": "heart",
      "Increase Energy": "lightning-bolt",
      "Improve Mental Health": "brain",
    };

    return goalIconMap[goal] || "target";
  };

  const getFitnessGoalColor = (goal: string) => {
    const goalColorMap: { [key: string]: string } = {
      "Lose Weight": "#FF6B35",
      "Gain Muscle": "#4CAF50",
      "Maintain Weight": "#2196F3",
      "Improve Endurance": "#FF9800",
      "Increase Strength": "#9C27B0",
      "Improve Flexibility": "#E91E63",
      "Healthy Eating": "#4CAF50",
      "Better Sleep": "#3F51B5",
      "Reduce Stress": "#00BCD4",
      "Improve Overall Health": "#F44336",
      "Build Lean Muscle": "#795548",
      "Tone Body": "#607D8B",
      "Improve Cardiovascular Health": "#E91E63",
      "Increase Energy": "#FFC107",
      "Improve Mental Health": "#673AB7",
    };

    return goalColorMap[goal] || "#666666";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{friend.firstName}'s Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friend.firstName}'s Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {friend.profilePicture ? (
              <S3Image
                imageUrl={friend.profilePicture}
                style={styles.profilePicture}
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Icon name="account" size={48} color="#666" />
              </View>
            )}
            <Text style={styles.name}>
              {friend.firstName} {friend.lastName}
            </Text>
            <Text style={styles.joinDate}>
              Member since {stats ? formatJoinDate(stats.joinDate) : "2024"}
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="fire" size={24} color="#FF6B35" />
              <Text style={styles.statNumber}>{stats?.loginStreak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="food" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>
                {stats?.totalMealsLogged || 0}
              </Text>
              <Text style={styles.statLabel}>Meals Logged</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="calendar-month" size={24} color="#2196F3" />
              <Text style={styles.statNumber}>
                {stats?.daysActiveThisMonth || 0}
              </Text>
              <Text style={styles.statLabel}>Active Days</Text>
            </View>
          </View>

          {/* Activity Level */}
          {stats?.activityLevel && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity Level</Text>
              <View style={styles.activityLevelCard}>
                <Icon
                  name={getActivityLevelIcon(stats.activityLevel)}
                  size={24}
                  color={getActivityLevelColor(stats.activityLevel)}
                />
                <Text
                  style={[
                    styles.activityLevelText,
                    { color: getActivityLevelColor(stats.activityLevel) },
                  ]}
                >
                  {stats.activityLevel}
                </Text>
              </View>
            </View>
          )}

          {/* Fitness Goals */}
          {stats?.fitnessGoals && stats.fitnessGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness Goals</Text>
              <View style={styles.goalsContainer}>
                {stats.fitnessGoals.map((goal, index) => (
                  <View key={index} style={styles.goalChip}>
                    <Icon
                      name={getFitnessGoalIcon(goal)}
                      size={16}
                      color={getFitnessGoalColor(goal)}
                      style={styles.goalIcon}
                    />
                    <Text style={styles.goalText}>{goal}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Achievements */}
          {stats?.achievements && stats.achievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
              <View style={styles.achievementsContainer}>
                {stats.achievements.map((achievement) => (
                  <View key={achievement.id} style={styles.achievementCard}>
                    <Icon name={achievement.icon} size={24} color="#FFD700" />
                    <Text style={styles.achievementName}>
                      {achievement.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Encouragement Button */}
          <TouchableOpacity
            style={styles.encourageButton}
            onPress={() =>
              Alert.alert(
                "Encouragement Sent!",
                `You sent encouragement to ${friend.firstName}!`
              )
            }
          >
            <Icon name="heart" size={20} color="#FFFFFF" />
            <Text style={styles.encourageButtonText}>Send Encouragement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333",
  },
  joinDate: {
    fontSize: 14,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#EEEEEE",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  activityLevelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    gap: 12,
  },
  activityLevelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  goalText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  goalIcon: {
    marginRight: 8,
  },
  achievementsContainer: {
    gap: 8,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    gap: 12,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  encourageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 8,
  },
  encourageButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default FriendProfileScreen;
