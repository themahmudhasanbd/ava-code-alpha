package com.avacode.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * AvaBootReceiver
 *
 * Receives BOOT_COMPLETED and MY_PACKAGE_REPLACED broadcasts so that:
 * - After a device reboot, AvA Code can auto-relaunch if a session was active at shutdown
 * - After an app update, the FCM token is re-synced with the server
 *
 * Registered in AndroidManifest.xml with:
 *   <action android:name="android.intent.action.BOOT_COMPLETED" />
 *   <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
 */
class AvaBootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        AvaNotificationDebugLogger.log(context, "BootReceiver triggered: action=$action")

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON", // HTC/OnePlus fast boot
            "com.htc.intent.action.QUICKBOOT_POWERON" -> handleBoot(context)

            Intent.ACTION_MY_PACKAGE_REPLACED -> handlePackageReplaced(context)
        }
    }

    // ── Boot Handler ──────────────────────────────────────────────────────────

    private fun handleBoot(context: Context) {
        val prefs = context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)

        // Check if a session was active when the device was shut down
        val wasSessionActive = prefs.getBoolean("flutter.ava_session_was_active", false)
        val lastSessionId = prefs.getString("flutter.ava_last_session_id", null)

        AvaNotificationDebugLogger.log(
            context,
            "Boot: wasSessionActive=$wasSessionActive lastSessionId=$lastSessionId"
        )

        if (wasSessionActive && !lastSessionId.isNullOrEmpty()) {
            // Relaunch MainActivity with a restore flag so Flutter can reconnect to the session
            launchMainActivity(context, lastSessionId)
        }
    }

    private fun handlePackageReplaced(context: Context) {
        // After update: clear stale session-active flag so no ghost relaunch on next boot
        val prefs = context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        prefs.edit().remove("flutter.ava_session_was_active").apply()
        AvaNotificationDebugLogger.log(context, "Package replaced — cleared session-active flag")
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun launchMainActivity(context: Context, sessionId: String) {
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            putExtra("ava_boot_restore", true)
            putExtra("ava_restore_session_id", sessionId)
        }

        try {
            context.startActivity(launchIntent)
            AvaNotificationDebugLogger.log(context, "Boot: launched MainActivity for session $sessionId")
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(context, "Boot: failed to launch MainActivity", e)
        }
    }
}
