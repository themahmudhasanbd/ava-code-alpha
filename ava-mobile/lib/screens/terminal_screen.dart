import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:xterm/xterm.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';

// ─────────────────────────────────────────────────────────────────
// High-Contrast Sleek Obsidian Terminal Theme
// ─────────────────────────────────────────────────────────────────

const _terminalDarkTheme = TerminalTheme(
  cursor: Color(0xFF22C55E), // Emerald Green Cursor
  selection: Color(0x5038BDF8),
  foreground: Color(0xFFF1F5F9),
  background: Color(0xFF0B0D13), // Deep Obsidian
  black: Color(0xFF1E293B),
  white: Color(0xFFF1F5F9),
  red: Color(0xFFEF4444),
  green: Color(0xFF10B981),
  yellow: Color(0xFFF59E0B),
  blue: Color(0xFF38BDF8),
  magenta: Color(0xFFA855F7),
  cyan: Color(0xFF06B6D4),
  brightBlack: Color(0xFF64748B),
  brightWhite: Color(0xFFFFFFFF),
  brightRed: Color(0xFFF87171),
  brightGreen: Color(0xFF34D399),
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
  final AvaAgentCoreService? agentCoreService;

  const TerminalScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.vpsWorkspacePath,
    this.serverUrl,
    this.agentCoreService,
  });

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final List<TerminalTabItem> _tabs = [];
  String? _activeTabId;
  bool _isLoadingTabs = true;
  TerminalCursorType _cursorType = TerminalCursorType.block;
  bool _ctrlActive = false;
  bool _altActive = false;

  // Terminal Special Characters for mobile helper bar
  static const _symbols = [
    '|', '~', '/', '\\', '-', '_', '*', '&', '&&', '\$', '#', '@', '!', '?', ';', ':', '<', '>', '>>', '=', '+', '(', ')', '[', ']', '{', '}', '"', "'", '`',
  ];

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
  }

  @override
  void dispose() {
    for (final t in _tabs) {
      t.sub?.cancel();
      _terminateProcess(t);
      t.focusNode.dispose();
      t.controller.dispose();
    }
    super.dispose();
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
    } catch (_) {}
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
    } catch (_) {}

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

  // ─── PTY AvA Core Native JSON-RPC Streaming ───────────────────

  void _terminateProcess(TerminalTabItem tab) {
    if (widget.agentCoreService != null) {
      widget.agentCoreService!.sendRpc('command/exec/terminate', {
        'processId': 'term_${tab.id}',
      }).catchError((_) => null);
    }
  }

  void _connectTab(TerminalTabItem tab) {
    if (tab.id.isEmpty) return;
    tab.isConnecting = true;
    if (mounted) setState(() {});

    tab.sub?.cancel();

    final processId = 'term_${tab.id}';
    final service = widget.agentCoreService;

    if (service == null) {
      tab.terminal.write('\r\n\x1b[31m[AvA Core service not connected]\x1b[0m\r\n');
      tab.isConnecting = false;
      if (mounted) setState(() {});
      return;
    }

    // 1. Hook native Xterm output directly into PTY JSON-RPC input write
    tab.terminal.onOutput = (data) {
      final bytes = utf8.encode(data);
      final deltaBase64 = base64Encode(bytes);
      service.sendRpc('command/exec/write', {
        'processId': processId,
        'deltaBase64': deltaBase64,
      }).catchError((_) => null);
    };

    // 2. Hook native Xterm resize to PTY backend resize
    tab.terminal.onResize = (width, height, pw, ph) {
      service.sendRpc('command/exec/resize', {
        'processId': processId,
        'size': {
          'rows': height,
          'cols': width,
        },
      }).catchError((_) => null);
    };

    // 3. Listen to AvA Core event stream for output chunks
    tab.sub = service.eventStream.listen((event) {
      final method = event['method']?.toString() ?? event['type']?.toString() ?? '';
      final params = (event['params'] is Map)
          ? Map<String, dynamic>.from(event['params'] as Map)
          : ((event['data'] is Map) ? Map<String, dynamic>.from(event['data'] as Map) : event);

      if (method == 'command/exec/outputDelta') {
        final pId = params['processId']?.toString();
        if (pId == processId) {
          final deltaB64 = params['deltaBase64']?.toString() ?? '';
          if (deltaB64.isNotEmpty) {
            try {
              final bytes = base64Decode(deltaB64);
              final text = utf8.decode(bytes, allowMalformed: true);
              tab.terminal.write(text);
            } catch (_) {}
          }
        }
      }
    });

    // 4. Launch interactive bash PTY process
    () async {
      try {
        await service.ensureSseConnected();
        tab.connected = true;
        tab.isConnecting = false;
        if (mounted) setState(() {});

        final res = await service.sendRpc('command/exec', {
          'command': ['bash', '-l'],
          'processId': processId,
          'tty': true,
          'streamStdin': true,
          'streamStdoutStderr': true,
          'cwd': tab.cwd.isNotEmpty ? tab.cwd : '/root',
          'size': {
            'rows': 24,
            'cols': 80,
          },
        });

        if (res is Map && res['exitCode'] != null) {
          tab.terminal.write('\r\n\x1b[33m[Process exited with code ${res['exitCode']}]\x1b[0m\r\n');
        }
      } catch (err) {
        tab.terminal.write('\r\n\x1b[31m[Terminal connection error: $err]\x1b[0m\r\n');
      } finally {
        tab.connected = false;
        tab.isConnecting = false;
        if (mounted) setState(() {});
      }
    }();
  }

  void _sendRawKey(String key) {
    final tab = _activeTab;
    if (tab == null) return;
    tab.terminal.onOutput?.call(key);
  }

  void _addTab() {
    final newIndex = _tabs.length + 1;
    final initialPath = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : '/root';
    final tab = TerminalTabItem(
      id: 'bash-$newIndex',
      name: 'bash $newIndex',
      cwd: initialPath,
    );
    setState(() {
      _tabs.add(tab);
      _activeTabId = tab.id;
    });
    _saveTabsToStorage();
    _connectTab(tab);
  }

  void _closeTab(String tabId) {
    if (_tabs.length <= 1) {
      AppToast.info(context, 'Cannot close the last terminal tab.');
      return;
    }
    final tabIndex = _tabs.indexWhere((t) => t.id == tabId);
    if (tabIndex == -1) return;

    final tab = _tabs[tabIndex];
    tab.sub?.cancel();
    _terminateProcess(tab);
    tab.focusNode.dispose();
    tab.controller.dispose();

    setState(() {
      _tabs.removeAt(tabIndex);
      if (_activeTabId == tabId) {
        final nextIdx = (tabIndex > 0) ? tabIndex - 1 : 0;
        _activeTabId = _tabs[nextIdx].id;
      }
    });
    _saveTabsToStorage();
  }

  void _renameTab(TerminalTabItem tab) {
    final ctrl = TextEditingController(text: tab.name);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        title: Text('Rename Terminal Tab', style: TextStyle(color: widget.textPrimary, fontSize: 16)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: TextStyle(color: widget.textPrimary),
          decoration: InputDecoration(
            hintText: 'Enter tab name...',
            hintStyle: TextStyle(color: widget.textSecondary),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8)),
            onPressed: () {
              if (ctrl.text.trim().isNotEmpty) {
                setState(() => tab.name = ctrl.text.trim());
                _saveTabsToStorage();
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _restartActiveTab() {
    final tab = _activeTab;
    if (tab == null) return;
    _terminateProcess(tab);
    tab.terminal.write('\r\n\x1b[36m[Restarting terminal session...]\x1b[0m\r\n');
    _connectTab(tab);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingTabs) {
      return Center(
        child: CircularProgressIndicator(
          color: const Color(0xFF38BDF8),
          strokeWidth: 2,
        ),
      );
    }

    final activeTab = _activeTab;

    return Scaffold(
      backgroundColor: const Color(0xFF0B0D13),
      body: SafeArea(
        child: Column(
          children: [
            // ── Tab Bar ─────────────────────────────────────────
            Container(
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFF11141C),
                border: Border(bottom: BorderSide(color: widget.borderColor.withValues(alpha: 0.3))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _tabs.length,
                      itemBuilder: (ctx, i) {
                        final tab = _tabs[i];
                        final isActive = tab.id == _activeTabId;

                        return GestureDetector(
                          onTap: () {
                            setState(() => _activeTabId = tab.id);
                            _saveTabsToStorage();
                            tab.focusNode.requestFocus();
                          },
                          onLongPress: () => _renameTab(tab),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isActive ? const Color(0xFF0B0D13) : Colors.transparent,
                              border: Border(
                                bottom: BorderSide(
                                  color: isActive ? const Color(0xFF38BDF8) : Colors.transparent,
                                  width: 2,
                                ),
                                right: BorderSide(
                                  color: widget.borderColor.withValues(alpha: 0.15),
                                ),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.terminal,
                                  size: 13,
                                  color: isActive ? const Color(0xFF38BDF8) : widget.textSecondary,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  tab.name,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                                    color: isActive ? widget.textPrimary : widget.textSecondary,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () => _closeTab(tab.id),
                                  child: Icon(
                                    LucideIcons.x,
                                    size: 13,
                                    color: widget.textSecondary.withValues(alpha: 0.6),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.plus, size: 16, color: Color(0xFF38BDF8)),
                    onPressed: _addTab,
                    tooltip: 'New Terminal Tab',
                  ),
                  IconButton(
                    icon: Icon(LucideIcons.rotateCw, size: 16, color: widget.textSecondary),
                    onPressed: _restartActiveTab,
                    tooltip: 'Restart Active Tab',
                  ),
                ],
              ),
            ),

            // ── Terminal View ───────────────────────────────────
            Expanded(
              child: activeTab == null
                  ? Center(
                      child: Text('No active terminal', style: TextStyle(color: widget.textSecondary)),
                    )
                  : TerminalView(
                      activeTab.terminal,
                      controller: activeTab.controller,
                      focusNode: activeTab.focusNode,
                      theme: _terminalDarkTheme,
                      cursorType: _cursorType,
                      autofocus: true,
                    ),
            ),

            // ── Mobile Helper Bar: Row 1 (Control Keys) ──────────
            Container(
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFF11141C),
                border: Border(top: BorderSide(color: widget.borderColor.withValues(alpha: 0.2))),
              ),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                children: [
                  _buildKeyButton('ESC', () => _sendRawKey('\x1b')),
                  _buildKeyButton('TAB', () => _sendRawKey('\t')),
                  _buildToggleButton('CTRL', _ctrlActive, () => setState(() => _ctrlActive = !_ctrlActive)),
                  _buildToggleButton('ALT', _altActive, () => setState(() => _altActive = !_altActive)),
                  _buildKeyButton('▲', () => _sendRawKey('\x1b[A')),
                  _buildKeyButton('▼', () => _sendRawKey('\x1b[B')),
                  _buildKeyButton('◄', () => _sendRawKey('\x1b[D')),
                  _buildKeyButton('►', () => _sendRawKey('\x1b[C')),
                  _buildKeyButton('CTRL+C', () => _sendRawKey('\x03'), isAction: true),
                  _buildKeyButton('CTRL+D', () => _sendRawKey('\x04')),
                  _buildKeyButton('CTRL+L', () => _sendRawKey('\x0c')),
                  _buildKeyButton('CLEAR', () {
                    activeTab?.terminal.eraseDisplay();
                    activeTab?.terminal.setCursor(0, 0);
                  }),
                ],
              ),
            ),

            // ── Mobile Helper Bar: Row 2 (Quick Symbols) ─────────
            Container(
              height: 36,
              color: const Color(0xFF0D1017),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                children: _symbols.map((sym) {
                  return InkWell(
                    onTap: () => _sendRawKey(sym),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF171B26),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: widget.borderColor.withValues(alpha: 0.15)),
                      ),
                      child: Center(
                        child: Text(
                          sym,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF38BDF8),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyButton(String label, VoidCallback onTap, {bool isAction = false}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 2),
      child: TextButton(
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          backgroundColor: isAction ? const Color(0xFFEF4444).withValues(alpha: 0.15) : const Color(0xFF1E2433),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(6),
            side: BorderSide(
              color: isAction ? const Color(0xFFEF4444).withValues(alpha: 0.3) : widget.borderColor.withValues(alpha: 0.2),
            ),
          ),
        ),
        onPressed: onTap,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isAction ? const Color(0xFFEF4444) : widget.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildToggleButton(String label, bool isActive, VoidCallback onTap) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 2),
      child: TextButton(
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          backgroundColor: isActive ? const Color(0xFF38BDF8).withValues(alpha: 0.25) : const Color(0xFF1E2433),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(6),
            side: BorderSide(
              color: isActive ? const Color(0xFF38BDF8) : widget.borderColor.withValues(alpha: 0.2),
            ),
          ),
        ),
        onPressed: onTap,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isActive ? const Color(0xFF38BDF8) : widget.textPrimary,
          ),
        ),
      ),
    );
  }
}
