import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { RootStackParamList } from "../navigation/types";
import CameraComponentWithRef, {
  CameraComponentHandle,
} from "../components/CameraComponent";
import { imageService } from "../services";
import { FoodAnalysis } from "../services/imageService";
import NutritionPopup from "../components/NutritionPopup";
import userService from "../services/userService";

type ScanMode = "food" | "label" | "gallery";
type CameraScreenRouteProp = RouteProp<RootStackParamList, "Camera">;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

export function CameraScreen() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("food");
  const [cameraReady, setCameraReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<FoodAnalysis | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);
  const cameraRef = useRef<CameraComponentHandle>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CameraScreenRouteProp>();
  const { mealType } = route.params;

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const data = await cameraRef.current.takePicture();
        if (data) {
          setPhoto(data.uri);
          console.log("Photo taken:", data.uri);
          // Show a success message
          Alert.alert("Success", "Photo captured successfully!");
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take photo");
      }
    } else {
      console.log("Camera not ready");
      Alert.alert("Camera Error", "Camera is not ready yet. Please try again.");
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      // Request permission to access the media library
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photo library to select images"
        );
        return;
      }

      // Launch the image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error selecting image from gallery:", error);
      Alert.alert("Error", "Failed to select image from gallery");
    }
  };

  const handleUsePhoto = async () => {
    if (!photo) {
      Alert.alert("Error", "No photo selected");
      return;
    }

    setAnalyzing(true);
    setAnalysisResults(null);

    try {
      // Compress and resize the image to reduce payload size
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        photo,
        [{ resize: { width: 800 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!manipulatedImage.base64) {
        throw new Error("Failed to compress image");
      }

      // Send to server for analysis
      const result = await imageService.analyzePhoto(manipulatedImage.base64);

      if (result.success && result.analysis) {
        // Validate that the analysis contains actual food data
        const isValidFoodAnalysis = validateFoodAnalysis(result.analysis);

        if (!isValidFoodAnalysis) {
          Alert.alert(
            "Not Food",
            "The image doesn't appear to contain food. Please try a different image."
          );
          return;
        }

        setAnalysisResults(result.analysis);
        setShowResults(true);
      } else {
        Alert.alert(
          "Analysis Failed",
          result.error || "Could not analyze the image"
        );
      }
    } catch (error) {
      console.error("Error processing photo:", error);
      Alert.alert("Error", "Failed to process the photo");
    } finally {
      setAnalyzing(false);
    }
  };

  // Validate if the analysis contains actual food data
  const validateFoodAnalysis = (analysis: FoodAnalysis): boolean => {
    // Check if there are food items
    if (!analysis.foodItems || analysis.foodItems.length === 0) {
      console.log("No food items found in analysis");
      return false;
    }

    // Check if there are reasonable calories (at least 1 per food item)
    if (analysis.totalCalories <= 0) {
      console.log("Zero or negative calories found in analysis");
      return false;
    }

    // Check if each food item has a name and reasonable nutritional values
    for (const item of analysis.foodItems) {
      if (!item.name || item.name.trim() === "") {
        console.log("Found food item with no name");
        return false;
      }

      // Verify the item has some nutritional content
      if (
        item.calories <= 0 &&
        item.protein <= 0 &&
        item.carbs <= 0 &&
        item.fat <= 0
      ) {
        console.log("Found food item with no nutritional content:", item.name);
        return false;
      }
    }

    // If passed all checks, the analysis seems to contain valid food data
    return true;
  };

  const handleRetake = () => {
    setPhoto(null);
    setAnalysisResults(null);
    setShowResults(false);
  };

  const closeResults = () => {
    setShowResults(false);
    // Navigate back to MainTabs (Dashboard will be shown and refreshed via useFocusEffect)
    navigation.navigate("MainTabs");
  };

  const handleLogMeal = async (analysis: FoodAnalysis) => {
    try {
      const response = await userService.logMeal({
        mealType: mealType,
        mealName: analysis.foodItems.map((item) => item.name).join(", "),
        totalCalories: analysis.totalCalories,
        totalProtein: analysis.foodItems.reduce(
          (sum, item) => sum + item.protein,
          0
        ),
        totalCarbs: analysis.foodItems.reduce(
          (sum, item) => sum + item.carbs,
          0
        ),
        totalFat: analysis.foodItems.reduce((sum, item) => sum + item.fat, 0),
        foodItems: analysis.foodItems,
      });

      if (response.success) {
        Alert.alert("Success", "Meal logged successfully");
        navigation.navigate("MainTabs");
      } else {
        Alert.alert("Error", response.error || "Failed to log meal");
      }
    } catch (error) {
      console.error("Error logging meal:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const renderScanModeButtons = () => {
    return (
      <View style={styles.scanOptionsContainer}>
        <TouchableOpacity
          style={[
            styles.scanOption,
            scanMode === "food" ? styles.scanOptionActive : {},
          ]}
          onPress={() => setScanMode("food")}
        >
          <Icon
            name="food-apple"
            size={24}
            color={scanMode === "food" ? "#000" : "#777"}
          />
          <Text style={styles.scanOptionText}>Food scan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scanOption,
            scanMode === "label" ? styles.scanOptionActive : {},
          ]}
          onPress={() => setScanMode("label")}
        >
          <Icon
            name="tag-text"
            size={24}
            color={scanMode === "label" ? "#000" : "#777"}
          />
          <Text style={styles.scanOptionText}>Food label</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scanOption,
            scanMode === "gallery" ? styles.scanOptionActive : {},
          ]}
          onPress={() => {
            setScanMode("gallery");
            handleSelectFromGallery();
          }}
        >
          <Icon
            name="image"
            size={24}
            color={scanMode === "gallery" ? "#000" : "#777"}
          />
          <Text style={styles.scanOptionText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {photo ? (
        // Photo preview mode - full screen photo with floating UI
        <View style={styles.fullScreenContainer}>
          <Image source={{ uri: photo }} style={styles.fullScreenImage} />

          {/* Floating header */}
          <SafeAreaView style={styles.overlayHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Floating footer */}
          <SafeAreaView style={styles.overlayFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleRetake}
            >
              <Icon name="camera-retake" size={24} color="#fff" />
              <Text style={styles.footerButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerButton, styles.usePhotoButton]}
              onPress={handleUsePhoto}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="check" size={24} color="#fff" />
                  <Text style={styles.footerButtonText}>Use Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      ) : (
        // Camera mode
        <View style={styles.cameraContainer}>
          {/* Header */}
          <SafeAreaView style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Capture Food</Text>
            <View style={styles.placeholder} />
          </SafeAreaView>

          {/* Camera Component */}
          <CameraComponentWithRef
            ref={cameraRef}
            style={styles.camera}
            onCameraReady={() => setCameraReady(true)}
          />

          {/* Footer */}
          <SafeAreaView style={styles.footer}>
            {renderScanModeButtons()}

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                disabled={!cameraReady}
              >
                <View style={styles.captureCircle}>
                  <View style={styles.captureInner} />
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* Replace the old results modal with the new NutritionPopup */}
      <NutritionPopup
        visible={showResults}
        onClose={closeResults}
        photoUri={photo}
        analysis={analysisResults}
        mealType={mealType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 10,
  },
  backButton: {
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  camera: {
    flex: 1,
  },
  footer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  scanOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  scanOption: {
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  scanOptionActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  scanOptionText: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 5,
  },
  cameraControls: {
    alignItems: "center",
    paddingBottom: 30,
    paddingTop: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "transparent",
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullScreenImage: {
    flex: 1,
    resizeMode: "contain",
  },
  overlayHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  overlayFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  footerButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  usePhotoButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
  },
  footerButtonText: {
    color: "#fff",
    marginLeft: 8,
  },
});
