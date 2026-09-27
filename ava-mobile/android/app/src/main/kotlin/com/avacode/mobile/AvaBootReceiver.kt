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
 */
class AvaBootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        AvaNotificationDebugLogger.log(context, "BootReceiver triggered: action=$action")

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON" -> handleBoot(context)
            Intent.ACTION_MY_PACKAGE_REPLACED -> handlePackageReplaced(context)
        }
    }

    private fun handleBoot(context: Context) {
        val prefs = context.getSharedPreferences("ava_native_prefs", Context.MODE_PRIVATE)
        val wasSessionActive = prefs.getBoolean("session_was_active", false)
        val lastSessionId = prefs.getString("last_session_id", null)

        AvaNotificationDebugLogger.log(
            context,
            "Boot: wasSessionActive=$wasSessionActive lastSessionId=$lastSessionId"
        )

        if (wasSessionActive && !lastSessionId.isNullOrEmpty()) {
            launchMainActivity(context, lastSessionId)
        }
    }

    private fun handlePackageReplaced(context: Context) {
        val prefs = context.getSharedPreferences("ava_native_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("session_was_active").apply()
        AvaNotificationDebugLogger.log(context, "Package replaced — cleared session-active flag")
    }

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