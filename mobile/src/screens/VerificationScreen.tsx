import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import authService from "../services/authService";

type VerificationScreenRouteProp = RouteProp<
  RootStackParamList,
  "Verification"
>;

export function VerificationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<VerificationScreenRouteProp>();
  const { email } = route.params;

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyEmail(email, code);
      if (response.success) {
        Alert.alert("Success", "Your email has been verified!", [
          {
            text: "OK",
            onPress: () => {
              // Simply navigate back to login screen
              console.log("Verification successful, redirecting to login");
              navigation.navigate("Login");
            },
          },
        ]);
      } else {
        Alert.alert(
          "Verification Failed",
          response.error || "Invalid or expired verification code"
        );
      }
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert(
        "Verification Error",
        "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await authService.sendVerificationEmail(email);

      if (response.success) {
        setResendDisabled(true);
        setCountdown(60); // 60 second cooldown
        Alert.alert(
          "Code Sent",
          "A new verification code has been sent to your email."
        );
      } else {
        Alert.alert(
          "Error",
          response.error || "Failed to send verification code"
        );
      }
    } catch (error) {
      console.error("Resend code error:", error);
      Alert.alert(
        "Error",
        "Failed to send verification code. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to {email}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#999"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              code.length < 6 && styles.disabledButton,
            ]}
            onPress={handleVerify}
            disabled={isLoading || code.length < 6}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive a code? </Text>
            {resendDisabled ? (
              <Text style={styles.countdownText}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isLoading || resendDisabled}
              >
                <Text
                  style={[
                    styles.resendButton,
                    (isLoading || resendDisabled) && styles.disabledText,
                  ]}
                >
                  Resend Code
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 40,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  codeInput: {
    width: "80%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 2,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 16,
  },
  verifyButton: {
    width: "80%",
    height: 55,
    backgroundColor: "#27ae60",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#a8d5a8",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  resendButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27ae60",
  },
  countdownText: {
    fontSize: 14,
    color: "#999",
  },
  disabledText: {
    color: "#ccc",
  },
  backButton: {
    marginTop: 40,
    padding: 10,
  },
  backButtonText: {
    color: "#333",
    fontSize: 16,
  },
});
