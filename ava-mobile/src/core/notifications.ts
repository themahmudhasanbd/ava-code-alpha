import { Platform } from "react-native";
import { storage } from "./storage";
import * as NativeAgent from "./native-agent";

const FCM_TOKEN_KEY = "ava.fcm_token";

/**
 * Configure notification channels and request permission if supported.
 */
export async function initPushNotifications(): Promise<string | null> {
  try {
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

        // Ongoing channel for foreground service (silent, low importance)
        await Notifications.setNotificationChannelAsync("ava_ongoing_turn_channel", {
          name: "AvA Live Agent Execution",
          description: "Ongoing notification during agent turns",
          importance: Notifications.AndroidImportance?.LOW ?? 2,
          vibrationPattern: [0, 0, 0, 0],
          sound: undefined,
          enableLights: false,
          enableVibrate: false,
          showBadge: false,
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

// ── Native Foreground Service Integration ──────────────────────────────────

/**
 * Start the native foreground service to keep the agent alive when backgrounded.
 * Shows a pinned notification with live chronometer.
 */
export async function startAgentForeground(params: {
  sessionId: string;
  modelName?: string;
  currentAction?: string;
}): Promise<void> {
  await NativeAgent.startForegroundService({
    sessionId: params.sessionId,
    modelName: params.modelName ?? "AvA Agent",
    currentAction: params.currentAction ?? "Processing...",
  });
  await NativeAgent.saveSessionActive(params.sessionId, true);
}

/**
 * Update the foreground service notification with current action/tool.
 */
export async function updateAgentForeground(params: {
  currentAction: string;
  toolName?: string;
}): Promise<void> {
  await NativeAgent.updateForegroundService(params);
}

/**
 * Stop the foreground service when the turn completes.
 */
export async function stopAgentForeground(params: {
  sessionId: string;
  isSuccess?: boolean;
}): Promise<void> {
  await NativeAgent.stopForegroundService({
    sessionId: params.sessionId,
    isSuccess: params.isSuccess ?? true,
  });
  await NativeAgent.saveSessionActive(params.sessionId, false);
}

/**
 * Check if a session was active before device reboot (for boot recovery).
 */
export async function checkBootRecovery(): Promise<{
  wasActive: boolean;
  lastSessionId: string | null;
} | null> {
  return NativeAgent.getSessionState();
}