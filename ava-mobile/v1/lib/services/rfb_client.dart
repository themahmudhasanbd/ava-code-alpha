import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:web_socket_channel/web_socket_channel.dart';

enum RfbEventType {
  connecting,
  handshake,
  authenticated,
  framebuffer,
  clipboard,
  warning,
  error,
  disconnected,
}

enum RfbState {
  disconnected,
  version,
  securityTypes,
  vncAuthChallenge,
  securityResult,
  serverInit,
  running,
}

class RfbEvent {
  final RfbEventType type;
  final String? message;
  final int? width;
  final int? height;

  RfbEvent({
    required this.type,
    this.message,
    this.width,
    this.height,
  });
}

/// Lightweight, high-performance RFB (VNC) protocol client communicating over WebSocket.
///
/// Implements RFC 6143 (RFB 3.8), VncAuth (DES-ECB challenge-response),
/// 32-bit BGRA pixel format negotiation, Raw & DesktopSize frame rendering,
/// and pointer/keyboard input forwarding.
class RfbClient {
  WebSocketChannel? _ws;
  StreamSubscription? _wsSub;
  String _password = "Samiriso";

  RfbState _state = RfbState.disconnected;
  bool _authenticated = false;

  int _framebufferWidth = 1920;
  int _framebufferHeight = 1080;
  final int _bytesPerPixel = 4;

  Uint8List? _framebuffer;
  int _framebufferStride = 1920;

  final StreamController<RfbEvent> _eventController = StreamController<RfbEvent>.broadcast();
  Stream<RfbEvent> get events => _eventController.stream;

  final StreamController<Uint8List?> _frameController = StreamController<Uint8List?>.broadcast();
  Stream<Uint8List?> get frames => _frameController.stream;

  final List<int> _buffer = [];
  Completer<bool>? _connectCompleter;
  Timer? _connectTimeoutTimer;

  bool get isConnected => _state != RfbState.disconnected;
  bool get isAuthenticated => _authenticated;
  int get width => _framebufferWidth;
  int get height => _framebufferHeight;
  Uint8List? get framebuffer => _framebuffer;

  /// Connects to VNC over the WebSocket bridge at /ws/desktop.
  Future<bool> connect(String serverUrl, {String password = "Samiriso"}) async {
    await disconnect();

    _password = password;
    _state = RfbState.version;
    _authenticated = false;
    _buffer.clear();

    final uri = Uri.parse(serverUrl);
    final wsScheme = (uri.scheme == "https" || uri.scheme == "wss") ? "wss" : "ws";
    final hostPort = uri.hasPort && uri.port != 80 && uri.port != 443
        ? '${uri.host}:${uri.port}'
        : uri.host;
    final wsUrl = "$wsScheme://$hostPort/ws/desktop";

    _eventController.add(RfbEvent(type: RfbEventType.connecting));
    _connectCompleter = Completer<bool>();

    _connectTimeoutTimer = Timer(const Duration(seconds: 15), () {
      if (_connectCompleter != null && !_connectCompleter!.isCompleted) {
        _eventController.add(RfbEvent(type: RfbEventType.error, message: "Connection timed out"));
        _connectCompleter!.complete(false);
        disconnect();
      }
    });

    try {
      _ws = WebSocketChannel.connect(Uri.parse(wsUrl));
      _wsSub = _ws!.stream.listen(
        _onData,
        onDone: _onDone,
        onError: _onError,
      );

      final success = await _connectCompleter!.future;
      return success;
    } catch (e) {
      _eventController.add(RfbEvent(type: RfbEventType.error, message: "Failed to connect: $e"));
      disconnect();
      return false;
    }
  }

  void _onData(dynamic data) {
    if (data is Uint8List) {
      _buffer.addAll(data);
    } else if (data is List<int>) {
      _buffer.addAll(data);
    } else if (data is String) {
      // Control messages or string fallback
      if (data == "pong") return;
      _buffer.addAll(utf8.encode(data));
    }

    _processBuffer();
  }

