/**
 * Bulletproof bootstrap for AvA Mobile.
 *
 * Ensures all startup and runtime errors are captured and displayed
 * visibly on screen instead of allowing the app to silently auto-close.
 */
import { registerRootComponent } from "expo";
import React, { useState, useEffect } from "react";
import { ScrollView, Text, View } from "react-native";

const TAG = "[AVA bootstrap]";

function sendDiagnostic(event, extra = {}) {
  try {
    fetch("https://ava.mahmudhasan.pro/crash-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: event,
        source: "javascript",
        time: new Date().toISOString(),
        ...extra,
      }),
    }).catch(() => {});
  } catch (_) {}
}

sendDiagnostic("index.js.evaluating");

function FatalStartupScreen(props) {
  const error = props.error;
  const message = String((error && error.message) || error || "Unknown startup error");
  const stack = String((error && error.stack) || "").slice(0, 4000);

  useEffect(() => {
    sendDiagnostic("FatalStartupScreen.rendered", { message, stack });
  }, []);

  return React.createElement(
    View,
    { style: { flex: 1, backgroundColor: "#0f172a", paddingTop: 56 } },
    React.createElement(
      ScrollView,
      { contentContainerStyle: { padding: 24 } },
      React.createElement(
        Text,
        { style: { fontSize: 22, fontWeight: "700", color: "#ffffff", marginBottom: 12 } },
        "AvA Startup Diagnostic"
      ),
      React.createElement(
        Text,
        { style: { fontSize: 15, color: "#f87171", marginBottom: 12 } },
        message
      ),
      stack
        ? React.createElement(
            Text,
            { style: { fontSize: 11, color: "#94a3b8", fontFamily: "monospace" } },
            stack
          )
        : null,
      React.createElement(
        Text,
        { style: { fontSize: 13, color: "#64748b", marginTop: 16 } },
        "Screenshot niye pathan Boss, fix kore dicchi."
      )
    )
  );
}

let notifyFatalError = null;
let App = null;
let startupError = null;

try {
  require("./src/polyfills");
  require("react-native-gesture-handler");
  const AppModule = require("./App");
  App = AppModule && AppModule.default ? AppModule.default : AppModule;
  if (typeof App !== "function") {
    throw new Error("App module did not export a component (got: " + typeof App + ")");
  }
  sendDiagnostic("index.js.AppModule.loaded");
} catch (e) {
  startupError = e;
  sendDiagnostic("index.js.AppModule.load_failed", {
    message: e?.message,
    stack: e?.stack,
  });
}

// Global handler: surfaces fatal async JS errors that escape React.
try {
  const RN = require("react-native");
  const ErrorUtils = RN && RN.ErrorUtils;
  if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === "function") {
    const prevHandler =
      typeof ErrorUtils.getGlobalHandler === "function" ? ErrorUtils.getGlobalHandler() : null;
    ErrorUtils.setGlobalHandler(function (error, isFatal) {
      try {
        console.error(TAG + " global", isFatal, error);
        sendDiagnostic("ErrorUtils.globalHandler", {
          isFatal,
          message: error?.message,
          stack: error?.stack,
        });
        if (notifyFatalError) {
          notifyFatalError(error);
          return;
        }
      } catch (_) {}
      if (prevHandler) {
        prevHandler(error, isFatal);
      }
    });
  }
} catch (_) {}

function RootBootstrap() {
  const [fatal, setFatal] = useState(startupError);

  useEffect(() => {
    sendDiagnostic("RootBootstrap.mounted");
    notifyFatalError = (err) => {
      setFatal(err);
    };
    return () => {
      notifyFatalError = null;
    };
  }, []);

  if (fatal || !App) {
    return React.createElement(FatalStartupScreen, { error: fatal || "Failed to load App module" });
  }

  return React.createElement(App);
}

registerRootComponent(RootBootstrap);
sendDiagnostic("registerRootComponent.done");
