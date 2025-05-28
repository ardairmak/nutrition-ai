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

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      setLoading(true);
      try {
        const response = await userService.getDashboardData();
        if (response.success && response.dashboardData) {
          setStreak(response.dashboardData.streak);
        } else {
          setStreak(null);
        }
      } catch (error) {
        setStreak(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStreak();
  }, []);

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
              <Image
                source={{ uri: user.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="account" size={40} color="#666" />
              </View>
            )}
            <Text style={styles.username}>{user.firstName || "User"}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* Streak */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>
                {loading ? "-" : streak !== null ? streak : "-"}
              </Text>
              <Text style={styles.statUnit}>days</Text>
            </View>

            {/* Progress */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Progress</Text>
              <Text style={styles.statValue}>0 kg</Text>
              <Text style={styles.statUnit}>weight lost</Text>
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
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statUnit: {
    fontSize: 14,
    color: "#888",
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
