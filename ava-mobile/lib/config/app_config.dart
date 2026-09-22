import "package:flutter/foundation.dart";

/// Centralized application configuration and base URL manager for AvA Code.
class AppConfig {
  /// Default production server URL fallback
  static const String defaultProductionUrl = "https://ava.mahmudhasan.pro";

  /// Default workspace directory on the VPS (System Root "/")
  static const String defaultWorkspacePath = "/";

  /// Resolves the default server URL based on execution environment.
  /// On Web, dynamically adopts the current browser origin.
  /// On Mobile/Desktop, uses [defaultProductionUrl].
  static String get defaultServerUrl {
    if (kIsWeb) {
      final origin = Uri.base.origin;
      if (origin.isNotEmpty && origin != "null" && !origin.startsWith("file:")) {
        return origin;
      }
    }
    return defaultProductionUrl;
  }

  /// Normalizes and resolves a given server URL.
  /// Replaces empty or legacy endpoints with [defaultServerUrl].
  static String resolveBaseUrl([String? customUrl]) {
    String base = (customUrl ?? "").trim();

    if (kIsWeb) {
      final origin = Uri.base.origin;
      if (origin.isNotEmpty && origin != "null" && !origin.startsWith("file:")) {
        base = origin;
      }
    }

    if (base.isEmpty || base == "https://ava.thundernexus.com" || base == "https://test.thundernexus.com") {
      base = defaultProductionUrl;
    }

    if (base.endsWith("/")) {
      base = base.substring(0, base.length - 1);
    }
    return base;
  }
}
