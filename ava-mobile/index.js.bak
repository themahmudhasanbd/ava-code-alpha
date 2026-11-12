/**
 * Bulletproof bootstrap for AvA Mobile.
 *
 * React ErrorBoundaries can only catch RENDER errors. If any module throws
 * during import (before the first render), the app silently closes with no
 * error visible. This bootstrap wraps every import in try/catch using
 * require() and renders a fallback error screen, so a startup crash always
 * shows WHAT failed instead of auto-closing.
 */
import { registerRootComponent } from "expo";
import React from "react";
import { ScrollView, Text, View } from "react-native";

const TAG = "[AVA bootstrap]";

function FatalStartupScreen(props) {
  const error = props.error;
  const message = String((error && error.message) || error || "Unknown startup error");
  const stack = String((error && error.stack) || "").slice(0, 4000);
  return React.createElement(
    View,
    { style: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56 } },
    React.createElement(
      ScrollView,
      { contentContainerStyle: { padding: 24 } },
      React.createElement(
        Text,
        { style: { fontSize: 22, fontWeight: "700", color: "#111111", marginBottom: 12 } },
        "Startup failed"
      ),
      React.createElement(
        Text,
        { style: { fontSize: 15, color: "#b00020", marginBottom: 12 } },
        message
      ),
      stack
        ? React.createElement(
            Text,
            { style: { fontSize: 11, color: "#444444", fontFamily: "monospace" } },
            stack
          )
        : null,
      React.createElement(
        Text,
        { style: { fontSize: 13, color: "#666666", marginTop: 16 } },
        "Ei screen-er screenshot niye pathao please."
      )
    )
  );
}

function showFatalStartupError(error) {
  try {
    console.error(TAG, error);
  } catch (_) {}
  try {
    const FallbackApp = function () {
      return React.createElement(FatalStartupScreen, { error: error });
    };
    registerRootComponent(FallbackApp);
  } catch (_) {
    // Last resort: nothing more we can render.
  }
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
      } catch (_) {}
      if (isFatal) {
        showFatalStartupError(error);
      } else if (prevHandler) {
        prevHandler(error, isFatal);
      }
    });
  }
} catch (_) {}

try {
  require("./src/polyfills");
  require("react-native-gesture-handler");
  const AppModule = require("./App");
  const App = AppModule && AppModule.default ? AppModule.default : AppModule;
  if (typeof App !== "function") {
    throw new Error("App module did not export a component (got: " + typeof App + ")");
  }
  registerRootComponent(App);
} catch (e) {
  showFatalStartupError(e);
}
