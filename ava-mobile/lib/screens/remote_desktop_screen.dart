import 'dart:async';
import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/rfb_client.dart';

/// Full-screen interactive remote desktop viewer for the server's VNC desktop.
///
/// Renders the VNC framebuffer natively in Flutter using CustomPainter,
/// with touch-based pointer events, pinch-to-zoom panning, virtual
/// keyboard, and a floating action toolbar.
class RemoteDesktopScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String serverUrl;
  final VoidCallback? onBack;

  const RemoteDesktopScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.serverUrl,
    this.onBack,
  });

  @override
  State<RemoteDesktopScreen> createState() => _RemoteDesktopScreenState();
}

class _RemoteDesktopScreenState extends State<RemoteDesktopScreen>
    with SingleTickerProviderStateMixin {
  final RfbClient _rfbClient = RfbClient();

  // ─── Connection state ──────────────────────────────────────────────────────
  bool _isConnected = false;
  bool _isConnecting = false;
  bool _isAuthenticated = false;
  String _statusText = "Disconnected";
  String _statusDetail = "";
  int _vncWidth = 1920;
  int _vncHeight = 1080;

  // ─── Framebuffer ───────────────────────────────────────────────────────────
  Uint8List? _framebuffer;
  ui.Image? _renderedImage;
  final GlobalKey _canvasKey = GlobalKey();

  // ─── Touch/Gesture ─────────────────────────────────────────────────────────
  Offset? _lastPanPosition;
  double _scale = 1.0;
  double _prevScale = 1.0;
  Offset _offset = Offset.zero;
  bool _isPanning = false;

  // ─── Virtual Keyboard ──────────────────────────────────────────────────────
  bool _showVirtualKeyboard = false;
  final TextEditingController _keyboardController = TextEditingController();
  final FocusNode _keyboardFocusNode = FocusNode();

  // ─── Toolbar state ─────────────────────────────────────────────────────────
  bool _showToolbar = true;
  Timer? _hideToolbarTimer;

  // ─── Resolution presets ────────────────────────────────────────────────────
  final List<Map<String, String>> _resolutionPresets = [
    {"label": "1920x1080", "value": "1920x1080"},
    {"label": "1280x720", "value": "1280x720"},
    {"label": "1024x768", "value": "1024x768"},
    {"label": "1440x900", "value": "1440x900"},
    {"label": "1600x900", "value": "1600x900"},
  ];

  // ─── Server desktop status ─────────────────────────────────────────────────
  Map<String, dynamic> _desktopStatus = {};

  StreamSubscription? _eventSub;
  StreamSubscription? _frameSub;
  bool _isRendering = false;

  @override
  void initState() {
    super.initState();
    _setupListeners();
    _fetchDesktopStatus();
    _startAutoHideToolbar();
  }

  void _setupListeners() {
    _eventSub = _rfbClient.events.listen((event) {
      if (!mounted) return;
      switch (event.type) {
        case RfbEventType.connecting:
          setState(() {
            _isConnecting = true;
            _statusText = "Connecting...";
          });
          break;
        case RfbEventType.handshake:
          setState(() {
            _statusText = "Handshake...";
            if (event.message != null) _statusDetail = event.message!;
          });
          break;
        case RfbEventType.authenticated:
          setState(() {
            _isAuthenticated = true;
            _statusText = "Initializing screen...";
          });
          break;
        case RfbEventType.framebuffer:
          setState(() {
            _isConnected = true;
            _isConnecting = false;
            _isAuthenticated = true;
            _statusText = "Connected";
            _framebuffer = _rfbClient.framebuffer;
            if (_rfbClient.width > 0 && _rfbClient.height > 0) {
              _vncWidth = _rfbClient.width;
              _vncHeight = _rfbClient.height;
              _statusDetail = "${_rfbClient.width}x${_rfbClient.height}";
            }
          });
          _renderFramebuffer();
          break;
        case RfbEventType.disconnected:
          setState(() {
            _isConnected = false;
            _isConnecting = false;
            _isAuthenticated = false;
            _statusText = "Disconnected";
            _statusDetail = "";
            _framebuffer = null;
            _renderedImage = null;
          });
          break;
        case RfbEventType.error:
          setState(() {
            _isConnecting = false;
            _statusText = "Error";
            _statusDetail = event.message ?? "Unknown error";
          });
          break;
        default:
          break;
      }
    });

    _frameSub = _rfbClient.frames.listen((frame) {
      if (!mounted || frame == null) return;
      _framebuffer = frame;
      _renderFramebuffer();
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    _frameSub?.cancel();
    _rfbClient.dispose();
    _keyboardController.dispose();
    _keyboardFocusNode.dispose();
    _hideToolbarTimer?.cancel();
    super.dispose();
  }

  // ─── Desktop Status ──────────────────────────────────────────────────────
  Future<void> _fetchDesktopStatus() async {
    try {
      final res = await http
          .get(Uri.parse('${widget.serverUrl}/api/desktop/status'))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map) {
          if (mounted) {
            setState(() {
              _desktopStatus = Map<String, dynamic>.from(decoded);
            });
          }
          return;
        }
      }
    } catch (_) {
      // Ignore
    }
  }

  // ─── Connect to VNC ─────────────────────────────────────────────────────
  Future<void> _connect() async {
    if (_isConnecting) return;

    setState(() {
      _isConnecting = true;
      _statusText = "Connecting to VNC...";
      _statusDetail = "";
    });

    await _fetchDesktopStatus();

    // Use VNC password from server status, fall back to default
    final password = _desktopStatus['vncPassword']?.toString() ?? "Samiriso";
    final success = await _rfbClient.connect(widget.serverUrl, password: password);

    if (mounted) {
      if (success) {
        setState(() {
          _isConnected = true;
          _isAuthenticated = true;
          _isConnecting = false;
          _statusText = "Connected";
          _statusDetail = "${_rfbClient.width}x${_rfbClient.height}";
          _vncWidth = _rfbClient.width > 0 ? _rfbClient.width : 1920;
          _vncHeight = _rfbClient.height > 0 ? _rfbClient.height : 1080;
        });
        _fitToScreen();
      } else {
        setState(() {
          _isConnected = false;
          _isConnecting = false;
          if (_statusText != "Error") {
            _statusText = "Connection Failed";
            _statusDetail = "Check VNC server status";
          }
        });
      }
    }
  }

  void _renderFramebuffer() {
    if (_framebuffer == null || _vncWidth <= 0 || _vncHeight <= 0 || _isRendering) return;
    _isRendering = true;

    _convertPixelsToImage(_framebuffer!, _vncWidth, _vncHeight).then((img) {
      _isRendering = false;
      if (mounted) {
        setState(() => _renderedImage = img);
      }
    }).catchError((_) {
      _isRendering = false;
    });
  }

  /// Convert raw BGRA32 pixel buffer directly to a hardware-accelerated ui.Image.
  Future<ui.Image> _convertPixelsToImage(Uint8List pixels, int width, int height) {
    final completer = Completer<ui.Image>();
    ui.decodeImageFromPixels(
      pixels,
      width,
      height,
      ui.PixelFormat.bgra8888,
      (ui.Image img) {
        completer.complete(img);
      },
    );
    return completer.future;
  }

  // ─── Disconnect ─────────────────────────────────────────────────────────
  Future<void> _disconnect() async {
    await _rfbClient.disconnect();
    if (mounted) {
      setState(() {
        _isConnected = false;
        _isConnecting = false;
        _isAuthenticated = false;
        _statusText = "Disconnected";
        _statusDetail = "";
        _framebuffer = null;
        _renderedImage = null;
      });
    }
  }

  // ─── Fit to Screen ──────────────────────────────────────────────────────
  void _fitToScreen() {
    final renderBox = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null || _vncWidth <= 0 || _vncHeight <= 0) return;

    final screenW = renderBox.size.width;
    final screenH = renderBox.size.height;

    final scaleX = screenW / _vncWidth;
    final scaleY = screenH / _vncHeight;
    _scale = scaleX < scaleY ? scaleX : scaleY;

    _offset = Offset(
      (screenW - _vncWidth * _scale) / 2,
      (screenH - _vncHeight * _scale) / 2,
    );

    setState(() {});
  }

  // ─── Pointer Event → VNC ──────────────────────────────────────────────
  void _onPointerDown(PointerDownEvent event) {
    _hideToolbarTimer?.cancel();
    _showToolbarTemporarily();

    if (!_isAuthenticated) return;
    final vncPos = _screenToVnc(event.localPosition);
    _rfbClient.sendPointerEvent(vncPos.dx.toInt(), vncPos.dy.toInt(), buttonMask: 1);
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (!_isAuthenticated) return;
    final vncPos = _screenToVnc(event.localPosition);
    _rfbClient.sendPointerEvent(vncPos.dx.toInt(), vncPos.dy.toInt(), buttonMask: 1);
  }

  void _onPointerUp(PointerUpEvent event) {
    if (!_isAuthenticated) return;
    final vncPos = _screenToVnc(event.localPosition);
    _rfbClient.sendPointerEvent(vncPos.dx.toInt(), vncPos.dy.toInt(), buttonMask: 0);
  }

  /// Convert screen coordinates to VNC framebuffer coordinates.
  Offset _screenToVnc(Offset screenPos) {
    final x = (screenPos.dx - _offset.dx) / _scale;
    final y = (screenPos.dy - _offset.dy) / _scale;
    return Offset(x.clamp(0, _vncWidth - 1).toDouble(), y.clamp(0, _vncHeight - 1).toDouble());
  }

  // ─── Keyboard ──────────────────────────────────────────────────────────
  void _onVirtualKeyboardChanged() {
    final text = _keyboardController.text;
    if (text.isNotEmpty) {
      // Send each character
      for (var i = 0; i < text.length; i++) {
        final char = text[i];
        final code = char.codeUnitAt(0);
        if (code == 0x08) {
          // Backspace
          _rfbClient.sendKeyEvent(0xff08, true);
          _rfbClient.sendKeyEvent(0xff08, false);
        } else if (code == 0x0d || code == 0x0a) {
          // Enter
          _rfbClient.sendKeyEvent(0xff0d, true);
          _rfbClient.sendKeyEvent(0xff0d, false);
        } else {
          _rfbClient.sendKeyEvent(code, true);
          _rfbClient.sendKeyEvent(code, false);
        }
      }
      _keyboardController.clear();
    }
  }

  // ─── Toolbar auto-hide ─────────────────────────────────────────────────
  void _startAutoHideToolbar() {
    _hideToolbarTimer = Timer(const Duration(seconds: 5), () {
      if (mounted && _isConnected) {
        setState(() => _showToolbar = false);
      }
    });
  }

  void _showToolbarTemporarily() {
    setState(() => _showToolbar = true);
    _startAutoHideToolbar();
  }

  void _toggleToolbar() {
    setState(() => _showToolbar = !_showToolbar);
    if (_showToolbar) _startAutoHideToolbar();
  }

  // ─── Resolution Change ─────────────────────────────────────────────────
  Future<void> _changeResolution(String resolution) async {
    try {
      final res = await http
          .post(
            Uri.parse('${widget.serverUrl}/api/desktop/action'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'action': 'resize', 'resolution': resolution}),
          )
          .timeout(const Duration(seconds: 30));

      if (res.statusCode == 200) {
        // Parse resolution
        final parts = resolution.split('x');
        if (parts.length == 2) {
          setState(() {
            _vncWidth = int.tryParse(parts[0]) ?? _vncWidth;
            _vncHeight = int.tryParse(parts[1]) ?? _vncHeight;
          });
          _fitToScreen();
        }

        // Reconnect after resize
        await _disconnect();
        await Future.delayed(const Duration(seconds: 2));
        await _connect();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Resize failed: $e")),
        );
      }
    }
  }

  // ─── Build ─────────────────────────────────────────────────────────────
  Color get _bgColor => widget.isDark ? const Color(0xFF07080A) : const Color(0xFFF8FAFC);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      body: Stack(
        children: [
          // Main canvas area
          _buildCanvasArea(),

          // Status bar (top)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _buildStatusBar(),
          ),

          // Floating toolbar (right side)
          if (_showToolbar)
            Positioned(
              right: 8,
              top: MediaQuery.of(context).padding.top + 48,
              child: _buildFloatingToolbar(),
            ),

          // Connection overlay (when not connected)
          if (!_isConnected && !_isConnecting)
            Positioned.fill(child: _buildConnectionOverlay()),

          // Connecting spinner
          if (_isConnecting)
            Positioned.fill(child: _buildConnectingOverlay()),

          // Virtual keyboard (bottom)
          if (_showVirtualKeyboard && _isConnected)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _buildVirtualKeyboard(),
            ),
        ],
      ),
    );
  }

  // ─── Canvas Area ───────────────────────────────────────────────────────
  Widget _buildCanvasArea() {
    return GestureDetector(
      key: _canvasKey,
      onTap: _toggleToolbar,
      onScaleStart: (details) {
        if (details.pointerCount == 1) {
          _lastPanPosition = details.focalPoint;
          _isPanning = false;
        } else if (details.pointerCount == 2) {
          _prevScale = _scale;
          _isPanning = true;
        }
      },
      onScaleUpdate: (details) {
        if (details.pointerCount == 1 && _lastPanPosition != null) {
          final delta = details.focalPoint - _lastPanPosition!;
          if (delta.distance > 3) {
            _isPanning = true;
            setState(() {
              _offset += delta;
            });
            _lastPanPosition = details.focalPoint;
          }
        } else if (details.pointerCount == 2) {
          setState(() {
            _scale = (_prevScale * details.scale).clamp(0.1, 5.0);
          });
        }
      },
      onScaleEnd: (details) {
        if (!_isPanning && details.pointerCount == 1) {
          // Treat as a tap → send left click
          if (_lastPanPosition != null && _isAuthenticated) {
            final vncPos = _screenToVnc(_lastPanPosition!);
            _rfbClient.sendPointerEvent(vncPos.dx.toInt(), vncPos.dy.toInt(), buttonMask: 1);
            _rfbClient.sendPointerEvent(vncPos.dx.toInt(), vncPos.dy.toInt(), buttonMask: 0);
          }
        }
        _lastPanPosition = null;
        _isPanning = false;
      },
      // Multi-touch pointer events for raw VNC input
      child: Listener(
        onPointerDown: _onPointerDown,
        onPointerMove: _onPointerMove,
        onPointerUp: _onPointerUp,
        child: CustomPaint(
          painter: _VncPainter(
            image: _renderedImage,
            framebuffer: _framebuffer,
            vncWidth: _vncWidth,
            vncHeight: _vncHeight,
            offset: _offset,
            scale: _scale,
            isDark: widget.isDark,
          ),
          size: Size.infinite,
        ),
      ),
    );
  }

  // ─── Status Bar ────────────────────────────────────────────────────────
  Widget _buildStatusBar() {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top,
        left: 12,
        right: 12,
        bottom: 8,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.7),
            Colors.black.withValues(alpha: 0.0),
          ],
        ),
      ),
      child: Row(
        children: [
          // Back button
          _buildToolbarIconButton(
            icon: LucideIcons.arrowLeft,
            onTap: widget.onBack ?? () => Navigator.of(context).pop(),
            tooltip: "Back",
          ),
          const SizedBox(width: 8),

          // Connection status indicator
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _isConnected
                  ? const Color(0xFF10B981)
                  : _isConnecting
                      ? const Color(0xFFF59E0B)
                      : const Color(0xFFEF4444),
              boxShadow: [
                BoxShadow(
                  color: (_isConnected
                          ? const Color(0xFF10B981)
                          : _isConnecting
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFFEF4444))
                      .withValues(alpha: 0.5),
                  blurRadius: 4,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Status text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "Remote Desktop",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.2,
                  ),
                ),
                if (_statusDetail.isNotEmpty)
                  Text(
                    "$_statusText - $_statusDetail",
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white.withValues(alpha: 0.6),
                      fontFamily: 'monospace',
                    ),
                  ),
              ],
            ),
          ),

          // Resolution badge
          if (_isConnected)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                "${_vncWidth}x$_vncHeight",
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  fontFamily: 'monospace',
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Floating Toolbar ──────────────────────────────────────────────────
  Widget _buildFloatingToolbar() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
      decoration: BoxDecoration(
        color: widget.isDark
            ? const Color(0xFF0E1017).withValues(alpha: 0.95)
            : Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: widget.isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Connect / Disconnect
          _buildToolbarIconButton(
            icon: _isConnected ? LucideIcons.unplug : LucideIcons.plug,
            onTap: _isConnected ? _disconnect : _connect,
            tooltip: _isConnected ? "Disconnect" : "Connect",
            color: _isConnected ? const Color(0xFFEF4444) : const Color(0xFF10B981),
          ),
          const SizedBox(height: 4),

          // Fit to screen
          _buildToolbarIconButton(
            icon: LucideIcons.maximize,
            onTap: _fitToScreen,
            tooltip: "Fit to Screen",
          ),
          const SizedBox(height: 4),

          // Virtual Keyboard toggle
          _buildToolbarIconButton(
            icon: LucideIcons.keyboard,
            onTap: () {
              setState(() => _showVirtualKeyboard = !_showVirtualKeyboard);
              if (_showVirtualKeyboard) {
                _keyboardFocusNode.requestFocus();
              }
            },
            tooltip: "Virtual Keyboard",
            isActive: _showVirtualKeyboard,
          ),
          const SizedBox(height: 4),

          // Right click simulation (long press)
          _buildToolbarIconButton(
            icon: LucideIcons.mousePointer2,
            onTap: () {
              // Send right-click at center of screen
              if (_isAuthenticated) {
                final centerX = _vncWidth ~/ 2;
                final centerY = _vncHeight ~/ 2;
                _rfbClient.sendPointerEvent(centerX, centerY, buttonMask: 4);
                _rfbClient.sendPointerEvent(centerX, centerY, buttonMask: 0);
              }
            },
            tooltip: "Right Click",
          ),
          const SizedBox(height: 4),

          // Resolution picker
          _buildToolbarIconButton(
            icon: LucideIcons.monitor,
            onTap: _showResolutionPicker,
            tooltip: "Resolution",
          ),
          const SizedBox(height: 4),

          // Refresh status
          _buildToolbarIconButton(
            icon: LucideIcons.refreshCw,
            onTap: () {
              _fetchDesktopStatus();
              if (_isConnected) {
                _disconnect();
                Future.delayed(const Duration(seconds: 1), _connect);
              }
            },
            tooltip: "Refresh",
          ),
          const SizedBox(height: 4),

          // Ctrl+Alt+Del shortcut
          _buildToolbarIconButton(
            icon: LucideIcons.keyRound,
            onTap: () {
              if (_isAuthenticated) {
                // Ctrl+Alt+Del
                _rfbClient.sendKeyEvent(0xffe3, true); // Ctrl
                _rfbClient.sendKeyEvent(0xffe9, true); // Alt
                _rfbClient.sendKeyEvent(0xffff, true); // Delete
                _rfbClient.sendKeyEvent(0xffff, false);
                _rfbClient.sendKeyEvent(0xffe9, false);
                _rfbClient.sendKeyEvent(0xffe3, false);
              }
            },
            tooltip: "Ctrl+Alt+Del",
          ),
        ],
      ),
    );
  }

  Widget _buildToolbarIconButton({
    required IconData icon,
    required VoidCallback onTap,
    required String tooltip,
    Color? color,
    bool isActive = false,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: isActive
                  ? const Color(0xFF6366F1).withValues(alpha: 0.2)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 16,
              color: color ?? (widget.textPrimary),
            ),
          ),
        ),
      ),
    );
  }

  // ─── Connection Overlay ─────────────────────────────────────────────────
  Widget _buildConnectionOverlay() {
    return Container(
      color: _bgColor,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Desktop icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: widget.isDark ? const Color(0xFF151823) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: widget.isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.black.withValues(alpha: 0.06),
                  ),
                ),
                child: Icon(
                  LucideIcons.monitor,
                  size: 36,
                  color: const Color(0xFF6366F1),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                "Remote Desktop",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: widget.textPrimary,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Connect to the server's VNC desktop.\nXFCE4 desktop environment on display :1",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: widget.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 8),

              // Desktop status info
              if (_desktopStatus.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: widget.isDark ? const Color(0xFF151823) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: widget.isDark
                          ? Colors.white.withValues(alpha: 0.06)
                          : Colors.black.withValues(alpha: 0.04),
                    ),
                  ),
                  child: Column(
                    children: [
                      _buildStatusRow("VNC Status", _desktopStatus['vncRunning'] == true ? "Running" : "Stopped"),
                      _buildStatusRow("Resolution", _desktopStatus['resolution']?.toString() ?? "1920x1080"),
                      _buildStatusRow("Desktop", _desktopStatus['desktopEnvironment']?.toString() ?? "XFCE4"),
                      _buildStatusRow("CPU", _desktopStatus['cpuUsage']?.toString() ?? "-"),
                      _buildStatusRow("Memory", _desktopStatus['memoryUsage']?.toString() ?? "-"),
                      _buildStatusRow("Hostname", _desktopStatus['hostname']?.toString() ?? "-"),
                    ],
                  ),
                ),

              const SizedBox(height: 32),

              // Connect button
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _connect,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.plug, size: 18, color: Colors.white),
                        SizedBox(width: 8),
                        Text(
                          "Connect to Desktop",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Start VNC button (if stopped)
              if (_desktopStatus['vncRunning'] == false)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () async {
                      try {
                        await http.post(
                          Uri.parse('${widget.serverUrl}/api/desktop/action'),
                          headers: {'Content-Type': 'application/json'},
                          body: jsonEncode({'action': 'start'}),
                        );
                        await _fetchDesktopStatus();
                        await Future.delayed(const Duration(seconds: 2));
                        await _connect();
                      } catch (e) { print('Ignored error: $e'); }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                      decoration: BoxDecoration(
                        color: widget.isDark
                            ? const Color(0xFF151823)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: widget.isDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : Colors.black.withValues(alpha: 0.06),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.power, size: 16, color: const Color(0xFF10B981)),
                          const SizedBox(width: 6),
                          Text(
                            "Start VNC Server",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: widget.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: widget.textSecondary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: widget.textPrimary,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  // ─── Connecting Overlay ────────────────────────────────────────────────
  Widget _buildConnectingOverlay() {
    return Container(
      color: _bgColor,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: Color(0xFF6366F1),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _statusText,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: widget.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _statusDetail,
              style: TextStyle(
                fontSize: 12,
                color: widget.textSecondary,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Virtual Keyboard ──────────────────────────────────────────────────
  Widget _buildVirtualKeyboard() {
    return Container(
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0E1017).withValues(alpha: 0.98) : Colors.white.withValues(alpha: 0.98),
        border: Border(
          top: BorderSide(
            color: widget.isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Shortcut row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildShortcutKey("Tab", 0xff09),
                const SizedBox(width: 4),
                _buildShortcutKey("Esc", 0xff1b),
                const SizedBox(width: 4),
                _buildShortcutKey("Ctrl", 0xffe3, isModifier: true),
                const SizedBox(width: 4),
                _buildShortcutKey("Alt", 0xffe9, isModifier: true),
                const SizedBox(width: 4),
                _buildShortcutKey("Del", 0xffff),
                const SizedBox(width: 4),
                _buildShortcutKey("BS", 0xff08),
                const SizedBox(width: 8),
                // Text input field
                Expanded(
                  child: TextField(
                    controller: _keyboardController,
                    focusNode: _keyboardFocusNode,
                    onChanged: (_) => _onVirtualKeyboardChanged(),
                    style: TextStyle(
                      fontSize: 14,
                      color: widget.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: "Type text here...",
                      hintStyle: TextStyle(
                        fontSize: 13,
                        color: widget.textSecondary.withValues(alpha: 0.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: widget.isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.1),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: widget.isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.1),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: Color(0xFF6366F1),
                          width: 1.5,
                        ),
                      ),
                      filled: true,
                      fillColor: widget.isDark
                          ? const Color(0xFF151823)
                          : const Color(0xFFF1F5F9),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutKey(String label, int keysym, {bool isModifier = false}) {
    return GestureDetector(
      onTap: () {
        if (_isAuthenticated) {
          _rfbClient.sendKeyEvent(keysym, true);
          _rfbClient.sendKeyEvent(keysym, false);
        }
      },
      onLongPressStart: isModifier
          ? (_) {
              if (_isAuthenticated) {
                _rfbClient.sendKeyEvent(keysym, true);
              }
            }
          : null,
      onLongPressEnd: isModifier
          ? (_) {
              if (_isAuthenticated) {
                _rfbClient.sendKeyEvent(keysym, false);
              }
            }
          : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: widget.isDark ? const Color(0xFF151823) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: widget.isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: widget.textPrimary,
          ),
        ),
      ),
    );
  }

  // ─── Resolution Picker ─────────────────────────────────────────────────
  void _showResolutionPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: widget.isDark ? const Color(0xFF0E1017) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: widget.textSecondary.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Desktop Resolution",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: widget.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "Changing resolution will restart the VNC session",
                style: TextStyle(
                  fontSize: 12,
                  color: widget.textSecondary,
                ),
              ),
              const SizedBox(height: 12),
              ...(_resolutionPresets.map((preset) => ListTile(
                    leading: Icon(
                      LucideIcons.monitor,
                      size: 18,
                      color: "${_vncWidth}x$_vncHeight" == preset['value']
                          ? const Color(0xFF6366F1)
                          : widget.textSecondary,
                    ),
                    title: Text(
                      preset['label']!,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: widget.textPrimary,
                        fontFamily: 'monospace',
                      ),
                    ),
                    trailing: "${_vncWidth}x$_vncHeight" == preset['value']
                        ? const Icon(LucideIcons.check, size: 16, color: Color(0xFF6366F1))
                        : null,
                    onTap: () {
                      Navigator.pop(context);
                      _changeResolution(preset['value']!);
                    },
                  ))),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

// ─── VNC Framebuffer Painter ───────────────────────────────────────────────
class _VncPainter extends CustomPainter {
  final ui.Image? image;
  final Uint8List? framebuffer;
  final int vncWidth;
  final int vncHeight;
  final Offset offset;
  final double scale;
  final bool isDark;

  _VncPainter({
    required this.image,
    required this.framebuffer,
    required this.vncWidth,
    required this.vncHeight,
    required this.offset,
    required this.scale,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Fill background
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = isDark ? const Color(0xFF07080A) : const Color(0xFFF8FAFC),
    );

    if (image != null) {
      canvas.save();
      canvas.translate(offset.dx, offset.dy);
      canvas.scale(scale);
      canvas.drawImage(image!, Offset.zero, Paint());
      canvas.restore();
    } else {
      // Show placeholder grid when no framebuffer
      _drawPlaceholder(canvas, size);
    }
  }

  void _drawPlaceholder(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isDark
          ? Colors.white.withValues(alpha: 0.03)
          : Colors.black.withValues(alpha: 0.03);

    // Draw grid pattern
    const gridSize = 40.0;
    for (var x = 0.0; x < size.width; x += gridSize) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (var y = 0.0; y < size.height; y += gridSize) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Center icon placeholder
    final iconPaint = Paint()
      ..color = isDark
          ? Colors.white.withValues(alpha: 0.08)
          : Colors.black.withValues(alpha: 0.08);

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(centerX, centerY), width: 80, height: 80),
        const Radius.circular(16),
      ),
      iconPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _VncPainter oldDelegate) {
    return image != oldDelegate.image || offset != oldDelegate.offset || scale != oldDelegate.scale;
  }
}
