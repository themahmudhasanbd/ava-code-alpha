package com.avacode.mobile

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue

/**
 * AvaNotificationDebugLogger
 *
 * Singleton error/debug logger for the native Android notification layer.
 *
 * Features:
 * - Writes structured log entries to a rotating local file (ava_debug.log, max 1 MB)
 * - Queues server POST requests to {serverUrl}/api/notifications/debug-log
 * - Thread-safe via a single-thread executor
 * - All operations are fire-and-forget — never blocks the calling thread
 *
 * Server URL is read from FlutterSharedPreferences key "flutter.ava_server_url"
 */
object AvaNotificationDebugLogger {

    private const val TAG = "AvaDebugLogger"
    private const val LOG_FILE_NAME = "ava_debug.log"
    private const val MAX_LOG_BYTES = 1_048_576L // 1 MB — rotate beyond this
    private const val SERVER_ENDPOINT = "/api/notifications/debug-log"

    private val executor = Executors.newSingleThreadExecutor()
    private val pendingServerLogs = LinkedBlockingQueue<String>(500)

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)

    // ── Public API ────────────────────────────────────────────────────────────

    /** Log an informational message. */
    fun log(context: Context, message: String) {
        val entry = buildEntry("INFO", message)
        Log.d(TAG, message)
        executor.execute {
            writeToFile(context, entry)
            enqueueServerLog(context, entry)
        }
    }

    /** Log an error with exception details. */
    fun logError(context: Context, message: String, error: Throwable? = null) {
        val detail = error?.let { "\n  ${it.javaClass.simpleName}: ${it.message}\n  ${it.stackTrace.take(5).joinToString("\n  ")}" } ?: ""
        val entry = buildEntry("ERROR", "$message$detail")
        Log.e(TAG, message, error)
        executor.execute {
            writeToFile(context, entry)
            enqueueServerLog(context, entry, isError = true)
        }
    }

    /** Read the full local debug log (called from Flutter via MethodChannel). */
    fun readLog(context: Context): String {
        return try {
            val file = logFile(context)
            if (file.exists()) file.readText() else "(no log file yet)"
        } catch (e: Exception) {
            "Failed to read log: ${e.message}"
        }
    }

    /** Clear the local debug log. */
    fun clearLog(context: Context) {
        executor.execute {
            try {
                logFile(context).delete()
            } catch (_: Exception) {}
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private fun buildEntry(level: String, message: String): String {
        val ts = dateFormat.format(Date())
        val device = "${Build.MANUFACTURER} ${Build.MODEL} (API ${Build.VERSION.SDK_INT})"
        return "[$ts] [$level] [$device] $message"
    }

    private fun writeToFile(context: Context, entry: String) {
        try {
            val file = logFile(context)
            // Rotate if file exceeds max size
            if (file.exists() && file.length() > MAX_LOG_BYTES) {
                val backup = File(context.filesDir, "ava_debug_old.log")
                backup.delete()
                file.renameTo(backup)
            }
            FileWriter(file, true).use { it.appendLine(entry) }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to write to log file: ${e.message}")
        }
    }

    private fun enqueueServerLog(context: Context, entry: String, isError: Boolean = false) {
        if (!isError) return // Only send errors to server to avoid spam
        if (pendingServerLogs.offer(entry)) {
            flushToServer(context)
        }
    }

    private fun flushToServer(context: Context) {
        val prefs = context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("flutter.ava_server_url", null) ?: return

        val entries = mutableListOf<String>()
        pendingServerLogs.drainTo(entries, 20) // Send up to 20 entries at once

        if (entries.isEmpty()) return

        try {
            val url = java.net.URL("$serverUrl$SERVER_ENDPOINT")
            val connection = url.openConnection() as java.net.HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.doOutput = true

            val body = buildJsonPayload(entries)
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                Log.w(TAG, "Server debug-log endpoint returned $responseCode")
                // Re-queue entries for retry (best-effort)
                entries.forEach { pendingServerLogs.offer(it) }
            }
            connection.disconnect()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to POST debug log to server: ${e.message}")
            // Re-queue for retry on next error
            entries.take(10).forEach { pendingServerLogs.offer(it) }
        }
    }

    private fun buildJsonPayload(entries: List<String>): String {
        val array = org.json.JSONArray()
        entries.forEach { array.put(it) }
        val root = org.json.JSONObject()
        root.put("source", "android_native")
        root.put("entries", array)
        return root.toString()
    }

    private fun logFile(context: Context) = File(context.filesDir, LOG_FILE_NAME)
}
