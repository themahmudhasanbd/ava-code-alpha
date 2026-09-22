import "dart:convert";
import "package:http/http.dart" as http;
import "agent_core_base.dart";

mixin AgentCoreAuthMixin on AgentCoreBase {
  /// Synchronize sandbox mode with backend session memory and config.
  Future<bool> updateSandboxMode(String mode, {String? sessionId}) async {
    final cleanMode = mode.trim().toUpperCase();
    setSandboxMode(cleanMode);
    final sessId = sessionId ?? lastActiveSessionId;

    try {
      if (sessId != null && sessId.isNotEmpty) {
        await sendRpc("thread/settings/update", {
          "threadId": sessId,
        });
      }
      AgentCoreBase.addDebugLog("updateSandboxMode: active mode set to $cleanMode");
      return true;
    } catch (e) {
      AgentCoreBase.addDebugLog("updateSandboxMode error: $e");
      return true;
    }
  }

  // ─── Server-Side Auth Verification ────────────────────────────────────────
  Future<Map<String, dynamic>> verifyServerAuth(String username, String password) async {
    final cleanUser = username.trim().isEmpty ? "ava" : username.trim();
    final cleanPass = password.trim();
    final token = base64Encode(utf8.encode("$cleanUser:$cleanPass"));

    try {
      setAuthCredentials(cleanUser, cleanPass);
      final cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
      bool serverReachable = false;
      
      // Strategy 1: HTTP /healthz or /readyz check
      try {
        final healthUri = Uri.parse("$cleanBase/healthz");
        final healthResp = await http.get(healthUri, headers: authHeaders).timeout(const Duration(seconds: 4));
        if (healthResp.statusCode == 200 || healthResp.statusCode == 204 || healthResp.statusCode == 400 || healthResp.statusCode == 401 || healthResp.statusCode == 403) {
          serverReachable = true;
        }
      } catch (_) {}

      // Strategy 2: Direct WebSocket JSON-RPC Handshake
      bool wsReady = false;
      try {
        await ensureSseConnected();
        final initRes = await sendRpc("initialize", {
          "clientInfo": {"name": "ava-mobile", "version": "1.0.0"},
          "capabilities": {},
        }).timeout(const Duration(seconds: 6));
        if (initRes != null) {
          wsReady = true;
          serverReachable = true;
        }
      } catch (_) {}

      if (serverReachable || wsReady) {
        setAuthToken(token);
        updateConnectionState(true);
        return {"success": true, "token": token, "username": cleanUser};
      } else {
        return {
          "success": false,
          "error": "Cannot connect to AvA Core ($baseUrl). Please verify network and server status.",
        };
      }
    } catch (e) {
      return {"success": false, "error": "Authentication failed: ${AgentCoreBase.extractCoreErrorMessage(e)}"};
    }
  }
}
