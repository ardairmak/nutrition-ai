// Notification Service for Food Recognition App
// This service handles local notifications for meal reminders

import { Platform } from "react-native";
import mealTrackingService from "./mealTrackingService";

// Interface for scheduling repeating notifications
interface RepeatingNotificationOptions {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekdaysOnly?: boolean;
  weekly?: boolean;
}

// Import expo-notifications with error handling
let Notifications: any = null;
let isNotificationModuleAvailable = false;

// Initialize notification module
const initializeNotificationModule = () => {
  try {
    Notifications = require("expo-notifications");

    // Verify the module has the required methods
    if (
      Notifications &&
      typeof Notifications.getPermissionsAsync === "function" &&
      typeof Notifications.requestPermissionsAsync === "function" &&
      typeof Notifications.scheduleNotificationAsync === "function"
    ) {
      isNotificationModuleAvailable = true;

      // Configure notification handler
      if (Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    } else {
      isNotificationModuleAvailable = false;
    }
  } catch (error) {
    isNotificationModuleAvailable = false;
    Notifications = null;
  }
};

// Initialize the module
initializeNotificationModule();

export class NotificationService {
  private static instance: NotificationService;
  private isAvailable: boolean = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.isAvailable = isNotificationModuleAvailable && Notifications !== null;
  }

  // Initialize notification permissions and setup
  async initialize(): Promise<boolean> {
    try {
      if (!this.isAvailable || !Notifications) {
        return false;
      }

      // Check if we're in a simulator (notifications don't work well in iOS simulator)
      if (Platform.OS === "ios" && __DEV__) {
        // Don't return false here, let's try anyway
      }

      // Check if required methods exist
      if (
        !Notifications.getPermissionsAsync ||
        !Notifications.requestPermissionsAsync
      ) {
        return false;
      }

      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return false;
      }

      // Configure notification channel for Android
      if (
        Platform.OS === "android" &&
        Notifications.setNotificationChannelAsync
      ) {
        await Notifications.setNotificationChannelAsync("meal-reminders", {
          name: "Meal Reminders",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4285F4",
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate smart notification content based on user activity
  async generateSmartNotificationContent(): Promise<{
    morningTitle: string;
    morningBody: string;
    eveningTitle: string;
    eveningBody: string;
  }> {
    try {
      const [hasLoggedToday, streak, mealCount, hoursSinceLastMeal] =
        await Promise.all([
          mealTrackingService.hasLoggedMealsToday(),
          mealTrackingService.getUserStreak(),
          mealTrackingService.getTodayMealCount(),
          mealTrackingService.getHoursSinceLastMeal(),
        ]);

      // Morning notification (always encouraging)
      const morningTitle = "Good morning! 🌅";
      let morningBody = "Ready to track your nutrition today?";

      if (streak > 0) {
        morningBody = `Day ${
          streak + 1
        } of your streak! Let's keep it going! 🔥`;
      }

      // Evening notification (smart based on activity)
      let eveningTitle = "Don't forget your meals! 🍽️";
      let eveningBody = "Log your food to keep your nutrition streak going!";

      if (hasLoggedToday) {
        if (mealCount >= 3) {
          eveningTitle = "Great job today! 🎉";
          eveningBody = `You logged ${mealCount} meals today. Keep up the excellent work!`;
        } else {
          eveningTitle = "Good progress! 👍";
          eveningBody = `${mealCount} meals logged. Consider adding any snacks or drinks!`;
        }
      } else {
        // No meals logged today
        if (streak >= 3) {
          eveningTitle = `Don't break your ${streak}-day streak! 🔥`;
          eveningBody = "Quick meal log to keep your amazing streak alive!";
        } else if (hoursSinceLastMeal >= 8) {
          eveningTitle = "Time to log your meals! ⏰";
          eveningBody =
            "It's been a while since your last entry. How was your day?";
        }
      }

      return {
        morningTitle,
        morningBody,
        eveningTitle,
        eveningBody,
      };
    } catch (error) {
      // Fallback to default messages
      return {
        morningTitle: "Good morning! 🌅",
        morningBody: "Ready to track your nutrition today?",
        eveningTitle: "Don't forget your meals! 🍽️",
        eveningBody: "Log your food to keep your nutrition streak going!",
      };
    }
  }

  // Schedule smart daily meal reminder notifications
  async scheduleSmartDailyReminders(): Promise<void> {
    try {
      if (!this.isAvailable || !Notifications) {
        return;
      }

      // Cancel existing notifications first
      await this.cancelAllNotifications();

      // Get smart notification content
      const content = await this.generateSmartNotificationContent();

      // Check if SchedulableTriggerInputTypes is available
      const triggerType =
        Notifications.SchedulableTriggerInputTypes?.CALENDAR || "calendar";

      // Morning reminder (8 AM) - Always encouraging
      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.morningTitle,
          body: content.morningBody,
          data: { type: "morning_reminder" },
        },
        trigger: {
          type: triggerType,
          hour: 8,
          minute: 0,
          repeats: true,
        },
      });

      // Afternoon check-in (2 PM) - Gentle reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Afternoon check-in! 🌞",
          body: "How's your nutrition going today?",
          data: { type: "afternoon_reminder" },
        },
        trigger: {
          type: triggerType,
          hour: 14,
          minute: 0,
          repeats: true,
        },
      });

      // Evening reminder (8 PM) - Smart based on activity
      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.eveningTitle,
          body: content.eveningBody,
          data: { type: "evening_reminder" },
        },
        trigger: {
          type: triggerType,
          hour: 20,
          minute: 0,
          repeats: true,
        },
      });
    } catch (error) {}
  }

  // Schedule a repeating notification with custom options
  async scheduleRepeatingNotification(
    options: RepeatingNotificationOptions
  ): Promise<void> {
    try {
      if (!this.isAvailable || !Notifications) {
        return;
      }

      const {
        id,
        title,
        body,
        hour,
        minute,
        weekdaysOnly = false,
        weekly = false,
      } = options;

      // Check if SchedulableTriggerInputTypes is available
      const triggerType =
        Notifications.SchedulableTriggerInputTypes?.CALENDAR || "calendar";

      if (weekly) {
        // Schedule weekly notification (every Monday by default)
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title,
            body,
            data: { type: "custom_reminder", id },
          },
          trigger: {
            type: triggerType,
            weekday: 2, // Monday (1 = Sunday, 2 = Monday, etc.)
            hour,
            minute,
            repeats: true,
          },
        });
      } else if (weekdaysOnly) {
        // Schedule for weekdays only (Monday to Friday)
        for (let weekday = 2; weekday <= 6; weekday++) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${id}-${weekday}`,
            content: {
              title,
              body,
              data: { type: "custom_reminder", id },
            },
            trigger: {
              type: triggerType,
              weekday,
              hour,
              minute,
              repeats: true,
            },
          });
        }
      } else {
        // Schedule daily notification
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title,
            body,
            data: { type: "custom_reminder", id },
          },
          trigger: {
            type: triggerType,
            hour,
            minute,
            repeats: true,
          },
        });
      }
    } catch (error) {
      // Silently handle errors
    }
  }

  // Schedule daily meal reminder notifications (legacy method)
  async scheduleDailyReminders(): Promise<void> {
    // Use the new smart scheduling
    await this.scheduleSmartDailyReminders();
  }

  // Send immediate notification (for testing)
  async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      if (!this.isAvailable || !Notifications) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: "immediate_test" },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {}
  }

  // Test smart notifications (for development)
  async testSmartNotifications(): Promise<void> {
    try {
      const content = await this.generateSmartNotificationContent();

      // Send test notifications with 5-second delays
      setTimeout(() => {
        this.sendImmediateNotification(
          content.morningTitle,
          content.morningBody
        );
      }, 2000);

      setTimeout(() => {
        this.sendImmediateNotification(
          content.eveningTitle,
          content.eveningBody
        );
      }, 5000);
    } catch (error) {}
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      if (
        !this.isAvailable ||
        !Notifications ||
        !Notifications.cancelAllScheduledNotificationsAsync
      ) {
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {}
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      if (
        !this.isAvailable ||
        !Notifications ||
        !Notifications.getPermissionsAsync
      ) {
        return false;
      }

      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch (error) {
      return false;
    }
  }

  // Get all scheduled notifications (for debugging)
  async getScheduledNotifications(): Promise<any[]> {
    try {
      if (
        !this.isAvailable ||
        !Notifications ||
        !Notifications.getAllScheduledNotificationsAsync
      ) {
        return [];
      }

      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      return [];
    }
  }
}

export default NotificationService.getInstance();
