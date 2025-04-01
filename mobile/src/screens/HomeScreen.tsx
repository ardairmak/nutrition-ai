import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export const HomeScreen = () => {
  const { user, signOut, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // For debugging - log the exact user ID and identity details
    console.log("=== HomeScreen RENDER ===");
    console.log("User authenticated:", isAuthenticated);
    console.log("User object:", JSON.stringify(user));
    console.log("User email:", user?.email);
    console.log("User name:", user?.firstName, user?.lastName);
  }, [user, isAuthenticated]);

  // Add time display to debug data to identify stale renders
  const currentTime = new Date().toLocaleTimeString();

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#4285F4" />
      ) : (
        <>
          <Text style={styles.title}>
            Welcome, {user?.firstName || user?.email?.split("@")[0] || "User"}!
          </Text>

          {/* Debug information */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>
                Debug Info (Updated: {currentTime}):
              </Text>
              <Text style={styles.debugText}>
                Email: {user?.email || "Not set"}
              </Text>
              <Text style={styles.debugText}>
                First Name: {user?.firstName || "Not set"}
              </Text>
              <Text style={styles.debugText}>
                Last Name: {user?.lastName || "Not set"}
              </Text>
              <Text style={styles.debugText}>
                Profile Setup:{" "}
                {user?.profileSetupComplete ? "Complete" : "Not Complete"}
              </Text>
              <Text style={styles.debugText}>ID: {user?.id || "Not set"}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={signOut}
            disabled={isLoading}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  debugContainer: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    marginVertical: 20,
    width: "100%",
  },
  debugTitle: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    color: "#333",
    marginBottom: 3,
  },
});
