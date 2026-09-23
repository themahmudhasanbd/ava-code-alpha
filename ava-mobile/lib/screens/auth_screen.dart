import "dart:async";
import "dart:convert";
import "dart:ui";
import "package:flutter/material.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";
import "package:http/http.dart" as http;
import "package:web_socket_channel/web_socket_channel.dart";
import "../theme/app_theme.dart";
import "../services/agent_core_service.dart";
import "../config/app_config.dart";

class AuthScreen extends StatefulWidget {
  final String currentServerUrl;
  final String currentWorkspacePath;
  final Future<void> Function(
    String email,
    String password, {
    String? serverUrl,
    String? workspacePath,
  }) onAuthenticateSuccess;

  const AuthScreen({
    super.key,
    required this.currentServerUrl,
    required this.currentWorkspacePath,
    required this.onAuthenticateSuccess,
  });

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late TextEditingController _emailCtrl;
  late TextEditingController _passwordCtrl;
  late TextEditingController _serverUrlCtrl;
  late TextEditingController _workspaceCtrl;

  final FocusNode _emailFocus = FocusNode();
  final FocusNode _passwordFocus = FocusNode();

  bool _isAuthenticating = false;
  bool _obscurePassword = true;
  bool _showServerSettings = false;

  bool _isServerOnline = false;
  bool _isCheckingServer = true;
  int _serverLatencyMs = 0;
  String _serverStatusMsg = "Checking AvA Core...";
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController();
    _passwordCtrl = TextEditingController();
    _serverUrlCtrl = TextEditingController(
      text: widget.currentServerUrl.isNotEmpty
          ? widget.currentServerUrl
          : AppConfig.defaultServerUrl,
    );
    _workspaceCtrl = TextEditingController(
      text: widget.currentWorkspacePath.isNotEmpty
          ? widget.currentWorkspacePath
          : AppConfig.defaultWorkspacePath,
    );

    _checkServerConnectivity();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _serverUrlCtrl.dispose();
    _workspaceCtrl.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  String _getActiveServerUrl() {
    final custom = _serverUrlCtrl.text.trim();
    return AppConfig.resolveBaseUrl(custom.isNotEmpty ? custom : widget.currentServerUrl);
  }

  String _resolveWebSocketUrl(String baseUrl) {
    String base = baseUrl.trim();
    if (base.endsWith("/")) base = base.substring(0, base.length - 1);
    if (base.endsWith("/api")) base = base.substring(0, base.length - 4);
    if (base.endsWith("/")) base = base.substring(0, base.length - 1);

    if (base.startsWith("https://")) {
      return "wss://${base.substring('https://'.length)}/ws";
    } else if (base.startsWith("http://")) {
      return "ws://${base.substring('http://'.length)}/ws";
    } else if (base.startsWith("wss://") || base.startsWith("ws://")) {
      return base.endsWith("/ws") ? base : "$base/ws";
    }
    return "wss://$base/ws";
  }

  Future<void> _checkServerConnectivity() async {
    if (!mounted) return;
    setState(() {
      _isCheckingServer = true;
      _serverStatusMsg = "Pinging AvA Core...";
      _errorMessage = null;
    });

    final stopwatch = Stopwatch()..start();
    final base = _getActiveServerUrl();
    bool online = false;
    int latency = 0;

    // Strategy 1: HTTP /healthz ping
    try {
      final res = await http.get(
        Uri.parse("$base/healthz"),
        headers: {
          "Accept": "application/json",
          "x-ava-client": "mobile",
        },
      ).timeout(const Duration(seconds: 4));
      
      if (res.statusCode == 200 || res.statusCode == 204 || res.statusCode == 400 || res.statusCode == 401 || res.statusCode == 403) {
        stopwatch.stop();
        online = true;
        latency = stopwatch.elapsedMilliseconds;
      }
    } catch (_) {}

    // Strategy 2: Direct WebSocket handshake if HTTP was blocked or ambiguous
    if (!online) {
      try {
        final wsUrl = _resolveWebSocketUrl(base);
        final channel = WebSocketChannel.connect(Uri.parse(wsUrl));
        final completer = Completer<bool>();

        final sub = channel.stream.listen(
          (message) {
            try {
              final decoded = jsonDecode(message.toString());
              if (decoded is Map && (decoded.containsKey("id") || decoded.containsKey("result"))) {
                if (!completer.isCompleted) completer.complete(true);
              }
            } catch (_) {
              if (!completer.isCompleted) completer.complete(true);
            }
          },
          onError: (_) {
            if (!completer.isCompleted) completer.complete(false);
          },
          onDone: () {
            if (!completer.isCompleted) completer.complete(false);
          },
        );

        channel.sink.add(jsonEncode({
          "jsonrpc": "2.0",
          "id": 1,
          "method": "initialize",
          "params": {
            "clientInfo": {"name": "ava-mobile-auth", "version": "1.0.0"},
            "capabilities": {},
          },
        }));

        final wsOk = await completer.future.timeout(const Duration(seconds: 5), onTimeout: () => false);
        await sub.cancel();
        await channel.sink.close();

        if (wsOk) {
          stopwatch.stop();
          online = true;
          latency = stopwatch.elapsedMilliseconds;
        }
      } catch (_) {}
    }

    if (mounted) {
      setState(() {
        _isServerOnline = online;
        _serverLatencyMs = latency > 0 ? latency : 15;
        _isCheckingServer = false;
        _serverStatusMsg = online
            ? "AvA Core Online (${_serverLatencyMs}ms)"
            : "Server Offline";
      });
    }
  }