  void _onDone() {
    _cleanup();
    _eventController.add(RfbEvent(type: RfbEventType.disconnected));
  }

  void _onError(dynamic error) {
    _eventController.add(RfbEvent(type: RfbEventType.error, message: error.toString()));
    _cleanup();
  }

  Future<void> disconnect() async {
    _cleanup();
    _eventController.add(RfbEvent(type: RfbEventType.disconnected));
  }

  void _cleanup() {
    _connectTimeoutTimer?.cancel();
    _connectTimeoutTimer = null;
    _wsSub?.cancel();
    _wsSub = null;
    try {
      _ws?.sink.close();
    } catch (e) { print('Ignored error: $e'); }
    _ws = null;
    _state = RfbState.disconnected;
    _authenticated = false;
    _buffer.clear();
  }

  void dispose() {
    disconnect();
    _eventController.close();
    _frameController.close();
  }

  void _sendRaw(List<int> bytes) {
    if (_ws == null) return;
    try {
      _ws!.sink.add(Uint8List.fromList(bytes));
    } catch (e) { print('Ignored error: $e'); }
  }

  void _ensureFramebuffer() {
    if (_framebufferWidth <= 0 || _framebufferHeight <= 0) return;
    final requiredSize = _framebufferWidth * _framebufferHeight * _bytesPerPixel;
    if (_framebuffer == null || _framebuffer!.length != requiredSize) {
      _framebuffer = Uint8List(requiredSize);
      _framebufferStride = _framebufferWidth;
    }
  }

  // ─── Protocol State Machine ───────────────────────────────────────────────
  void _processBuffer() {
    bool progress = true;
    while (progress && _buffer.isNotEmpty) {
      final prevLen = _buffer.length;
      final prevState = _state;

      switch (_state) {
        case RfbState.version:
          _handleVersion();
          break;
        case RfbState.securityTypes:
          _handleSecurityTypes();
          break;
        case RfbState.vncAuthChallenge:
          _handleVncAuthChallenge();
          break;
        case RfbState.securityResult:
          _handleSecurityResult();
          break;
        case RfbState.serverInit:
          _handleServerInit();
          break;
        case RfbState.running:
          _handleRunning();
          break;
        case RfbState.disconnected:
          return;
      }

      progress = _buffer.length != prevLen || _state != prevState;
    }
  }

  void _handleVersion() {
    final str = String.fromCharCodes(_buffer);
    final match = RegExp(r'RFB (\d{3})\.(\d{3})').firstMatch(str);
    if (match == null) {
      if (_buffer.length > 30) {
        _buffer.clear();
      }
      return;
    }

    _buffer.clear();
    _state = RfbState.securityTypes;

    // Send preferred RFB version 3.8
    _sendRaw(utf8.encode("RFB 003.008\n"));
    _eventController.add(RfbEvent(
      type: RfbEventType.handshake,
      message: "Connected to VNC server (RFB 3.8)",
    ));
  }

  void _handleSecurityTypes() {
    if (_buffer.isEmpty) return;

    final numTypes = _buffer[0];
    if (numTypes == 0) {
      // Error reason follows (UInt32 len + string)
      if (_buffer.length >= 5) {
        final len = (_buffer[1] << 24) | (_buffer[2] << 16) | (_buffer[3] << 8) | _buffer[4];
        if (_buffer.length >= 5 + len) {
          final reason = utf8.decode(_buffer.sublist(5, 5 + len));
          _eventController.add(RfbEvent(type: RfbEventType.error, message: reason));
          _connectCompleter?.complete(false);
          disconnect();
        }
      }
      return;
    }

    if (_buffer.length < 1 + numTypes) return;

    final types = _buffer.sublist(1, 1 + numTypes);
    _buffer.removeRange(0, 1 + numTypes);

    if (types.contains(2)) {
      // VncAuth
      _sendRaw([2]);
      _state = RfbState.vncAuthChallenge;
    } else if (types.contains(1)) {
      // None
      _sendRaw([1]);
      _state = RfbState.securityResult;
    } else {
      _eventController.add(RfbEvent(type: RfbEventType.error, message: "No supported VNC security types ($types)"));
      _connectCompleter?.complete(false);
      disconnect();
    }
  }

