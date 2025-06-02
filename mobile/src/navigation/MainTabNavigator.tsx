import React, { useState, useRef, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Text,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { MainTabsParamList } from "./types";
import { RootStackParamList } from "./types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { EnhancedProgressScreen } from "../screens/EnhancedProgressScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Custom tab button for the center "+" action
const CustomAddButton = ({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showMealTypeSelection, setShowMealTypeSelection] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const stackNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabsParamList>>();

  const mealTypes = [
    { id: "Breakfast", label: "Breakfast", icon: "coffee" },
    { id: "Lunch", label: "Lunch", icon: "food" },
    { id: "Dinner", label: "Dinner", icon: "silverware-fork-knife" },
    { id: "Snacks", label: "Snacks", icon: "cookie" },
  ];

  useEffect(() => {
    if (modalVisible) {
      // Slide up animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible, slideAnim]);

  const closeModal = () => {
    // Start slide down animation
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Close modal after animation completes
      setModalVisible(false);
      setShowMealTypeSelection(false);
    });
  };

  const handleCameraPress = () => {
    // Show meal type selection in the same modal
    setShowMealTypeSelection(true);
  };

  const handleMealTypeSelect = (mealType: string) => {
    closeModal();
    // Navigate to the camera screen with selected meal type
    stackNavigation.navigate("Camera", { mealType });
  };

  const handleLogWeightPress = () => {
    closeModal();
    // Navigate to Progress screen with weight modal open
    tabNavigation.navigate("Progress", { openWeightModal: true });
  };

  const handleBackToMainOptions = () => {
    setShowMealTypeSelection(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.addButtonContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.addButton}>
          <Icon name="plus" color="#FFFFFF" size={30} />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.modalHandle} />

            {!showMealTypeSelection ? (
              <>
                <Text style={styles.modalTitle}>Add New Entry</Text>
                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleCameraPress}
                  >
                    <Icon name="camera" size={24} color="#000000" />
                    <Text style={styles.optionText}>Food</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleLogWeightPress}
                  >
                    <Icon name="scale-bathroom" size={24} color="#000000" />
                    <Text style={styles.optionText}>Log Weight</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleBackToMainOptions}>
                    <Icon name="arrow-left" size={24} color="#333" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Meal Type</Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.mealTypeContainer}>
                  {mealTypes.map((mealType) => (
                    <TouchableOpacity
                      key={mealType.id}
                      style={styles.mealTypeButton}
                      onPress={() => handleMealTypeSelect(mealType.id)}
                    >
                      <Icon name={mealType.icon} size={24} color="#000000" />
                      <Text style={styles.mealTypeText}>{mealType.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// Placeholder for Add Entry screen (not actually used with modal approach)
const AddEntryScreen = () => <View />;

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#666666",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          height: 85,
          paddingBottom: 20,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard-outline" color={color} size={size} />
          ),
          tabBarLabel: "Dashboard",
        }}
      />

      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="book-outline" color={color} size={size} />
          ),
          tabBarLabel: "Journal",
        }}
      />

      <Tab.Screen
        name="AddEntry"
        component={AddEntryScreen}
        options={{
          tabBarIcon: ({ color }) => <View />,
          tabBarLabel: "",
          tabBarButton: (props) => (
            <CustomAddButton onPress={() => {}} children={null} />
          ),
        }}
      />

      <Tab.Screen
        name="Progress"
        component={EnhancedProgressScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-line" color={color} size={size} />
          ),
          tabBarLabel: "Progress",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    position: "absolute",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    elevation: 0,
    backgroundColor: "#FFFFFF",
  },
  addButtonContainer: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#DDDDDD",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  optionButton: {
    alignItems: "center",
    padding: 15,
  },
  optionText: {
    marginTop: 8,
    color: "#333",
  },
  mealTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  mealTypeButton: {
    alignItems: "center",
    padding: 15,
  },
  mealTypeText: {
    marginTop: 8,
    color: "#333",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
});
