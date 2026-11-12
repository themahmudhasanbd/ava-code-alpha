package com.avacode.mobile

import android.app.Application
import android.content.res.Configuration
import android.util.Log
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  companion object {
    fun sendDiagnostic(event: String, extra: Map<String, Any?> = emptyMap()) {
      Thread {
        try {
          val url = URL("https://ava.mahmudhasan.pro/crash-report")
          val conn = url.openConnection() as HttpURLConnection
          conn.requestMethod = "POST"
          conn.setRequestProperty("Content-Type", "application/json")
          conn.connectTimeout = 3000
          conn.readTimeout = 3000
          conn.doOutput = true
          val json = JSONObject().apply {
            put("event", event)
            put("time", System.currentTimeMillis())
            extra.forEach { (k, v) -> put(k, v ?: JSONObject.NULL) }
          }
          conn.outputStream.use { it.write(json.toString().toByteArray(Charsets.UTF_8)) }
          conn.responseCode
          conn.disconnect()
        } catch (_: Exception) {}
      }.start()
    }
  }

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(AvaAgentPackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()

    // Global Android uncaught exception logger
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      val stack = Log.getStackTraceString(throwable)
      Log.e("AvACrash", "FATAL CRASH in thread ${thread.name}: ${throwable.message}", throwable)
      try {
        val crashFile = File(filesDir, "crash.log")
        crashFile.writeText(stack)
      } catch (_: Exception) {}

      // Synchronously post crash to server
      val reportThread = Thread {
        try {
          val url = URL("https://ava.mahmudhasan.pro/crash-report")
          val conn = url.openConnection() as HttpURLConnection
          conn.requestMethod = "POST"
          conn.setRequestProperty("Content-Type", "application/json")
          conn.connectTimeout = 3000
          conn.readTimeout = 3000
          conn.doOutput = true
          val json = JSONObject().apply {
            put("event", "FATAL_NATIVE_CRASH")
            put("thread", thread.name)
            put("exception", throwable.javaClass.name)
            put("message", throwable.message ?: "")
            put("stack", stack)
            put("device", "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL} (SDK ${android.os.Build.VERSION.SDK_INT})")
          }
          conn.outputStream.use { it.write(json.toString().toByteArray(Charsets.UTF_8)) }
          conn.responseCode
          conn.disconnect()
        } catch (_: Exception) {}
      }
      reportThread.start()
      try { reportThread.join(2500) } catch (_: Exception) {}

      defaultHandler?.uncaughtException(thread, throwable)
    }

    sendDiagnostic("MainApplication.onCreate", mapOf(
      "device" to "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL} (SDK ${android.os.Build.VERSION.SDK_INT})"
    ))

    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
