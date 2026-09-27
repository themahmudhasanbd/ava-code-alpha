package com.avacode.mobile

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * AvaAgentModule
 *
 * React Native native module that bridges JavaScript ↔ Android native code.
 * Provides access to:
 * - Foreground service control (start/update/stop)
 * - Session state persistence for boot recovery
 * - Permission checking and requesting
 * - Battery optimization exemption
 * - Debug logging
 */
@ReactModule(name = AvaAgentModule.NAME)
class AvaAgentModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AvaAgentModule"
        private const val PREFS_NAME = "ava_native_prefs"
        private const val PERMISSION_REQUEST_CODE = 4096
    }

    override fun getName(): String = NAME

    // ── Foreground Service ────────────────────────────────────────────────────

    @ReactMethod
    fun startForegroundService(params: ReadableMap, promise: Promise) {
        try {
            val sessionId = params.getString("sessionId") ?: ""
            val modelName = params.getString("modelName") ?: "AvA Agent"
            val currentAction = params.getString("currentAction") ?: "Starting..."
            val startTimeMs = if (params.hasKey("startTimeMs")) params.getDouble("startTimeMs").toLong() else System.currentTimeMillis()

            val intent = AvaAgentForegroundService.startIntent(
                reactContext, sessionId, modelName, currentAction, startTimeMs
            )
            startForegroundServiceCompat(intent)

            saveSessionActive(sessionId, true)

            AvaNotificationDebugLogger.log(reactContext, "NativeModule: startForegroundService session=$sessionId")
            promise.resolve(true)
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(reactContext, "startForegroundService error", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateForegroundService(params: ReadableMap, promise: Promise) {
        try {
            val currentAction = params.getString("currentAction") ?: ""
            val toolName = if (params.hasKey("toolName")) params.getString("toolName") else null

            val intent = AvaAgentForegroundService.updateIntent(reactContext, currentAction, toolName)
            startForegroundServiceCompat(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(reactContext, "updateForegroundService error", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopForegroundService(params: ReadableMap, promise: Promise) {
        try {
            val sessionId = params.getString("sessionId") ?: ""
            val isSuccess = if (params.hasKey("isSuccess")) params.getBoolean("isSuccess") else true

            reactContext.startService(AvaAgentForegroundService.stopIntent(reactContext))
            saveSessionActive(sessionId, false)

            AvaNotificationDebugLogger.log(reactContext, "NativeModule: stopForegroundService session=$sessionId")
            promise.resolve(true)
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(reactContext, "stopForegroundService error", e)
            promise.reject("ERROR", e.message)
        }
    }

    // ── Session State Persistence ─────────────────────────────────────────────

    @ReactMethod
    fun saveSessionActive(sessionId: String, active: Boolean) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("session_was_active", active)
                .putString("last_session_id", sessionId)
                .apply()
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(reactContext, "saveSessionActive error", e)
        }
    }

    @ReactMethod
    fun getSessionState(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val result = Arguments.createMap()
            result.putBoolean("wasActive", prefs.getBoolean("session_was_active", false))
            result.putString("lastSessionId", prefs.getString("last_session_id", null))
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val hasNotifications = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(reactContext, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else true

            val hasMicrophone = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

            val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isBatteryOptIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
                powerManager.isIgnoringBatteryOptimization(reactContext.packageName)
            } else true

            val result = Arguments.createMap()
            result.putBoolean("notifications", hasNotifications)
            result.putBoolean("microphone", hasMicrophone)
            result.putBoolean("batteryOptimizationIgnored", isBatteryOptIgnored)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                if (powerManager != null && !powerManager.isIgnoringBatteryOptimization(reactContext.packageName)) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${reactContext.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openAppSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // ── Debug Log ─────────────────────────────────────────────────────────────

    @ReactMethod
    fun getDebugLog(promise: Promise) {
        try {
            val log = AvaNotificationDebugLogger.readLog(reactContext)
            promise.resolve(log)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearDebugLog(promise: Promise) {
        try {
            AvaNotificationDebugLogger.clearLog(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // ── Server URL ────────────────────────────────────────────────────────────

    @ReactMethod
    fun saveServerUrl(url: String) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString("server_url", url).apply()
            AvaNotificationDebugLogger.log(reactContext, "Server URL saved: $url")
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(reactContext, "saveServerUrl error", e)
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun startForegroundServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }
}