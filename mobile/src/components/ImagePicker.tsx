import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { uploadService, UploadResponse } from "../services/uploadService";

interface ImagePickerComponentProps {
  onImageSelected?: (imageUri: string) => void;
  onImageUploaded?: (result: UploadResponse) => void;
  uploadType: "meal" | "profile";
  mealId?: string;
  currentImageUri?: string;
  style?: any;
  showPreview?: boolean;
  autoUpload?: boolean;
}

export const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  onImageSelected,
  onImageUploaded,
  uploadType,
  mealId,
  currentImageUri,
  style,
  showPreview = true,
  autoUpload = false,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(
    currentImageUri || null
  );
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "We need camera and photo library permissions to upload images.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const showImagePickerOptions = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    Alert.alert("Select Image", "Choose how you want to select an image", [
      {
        text: "Camera",
        onPress: () => openCamera(),
      },
      {
        text: "Gallery",
        onPress: () => openGallery(),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: uploadType === "profile" ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error opening camera:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: uploadType === "profile" ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error opening gallery:", error);
      Alert.alert("Error", "Failed to open gallery");
    }
  };

  const handleImageSelected = async (imageUri: string) => {
    setSelectedImage(imageUri);
    onImageSelected?.(imageUri);

    // Auto upload if enabled
    if (autoUpload) {
      setUploading(true);
      try {
        let result: UploadResponse;

        if (uploadType === "meal") {
          result = await uploadService.uploadMealImage(imageUri, mealId);
        } else {
          result = await uploadService.uploadProfileImage(imageUri);
        }

        if (result.success) {
          onImageUploaded?.(result);
        } else {
          Alert.alert(
            "Upload Failed",
            result.error || "Failed to upload image"
          );
        }
      } catch (error) {
        console.error("Auto upload error:", error);
        Alert.alert("Error", "Failed to upload image");
      } finally {
        setUploading(false);
      }
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert("Error", "Please select an image first");
      return;
    }

    setUploading(true);
    try {
      let result: UploadResponse;

      if (uploadType === "meal") {
        result = await uploadService.uploadMealImage(selectedImage, mealId);
      } else {
        result = await uploadService.uploadProfileImage(selectedImage);
      }

      if (result.success) {
        Alert.alert("Success", "Image uploaded successfully!");
        onImageUploaded?.(result);
      } else {
        Alert.alert("Upload Failed", result.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {showPreview && selectedImage && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: selectedImage }}
            style={[
              styles.previewImage,
              uploadType === "profile"
                ? styles.profilePreview
                : styles.mealPreview,
            ]}
          />
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={showImagePickerOptions}
          disabled={uploading}
        >
          <Icon name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {selectedImage ? "Change Image" : "Select Image"}
          </Text>
        </TouchableOpacity>

        {autoUpload && uploading && (
          <View style={styles.autoUploadIndicator}>
            <ActivityIndicator size="small" color="#4285F4" />
            <Text style={styles.autoUploadText}>Uploading...</Text>
          </View>
        )}

        {selectedImage && !autoUpload && (
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadingButton]}
            onPress={uploadImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="cloud-upload" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.buttonText}>
              {uploading ? "Uploading..." : "Upload"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewImage: {
    borderRadius: 8,
  },
  profilePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  mealPreview: {
    width: 200,
    height: 150,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  selectButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButton: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadingButton: {
    backgroundColor: "#999999",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  autoUploadIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  autoUploadText: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
