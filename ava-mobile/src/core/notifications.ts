import { Platform } from "react-native";
import { storage } from "./storage";

const FCM_TOKEN_KEY = "ava.fcm_token";

/**
 * Configure notification channels and request permission if supported.
 */
export async function initPushNotifications(): Promise<string | null> {
  try {
    // In Expo Go or standalone mode, lazy load to prevent crash if native module isn't loaded
    const Notifications = await import("expo-notifications").catch(() => null);
    if (!Notifications || typeof Notifications.getPermissionsAsync !== "function") {
      return null;
    }

    if (Platform.OS === "android" && typeof Notifications.setNotificationChannelAsync === "function") {
      try {
        await Notifications.setNotificationChannelAsync("ava-turns", {
          name: "AvA Agent Tasks",
          description: "Notifications for completed AvA agent turns and commands",
          importance: Notifications.AndroidImportance?.HIGH ?? 4,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3B82F6",
          sound: "default",
        });
      } catch {}
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted" && typeof Notifications.requestPermissionsAsync === "function") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    return null;
  } catch (err) {
    console.warn("[Notifications] initPushNotifications error:", err);
    return null;
  }
}

/**
 * Send an immediate local notification when a background turn completes.
 */
export async function notifyTurnComplete(
  sessionId: string,
  title = "Task Complete",
  summary = "The agent finished running your task."
) {
  try {
    const Notifications = await import("expo-notifications").catch(() => null);
    if (Notifications && typeof Notifications.scheduleNotificationAsync === "function") {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `AvA: ${title}`,
          body: summary.slice(0, 120),
          data: { sessionId },
          sound: true,
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.warn("[Notifications] notifyTurnComplete error:", err);
  }
}

/**
 * Get saved FCM / device push token
 */
export function getSavedPushToken(): string | null {
  return storage.get(FCM_TOKEN_KEY);
}