  Future<void> _handleLogin() async {
    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text.trim();
    final serverUrl = _getActiveServerUrl();
    final workspacePath = _workspaceCtrl.text.trim().isNotEmpty
        ? _workspaceCtrl.text.trim()
        : AppConfig.defaultWorkspacePath;

    if (email.isEmpty) {
      setState(() => _errorMessage = "Please enter your username or email address.");
      _emailFocus.requestFocus();
      return;
    }
    if (password.isEmpty) {
      setState(() => _errorMessage = "Please enter your password.");
      _passwordFocus.requestFocus();
      return;
    }

    setState(() {
      _isAuthenticating = true;
      _errorMessage = null;
    });

    try {
      final service = AvaAgentCoreService(
        baseUrl: serverUrl,
        workspacePath: workspacePath,
      );

      final authResult = await service.verifyServerAuth(email, password);

      if (authResult["success"] == true) {
        await widget.onAuthenticateSuccess(
          email,
          password,
          serverUrl: serverUrl,
          workspacePath: workspacePath,
        );
      } else {
        if (!mounted) return;
        setState(() {
          _isAuthenticating = false;
          _errorMessage = authResult["error"]?.toString() ?? "Invalid credentials. Access denied.";
        });
      }
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _isAuthenticating = false;
        _errorMessage = "Authentication failed: ${AgentCoreBase.extractCoreErrorMessage(err)}";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;
    final textPrimary = isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF070709) : const Color(0xFFF1F5F9),
      body: Stack(
        children: [
          Positioned(
            top: -60,
            left: -60,
            child: Container(
              width: 360,
              height: 360,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF6366F1).withValues(alpha: isDark ? 0.28 : 0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            right: -80,
            child: Container(
              width: 380,
              height: 380,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF06B6D4).withValues(alpha: isDark ? 0.22 : 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF13131A).withValues(alpha: 0.75)
                              : Colors.white.withValues(alpha: 0.90),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.12)
                                : Colors.white.withValues(alpha: 0.6),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.15 : 0.05),
                              blurRadius: 36,
                              spreadRadius: -4,
                            ),
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.50 : 0.08),
                              blurRadius: 30,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Center(
                              child: Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF1E1E26).withValues(alpha: 0.8)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.14)
                                        : const Color(0xFFE2E8F0),
                                    width: 1.2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF6366F1).withValues(alpha: isDark ? 0.25 : 0.10),
                                      blurRadius: 18,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                padding: const EdgeInsets.all(10),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.asset(
                                    "assets/logo.png",
                                    fit: BoxFit.contain,
                                    filterQuality: FilterQuality.high,
                                    isAntiAlias: true,
                                    errorBuilder: (ctx, err, stack) => const Icon(
                                      LucideIcons.bot,
                                      size: 34,
                                      color: Color(0xFF6366F1),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "AvA Code",
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                    color: textPrimary,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                                    ),
                                  ),
                                  child: const Text(
                                    "Alpha",
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF818CF8),
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Autonomous AI Pair Programmer & Cloud IDE",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: textSecondary,
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Center(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF1E1E26).withValues(alpha: 0.6)
                                      : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.08)
                                        : const Color(0xFFCBD5E1),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 6.5,
                                      height: 6.5,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: _isCheckingServer
                                            ? Colors.amber
                                            : (_isServerOnline ? const Color(0xFF10B981) : Colors.redAccent),
                                        boxShadow: _isServerOnline
                                            ? [
                                                BoxShadow(
                                                  color: const Color(0xFF10B981).withValues(alpha: 0.6),
                                                  blurRadius: 4,
                                                  spreadRadius: 1,
                                                ),
                                              ]
                                            : null,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _isCheckingServer ? "Checking AvA Core..." : _serverStatusMsg,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: _isServerOnline ? const Color(0xFF10B981) : textSecondary,
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    InkWell(
                                      onTap: _checkServerConnectivity,
                                      borderRadius: BorderRadius.circular(8),
                                      child: Padding(
                                        padding: const EdgeInsets.all(2.0),
                                        child: Icon(LucideIcons.refreshCw, size: 10, color: textSecondary),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              "USERNAME OR EMAIL",
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: textSecondary,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _emailCtrl,
                              focusNode: _emailFocus,
                              keyboardType: TextInputType.text,
                              style: TextStyle(fontSize: 13, color: textPrimary),
                              textInputAction: TextInputAction.next,
                              decoration: InputDecoration(
                                hintText: "Enter your username or email",
                                hintStyle: TextStyle(fontSize: 12, color: textSecondary.withValues(alpha: 0.6)),
                                prefixIcon: const Icon(LucideIcons.user, size: 15, color: Color(0xFF818CF8)),
                                filled: true,
                                fillColor: isDark
                                    ? const Color(0xFF1A1A22).withValues(alpha: 0.65)
                                    : const Color(0xFFF8FAFC),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white.withValues(alpha: 0.10) : const Color(0xFFCBD5E1),
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white.withValues(alpha: 0.10) : const Color(0xFFCBD5E1),
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              "PASSWORD",
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: textSecondary,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _passwordCtrl,
                              focusNode: _passwordFocus,
                              obscureText: _obscurePassword,
                              style: TextStyle(fontSize: 13, color: textPrimary),
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => _handleLogin(),
                              decoration: InputDecoration(
                                hintText: "Enter account password",
                                hintStyle: TextStyle(fontSize: 12, color: textSecondary.withValues(alpha: 0.6)),
                                prefixIcon: const Icon(LucideIcons.lock, size: 15, color: Color(0xFF818CF8)),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                                    size: 15,
                                    color: textSecondary,
                                  ),
                                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                ),
                                filled: true,
                                fillColor: isDark
                                    ? const Color(0xFF1A1A22).withValues(alpha: 0.65)
                                    : const Color(0xFFF8FAFC),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white.withValues(alpha: 0.10) : const Color(0xFFCBD5E1),
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white.withValues(alpha: 0.10) : const Color(0xFFCBD5E1),
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Collapsible Server & Workspace Configuration
                            InkWell(
                              onTap: () => setState(() => _showServerSettings = !_showServerSettings),
                              borderRadius: BorderRadius.circular(10),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                                child: Row(
                                  children: [
                                    Icon(
                                      _showServerSettings ? LucideIcons.chevronDown : LucideIcons.chevronRight,
                                      size: 14,
                                      color: textSecondary,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      "Server Endpoint & Workspace Path",
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (_showServerSettings) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF181820).withValues(alpha: 0.65)
                                      : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      "SERVER URL",
                                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: textSecondary),
                                    ),
                                    const SizedBox(height: 4),
                                    TextField(
                                      controller: _serverUrlCtrl,
                                      style: TextStyle(fontSize: 12, color: textPrimary),
                                      onChanged: (_) => _checkServerConnectivity(),
                                      decoration: InputDecoration(
                                        hintText: "https://ava.mahmudhasan.pro",
                                        hintStyle: TextStyle(fontSize: 11, color: textSecondary.withValues(alpha: 0.5)),
                                        isDense: true,
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        filled: true,
                                        fillColor: isDark ? const Color(0xFF121217) : Colors.white,
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: BorderSide(
                                            color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFCBD5E1),
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      "VPS ROOT DIRECTORY",
                                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: textSecondary),
                                    ),
                                    const SizedBox(height: 4),
                                    TextField(
                                      controller: _workspaceCtrl,
                                      style: TextStyle(fontSize: 12, color: textPrimary),
                                      decoration: InputDecoration(
                                        hintText: "/",
                                        hintStyle: TextStyle(fontSize: 11, color: textSecondary.withValues(alpha: 0.5)),
                                        isDense: true,
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        filled: true,
                                        fillColor: isDark ? const Color(0xFF121217) : Colors.white,
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: BorderSide(
                                            color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFCBD5E1),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            if (_errorMessage != null) ...[
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                                decoration: BoxDecoration(
                                  color: Colors.redAccent.withValues(alpha: 0.10),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.redAccent.withValues(alpha: 0.35)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(LucideIcons.alertCircle, size: 14, color: Colors.redAccent),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: const TextStyle(fontSize: 11, color: Colors.redAccent, height: 1.2),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 20),
                            SizedBox(
                              height: 46,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                                      blurRadius: 14,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton(
                                  onPressed: _isAuthenticating ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  child: _isAuthenticating
                                      ? const Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                            ),
                                            SizedBox(width: 10),
                                            Text(
                                              "Authenticating...",
                                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        )
                                      : const Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              "Sign In to AvA Code",
                                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                            ),
                                            SizedBox(width: 8),
                                            Icon(LucideIcons.arrowRight, size: 15),
                                          ],
                                        ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 18),
                            Wrap(
                              alignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 6,
                              children: [
                                Icon(LucideIcons.shieldCheck, size: 12, color: textSecondary.withValues(alpha: 0.7)),
                                Text(
                                  "Protected with Native AvA Core Handshake",
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500,
                                    color: textSecondary.withValues(alpha: 0.7),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
