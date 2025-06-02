import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Platform,
  Button,
  Alert,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import userService from "../services/userService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ImagePickerComponent } from "../components/ImagePicker";
import { UploadResponse, uploadService } from "../services/uploadService";
import { S3Image } from "../components/S3Image";

// Helper function to get user-specific data key
const getUserDataKey = (email: string) => `@user_data_${email.toLowerCase()}`;

export function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [weightValue, setWeightValue] = useState<string>(
    String(Math.round(user?.weight || 80))
  ); // Convert to string for picker
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const successFade = useRef(new Animated.Value(0)).current;

  // For gender picker
  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
    { label: "Prefer not to say", value: "not_specified" },
  ];

  const openModal = (field: string) => {
    setModalVisible(field);
    if (field === "username") setInputValue(user?.firstName || "");
    if (field === "height")
      setInputValue(user?.height ? String(user.height) : "");
    if (field === "weight")
      setWeightValue(String(Math.round(user?.weight || 80))); // Convert to string
    if (field === "gender") setInputValue(user?.gender || "");
    if (field === "dateOfBirth")
      setDateValue(user?.dateOfBirth ? new Date(user.dateOfBirth) : new Date());
  };

  const closeModal = () => {
    setModalVisible(null);
    setInputValue("");
    setDateValue(null);
    setWeightValue(String(Math.round(user?.weight || 80))); // Convert to string
    slideAnim.setValue(0);
  };

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (showSuccess) {
      // Animate success toast in
      Animated.sequence([
        // Fade in
        Animated.timing(successFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Wait
        Animated.delay(1500),
        // Fade out
        Animated.timing(successFade, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        successFade.setValue(0);
      });
    }
  }, [showSuccess]);

  const handleSave = async () => {
    setLoading(true);
    let profileData: any = {};
    if (modalVisible === "username") profileData.firstName = inputValue.trim();
    if (modalVisible === "height") profileData.height = parseFloat(inputValue);
    if (modalVisible === "weight") profileData.weight = parseFloat(weightValue); // Convert back to number
    if (modalVisible === "gender") profileData.gender = inputValue;
    if (modalVisible === "dateOfBirth" && dateValue)
      profileData.dateOfBirth = dateValue.toISOString();
    try {
      const response = await userService.updateProfile(profileData);
      if (response.success) {
        // Update only the specific fields that were changed
        // instead of replacing the entire user object
        if (user) {
          const updatedUser = {
            ...user,
            ...profileData,
          };
          setUser(updatedUser);
          await AsyncStorage.setItem(
            getUserDataKey(user.email),
            JSON.stringify(updatedUser)
          );
        }
        closeModal();

        // Show success toast
        setShowSuccess(true);
      } else {
        Alert.alert("Error", response.error || "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Modal slide up animation
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <ScrollView style={styles.container}>
      {/* Success Toast */}
      {showSuccess && (
        <Animated.View style={[styles.successToast, { opacity: successFade }]}>
          <Icon name="check-circle" size={24} color="#fff" />
          <Text style={styles.successText}>Profile updated successfully</Text>
        </Animated.View>
      )}

      {/* Username */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => openModal("username")}
      >
        <Text style={styles.label}>Username</Text>
        <View style={styles.valueRow}>
          <Text style={styles.valueLink}>{user?.firstName}</Text>
          <Icon name="chevron-right" size={22} color="#bbb" />
        </View>
      </TouchableOpacity>

      {/* Profile Picture */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => openModal("profilePicture")}
      >
        <Text style={styles.label}>Profile Picture</Text>
        <View style={styles.valueRow}>
          {user?.profilePicture ? (
            <S3Image imageUrl={user.profilePicture} style={styles.avatar} />
          ) : (
            <Icon name="account" size={28} color="#bbb" />
          )}
          <Icon name="chevron-right" size={22} color="#bbb" />
        </View>
      </TouchableOpacity>

      {/* Height */}
      <TouchableOpacity style={styles.row} onPress={() => openModal("height")}>
        <Text style={styles.label}>Height</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {user?.height ? `${user.height} cm` : "-"}
          </Text>
          <Icon name="chevron-right" size={22} color="#bbb" />
        </View>
      </TouchableOpacity>

      {/* Weight */}
      <TouchableOpacity style={styles.row} onPress={() => openModal("weight")}>
        <Text style={styles.label}>Weight</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {user?.weight ? `${user.weight} kg` : "-"}
          </Text>
          <Icon name="chevron-right" size={22} color="#bbb" />
        </View>
      </TouchableOpacity>

      {/* Gender */}
      <TouchableOpacity style={styles.row} onPress={() => openModal("gender")}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{user?.gender || "-"}</Text>
          <Icon name="chevron-right" size={22} color="#bbb" />
        </View>
      </TouchableOpacity>

      {/* Date of Birth */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => openModal("dateOfBirth")}
      >
        <Text style={styles.label}>Date of Birth</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {user?.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString()
              : "-"}
          </Text>
          <Icon name="chevron-right" size={22} color="#bbb" />
        </View>
      </TouchableOpacity>

      {/* Email Address (not editable) */}
      <View style={styles.row}>
        <Text style={styles.label}>Email Address</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      {/* Modal for editing fields */}
      <Modal
        visible={
          modalVisible === "username" ||
          modalVisible === "height" ||
          modalVisible === "weight" ||
          modalVisible === "gender" ||
          modalVisible === "dateOfBirth" ||
          modalVisible === "profilePicture"
        }
        animationType="none"
        transparent
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[styles.modalContent, { transform: [{ translateY }] }]}
        >
          {modalVisible === "username" && (
            <>
              <Text style={styles.modalTitle}>Edit Username</Text>
              <TextInput
                style={styles.modalInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Enter your name"
                autoFocus
              />
            </>
          )}
          {modalVisible === "height" && (
            <>
              <Text style={styles.modalTitle}>Edit Height</Text>
              <TextInput
                style={styles.modalInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Enter your height in cm"
                keyboardType="numeric"
                autoFocus
              />
            </>
          )}
          {modalVisible === "weight" && (
            <>
              <Text style={styles.modalTitle}>Edit Weight</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Select your weight</Text>
                <Picker
                  selectedValue={weightValue}
                  onValueChange={(value) => setWeightValue(String(value))}
                  style={styles.weightPicker}
                >
                  {Array.from({ length: 171 }, (_, i) => {
                    const weight = i + 30; // Start from 30kg
                    return (
                      <Picker.Item
                        key={weight}
                        label={`${weight} kg`}
                        value={String(weight)}
                      />
                    );
                  })}
                </Picker>
              </View>
            </>
          )}
          {modalVisible === "gender" && (
            <>
              <Text style={styles.modalTitle}>Edit Gender</Text>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.genderOption}
                  onPress={() => setInputValue(option.value)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      inputValue === option.value && {
                        color: "#4285F4",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          {modalVisible === "dateOfBirth" && (
            <>
              <Text style={styles.modalTitle}>Edit Date of Birth</Text>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={dateValue || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => date && setDateValue(date)}
                  maximumDate={new Date()}
                />
              ) : (
                <DateTimePicker
                  value={dateValue || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, date) => date && setDateValue(date)}
                  maximumDate={new Date()}
                />
              )}
            </>
          )}
          {modalVisible === "profilePicture" && (
            <>
              <Text style={styles.modalTitle}>Edit Profile Picture</Text>

              {/* Current Profile Picture */}
              <View style={styles.currentPictureContainer}>
                <Text style={styles.currentPictureLabel}>Current Picture:</Text>
                {user?.profilePicture ? (
                  <S3Image
                    imageUrl={user.profilePicture}
                    style={styles.currentProfileImage}
                  />
                ) : (
                  <View style={styles.currentProfileImagePlaceholder}>
                    <Icon name="account" size={40} color="#666" />
                  </View>
                )}
              </View>

              <ImagePickerComponent
                uploadType="profile"
                currentImageUri={user?.profilePicture || undefined}
                autoUpload={true}
                showPreview={true}
                onImageUploaded={async (result: UploadResponse) => {
                  if (result.success && result.imageUrl) {
                    // Update user profile with new image URL
                    try {
                      const response = await userService.updateProfile({
                        profilePicture: result.imageUrl,
                      });

                      if (response.success && user) {
                        // Create updated user object with new profile picture
                        const updatedUser = {
                          ...user,
                          profilePicture: result.imageUrl,
                        };

                        // Update context state
                        setUser(updatedUser);

                        // Update AsyncStorage
                        await AsyncStorage.setItem(
                          getUserDataKey(user.email),
                          JSON.stringify(updatedUser)
                        );

                        // Show success toast and close modal
                        setShowSuccess(true);
                        closeModal();
                      } else {
                        Alert.alert(
                          "Error",
                          response.error || "Failed to update profile picture"
                        );
                      }
                    } catch (error) {
                      console.error("Error updating profile picture:", error);
                      Alert.alert("Error", "Failed to update profile picture");
                    }
                  } else {
                    Alert.alert(
                      "Error",
                      result.error || "Failed to upload image"
                    );
                  }
                }}
              />
            </>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeModal}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {modalVisible !== "profilePicture" && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: 16,
  },
  sectionHeader: {
    backgroundColor: "#f5f5f7",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 15,
    color: "#888",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: "#222",
  },
  value: {
    fontSize: 16,
    color: "#222",
    minWidth: 80,
    textAlign: "right",
  },
  valueLink: {
    fontSize: 16,
    color: "#4285F4",
    minWidth: 80,
    textAlign: "right",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  genderOption: {
    paddingVertical: 10,
  },
  genderText: {
    fontSize: 16,
    color: "#222",
  },
  successToast: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  currentPictureContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  currentPictureLabel: {
    fontSize: 16,
    color: "#222",
    marginRight: 8,
  },
  currentProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  currentProfileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#222",
    fontWeight: "600",
  },
  saveButton: {
    padding: 12,
    backgroundColor: "#000000",
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#999999",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pickerContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  weightPicker: {
    width: "100%",
    height: 150,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
  },
});