  void _handleVncAuthChallenge() {
    if (_buffer.length < 16) return;

    final challenge = _buffer.sublist(0, 16);
    _buffer.removeRange(0, 16);

    final key = _vncPasswordToKey(_password);
    final response = Uint8List(16);

    for (var i = 0; i < 16; i += 8) {
      final block = challenge.sublist(i, i + 8);
      final encrypted = _desEncryptBlock(block, key);
      response.setRange(i, i + 8, encrypted);
    }

    _sendRaw(response);
    _state = RfbState.securityResult;
  }

  void _handleSecurityResult() {
    if (_buffer.length < 4) return;

    final result = (_buffer[0] << 24) | (_buffer[1] << 16) | (_buffer[2] << 8) | _buffer[3];
    _buffer.removeRange(0, 4);

    if (result == 0) {
      // Security Result: OK
      _authenticated = true;
      _eventController.add(RfbEvent(type: RfbEventType.authenticated));

      // Send ClientInit (shared = 1)
      _sendRaw([1]);
      _state = RfbState.serverInit;
    } else {
      // Security Result: Failed
      if (_buffer.length >= 4) {
        final len = (_buffer[0] << 24) | (_buffer[1] << 16) | (_buffer[2] << 8) | _buffer[3];
        if (_buffer.length >= 4 + len) {
          final errStr = utf8.decode(_buffer.sublist(4, 4 + len));
          _eventController.add(RfbEvent(type: RfbEventType.error, message: "Auth failed: $errStr"));
        }
      } else {
        _eventController.add(RfbEvent(type: RfbEventType.error, message: "VNC Authentication failed"));
      }
      _connectCompleter?.complete(false);
      disconnect();
    }
  }

  void _handleServerInit() {
    if (_buffer.length < 24) return;

    final nameLen = (_buffer[20] << 24) | (_buffer[21] << 16) | (_buffer[22] << 8) | _buffer[23];
    if (_buffer.length < 24 + nameLen) return;

    _framebufferWidth = (_buffer[0] << 8) | _buffer[1];
    _framebufferHeight = (_buffer[2] << 8) | _buffer[3];
    final desktopName = utf8.decode(_buffer.sublist(24, 24 + nameLen));
    _buffer.removeRange(0, 24 + nameLen);

    _ensureFramebuffer();
    _state = RfbState.running;

    // Send SetPixelFormat (32bpp, 24-depth, true-color, BGRA)
    final setPf = Uint8List(20);
    setPf[0] = 0; // msg type
    setPf[4] = 32; // bits per pixel
    setPf[5] = 24; // depth
    setPf[6] = 0; // big endian
    setPf[7] = 1; // true color
    setPf[8] = 0; setPf[9] = 255; // red max
    setPf[10] = 0; setPf[11] = 255; // green max
    setPf[12] = 0; setPf[13] = 255; // blue max
    setPf[14] = 16; // red shift
    setPf[15] = 8; // green shift
    setPf[16] = 0; // blue shift
    _sendRaw(setPf);

    // Send SetEncodings: Raw (0), DesktopSize (-223)
    final setEnc = Uint8List(12);
    setEnc[0] = 2; // SetEncodings
    setEnc[2] = 0; setEnc[3] = 2; // 2 encodings
    // Encoding 0: Raw (0)
    setEnc[4] = 0; setEnc[5] = 0; setEnc[6] = 0; setEnc[7] = 0;
    // Encoding 1: DesktopSize (-223 = 0xFFFFFF21)
    setEnc[8] = 0xFF; setEnc[9] = 0xFF; setEnc[10] = 0xFF; setEnc[11] = 0x21;
    _sendRaw(setEnc);

    // Send initial full FramebufferUpdateRequest
    _sendFramebufferRequest(0, 0, 0, _framebufferWidth, _framebufferHeight);

    _eventController.add(RfbEvent(
      type: RfbEventType.framebuffer,
      message: desktopName,
      width: _framebufferWidth,
      height: _framebufferHeight,
    ));

    _connectTimeoutTimer?.cancel();
    _connectTimeoutTimer = null;
    if (_connectCompleter != null && !_connectCompleter!.isCompleted) {
      _connectCompleter!.complete(true);
    }
  }

