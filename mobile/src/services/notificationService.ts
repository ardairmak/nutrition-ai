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

// Check if we're running in iOS simulator
const isIOSSimulator = () => {
  return Platform.OS === "ios" && __DEV__;
};

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
          }),
        });
      }

      // Log simulator status
      if (isIOSSimulator()) {
        console.log(
          "🔔 SIMULATOR MODE: Notifications have limitations in iOS simulator"
        );
        console.log("🔔 For full testing, please use a physical device");
      }
    } else {
      isNotificationModuleAvailable = false;
    }
  } catch (error) {
    console.error("Failed to initialize notification module:", error);
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

  // Simple notification scheduling - just works!
  async scheduleRepeatingNotification(
    options: RepeatingNotificationOptions
  ): Promise<void> {
    try {
      if (!this.isAvailable || !Notifications) {
        console.log("Notification service not available");
        return;
      }

      const { id, title, body, hour, minute } = options;

      // Simple: Calculate when to fire
      const now = new Date();
      const fireTime = new Date();
      fireTime.setHours(hour, minute, 0, 0);

      // If time passed today, schedule for tomorrow
      if (fireTime <= now) {
        fireTime.setDate(fireTime.getDate() + 1);
      }

      const secondsUntilFire = Math.floor(
        (fireTime.getTime() - now.getTime()) / 1000
      );

      console.log(`📅 Scheduling: ${title}`);
      console.log(`📅 Will fire at: ${fireTime.toLocaleString()}`);
      console.log(
        `📅 In ${secondsUntilFire} seconds (${Math.round(
          secondsUntilFire / 60
        )} minutes)`
      );

      // Simple schedule
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilFire,
        },
      });

      console.log(`✅ Scheduled successfully!`);
    } catch (error) {
      console.error("Error scheduling:", error);
    }
  }

  // Schedule smart daily meal reminder notifications
  async scheduleSmartDailyReminders(): Promise<void> {
    try {
      if (!this.isAvailable || !Notifications) return;

      const content = await this.generateSmartNotificationContent();

      // Helper to schedule a notification for demo
      const scheduleForDemo = async (
        hour: number,
        minute: number,
        title: string,
        body: string,
        type: string
      ) => {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hour, minute, 0, 0);

        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }

        const secondsFromNow = Math.floor(
          (targetTime.getTime() - now.getTime()) / 1000
        );

        await Notifications.scheduleNotificationAsync({
          content: { title, body, data: { type }, sound: true },
          trigger: { seconds: secondsFromNow },
        });

        console.log(
          `✅ ${type} scheduled for demo in ${Math.floor(
            secondsFromNow / 60
          )} minutes`
        );
      };

      // Schedule each notification
      await scheduleForDemo(
        8,
        0,
        content.morningTitle,
        content.morningBody,
        "morning_reminder"
      );
      await scheduleForDemo(
        14,
        0,
        "Afternoon check-in! 🌞",
        "How's your nutrition going today?",
        "afternoon_reminder"
      );
      await scheduleForDemo(
        20,
        0,
        content.eveningTitle,
        content.eveningBody,
        "evening_reminder"
      );

      console.log("✅ All demo notifications scheduled");
    } catch (error) {
      console.error("Error scheduling reminders:", error);
    }
  }

  // Schedule daily meal reminder notifications (legacy method)
  async scheduleDailyReminders(): Promise<void> {
    // Use the new smart scheduling
    await this.scheduleSmartDailyReminders();
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
      console.log("🗑️ All notifications canceled");
    } catch (error) {
      console.error("Error canceling notifications:", error);
    }
  }
}

export default NotificationService.getInstance();
