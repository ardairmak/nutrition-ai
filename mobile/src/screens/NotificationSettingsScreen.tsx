import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import notificationService from "../services/notificationService";
import userService from "../services/userService";
import * as Notifications from "expo-notifications";

interface NotificationTime {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

interface NotificationSettings {
  mealReminders: {
    enabled: boolean;
    times: NotificationTime[];
    weekdaysOnly: boolean;
  };
  waterReminders: {
    enabled: boolean;
    interval: number; // hours
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };
    weekdaysOnly: boolean;
  };
  weighInReminders: {
    enabled: boolean;
    time: { hour: number; minute: number };
    frequency: "daily" | "weekly" | "custom";
    weekdaysOnly: boolean;
  };
  streakReminders: {
    enabled: boolean;
    time: { hour: number; minute: number };
    onlyWhenMissing: boolean;
  };
  motivationalMessages: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "custom";
  };
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{
    visible: boolean;
    type: string;
    index?: number;
  }>({ visible: false, type: "" });
  const [tempTime, setTempTime] = useState(new Date());
  const slideAnim = useState(new Animated.Value(300))[0]; // Start below screen

  const [settings, setSettings] = useState<NotificationSettings>({
    mealReminders: {
      enabled: true,
      times: [
        { id: "1", hour: 8, minute: 0, enabled: true },
        { id: "2", hour: 13, minute: 0, enabled: true },
        { id: "3", hour: 19, minute: 0, enabled: true },
      ],
      weekdaysOnly: false,
    },
    waterReminders: {
      enabled: false,
      interval: 2,
      startTime: { hour: 8, minute: 0 },
      endTime: { hour: 22, minute: 0 },
      weekdaysOnly: false,
    },
    weighInReminders: {
      enabled: false,
      time: { hour: 7, minute: 0 },
      frequency: "weekly",
      weekdaysOnly: false,
    },
    streakReminders: {
      enabled: true,
      time: { hour: 21, minute: 0 },
      onlyWhenMissing: true,
    },
    motivationalMessages: {
      enabled: true,
      frequency: "daily",
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await userService.getNotificationSettings();

      if (response.success && response.settings) {
        setSettings(response.settings);
        console.log("Loaded notification settings:", response.settings);
      } else {
        console.warn("Failed to load notification settings, using defaults");
        // Keep default settings if loading fails
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
      // Keep default settings if loading fails
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // First save settings to the backend
      const response = await userService.updateNotificationSettings(settings);

      if (!response.success) {
        Alert.alert("Error", "Failed to save notification settings to server");
        return;
      }

      // IMPORTANT: Cancel all existing notifications before rescheduling
      // This prevents duplicate notifications
      console.log("🗑️ Canceling all existing notifications...");
      await notificationService.cancelAllNotifications();

      // Wait a bit to ensure cancellation completes
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("🔔 Starting to schedule NEW notifications...");

      // Schedule new notifications based on settings
      if (settings.mealReminders.enabled) {
        console.log("🍽️ Scheduling meal reminders...");
        await scheduleMealReminders();
      }

      if (settings.waterReminders.enabled) {
        console.log("💧 Scheduling water reminders...");
        await scheduleWaterReminders();
      }

      if (settings.weighInReminders.enabled) {
        console.log("⚖️ Scheduling weigh-in reminders...");
        await scheduleWeighInReminders();
      }

      if (settings.streakReminders.enabled) {
        console.log("🔥 Scheduling streak reminders...");
        await scheduleStreakReminders();
      }

      if (settings.motivationalMessages.enabled) {
        console.log("💪 Scheduling motivational messages...");
        await scheduleMotivationalMessages();
      }

      console.log("✅ All notifications scheduled successfully!");
      Alert.alert("Success", "Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save notification settings");
    } finally {
      setLoading(false);
    }
  };

  const scheduleMealReminders = async () => {
    console.log("🍽️ Starting to schedule meal reminders...");
    console.log("🍽️ Meal reminder settings:", settings.mealReminders);

    for (const time of settings.mealReminders.times) {
      if (time.enabled) {
        console.log(
          `🍽️ Scheduling meal reminder for ${time.hour}:${time.minute} with ID: meal-${time.id}`
        );

        try {
          await notificationService.scheduleRepeatingNotification({
            id: `meal-${time.id}`,
            title: "Meal Reminder 🍽️",
            body: "Time to log your meal and stay on track!",
            hour: time.hour,
            minute: time.minute,
            weekdaysOnly: settings.mealReminders.weekdaysOnly,
          });
          console.log(
            `✅ Successfully scheduled meal reminder: meal-${time.id}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to schedule meal reminder: meal-${time.id}`,
            error
          );
        }

        // Small delay between scheduling individual meal reminders
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    console.log("🍽️ Finished scheduling all meal reminders");
  };

  const scheduleWaterReminders = async () => {
    const { startTime, endTime, interval } = settings.waterReminders;
    let currentHour = startTime.hour;
    let reminderCount = 0;

    while (currentHour <= endTime.hour && reminderCount < 10) {
      await notificationService.scheduleRepeatingNotification({
        id: `water-${reminderCount}`,
        title: "Hydration Reminder 💧",
        body: "Don't forget to drink water! Stay hydrated.",
        hour: currentHour,
        minute: startTime.minute,
        weekdaysOnly: settings.waterReminders.weekdaysOnly,
      });

      currentHour += interval;
      reminderCount++;
    }
  };

  const scheduleWeighInReminders = async () => {
    const { time, frequency } = settings.weighInReminders;

    await notificationService.scheduleRepeatingNotification({
      id: "weigh-in",
      title: "Weigh-In Reminder ⚖️",
      body: "Time for your weekly weigh-in! Track your progress.",
      hour: time.hour,
      minute: time.minute,
      weekdaysOnly: settings.weighInReminders.weekdaysOnly,
      weekly: frequency === "weekly",
    });
  };

  const scheduleStreakReminders = async () => {
    const { time } = settings.streakReminders;

    await notificationService.scheduleRepeatingNotification({
      id: "streak-reminder",
      title: "Don't Break Your Streak! 🔥",
      body: "Keep your nutrition logging streak alive!",
      hour: time.hour,
      minute: time.minute,
      weekdaysOnly: false,
    });
  };

  const scheduleMotivationalMessages = async () => {
    // Use a sensible default time (9:00 AM) but calculate it properly
    await notificationService.scheduleRepeatingNotification({
      id: "motivation",
      title: "You've Got This! 💪",
      body: "Keep up the great work on your health journey!",
      hour: 9,
      minute: 0,
      weekdaysOnly: false,
    });
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      // On Android, handle immediate selection
      setShowTimePicker({ visible: false, type: "" });

      if (event.type === "set" && selectedDate) {
        applyTimeChange(selectedDate);
      }
    } else if (selectedDate) {
      // On iOS, just update temp time - user will confirm later
      setTempTime(selectedDate);
    }
  };

  const applyTimeChange = (selectedDate: Date) => {
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();

    if (
      showTimePicker.type.startsWith("meal-") &&
      showTimePicker.index !== undefined
    ) {
      const timeId = settings.mealReminders.times[showTimePicker.index].id;
      updateMealTime(timeId, hour, minute);
    } else if (showTimePicker.type === "water-start") {
      setSettings((prev) => ({
        ...prev,
        waterReminders: {
          ...prev.waterReminders,
          startTime: { hour, minute },
        },
      }));
    } else if (showTimePicker.type === "water-end") {
      setSettings((prev) => ({
        ...prev,
        waterReminders: {
          ...prev.waterReminders,
          endTime: { hour, minute },
        },
      }));
    } else if (showTimePicker.type === "weigh-in") {
      setSettings((prev) => ({
        ...prev,
        weighInReminders: {
          ...prev.weighInReminders,
          time: { hour, minute },
        },
      }));
    } else if (showTimePicker.type === "streak") {
      setSettings((prev) => ({
        ...prev,
        streakReminders: {
          ...prev.streakReminders,
          time: { hour, minute },
        },
      }));
    }
  };

  const openTimePicker = (type: string, index?: number) => {
    // Set initial time based on current setting
    let initialTime = new Date();

    if (type.startsWith("meal-") && index !== undefined) {
      const mealTime = settings.mealReminders.times[index];
      initialTime.setHours(mealTime.hour, mealTime.minute, 0, 0);
    } else if (type === "water-start") {
      initialTime.setHours(
        settings.waterReminders.startTime.hour,
        settings.waterReminders.startTime.minute,
        0,
        0
      );
    } else if (type === "water-end") {
      initialTime.setHours(
        settings.waterReminders.endTime.hour,
        settings.waterReminders.endTime.minute,
        0,
        0
      );
    } else if (type === "weigh-in") {
      initialTime.setHours(
        settings.weighInReminders.time.hour,
        settings.weighInReminders.time.minute,
        0,
        0
      );
    } else if (type === "streak") {
      initialTime.setHours(
        settings.streakReminders.time.hour,
        settings.streakReminders.time.minute,
        0,
        0
      );
    }

    setTempTime(initialTime);

    // Reset animation position and show modal
    slideAnim.setValue(300); // Start from bottom
    setShowTimePicker({ visible: true, type, index });

    // Animate modal in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const confirmTimeChange = () => {
    applyTimeChange(tempTime);
    setShowTimePicker({ visible: false, type: "" }); // Close immediately on confirm
  };

  const cancelTimeChange = () => {
    setShowTimePicker({ visible: false, type: "" }); // Close immediately on cancel
  };

  const closeModal = () => {
    // This function is no longer needed, but keeping for potential future use
    setShowTimePicker({ visible: false, type: "" });
  };

  const addMealTime = () => {
    const newTime: NotificationTime = {
      id: Date.now().toString(),
      hour: 12,
      minute: 0,
      enabled: true,
    };

    setSettings((prev) => ({
      ...prev,
      mealReminders: {
        ...prev.mealReminders,
        times: [...prev.mealReminders.times, newTime],
      },
    }));
  };

  const removeMealTime = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      mealReminders: {
        ...prev.mealReminders,
        times: prev.mealReminders.times.filter((time) => time.id !== id),
      },
    }));
  };

  const updateMealTime = (id: string, hour: number, minute: number) => {
    setSettings((prev) => ({
      ...prev,
      mealReminders: {
        ...prev.mealReminders,
        times: prev.mealReminders.times.map((time) =>
          time.id === id ? { ...time, hour, minute } : time
        ),
      },
    }));
  };

  const toggleMealTimeEnabled = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      mealReminders: {
        ...prev.mealReminders,
        times: prev.mealReminders.times.map((time) =>
          time.id === id ? { ...time, enabled: !time.enabled } : time
        ),
      },
    }));
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity onPress={saveSettings} disabled={loading}>
          <Text
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          >
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meal Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="food-variant" size={24} color="#000" />
              <Text style={styles.sectionTitle}>Meal Reminders</Text>
            </View>
            <Switch
              value={settings.mealReminders.enabled}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  mealReminders: { ...prev.mealReminders, enabled: value },
                }))
              }
            />
          </View>

          {settings.mealReminders.enabled && (
            <>
              <Text style={styles.sectionDescription}>
                Get reminded to log your meals at specific times
              </Text>

              {settings.mealReminders.times.map((time, index) => (
                <View key={time.id} style={styles.timeItem}>
                  <Switch
                    value={time.enabled}
                    onValueChange={() => toggleMealTimeEnabled(time.id)}
                  />
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker(`meal-${time.id}`, index)}
                  >
                    <Text style={styles.timeText}>
                      {formatTime(time.hour, time.minute)}
                    </Text>
                  </TouchableOpacity>
                  {settings.mealReminders.times.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeMealTime(time.id)}
                      style={styles.removeButton}
                    >
                      <Icon name="close" size={20} color="#FF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={addMealTime}>
                <Icon name="plus" size={20} color="#000" />
                <Text style={styles.addButtonText}>Add Meal Time</Text>
              </TouchableOpacity>

              <View style={styles.optionRow}>
                <Text style={styles.optionText}>Weekdays only</Text>
                <Switch
                  value={settings.mealReminders.weekdaysOnly}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      mealReminders: {
                        ...prev.mealReminders,
                        weekdaysOnly: value,
                      },
                    }))
                  }
                />
              </View>
            </>
          )}
        </View>

        {/* Water Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="water" size={24} color="#000" />
              <Text style={styles.sectionTitle}>Water Reminders</Text>
            </View>
            <Switch
              value={settings.waterReminders.enabled}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  waterReminders: { ...prev.waterReminders, enabled: value },
                }))
              }
            />
          </View>

          {settings.waterReminders.enabled && (
            <>
              <Text style={styles.sectionDescription}>
                Stay hydrated with regular water reminders
              </Text>

              <View style={styles.waterSettings}>
                <View style={styles.waterRow}>
                  <Text style={styles.waterLabel}>Every</Text>
                  <View style={styles.intervalContainer}>
                    {[1, 2, 3, 4].map((hours) => (
                      <TouchableOpacity
                        key={hours}
                        style={[
                          styles.intervalButton,
                          settings.waterReminders.interval === hours &&
                            styles.intervalButtonActive,
                        ]}
                        onPress={() =>
                          setSettings((prev) => ({
                            ...prev,
                            waterReminders: {
                              ...prev.waterReminders,
                              interval: hours,
                            },
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.intervalText,
                            settings.waterReminders.interval === hours &&
                              styles.intervalTextActive,
                          ]}
                        >
                          {hours}h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.timeRangeRow}>
                  <Text style={styles.waterLabel}>From</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker("water-start")}
                  >
                    <Text style={styles.timeText}>
                      {formatTime(
                        settings.waterReminders.startTime.hour,
                        settings.waterReminders.startTime.minute
                      )}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.waterLabel}>to</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker("water-end")}
                  >
                    <Text style={styles.timeText}>
                      {formatTime(
                        settings.waterReminders.endTime.hour,
                        settings.waterReminders.endTime.minute
                      )}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Weigh-In Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="scale-bathroom" size={24} color="#000" />
              <Text style={styles.sectionTitle}>Weigh-In Reminders</Text>
            </View>
            <Switch
              value={settings.weighInReminders.enabled}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  weighInReminders: {
                    ...prev.weighInReminders,
                    enabled: value,
                  },
                }))
              }
            />
          </View>

          {settings.weighInReminders.enabled && (
            <>
              <Text style={styles.sectionDescription}>
                Regular reminders to track your weight progress
              </Text>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => openTimePicker("weigh-in")}
              >
                <Text style={styles.timeText}>
                  {formatTime(
                    settings.weighInReminders.time.hour,
                    settings.weighInReminders.time.minute
                  )}
                </Text>
              </TouchableOpacity>

              <View style={styles.frequencyContainer}>
                {(["daily", "weekly"] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      settings.weighInReminders.frequency === freq &&
                        styles.frequencyButtonActive,
                    ]}
                    onPress={() =>
                      setSettings((prev) => ({
                        ...prev,
                        weighInReminders: {
                          ...prev.weighInReminders,
                          frequency: freq,
                        },
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.frequencyText,
                        settings.weighInReminders.frequency === freq &&
                          styles.frequencyTextActive,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Streak Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="fire" size={24} color="#000" />
              <Text style={styles.sectionTitle}>Streak Reminders</Text>
            </View>
            <Switch
              value={settings.streakReminders.enabled}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  streakReminders: { ...prev.streakReminders, enabled: value },
                }))
              }
            />
          </View>

          {settings.streakReminders.enabled && (
            <>
              <Text style={styles.sectionDescription}>
                Smart reminders to maintain your logging streak
              </Text>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => openTimePicker("streak")}
              >
                <Text style={styles.timeText}>
                  {formatTime(
                    settings.streakReminders.time.hour,
                    settings.streakReminders.time.minute
                  )}
                </Text>
              </TouchableOpacity>

              <View style={styles.optionRow}>
                <Text style={styles.optionText}>
                  Only when meals not logged
                </Text>
                <Switch
                  value={settings.streakReminders.onlyWhenMissing}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      streakReminders: {
                        ...prev.streakReminders,
                        onlyWhenMissing: value,
                      },
                    }))
                  }
                />
              </View>
            </>
          )}
        </View>

        {/* Motivational Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="heart" size={24} color="#000" />
              <Text style={styles.sectionTitle}>Motivational Messages</Text>
            </View>
            <Switch
              value={settings.motivationalMessages.enabled}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  motivationalMessages: {
                    ...prev.motivationalMessages,
                    enabled: value,
                  },
                }))
              }
            />
          </View>

          {settings.motivationalMessages.enabled && (
            <>
              <Text style={styles.sectionDescription}>
                Encouraging messages to keep you motivated
              </Text>

              <View style={styles.frequencyContainer}>
                {(["daily", "weekly"] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      settings.motivationalMessages.frequency === freq &&
                        styles.frequencyButtonActive,
                    ]}
                    onPress={() =>
                      setSettings((prev) => ({
                        ...prev,
                        motivationalMessages: {
                          ...prev.motivationalMessages,
                          frequency: freq,
                        },
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.frequencyText,
                        settings.motivationalMessages.frequency === freq &&
                          styles.frequencyTextActive,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Improved Time Picker Modal */}
      <Modal
        visible={showTimePicker.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelTimeChange}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
            </View>

            <View style={styles.timePickerContainer}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
                style={styles.timePicker}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelTimeChange}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmTimeChange}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  saveButtonDisabled: {
    color: "#CCCCCC",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
    lineHeight: 20,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  timeButton: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    textAlign: "center",
  },
  removeButton: {
    marginLeft: 12,
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    marginLeft: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  optionText: {
    fontSize: 16,
    color: "#000000",
  },
  waterSettings: {
    marginTop: 8,
  },
  waterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  waterLabel: {
    fontSize: 16,
    color: "#000000",
    marginRight: 12,
  },
  intervalContainer: {
    flexDirection: "row",
    flex: 1,
  },
  intervalButton: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  intervalButtonActive: {
    backgroundColor: "#000000",
  },
  intervalText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  intervalTextActive: {
    color: "#FFFFFF",
  },
  timeRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  frequencyContainer: {
    flexDirection: "row",
    marginTop: 16,
  },
  frequencyButton: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  frequencyButtonActive: {
    backgroundColor: "#000000",
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  frequencyTextActive: {
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    width: "80%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  timePickerContainer: {
    marginBottom: 16,
  },
  timePicker: {
    width: "100%",
    height: 200,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#CCCCCC",
  },
  confirmButton: {
    backgroundColor: "#000000",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
