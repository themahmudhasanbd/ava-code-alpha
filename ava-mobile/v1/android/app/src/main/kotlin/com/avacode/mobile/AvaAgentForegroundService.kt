package com.avacode.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat

/**
 * AvaAgentForegroundService
 *
 * Native Android foreground service that:
 * - Pins the ongoing "Agent Running" notification in the notification shade
 * - Keeps the app process alive when backgrounded during an agent turn
 * - Updates notification content as tool/reasoning events arrive
 * - Uses native Android chronometer for live elapsed time display
 *
 * Commands are sent via startService(Intent) with `action` extra:
 *   "start"  — begin foreground service with session info
 *   "update" — update current action / tool name
 *   "stop"   — stop foreground service and dismiss notification
 */
class AvaAgentForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "ava_ongoing_turn_channel"
        const val CHANNEL_NAME = "AvA Live Agent Execution"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "start"
        const val ACTION_UPDATE = "update"
        const val ACTION_STOP = "stop"

        const val EXTRA_SESSION_ID = "sessionId"
        const val EXTRA_MODEL_NAME = "modelName"
        const val EXTRA_CURRENT_ACTION = "currentAction"
        const val EXTRA_TOOL_NAME = "toolName"
        const val EXTRA_START_TIME_MS = "startTimeMs"

        /** Convenience factory for start intent */
        fun startIntent(
            context: Context,
            sessionId: String,
            modelName: String,
            currentAction: String,
            startTimeMs: Long,
        ): Intent = Intent(context, AvaAgentForegroundService::class.java).apply {
            putExtra("action", ACTION_START)
            putExtra(EXTRA_SESSION_ID, sessionId)
            putExtra(EXTRA_MODEL_NAME, modelName)
            putExtra(EXTRA_CURRENT_ACTION, currentAction)
            putExtra(EXTRA_START_TIME_MS, startTimeMs)
        }

        /** Convenience factory for update intent */
        fun updateIntent(
            context: Context,
            currentAction: String,
            toolName: String?,
        ): Intent = Intent(context, AvaAgentForegroundService::class.java).apply {
            putExtra("action", ACTION_UPDATE)
            putExtra(EXTRA_CURRENT_ACTION, currentAction)
            if (toolName != null) putExtra(EXTRA_TOOL_NAME, toolName)
        }

        /** Convenience factory for stop intent */
        fun stopIntent(context: Context): Intent =
            Intent(context, AvaAgentForegroundService::class.java).apply {
                putExtra("action", ACTION_STOP)
            }
    }

    private var sessionId: String = ""
    private var modelName: String = "AvA Agent"
    private var currentAction: String = "Initializing..."
    private var toolName: String? = null
    private var startTimeMs: Long = 0L

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY

        when (intent.getStringExtra("action")) {
            ACTION_START -> handleStart(intent)
            ACTION_UPDATE -> handleUpdate(intent)
            ACTION_STOP -> handleStop()
        }

        return START_STICKY // Restart if killed by OS
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        AvaNotificationDebugLogger.log(this, "ForegroundService onDestroy — sessionId=$sessionId")
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private fun handleStart(intent: Intent) {
        sessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: ""
        modelName = intent.getStringExtra(EXTRA_MODEL_NAME) ?: "AvA Agent"
        currentAction = intent.getStringExtra(EXTRA_CURRENT_ACTION) ?: "Starting..."
        toolName = intent.getStringExtra(EXTRA_TOOL_NAME)
        startTimeMs = intent.getLongExtra(EXTRA_START_TIME_MS, System.currentTimeMillis())

        AvaNotificationDebugLogger.log(this, "ForegroundService START — session=$sessionId model=$modelName")

        try {
            val notification = buildNotification()
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(this, "startForeground failed", e)
        }
    }

    private fun handleUpdate(intent: Intent) {
        currentAction = intent.getStringExtra(EXTRA_CURRENT_ACTION) ?: currentAction
        toolName = if (intent.hasExtra(EXTRA_TOOL_NAME)) intent.getStringExtra(EXTRA_TOOL_NAME) else toolName

        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(NOTIFICATION_ID, buildNotification())
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(this, "notification update failed", e)
        }
    }

    private fun handleStop() {
        AvaNotificationDebugLogger.log(this, "ForegroundService STOP — session=$sessionId")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (e: Exception) {
            AvaNotificationDebugLogger.logError(this, "stopForeground failed", e)
        }
        stopSelf()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        AvaNotificationDebugLogger.log(this, "ForegroundService onTaskRemoved — app swiped from recents. Session=$sessionId")
        // If an agent turn was running, keep foreground service active and restart intent
        if (sessionId.isNotEmpty()) {
            val restartServiceIntent = Intent(applicationContext, this.javaClass).also {
                it.setPackage(packageName)
                it.putExtra("action", ACTION_START)
                it.putExtra(EXTRA_SESSION_ID, sessionId)
                it.putExtra(EXTRA_MODEL_NAME, modelName)
                it.putExtra(EXTRA_CURRENT_ACTION, currentAction)
                it.putExtra(EXTRA_START_TIME_MS, startTimeMs)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(restartServiceIntent)
            } else {
                startService(restartServiceIntent)
            }
        }
    }

    // ── Notification Builder ──────────────────────────────────────────────────

    private fun buildNotification(): Notification {
        // Tap notification → open MainActivity
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("openTab", 0) // Chat tab
            putExtra("sessionId", sessionId)
        }
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val tapIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags)

        // Action: Stop / Cancel turn
        val stopActionIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "stop_agent")
            putExtra("sessionId", sessionId)
        }
        val stopPendingIntent = PendingIntent.getActivity(this, 1, stopActionIntent, pendingFlags)

        val title = "⚡ AvA Engine Active ($modelName)"
        val body = if (toolName != null && toolName!!.isNotEmpty()) {
            "Executing: $toolName\n$currentAction"
        } else {
            currentAction
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFF2563EB.toInt()) // Electric Blue accent
            .setOngoing(true)          // Cannot be dismissed by user while running
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)    // Silent updates — no vibration on re-notify
            .setShowWhen(true)
            .setUsesChronometer(true)  // Live counting timer in notification shade
            .setChronometerCountDown(false)
            .setWhen(startTimeMs)
            .setSubText("VPS Agent Running")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(tapIntent)
            .addAction(R.drawable.ic_notification, "Open Chat", tapIntent)
            .addAction(R.drawable.ic_notification, "Stop Agent", stopPendingIntent)
            .build()
    }

    // ── Channel Setup ─────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Live ongoing notification during AvA AI agent execution turns"
                enableVibration(false)
                setSound(null, null)
                setShowBadge(false)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}
