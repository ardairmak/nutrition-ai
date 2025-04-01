import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import authService from "../services/authService";

const { width } = Dimensions.get("window");

enum AuthMode {
  LOGIN = "login",
  REGISTER = "register",
}

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    signInWithGoogle,
    signIn,
    isLoading: authContextLoading,
    setUser,
    setIsAuthenticated,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [requiresVerification, setRequiresVerification] = useState(false);

  // Handle email/password sign in
  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signIn(email, password);

      // Check if we got an object with requiresVerification flag
      if (result && typeof result === "object" && result.requiresVerification) {
        console.log(
          "Account requires verification, auto-sending verification email"
        );
        setRequiresVerification(true);

        // Auto-send verification email
        const verificationResponse = await authService.sendVerificationEmail(
          email
        );
        if (verificationResponse.success) {
          console.log("Verification email sent automatically");
        } else {
          console.error(
            "Failed to auto-send verification email:",
            verificationResponse.error
          );
        }

        // Navigate to verification screen
        navigation.navigate("Verification", {
          email: result.email || email,
        });
      }
      // If result is true, login was successful and handled by AuthContext
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resending verification email
  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.sendVerificationEmail(email);
      if (response.success) {
        Alert.alert(
          "Verification Email Sent",
          "Please check your email for the verification code",
          [
            {
              text: "Go to Verification",
              onPress: () => navigation.navigate("Verification", { email }),
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          response.error || "Failed to send verification email"
        );
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      Alert.alert(
        "Error",
        "Could not send verification email. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle account registration
  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        email,
        password,
      };

      const response = await authService.register(userData);

      if (response.success) {
        // Navigate to verification screen
        Alert.alert(
          "Registration Successful",
          "Please check your email for a verification code.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Verification", { email }),
            },
          ]
        );
      } else {
        Alert.alert(
          "Registration Failed",
          response.error || "Unable to create account"
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email/password authentication based on mode
  const handleEmailAuth = async () => {
    if (authMode === AuthMode.LOGIN) {
      await handleSignIn();
    } else {
      await handleRegister();
    }
  };

  // Toggle between login and register modes
  const toggleAuthMode = () => {
    setAuthMode(
      authMode === AuthMode.LOGIN ? AuthMode.REGISTER : AuthMode.LOGIN
    );
    // Clear form fields when switching modes
    setPassword("");
  };

  // Dismiss keyboard when tapping outside input fields
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appName}>Food Recognition</Text>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.title}>
                {authMode === AuthMode.LOGIN
                  ? "Welcome Back"
                  : "Create Account"}
              </Text>
              <Text style={styles.subtitle}>
                Track your nutrition and achieve your health goals with
                AI-powered food recognition
              </Text>

              {/* Verification message if needed */}
              {requiresVerification && (
                <View style={styles.verificationContainer}>
                  <Text style={styles.verificationText}>
                    Your account requires verification. Please check your email
                    for a verification code or request a new one.
                  </Text>
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendVerification}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.resendButtonText}>
                        Resend Verification Email
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Email Auth Button */}
              <TouchableOpacity
                style={styles.emailButton}
                onPress={handleEmailAuth}
                activeOpacity={0.9}
                disabled={
                  isLoading || authContextLoading || !email || !password
                }
              >
                {isLoading || authContextLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.emailButtonText}>
                    {authMode === AuthMode.LOGIN ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Toggle Auth Mode */}
              <TouchableOpacity
                onPress={toggleAuthMode}
                style={styles.toggleContainer}
              >
                <Text style={styles.toggleText}>
                  {authMode === AuthMode.LOGIN
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={signInWithGoogle}
                activeOpacity={0.9}
                disabled={isLoading || authContextLoading}
              >
                {authContextLoading ? (
                  <ActivityIndicator color="#4285F4" size="small" />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <Image
                        source={require("../../assets/icons/google.png")}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.buttonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By continuing, you agree to our Terms of Service and Privacy
                Policy
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  contentContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: width * 0.8,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  emailButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#27ae60",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  emailButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  toggleContainer: {
    marginBottom: 24,
  },
  toggleText: {
    color: "#4285F4",
    fontSize: 14,
    fontWeight: "500",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    paddingHorizontal: 10,
    color: "#999",
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  termsText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 24,
    maxWidth: width * 0.8,
  },
  verificationContainer: {
    width: "100%",
    padding: 16,
    backgroundColor: "#E8F0FE",
    borderRadius: 8,
    marginBottom: 24,
    marginTop: 16,
  },
  verificationText: {
    color: "#444",
    fontSize: 15,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  resendButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "center",
  },
  resendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
