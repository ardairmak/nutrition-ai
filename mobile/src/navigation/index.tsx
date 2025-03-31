import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { useAuth } from "../contexts/AuthContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth screen to handle redirects
const AuthRedirectScreen = () => {
  const { isAuthenticated } = useAuth();

  // This is just a placeholder for the deep link
  // The actual logic is in the AuthContext's handleUrlRedirect

  return null;
};

export function Navigation({ linking }: { linking?: any }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show loading screen while checking authentication status
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is signed in
          <Stack.Screen name="Main" component={HomeScreen} />
        ) : (
          // User is not signed in
          <>
            <Stack.Screen name="Auth" component={LoginScreen} />
            <Stack.Screen name="AuthRedirect" component={AuthRedirectScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
