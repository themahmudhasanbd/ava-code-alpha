import { NativeModules, Platform } from "react-native";

const { AvaAgentModule } = NativeModules;

/**
 * Native Agent Service — bridges React Native ↔ Android native code.
 *
 * Provides access to:
 * - Foreground service control (keeps agent alive when backgrounded)
 * - Session state persistence for boot recovery
 * - Permission checking and battery optimization
 * - Debug logging
 *
 * All methods are no-ops on iOS/web.
 */

const isAndroid = Platform.OS === "android" && !!AvaAgentModule;

// ── Foreground Service ─────────────────────────────────────────────────────

/** Start the native foreground service with a pinned notification. */
export async function startForegroundService(params: {
  sessionId: string;
  modelName: string;
  currentAction: string;
  startTimeMs?: number;
}): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    return await AvaAgentModule.startForegroundService({
      ...params,
      startTimeMs: params.startTimeMs ?? Date.now(),
    });
  } catch (e) {
    console.warn("[NativeAgent] startForegroundService error:", e);
    return false;
  }
}

/** Update the foreground service notification with current action/tool. */
export async function updateForegroundService(params: {
  currentAction: string;
  toolName?: string;
}): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    return await AvaAgentModule.updateForegroundService(params);
  } catch (e) {
    console.warn("[NativeAgent] updateForegroundService error:", e);
    return false;
  }
}

/** Stop the foreground service and dismiss the notification. */
export async function stopForegroundService(params: {
  sessionId: string;
  isSuccess?: boolean;
}): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    return await AvaAgentModule.stopForegroundService({
      sessionId: params.sessionId,
      isSuccess: params.isSuccess ?? true,
    });
  } catch (e) {
    console.warn("[NativeAgent] stopForegroundService error:", e);
    return false;
  }
}

// ── Session State (Boot Recovery) ──────────────────────────────────────────

/** Save session active state for boot recovery. */
export async function saveSessionActive(sessionId: string, active: boolean): Promise<void> {
  if (!isAndroid) return;
  try {
    await AvaAgentModule.saveSessionActive(sessionId, active);
  } catch (e) {
    console.warn("[NativeAgent] saveSessionActive error:", e);
  }
}

/** Get the last session state (for boot restore). */
export async function getSessionState(): Promise<{
  wasActive: boolean;
  lastSessionId: string | null;
} | null> {
  if (!isAndroid) return null;
  try {
    return await AvaAgentModule.getSessionState();
  } catch (e) {
    console.warn("[NativeAgent] getSessionState error:", e);
    return null;
  }
}

// ── Permissions ────────────────────────────────────────────────────────────

/** Check system permissions (notifications, microphone, battery optimization). */
export async function checkPermissions(): Promise<{
  notifications: boolean;
  microphone: boolean;
  batteryOptimizationIgnored: boolean;
} | null> {
  if (!isAndroid) return null;
  try {
    return await AvaAgentModule.checkPermissions();
  } catch (e) {
    console.warn("[NativeAgent] checkPermissions error:", e);
    return null;
  }
}

/** Request battery optimization exemption. */
export async function requestIgnoreBatteryOptimizations(): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    return await AvaAgentModule.requestIgnoreBatteryOptimizations();
  } catch (e) {
    console.warn("[NativeAgent] requestIgnoreBatteryOptimizations error:", e);
    return false;
  }
}

/** Open the app's system settings page. */
export async function openAppSettings(): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    return await AvaAgentModule.openAppSettings();
  } catch (e) {
    console.warn("[NativeAgent] openAppSettings error:", e);
    return false;
  }
}

// ── Debug Logging ──────────────────────────────────────────────────────────

/** Get the native debug log contents. */
export async function getDebugLog(): Promise<string> {
  if (!isAndroid) return "(Debug log only available on Android)";
  try {
    return await AvaAgentModule.getDebugLog();
  } catch (e) {
    return `Failed to read debug log: ${e}`;
  }
}

/** Clear the native debug log. */
export async function clearDebugLog(): Promise<void> {
  if (!isAndroid) return;
  try {
    await AvaAgentModule.clearDebugLog();
  } catch (e) {
    console.warn("[NativeAgent] clearDebugLog error:", e);
  }
}

/** Save the server URL for native error reporting. */
export async function saveServerUrl(url: string): Promise<void> {
  if (!isAndroid) return;
  try {
    await AvaAgentModule.saveServerUrl(url);
  } catch (e) {
    console.warn("[NativeAgent] saveServerUrl error:", e);
  }
}