  void _sendFramebufferRequest(int incremental, int x, int y, int w, int h) {
    if (_ws == null || _state != RfbState.running) return;
    final req = Uint8List(10);
    req[0] = 3; // FramebufferUpdateRequest
    req[1] = incremental; // 0 = full, 1 = incremental
    req[2] = (x >> 8) & 0xFF; req[3] = x & 0xFF;
    req[4] = (y >> 8) & 0xFF; req[5] = y & 0xFF;
    req[6] = (w >> 8) & 0xFF; req[7] = w & 0xFF;
    req[8] = (h >> 8) & 0xFF; req[9] = h & 0xFF;
    _sendRaw(req);
  }

  void _handleRunning() {
    if (_buffer.isEmpty) return;

    final msgType = _buffer[0];
    switch (msgType) {
      case 0: // FramebufferUpdate
        _processFramebufferUpdate();
        break;
      case 1: // SetColourMapEntries
        if (_buffer.length >= 6) {
          final count = (_buffer[4] << 8) | _buffer[5];
          final totalLen = 6 + count * 6;
          if (_buffer.length >= totalLen) {
            _buffer.removeRange(0, totalLen);
          }
        }
        break;
      case 2: // Bell
        _buffer.removeAt(0);
        break;
      case 3: // ServerCutText
        if (_buffer.length >= 8) {
          final len = (_buffer[4] << 24) | (_buffer[5] << 16) | (_buffer[6] << 8) | _buffer[7];
          if (_buffer.length >= 8 + len) {
            final text = utf8.decode(_buffer.sublist(8, 8 + len));
            _buffer.removeRange(0, 8 + len);
            _eventController.add(RfbEvent(type: RfbEventType.clipboard, message: text));
          }
        }
        break;
      default:
        _buffer.removeAt(0);
        break;
    }
  }

  void _processFramebufferUpdate() {
    if (_buffer.length < 4) return;

    final numRects = (_buffer[2] << 8) | _buffer[3];
    int offset = 4;

    for (var r = 0; r < numRects; r++) {
      if (_buffer.length < offset + 12) return; // Wait for full rectangle header

      final x = (_buffer[offset + 0] << 8) | _buffer[offset + 1];
      final y = (_buffer[offset + 2] << 8) | _buffer[offset + 3];
      final w = (_buffer[offset + 4] << 8) | _buffer[offset + 5];
      final h = (_buffer[offset + 6] << 8) | _buffer[offset + 7];
      final encoding = (_buffer[offset + 8] << 24) |
          (_buffer[offset + 9] << 16) |
          (_buffer[offset + 10] << 8) |
          _buffer[offset + 11];

      offset += 12;

      if (encoding == 0) {
        // Raw Encoding
        final pixelBytes = w * h * _bytesPerPixel;
        if (_buffer.length < offset + pixelBytes) return; // Wait for full pixel payload

        _ensureFramebuffer();
        if (_framebuffer != null) {
          final srcList = _buffer.sublist(offset, offset + pixelBytes);
          for (var row = 0; row < h; row++) {
            final dstStart = ((y + row) * _framebufferStride + x) * _bytesPerPixel;
            final srcStart = row * w * _bytesPerPixel;
            final lineLen = w * _bytesPerPixel;
            if (dstStart + lineLen <= _framebuffer!.length && srcStart + lineLen <= srcList.length) {
              _framebuffer!.setRange(dstStart, dstStart + lineLen, srcList, srcStart);
            }
          }
        }
        offset += pixelBytes;
      } else if (encoding == -223 || encoding == 0xFFFFFF21) {
        // DesktopSize pseudo-encoding
        _framebufferWidth = w;
        _framebufferHeight = h;
        _ensureFramebuffer();
      } else {
        // Unknown encoding: skip
        return;
      }
    }

    _buffer.removeRange(0, offset);

    // Emit updated framebuffer
    _frameController.add(_framebuffer);
    _eventController.add(RfbEvent(
      type: RfbEventType.framebuffer,
      width: _framebufferWidth,
      height: _framebufferHeight,
    ));

    // Request next incremental update
    _sendFramebufferRequest(1, 0, 0, _framebufferWidth, _framebufferHeight);
  }

