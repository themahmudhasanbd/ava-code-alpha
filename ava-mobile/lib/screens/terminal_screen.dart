import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:xterm/xterm.dart';
import '../config/app_config.dart';
import '../utils/app_toast.dart';

// ─────────────────────────────────────────────────────────────────
// High-Contrast Pro Terminal Theme
// ─────────────────────────────────────────────────────────────────

const _terminalDarkTheme = TerminalTheme(
  cursor: Color(0xFF22C55E), // Bright emerald green cursor for crisp visibility
  selection: Color(0x5038BDF8),
  foreground: Color(0xFFE2E8F0),
  background: Color(0xFF080B11),
  black: Color(0xFF1E293B),
  white: Color(0xFFE2E8F0),
  red: Color(0xFFEF4444),
  green: Color(0xFF22C55E),
  yellow: Color(0xFFEAB308),
  blue: Color(0xFF38BDF8),
  magenta: Color(0xFFA855F7),
  cyan: Color(0xFF06B6D4),
  brightBlack: Color(0xFF64748B),
  brightWhite: Color(0xFFFFFFFF),
  brightRed: Color(0xFFF87171),
  brightGreen: Color(0xFF4ADE80),
  brightYellow: Color(0xFFFDE047),
  brightBlue: Color(0xFF60A5FA),
  brightMagenta: Color(0xFFC084FC),
  brightCyan: Color(0xFF22D3EE),
  searchHitBackground: Color(0xFFEAB308),
  searchHitBackgroundCurrent: Color(0xFFF97316),
  searchHitForeground: Color(0xFF000000),
);

// ─────────────────────────────────────────────────────────────────
// Terminal Tab Item Model with Native XTerm Instance
// ─────────────────────────────────────────────────────────────────

class TerminalTabItem {
  final String id;
  String name;
  String cwd;
  final Terminal terminal;
  final TerminalController controller;
  final FocusNode focusNode;
  WebSocketChannel? channel;
  StreamSubscription? sub;
  bool connected;
  bool isConnecting;

  TerminalTabItem({
    required this.id,
    required this.name,
    this.cwd = '/root',
  })  : terminal = Terminal(maxLines: 10000),
        controller = TerminalController(),
        focusNode = FocusNode(),
        connected = false,
        isConnecting = false;
}

// ─────────────────────────────────────────────────────────────────
// Terminal Screen Widget
// ─────────────────────────────────────────────────────────────────

class TerminalScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String vpsWorkspacePath;
  final String? serverUrl;

  const TerminalScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.vpsWorkspacePath,
    this.serverUrl,
  });

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final List<TerminalTabItem> _tabs = [];
  String? _activeTabId;
  bool _isLoadingTabs = true;
  Timer? _heartbeatTimer;
  TerminalCursorType _cursorType = TerminalCursorType.block;
  bool _ctrlActive = false;
  bool _altActive = false;

  // Terminal Special Characters for Row 2
  static const _symbols = [
    '|', '~', '/', '\\', '-', '_', '*', '&', '&&', '\$', '#', '@', '!', '?', ';', ':', '<', '>', '>>', '=', '+', '(', ')', '[', ']', '{', '}', '"', "'", '`',
  ];

  String _wsUrlForTab(TerminalTabItem tab) {
    final base = AppConfig.resolveBaseUrl(widget.serverUrl);
    final uri = Uri.parse(base);
    final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
    final portPart = (uri.hasPort && uri.port != 80 && uri.port != 443) ? ':${uri.port}' : '';
    final params = <String>[];
    if (tab.cwd.isNotEmpty) params.add('cwd=${Uri.encodeComponent(tab.cwd)}');
    params.add('tabId=${Uri.encodeComponent(tab.id)}');
    return '$wsScheme://${uri.host}$portPart/ws/pty?${params.join("&")}';
  }

  TerminalTabItem? get _activeTab {
    if (_activeTabId == null || _tabs.isEmpty) return null;
    return _tabs.firstWhere(
      (t) => t.id == _activeTabId,
      orElse: () => _tabs.first,
    );
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _initTabs();
    _startHeartbeat();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    for (final t in _tabs) {
      t.sub?.cancel();
      t.channel?.sink.close();
      t.focusNode.dispose();
      t.controller.dispose();
    }
    super.dispose();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      final tab = _activeTab;
      if (tab != null && tab.connected) {
        _send(tab, {'type': 'ping'});
      }
    });
  }

  Future<void> _saveTabsToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tabData = _tabs.map((t) => {
        'id': t.id,
        'name': t.name,
        'cwd': t.cwd,
      }).toList();
      await prefs.setString('ava_terminal_tabs', jsonEncode(tabData));
      if (_activeTabId != null) {
        await prefs.setString('ava_terminal_active_tab_id', _activeTabId!);
      }
    } catch (e) { print('Ignored error: $e'); }
  }

  Future<void> _initTabs() async {
    setState(() => _isLoadingTabs = true);
    final initialPath = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : '/root';

    try {
      final prefs = await SharedPreferences.getInstance();
      final savedJson = prefs.getString('ava_terminal_tabs');
      final savedActiveId = prefs.getString('ava_terminal_active_tab_id');

      if (savedJson != null && savedJson.isNotEmpty) {
        final dynamic decoded = jsonDecode(savedJson);
        if (decoded is List && decoded.isNotEmpty) {
          _tabs.clear();
          for (final item in decoded) {
            if (item is Map) {
              final id = item['id']?.toString() ?? '';
              final name = item['name']?.toString() ?? '';
              final cwd = item['cwd']?.toString() ?? initialPath;
              if (id.isNotEmpty) {
                _tabs.add(TerminalTabItem(id: id, name: name.isNotEmpty ? name : id, cwd: cwd));
              }
            }
          }
          if (_tabs.isNotEmpty) {
            if (savedActiveId != null && _tabs.any((t) => t.id == savedActiveId)) {
              _activeTabId = savedActiveId;
            } else {
              _activeTabId = _tabs.first.id;
            }
          }
        }
      }
    } catch (e) { print('Ignored error: $e'); }

    if (_tabs.isEmpty) {
      final tab = TerminalTabItem(id: 'bash-1', name: 'bash 1', cwd: initialPath);
      _tabs.add(tab);
      _activeTabId = tab.id;
      _saveTabsToStorage();
    }

    setState(() => _isLoadingTabs = false);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      for (final tab in _tabs) {
        _connectTab(tab);
      }
      _activeTab?.focusNode.requestFocus();
    });
  }

  // ─── PTY WebSocket Connection & Real-Time Sync ────────────────

  void _connectTab(TerminalTabItem tab) {
    if (tab.id.isEmpty) return;
    tab.isConnecting = true;
    if (mounted) setState(() {});

    tab.sub?.cancel();
    try {
      tab.channel?.sink.close();
    } catch (e) { print('Ignored error: $e'); }

    // Hook native Xterm output directly into PTY WebSocket input
    tab.terminal.onOutput = (data) {
      _send(tab, {
        'type': 'input',
        'payload': {
          'tabId': tab.id,
          'data': data,
        },
      });
    };

    // Hook native Xterm resize to PTY backend resize
    tab.terminal.onResize = (width, height, pw, ph) {
      _send(tab, {
        'type': 'resize',
        'payload': {
          'tabId': tab.id,
          'cols': width,
          'rows': height,
        },
      });
    };

    try {
      final wsUri = Uri.parse(_wsUrlForTab(tab));
      tab.channel = WebSocketChannel.connect(wsUri);
      tab.sub = tab.channel!.stream.listen(
        (raw) {
          try {
            final msg = jsonDecode(raw.toString());
            final type = msg['type'] as String? ?? '';

            if (type == 'output' || type == 'data') {
              final data = msg['data'] as String? ?? '';
              tab.terminal.write(data);
            } else if (type == 'tab_created' || type == 'attached') {
              tab.connected = true;
              tab.isConnecting = false;
              if (mounted) setState(() {});
            } else if (type == 'exit') {
              final code = msg['exitCode'];
              tab.terminal.write('\r\n\x1b[33m[Process exited with code $code]\x1b[0m\r\n');
              tab.connected = false;
              if (mounted) setState(() {});
            }
          } catch (_) {
            tab.terminal.write(raw.toString());
          }
        },
        onError: (e) {
          tab.terminal.write('\r\n\x1b[31m[WebSocket connection error: $e]\x1b[0m\r\n');
          if (mounted) {
            setState(() {
              tab.connected = false;
              tab.isConnecting = false;
            });
          }
        },
        onDone: () {
          if (mounted) {
            setState(() {
              tab.connected = false;
              tab.isConnecting = false;
            });
          }
        },
        cancelOnError: false,
      );

      // Attach to tab in backend
      _send(tab, {
        'type': 'attach',
        'payload': {
          'tabId': tab.id,
          'cwd': tab.cwd,
          'cols': tab.terminal.viewWidth > 0 ? tab.terminal.viewWidth : 80,
          'rows': tab.terminal.viewHeight > 0 ? tab.terminal.viewHeight : 24,
        },
      });

      tab.connected = true;
      tab.isConnecting = false;
      if (mounted) setState(() {});
    } catch (e) {
      tab.terminal.write('\r\n\x1b[31m[WS connect failed: $e]\x1b[0m\r\n');
      tab.connected = false;
      tab.isConnecting = false;
      if (mounted) setState(() {});
    }
  }

  void _send(TerminalTabItem tab, Map<String, dynamic> msg) {
    try {
      tab.channel?.sink.add(jsonEncode(msg));
    } catch (e) { print('Ignored error: $e'); }
  }

  void _sendRaw(String data) {
    final tab = _activeTab;
    if (tab == null || data.isEmpty) return;

    if (!tab.connected) {
      _connectTab(tab);
      Future.delayed(const Duration(milliseconds: 400), () {
        _send(tab, {'type': 'input', 'payload': {'tabId': tab.id, 'data': data}});
      });
    } else {
      _send(tab, {'type': 'input', 'payload': {'tabId': tab.id, 'data': data}});
    }
    tab.focusNode.requestFocus();
  }

  // ─── Tab Operations ───────────────────────────────────────────

  void _createTab() {
    int maxIdx = 0;
    for (final t in _tabs) {
      final match = RegExp(r'bash-(\d+)').firstMatch(t.id);
      if (match != null) {
        final n = int.tryParse(match.group(1) ?? '0') ?? 0;
        if (n > maxIdx) maxIdx = n;
      }
    }
    final nextIdx = maxIdx > 0 ? maxIdx + 1 : _tabs.length + 1;
    final tabId = 'bash-$nextIdx';
    final initialPath = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : '/root';
    final tab = TerminalTabItem(id: tabId, name: 'bash $nextIdx', cwd: initialPath);
    setState(() {
      _tabs.add(tab);
      _activeTabId = tab.id;
    });

    _send(tab, {
      'type': 'create_tab',
      'payload': {
        'tabId': tab.id,
        'cwd': tab.cwd,
        'cols': 80,
        'rows': 24,
      },
    });

    _connectTab(tab);
    tab.focusNode.requestFocus();
    _saveTabsToStorage();
  }

  void _closeTab(String id) {
    final tab = _tabs.firstWhere((t) => t.id == id, orElse: () => TerminalTabItem(id: '', name: ''));
    if (tab.id.isEmpty) return;

    _send(tab, {'type': 'close_tab', 'payload': {'tabId': id}});
    tab.sub?.cancel();
    tab.channel?.sink.close();
    tab.focusNode.dispose();
    tab.controller.dispose();

    setState(() {
      _tabs.removeWhere((t) => t.id == id);
      if (_activeTabId == id) {
        _activeTabId = _tabs.isNotEmpty ? _tabs.first.id : null;
      }
    });

    if (_tabs.isEmpty) {
      _createTab();
    } else {
      _activeTab?.focusNode.requestFocus();
      _saveTabsToStorage();
    }
  }

  void _switchTab(String id) {
    if (_activeTabId == id) return;
    setState(() {
      _activeTabId = id;
    });
    _saveTabsToStorage();
    final current = _activeTab;
    if (current != null) {
      if (!current.connected) {
        _connectTab(current);
      }
      current.focusNode.requestFocus();
    }
  }

  void _clearActiveBuffer() {
    final tab = _activeTab;
    if (tab == null) return;
    tab.terminal.buffer.clear();
    tab.terminal.buffer.clearScrollback();
    tab.terminal.write('\x1b[2J\x1b[H\x1b[3J');
    _send(tab, {'type': 'clear_buffer', 'payload': {'tabId': tab.id}});
    _sendRaw('\x03clear\r');
    if (mounted) {
      AppToast.info(context, 'Terminal output cleared.');
    }
  }

  void _showDeleteOrClearMenu() {
    final tab = _activeTab;
    if (tab == null) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF334155),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4F46E5).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(LucideIcons.eraser, color: Color(0xFF818CF8), size: 18),
                ),
                title: const Text(
                  'Clear Terminal Screen',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                subtitle: const Text(
                  'Wipes terminal output and scrollback buffer',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _clearActiveBuffer();
                },
              ),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(LucideIcons.trash2, color: Color(0xFFEF4444), size: 18),
                ),
                title: Text(
                  _tabs.length > 1 ? 'Close Tab "${tab.name}"' : 'Reset / Restart Shell Session',
                  style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600, fontSize: 14),
                ),
                subtitle: Text(
                  _tabs.length > 1
                      ? 'Terminates this tab and switches to another'
                      : 'Kills active bash session and creates a clean shell',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  final tabToClose = tab.id;
                  if (_tabs.length > 1) {
                    _closeTab(tabToClose);
                  } else {
                    _closeTab(tabToClose);
                    _createTab();
                  }
                  AppToast.info(
                    context,
                    _tabs.length > 1 ? 'Tab closed.' : 'Terminal session restarted.',
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _copyAllOutput() {
    final tab = _activeTab;
    if (tab == null) return;
    final fullText = tab.terminal.buffer.getText();
    Clipboard.setData(ClipboardData(text: fullText));
    AppToast.copied(context, 'Terminal output copied to clipboard.');
  }

  void _toggleCursorType() {
    setState(() {
      if (_cursorType == TerminalCursorType.block) {
        _cursorType = TerminalCursorType.underline;
      } else if (_cursorType == TerminalCursorType.underline) {
        _cursorType = TerminalCursorType.verticalBar;
      } else {
        _cursorType = TerminalCursorType.block;
      }
    });
  }

  String get _cursorLabel {
    switch (_cursorType) {
      case TerminalCursorType.block:
        return '█ BLOCK';
      case TerminalCursorType.underline:
        return '_ LINE';
      case TerminalCursorType.verticalBar:
        return '| BAR';
    }
  }

  // ─── Build UI ─────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_isLoadingTabs) {
      return Container(
        color: const Color(0xFF080B11),
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2.5),
        ),
      );
    }

    final tab = _activeTab;

    return Container(
      color: const Color(0xFF080B11),
      child: Column(
        children: [
          // Top Tab Bar & Global Terminal Actions
          _buildTabBar(),

          // Main Native XTerm Terminal View (Direct Touch & Input Canvas — ZERO input box)
          Expanded(
            child: tab != null
                ? TerminalView(
                    tab.terminal,
                    controller: tab.controller,
                    focusNode: tab.focusNode,
                    autofocus: true,
                    autoResize: true,
                    deleteDetection: true,
                    alwaysShowCursor: true,
                    cursorType: _cursorType,
                    // Native direct keyboard input
                    keyboardType: TextInputType.text,
                    // Tap-to-position cursor navigation:
                    onTapUp: (details, offset) {
                      tab.focusNode.requestFocus();
                      final curY = tab.terminal.buffer.cursorY;
                      if (offset.y == curY) {
                        final curX = tab.terminal.buffer.cursorX;
                        final diff = offset.x - curX;
                        if (diff < 0) {
                          _sendRaw('\x1b[D' * (-diff));
                        } else if (diff > 0) {
                          _sendRaw('\x1b[C' * diff);
                        }
                      }
                    },
                    theme: _terminalDarkTheme,
                    textStyle: const TerminalStyle(
                      fontSize: 13,
                      height: 1.25,
                      fontFamily: 'JetBrainsMono',
                      fontFamilyFallback: [
                        'NotoSansBengali',
                        'monospace',
                        'sans-serif',
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  )
                : const Center(
                    child: CircularProgressIndicator(color: Color(0xFF6366F1)),
                  ),
          ),

          // Quick Keys, Cursor Navigation, Modifiers & Shortcut Chips
          _buildQuickKeysBar(),
        ],
      ),
    );
  }

  // ─── Tab Bar Widget ───────────────────────────────────────────

  Widget _buildTabBar() {
    final tab = _activeTab;
    final isFocused = tab?.focusNode.hasFocus ?? false;

    return Container(
      height: 44,
      decoration: const BoxDecoration(
        color: Color(0xFF0D121F),
        border: Border(bottom: BorderSide(color: Color(0xFF1E293B), width: 0.8)),
      ),
      child: Row(
        children: [
          // Tab Items List
          Expanded(
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              itemCount: _tabs.length,
              itemBuilder: (_, i) => _buildTabChip(_tabs[i]),
            ),
          ),

          // Cursor Switcher Button (Block / Underline / Bar)
          GestureDetector(
            onTap: _toggleCursorType,
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFF2E384D), width: 0.8),
              ),
              child: Text(
                _cursorLabel,
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'JetBrainsMono',
                  color: Color(0xFF22C55E),
                ),
              ),
            ),
          ),

          // Focus indicator badge
          Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: isFocused ? const Color(0xFF4F46E5).withValues(alpha: 0.2) : Colors.transparent,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: isFocused ? const Color(0xFF6366F1).withValues(alpha: 0.4) : Colors.transparent,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  LucideIcons.terminal,
                  size: 13,
                  color: isFocused ? const Color(0xFF818CF8) : const Color(0xFF64748B),
                ),
                const SizedBox(width: 4),
                Text(
                  isFocused ? 'TYPING' : 'TAP TO TYPE',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: isFocused ? const Color(0xFF818CF8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),

          // Add Tab Button
          InkWell(
            onTap: _createTab,
            borderRadius: BorderRadius.circular(6),
            child: Container(
              width: 30,
              height: 28,
              margin: const EdgeInsets.only(right: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF161E2E),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFF2E384D), width: 0.8),
              ),
              child: const Icon(LucideIcons.plus, size: 14, color: Color(0xFF818CF8)),
            ),
          ),

          // Delete / Clear Button
          IconButton(
            icon: const Icon(LucideIcons.trash2, size: 15, color: Color(0xFF94A3B8)),
            onPressed: _showDeleteOrClearMenu,
            tooltip: 'Clear Output or Close Tab',
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
            padding: EdgeInsets.zero,
          ),

          // Copy Output Button
          IconButton(
            icon: const Icon(LucideIcons.copy, size: 14, color: Color(0xFF94A3B8)),
            onPressed: _copyAllOutput,
            tooltip: 'Copy Output',
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
            padding: EdgeInsets.zero,
          ),

          // Reconnect Button
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 13, color: Color(0xFF94A3B8)),
            onPressed: () {
              final current = _activeTab;
              if (current != null) _connectTab(current);
            },
            tooltip: 'Reconnect',
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
            padding: const EdgeInsets.only(right: 6),
          ),
        ],
      ),
    );
  }

  Widget _buildTabChip(TerminalTabItem tab) {
    final isActive = tab.id == _activeTabId;

    return GestureDetector(
      onTap: () => _switchTab(tab.id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF4F46E5) : const Color(0xFF161E2E),
          borderRadius: BorderRadius.circular(7),
          border: Border.all(
            color: isActive ? const Color(0xFF6366F1) : const Color(0xFF2E384D),
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: tab.connected
                    ? const Color(0xFF22C55E)
                    : (tab.isConnecting ? const Color(0xFFEAB308) : const Color(0xFFEF4444)),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              tab.name,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive ? Colors.white : const Color(0xFF94A3B8),
              ),
            ),
            if (_tabs.length > 1) ...[
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () => _closeTab(tab.id),
                child: Icon(
                  LucideIcons.x,
                  size: 11,
                  color: isActive ? Colors.white70 : const Color(0xFF64748B),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─── Quick Keys & Helper Bar ──────────────────────────────────

  Widget _buildQuickKeysBar() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0B0F19),
        border: Border(
          top: BorderSide(color: Color(0xFF1E293B), width: 0.8),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row 1: System Modifiers, Navigation & Core Action Keys (Horizontally Scrollable)
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              children: [
                // System Modifiers
                _systemBtn('ESC', () => _sendKeyWithModifiers('\x1b')),
                _systemBtn('TAB', () => _sendKeyWithModifiers('\t')),
                _modifierToggleBtn(
                  'CTRL',
                  isActive: _ctrlActive,
                  onTap: () => setState(() => _ctrlActive = !_ctrlActive),
                  activeColor: const Color(0xFF818CF8),
                ),
                _modifierToggleBtn(
                  'ALT',
                  isActive: _altActive,
                  onTap: () => setState(() => _altActive = !_altActive),
                  activeColor: const Color(0xFFF59E0B),
                ),

                const VerticalDivider(color: Color(0xFF1E293B), width: 8, indent: 4, endIndent: 4),

                // Directional Navigation
                _navBtn('←', () => _sendRaw('\x1b[D')),
                _navBtn('→', () => _sendRaw('\x1b[C')),
                _navBtn('↑', () => _sendRaw('\x1b[A')),
                _navBtn('↓', () => _sendRaw('\x1b[B')),

                const VerticalDivider(color: Color(0xFF1E293B), width: 8, indent: 4, endIndent: 4),

                // Navigation & Editing
                _systemBtn('HOME', () => _sendRaw('\x01')),
                _systemBtn('END', () => _sendRaw('\x05')),
                _systemBtn('PGUP', () => _sendRaw('\x1b[5~')),
                _systemBtn('PGDN', () => _sendRaw('\x1b[6~')),
                _systemBtn('INS', () => _sendRaw('\x1b[2~')),
                _systemBtn('DEL', () => _sendRaw('\x1b[3~')),
                _systemBtn('BKSP', () => _sendRaw('\x7f')),
                _systemBtn('ENTER', () => _sendRaw('\r'), isAccent: true),

                const VerticalDivider(color: Color(0xFF1E293B), width: 8, indent: 4, endIndent: 4),

                // Quick Ctrl Combinations (1-tap execution)
                _ctrlPill('Ctrl+C', () => _sendRaw('\x03'), isDanger: true),
                _ctrlPill('Ctrl+D', () => _sendRaw('\x04')),
                _ctrlPill('Ctrl+Z', () => _sendRaw('\x1a')),
                _ctrlPill('Ctrl+A', () => _sendRaw('\x01')),
                _ctrlPill('Ctrl+E', () => _sendRaw('\x05')),
                _ctrlPill('Ctrl+L', () => _sendRaw('\x0c')),
                _ctrlPill('Ctrl+R', () => _sendRaw('\x12')),
                _ctrlPill('Ctrl+W', () => _sendRaw('\x17')),
                _ctrlPill('Ctrl+U', () => _sendRaw('\x15')),
                _ctrlPill('Ctrl+K', () => _sendRaw('\x0b')),
              ],
            ),
          ),

          // Row 2: Function Keys (F1-F12) & Symbols (Horizontally Scrollable)
          SizedBox(
            height: 34,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
              children: [
                // Function Keys (F1 - F12)
                _functionKeyBtn('F1', '\x1bOP'),
                _functionKeyBtn('F2', '\x1bOQ'),
                _functionKeyBtn('F3', '\x1bOR'),
                _functionKeyBtn('F4', '\x1bOS'),
                _functionKeyBtn('F5', '\x1b[15~'),
                _functionKeyBtn('F6', '\x1b[17~'),
                _functionKeyBtn('F7', '\x1b[18~'),
                _functionKeyBtn('F8', '\x1b[19~'),
                _functionKeyBtn('F9', '\x1b[20~'),
                _functionKeyBtn('F10', '\x1b[21~'),
                _functionKeyBtn('F11', '\x1b[22~'),
                _functionKeyBtn('F12', '\x1b[24~'),

                const VerticalDivider(color: Color(0xFF1E293B), width: 8, indent: 3, endIndent: 3),

                // Terminal Symbols
                ..._symbols.map((sym) => _symbolBtn(sym)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _sendKeyWithModifiers(String key) {
    if (_ctrlActive) {
      setState(() => _ctrlActive = false);
      if (key.length == 1) {
        final code = key.codeUnitAt(0);
        if (code >= 65 && code <= 90) { // A-Z
          _sendRaw(String.fromCharCode(code - 64));
          return;
        } else if (code >= 97 && code <= 122) { // a-z
          _sendRaw(String.fromCharCode(code - 96));
          return;
        }
      }
    }
    if (_altActive) {
      setState(() => _altActive = false);
      _sendRaw('\x1b$key');
      return;
    }
    _sendRaw(key);
  }

  Widget _systemBtn(String label, VoidCallback onTap, {bool isAccent = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(horizontal: 7),
        decoration: BoxDecoration(
          color: isAccent
              ? const Color(0xFF22C55E).withValues(alpha: 0.2)
              : const Color(0xFF161E2E),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isAccent ? const Color(0xFF22C55E).withValues(alpha: 0.5) : const Color(0xFF2A364F),
            width: 0.8,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              fontFamily: 'JetBrainsMono',
              color: isAccent ? const Color(0xFF4ADE80) : const Color(0xFFCBD5E1),
            ),
          ),
        ),
      ),
    );
  }

  Widget _modifierToggleBtn(
    String label, {
    required bool isActive,
    required VoidCallback onTap,
    required Color activeColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? activeColor.withValues(alpha: 0.25) : const Color(0xFF161E2E),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isActive ? activeColor : const Color(0xFF2A364F),
            width: 0.8,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              fontFamily: 'JetBrainsMono',
              color: isActive ? activeColor : const Color(0xFF94A3B8),
            ),
          ),
        ),
      ),
    );
  }

  Widget _navBtn(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1A2337),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: const Color(0xFF3B4B6E), width: 0.8),
        ),
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              fontFamily: 'JetBrainsMono',
              color: Color(0xFF818CF8),
            ),
          ),
        ),
      ),
    );
  }

  Widget _ctrlPill(String label, VoidCallback onTap, {bool isDanger = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(horizontal: 7),
        decoration: BoxDecoration(
          color: isDanger
              ? const Color(0xFFEF4444).withValues(alpha: 0.18)
              : const Color(0xFF161E2E),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isDanger
                ? const Color(0xFFEF4444).withValues(alpha: 0.5)
                : const Color(0xFF2A364F),
            width: 0.8,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              fontFamily: 'JetBrainsMono',
              color: isDanger ? const Color(0xFFF87171) : const Color(0xFFCBD5E1),
            ),
          ),
        ),
      ),
    );
  }

  Widget _functionKeyBtn(String label, String escapeSeq) {
    return GestureDetector(
      onTap: () => _sendRaw(escapeSeq),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(horizontal: 7),
        decoration: BoxDecoration(
          color: const Color(0xFF131A29),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: const Color(0xFF222F47), width: 0.7),
        ),
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'JetBrainsMono',
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF38BDF8),
            ),
          ),
        ),
      ),
    );
  }

  Widget _symbolBtn(String sym) {
    return GestureDetector(
      onTap: () => _sendKeyWithModifiers(sym),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(horizontal: 7),
        decoration: BoxDecoration(
          color: const Color(0xFF131A29),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: const Color(0xFF222F47), width: 0.7),
        ),
        child: Center(
          child: Text(
            sym,
            style: const TextStyle(
              fontFamily: 'JetBrainsMono',
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              color: Color(0xFF94A3B8),
            ),
          ),
        ),
      ),
    );
  }
}
