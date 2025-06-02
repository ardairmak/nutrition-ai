import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../contexts/AuthContext";
import analyticsService from "../services/analyticsService";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: "recommendation" | "insight" | "general";
}

export function AIChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      text: `Hi ${
        user?.firstName || "there"
      }! 👋 I'm your AI nutrition assistant. I can help you with:\n\n🍎 Personalized food recommendations\n📊 Nutrition insights based on your goals\n🥗 Meal planning suggestions\n⚠️ Allergy-safe alternatives\n\nWhat would you like to know?`,
      isUser: false,
      timestamp: new Date(),
      type: "general",
    };
    setMessages([welcomeMessage]);
  }, [user]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Frontend validation for better UX
    if (inputText.trim().length < 3) {
      Alert.alert(
        "Message too short",
        "Please ask a proper question with at least 3 characters."
      );
      return;
    }

    if (inputText.trim().length > 500) {
      Alert.alert(
        "Message too long",
        "Please keep your message under 500 characters."
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText("");
    setIsLoading(true);

    try {
      // Convert messages to conversation history format for AI
      const conversationHistory = messages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
      }));

      // Use the new AI chat endpoint
      const response = await analyticsService.aiChat(
        messageText,
        conversationHistory
      );

      if (response.success && response.data) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.data.response,
          isUser: false,
          timestamp: new Date(),
          type: "general",
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        // Handle specific error types with user-friendly messages
        let errorText =
          "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 🤖";

        if (response.error?.includes("too short")) {
          errorText =
            "Please ask a longer, more detailed question so I can help you better! 📝";
        } else if (response.error?.includes("too long")) {
          errorText =
            "Your message is a bit too long! Please try breaking it into smaller questions. ✂️";
        } else if (response.error?.includes("Too many requests")) {
          errorText =
            "You're asking questions very quickly! Please wait a moment before asking again. ⏰";
        } else if (response.error?.includes("Daily AI request limit")) {
          errorText =
            "You've reached your daily question limit. Feel free to continue tomorrow! 📅";
        }

        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: errorText,
          isUser: false,
          timestamp: new Date(),
          type: "general",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 🤖",
        isUser: false,
        timestamp: new Date(),
        type: "general",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getQuickSuggestions = () => [
    "What should I eat for breakfast?",
    "Suggest a high-protein meal",
    "Low-calorie dinner ideas",
    "Foods to avoid with my allergies",
    "How am I doing with my goals?",
    "Healthy snack recommendations",
  ];

  const handleQuickSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case "recommendation":
        return "food-apple";
      case "insight":
        return "chart-line";
      default:
        return "robot";
    }
  };

  const getMessageColor = (type?: string) => {
    switch (type) {
      case "recommendation":
        return "#34C759";
      case "insight":
        return "#007AFF";
      default:
        return "#5E60CE";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.aiAvatar}>
              <Icon name="robot" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Nutrition Assistant</Text>
              <Text style={styles.headerSubtitle}>
                Powered by your personal data
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser
                  ? styles.userMessageContainer
                  : styles.aiMessageContainer,
              ]}
            >
              {!message.isUser && (
                <View
                  style={[
                    styles.messageAvatar,
                    { backgroundColor: getMessageColor(message.type) },
                  ]}
                >
                  <Icon
                    name={getMessageIcon(message.type)}
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  message.isUser
                    ? styles.userMessageBubble
                    : styles.aiMessageBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser
                      ? styles.userMessageText
                      : styles.aiMessageText,
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.isUser
                      ? styles.userMessageTime
                      : styles.aiMessageTime,
                  ]}
                >
                  {formatTime(message.timestamp)}
                </Text>
              </View>

              {message.isUser && (
                <View style={styles.userAvatar}>
                  <Icon name="account" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#5E60CE" />
                <Text style={styles.loadingText}>AI is thinking...</Text>
              </View>
            </View>
          )}

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Quick suggestions:</Text>
              <View style={styles.suggestionsGrid}>
                {getQuickSuggestions().map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleQuickSuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything about nutrition..."
              placeholderTextColor="#8E8E93"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Icon
                name={isLoading ? "loading" : "send"}
                size={20}
                color={!inputText.trim() || isLoading ? "#8E8E93" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputFooter}>
            <Icon name="shield-check" size={12} color="#8E8E93" />
            <Text style={styles.inputFooterText}>
              Your data is private and secure
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5E60CE",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessageBubble: {
    backgroundColor: "#000000",
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  aiMessageText: {
    color: "#000000",
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
  },
  userMessageTime: {
    color: "#FFFFFF",
    textAlign: "right",
  },
  aiMessageTime: {
    color: "#666666",
  },
  loadingContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 16,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: "#666666",
    fontStyle: "italic",
  },
  suggestionsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    color: "#000000",
    fontWeight: "500",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F8F9FA",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E9ECEF",
  },
  inputFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  inputFooterText: {
    fontSize: 11,
    color: "#8E8E93",
  },
});