  // ─── Input Events ─────────────────────────────────────────────────────────

  /// Sends pointer motion / button press / release to VNC.
  /// [buttonMask]: bit 0 = Left (1), bit 1 = Middle (2), bit 2 = Right (4), bit 3 = Wheel Up (8), bit 4 = Wheel Down (16).
  void sendPointerEvent(int x, int y, {int buttonMask = 0}) {
    if (_ws == null || _state != RfbState.running) return;
    final clampedX = x.clamp(0, _framebufferWidth - 1);
    final clampedY = y.clamp(0, _framebufferHeight - 1);

    final msg = Uint8List(6);
    msg[0] = 5; // PointerEvent
    msg[1] = buttonMask;
    msg[2] = (clampedX >> 8) & 0xFF;
    msg[3] = clampedX & 0xFF;
    msg[4] = (clampedY >> 8) & 0xFF;
    msg[5] = clampedY & 0xFF;
    _sendRaw(msg);
  }

  /// Sends keyboard key press or release to VNC.
  void sendKeyEvent(int keysym, bool down) {
    if (_ws == null || _state != RfbState.running) return;
    final msg = Uint8List(8);
    msg[0] = 4; // KeyEvent
    msg[1] = down ? 1 : 0; // down-flag
    msg[2] = 0; msg[3] = 0; // padding
    msg[4] = (keysym >> 24) & 0xFF;
    msg[5] = (keysym >> 16) & 0xFF;
    msg[6] = (keysym >> 8) & 0xFF;
    msg[7] = keysym & 0xFF;
    _sendRaw(msg);
  }

  /// Sends clipboard text to VNC.
  void sendClientCutText(String text) {
    if (_ws == null || _state != RfbState.running) return;
    final bytes = utf8.encode(text);
    final msg = Uint8List(8 + bytes.length);
    msg[0] = 6; // ClientCutText
    msg[1] = 0; msg[2] = 0; msg[3] = 0;
    msg[4] = (bytes.length >> 24) & 0xFF;
    msg[5] = (bytes.length >> 16) & 0xFF;
    msg[6] = (bytes.length >> 8) & 0xFF;
    msg[7] = bytes.length & 0xFF;
    msg.setRange(8, 8 + bytes.length, bytes);
    _sendRaw(msg);
  }

  // ─── DES Key and ECB Encryption for VncAuth ───────────────────────────────

  static List<int> _vncPasswordToKey(String password) {
    final key = List<int>.filled(8, 0);
    final pwBytes = utf8.encode(password);
    for (var i = 0; i < 8; i++) {
      final byte = i < pwBytes.length ? pwBytes[i] : 0;
      var reversed = 0;
      for (var bit = 0; bit < 8; bit++) {
        if ((byte >> bit) & 1 == 1) {
          reversed |= 1 << (7 - bit);
        }
      }
      key[i] = reversed;
    }
    return key;
  }

  static const _ipTable = [
    58, 50, 42, 34, 26, 18, 10, 2,
    60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6,
    64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17, 9, 1,
    59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5,
    63, 55, 47, 39, 31, 23, 15, 7,
  ];

  static const _fpTable = [
    40, 8, 48, 16, 56, 24, 64, 32,
    39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30,
    37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28,
    35, 3, 43, 11, 51, 19, 59, 27,
    32, 2, 42, 10, 50, 18, 58, 26,
    33, 1, 41, 9, 49, 17, 57, 25,
  ];

