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
    // For debugging
    console.log("HomeScreen rendered with user:", user);
    console.log("User authenticated:", isAuthenticated);
  }, [user, isAuthenticated]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#4285F4" />
      ) : (
        <>
          <Text style={styles.title}>
            Welcome, {user?.firstName || user?.email?.split("@")[0] || "User"}!
          </Text>

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
});
