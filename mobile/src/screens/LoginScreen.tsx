import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthStackParamList } from "../types/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Login"
>;

export function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signInWithGoogle, isLoading } = useAuth();
  const [loginAttempted, setLoginAttempted] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoginAttempted(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Authentication Failed",
        "There was a problem connecting to Google. Please try again."
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>Food Recognition</Text>
          <Text style={styles.subtitle}>
            Track your meals and achieve your health goals
          </Text>

          {isLoading ? (
            <View style={styles.googleButton}>
              <ActivityIndicator color="#4285F4" size="small" />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <View style={styles.googleIconPlaceholder}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.buttonText}>Continue with Google</Text>
              </TouchableOpacity>

              {loginAttempted && (
                <Text style={styles.helpText}>
                  If the browser opened but nothing happened, check your server
                  connection and IP address.
                </Text>
              )}
            </>
          )}

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  googleButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleIconText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  buttonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 14,
    color: "#FF6B6B",
    textAlign: "center",
    marginTop: 12,
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
});