  static const _eTable = [
    32, 1, 2, 3, 4, 5,
    4, 5, 6, 7, 8, 9,
    8, 9, 10, 11, 12, 13,
    12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21,
    20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29,
    28, 29, 30, 31, 32, 1,
  ];

  static const _pTable = [
    16, 7, 20, 21, 29, 12, 28, 17,
    1, 15, 23, 26, 5, 18, 31, 10,
    2, 8, 24, 14, 32, 27, 3, 9,
    19, 13, 30, 6, 22, 11, 4, 25,
  ];

  static const _sBoxes = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 2, 0, 14, 9, 11, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
  ];

  static List<int> _desEncryptBlock(List<int> block, List<int> key) {
    int data = 0;
    for (var i = 0; i < 8; i++) {
      data = (data << 8) | block[i];
    }

    final subkeys = _generateSubkeys(key);
    data = _permute(data, _ipTable, 64);

    var left = (data >> 32) & 0xFFFFFFFF;
    var right = data & 0xFFFFFFFF;

    for (var round = 0; round < 16; round++) {
      final newRight = left ^ _feistel(right, subkeys[round]);
      left = right;
      right = newRight;
    }

    data = (right.toUnsigned(32) << 32) | left.toUnsigned(32);
    data = _permute(data, _fpTable, 64);

    final result = List<int>.filled(8, 0);
    for (var i = 7; i >= 0; i--) {
      result[i] = data & 0xFF;
      data >>= 8;
    }
    return result;
  }

  static int _permute(int data, List<int> table, int bits) {
    int result = 0;
    for (var i = 0; i < table.length; i++) {
      final bit = (data >> (bits - table[i])) & 1;
      result |= bit << (table.length - 1 - i);
    }
    return result;
  }

  static List<int> _generateSubkeys(List<int> keyBytes) {
    int key = 0;
    for (var i = 0; i < 8; i++) {
      key = (key << 8) | keyBytes[i];
    }

    const pc1 = [
      57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2,
      59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39,
      31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37,
      29, 21, 13, 5, 28, 20, 12, 4,
    ];

    int cd = 0;
    for (var i = 0; i < 56; i++) {
      final bit = (key >> (64 - pc1[i])) & 1;
      cd |= bit << (55 - i);
    }

    var c = (cd >> 28) & 0x0FFFFFFF;
    var d = cd & 0x0FFFFFFF;

    const shifts = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

    const pc2 = [
      14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4,
      26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40,
      51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
    ];

    final subkeys = <int>[];
    for (var round = 0; round < 16; round++) {
      c = ((c << shifts[round]) | (c >> (28 - shifts[round]))) & 0x0FFFFFFF;
      d = ((d << shifts[round]) | (d >> (28 - shifts[round]))) & 0x0FFFFFFF;

      int cdCombined = (c << 28) | d;
      int k = 0;
      for (var i = 0; i < 48; i++) {
        final bit = (cdCombined >> (56 - pc2[i])) & 1;
        k |= bit << (47 - i);
      }
      subkeys.add(k);
    }

    return subkeys;
  }

  static int _feistel(int right, int subkey) {
    int expanded = 0;
    for (var i = 0; i < 48; i++) {
      final bit = (right >> (32 - _eTable[i])) & 1;
      expanded |= bit << (47 - i);
    }

    expanded ^= subkey;
    int sboxOutput = 0;
    for (var i = 0; i < 8; i++) {
      final chunk = (expanded >> (42 - i * 6)) & 0x3F;
      final row = ((chunk >> 5) & 1) << 1 | (chunk & 1);
      final col = (chunk >> 1) & 0xF;
      final val = _sBoxes[i][row * 16 + col];
      sboxOutput |= val << (28 - i * 4);
    }

    int result = 0;
    for (var i = 0; i < 32; i++) {
      final bit = (sboxOutput >> (32 - _pTable[i])) & 1;
      result |= bit << (31 - i);
    }

    return result;
  }
}
