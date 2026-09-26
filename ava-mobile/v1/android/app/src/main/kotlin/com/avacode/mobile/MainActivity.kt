package com.avacode.mobile

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * MainActivity
 *
 * Extended FlutterActivity that registers a MethodChannel
 * ("com.avacode.mobile/agent_service") for Flutter ↔ native communication.
 */
class MainActivity : FlutterActivity() {

    companion object {
        const val CHANNEL = "com.avacode.mobile/agent_service"
        private const val PERMISSION_REQUEST_CODE = 4096
    }

    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val result = pendingPermissionResult ?: return
            pendingPermissionResult = null
            val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            result.success(mapOf("granted" to granted))
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                try {
                    handleMethodCall(call.method, call.arguments, result)
                } catch (e: Exception) {
                    AvaNotificationDebugLogger.logError(this, "MethodChannel error: ${call.method}", e)
                    result.error("NATIVE_ERROR", e.message, null)
                }
            }

        // Forward boot-restore intent to Flutter once engine is ready
        forwardBootRestoreIfNeeded(flutterEngine)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // If app was relaunched from boot-restore while already running
        handleBootRestoreIntent(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        // Mark session as inactive on clean app exit
        val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        val wasActive = prefs.getBoolean("flutter.ava_session_was_active", false)
        if (wasActive) {
            // Only clear if the foreground service is not running (i.e. clean exit not crash)
            prefs.edit().putBoolean("flutter.ava_session_was_active", false).apply()
        }
        AvaNotificationDebugLogger.log(this, "MainActivity onDestroy")
    }

    // ── MethodChannel Handler ─────────────────────────────────────────────────

    private fun handleMethodCall(method: String, args: Any?, result: MethodChannel.Result) {
        @Suppress("UNCHECKED_CAST")
        val map = args as? Map<String, Any?> ?: emptyMap()

        when (method) {
            "startForegroundService" -> {
                val sessionId = map["sessionId"]?.toString() ?: ""
                val modelName = map["modelName"]?.toString() ?: "AvA Agent"
                val currentAction = map["currentAction"]?.toString() ?: "Starting..."
                val startTimeMs = (map["startTimeMs"] as? Number)?.toLong() ?: System.currentTimeMillis()

                val intent = AvaAgentForegroundService.startIntent(
                    this, sessionId, modelName, currentAction, startTimeMs
                )
                startForegroundServiceCompat(intent)

                // Persist session-active state for boot recovery
                saveSessionActive(sessionId, active = true)

                AvaNotificationDebugLogger.log(this, "MethodChannel: startForegroundService session=$sessionId")
                result.success(true)
            }

            "updateForegroundService" -> {
                val currentAction = map["currentAction"]?.toString() ?: ""
                val toolName = map["toolName"]?.toString()
                val intent = AvaAgentForegroundService.updateIntent(this, currentAction, toolName)
                startForegroundServiceCompat(intent)
                result.success(true)
            }

            "stopForegroundService" -> {
                val isSuccess = map["isSuccess"] as? Boolean ?: true
                val sessionId = map["sessionId"]?.toString() ?: ""
                startService(AvaAgentForegroundService.stopIntent(this))
                saveSessionActive(sessionId, active = false)
                AvaNotificationDebugLogger.log(this, "MethodChannel: stopForegroundService success=$isSuccess session=$sessionId")
                result.success(true)
            }

            "getDebugLog" -> {
                result.success(AvaNotificationDebugLogger.readLog(this))
            }

            "clearDebugLog" -> {
                AvaNotificationDebugLogger.clearLog(this)
                result.success(true)
            }

            "checkPermissions" -> {
                val hasNotifications = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                } else true

                val hasMicrophone = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

                val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
                val isBatteryOptIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && powerManager != null) {
                    powerManager.isIgnoringBatteryOptimizations(packageName)
                } else true

                result.success(
                    mapOf(
                        "notifications" to hasNotifications,
                        "microphone" to hasMicrophone,
                        "batteryOptimizationIgnored" to isBatteryOptIgnored
                    )
                )
            }

            "requestPermissions" -> {
                val permissionsToRequest = mutableListOf<String>()

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }

                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
                }

                if (permissionsToRequest.isNotEmpty()) {
                    pendingPermissionResult = result
                    ActivityCompat.requestPermissions(this, permissionsToRequest.toTypedArray(), PERMISSION_REQUEST_CODE)
                } else {
                    result.success(mapOf("granted" to true))
                }
            }

            "requestIgnoreBatteryOptimizations" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
                        if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName)) {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                            }
                            startActivity(intent)
                            result.success(true)
                            return
                        }
                    } catch (e: Exception) {
                        // Fallback to general battery settings
                        try {
                            val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                            startActivity(fallbackIntent)
                            result.success(true)
                            return
                        } catch (_: Exception) {}
                    }
                }
                result.success(false)
            }

            "openAppSettings" -> {
                try {
                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                    result.success(true)
                } catch (e: Exception) {
                    result.error("INTENT_ERROR", e.message, null)
                }
            }

            "saveServerUrl" -> {
                val url = map["url"]?.toString() ?: return result.success(false)
                val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
                prefs.edit().putString("flutter.ava_server_url", url).apply()
                AvaNotificationDebugLogger.log(this, "Server URL saved: $url")
                result.success(true)
            }

            "saveSessionActive" -> {
                val sessionId = map["sessionId"]?.toString() ?: ""
                val active = map["active"] as? Boolean ?: false
                saveSessionActive(sessionId, active)
                result.success(true)
            }

            else -> result.notImplemented()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun startForegroundServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun saveSessionActive(sessionId: String, active: Boolean) {
        val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("flutter.ava_session_was_active", active)
            .putString("flutter.ava_last_session_id", sessionId)
            .apply()
    }

    private fun forwardBootRestoreIfNeeded(flutterEngine: FlutterEngine) {
        val bootRestore = intent?.getBooleanExtra("ava_boot_restore", false) ?: false
        val sessionId = intent?.getStringExtra("ava_restore_session_id") ?: return
        if (!bootRestore || sessionId.isEmpty()) return

        // Send to Flutter after a short delay to ensure Dart is ready
        flutterEngine.dartExecutor.binaryMessenger.let { messenger ->
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                MethodChannel(messenger, CHANNEL).invokeMethod(
                    "onBootRestore",
                    mapOf("sessionId" to sessionId)
                )
                AvaNotificationDebugLogger.log(this, "Boot restore forwarded to Flutter: session=$sessionId")
            }, 2000)
        }
    }

    private fun handleBootRestoreIntent(intent: Intent?) {
        val bootRestore = intent?.getBooleanExtra("ava_boot_restore", false) ?: false
        val sessionId = intent?.getStringExtra("ava_restore_session_id") ?: return
        if (!bootRestore || sessionId.isEmpty()) return

        flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
            MethodChannel(messenger, CHANNEL).invokeMethod(
                "onBootRestore",
                mapOf("sessionId" to sessionId)
            )
        }
    }
}
