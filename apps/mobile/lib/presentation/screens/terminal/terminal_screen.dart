import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../state/app_state.dart';

/// Tab Item Model for Interactive Terminal
class TerminalTab {
  final String id;
  String name;
  String cwd;
  final List<Map<String, dynamic>> logs;
  final ScrollController scrollController;

  TerminalTab({
    required this.id,
    required this.name,
    this.cwd = '/var/www/ava-code',
  })  : logs = [
          {
            'type': 'system',
            'text': '🚀 AvA Code Alpha Terminal Shell connected\nWorking directory: $cwd\nEnter command or use interactive toolbar.',
          },
        ],
        scrollController = ScrollController();
}

/// Rich Multi-Tab Interactive Terminal Screen
class TerminalScreen extends StatefulWidget {
  const TerminalScreen({super.key});

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final List<TerminalTab> _tabs = [];
  String? _activeTabId;
  final TextEditingController _cmdController = TextEditingController();
  final FocusNode _cmdFocusNode = FocusNode();
  bool _isExecuting = false;

  static const _symbols = [
    '|', '~', '/', '\\', '-', '_', '*', '&', '&&', '\$', '#', '@', '!', '?', ';', ':', '<', '>', '>>', '=', '+', '(', ')', '[', ']', '{', '}', '"', "'", '`',
  ];

  static const _quickCommands = [
    'git status',
    'git diff',
    'pm2 list',
    'cargo check',
    'ls -la',
    'bun run build',
    'pwd',
    'whoami',
    'df -h',
  ];

  @override
  void initState() {
    super.initState();
    final initialTab = TerminalTab(id: 'bash-1', name: 'bash 1');
    _tabs.add(initialTab);
    _activeTabId = initialTab.id;
  }

  @override
  void dispose() {
    _cmdController.dispose();
    _cmdFocusNode.dispose();
    for (final t in _tabs) {
      t.scrollController.dispose();
    }
    super.dispose();
  }

  TerminalTab? get _activeTab {
    if (_activeTabId == null || _tabs.isEmpty) return null;
    return _tabs.firstWhere((t) => t.id == _activeTabId, orElse: () => _tabs.first);
  }

  void _addNewTab() {
    final nextNum = _tabs.length + 1;
    final newTab = TerminalTab(id: 'bash-$nextNum', name: 'bash $nextNum');
    setState(() {
      _tabs.add(newTab);
      _activeTabId = newTab.id;
    });
  }

  void _closeTab(String id) {
    if (_tabs.length <= 1) return;
    setState(() {
      _tabs.removeWhere((t) => t.id == id);
      if (_activeTabId == id) {
        _activeTabId = _tabs.first.id;
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final tab = _activeTab;
      if (tab != null && tab.scrollController.hasClients) {
        tab.scrollController.animateTo(
          tab.scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _runCommand([String? explicitCmd]) async {
    final cmd = (explicitCmd ?? _cmdController.text).trim();
    if (cmd.isEmpty || _isExecuting) return;

    final tab = _activeTab;
    if (tab == null) return;

    setState(() {
      tab.logs.add({'type': 'input', 'text': '\$ $cmd'});
      _isExecuting = true;
    });
    _cmdController.clear();
    _scrollToBottom();

    final rpc = AppStateScope.of(context).rpcClient;

    try {
      final res = await rpc.executeTerminal(cmd, cwd: tab.cwd);
      if (mounted) {
        setState(() {
          _isExecuting = false;
          if (res != null) {
            final stdout = res['stdout']?.toString() ?? '';
            final stderr = res['stderr']?.toString() ?? '';
            final exitCode = res['exitCode'] as int? ?? 0;

            if (stdout.isNotEmpty) {
              tab.logs.add({'type': 'stdout', 'text': stdout});
            }
            if (stderr.isNotEmpty) {
              tab.logs.add({'type': 'stderr', 'text': stderr});
            }
            if (stdout.isEmpty && stderr.isEmpty) {
              tab.logs.add({'type': 'system', 'text': 'Command completed (exit $exitCode)'});
            }
          } else {
            tab.logs.add({'type': 'stderr', 'text': 'Error: Failed to communicate with terminal daemon'});
          }
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isExecuting = false;
          tab.logs.add({'type': 'stderr', 'text': 'Terminal execution error: $e'});
        });
        _scrollToBottom();
      }
    }
  }

  void _insertSymbol(String symbol) {
    final text = _cmdController.text;
    final sel = _cmdController.selection;
    if (sel.isValid) {
      final newText = text.replaceRange(sel.start, sel.end, symbol);
      _cmdController.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: sel.start + symbol.length),
      );
    } else {
      _cmdController.text = '$text$symbol';
    }
  }

  void _clearLogs() {
    final tab = _activeTab;
    if (tab == null) return;
    setState(() {
      tab.logs.clear();
      tab.logs.add({'type': 'system', 'text': 'Terminal output cleared.'});
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    final activeTab = _activeTab;

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      body: Column(
        children: [
          // ── Multi-Tab Header Bar ─────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(12, 6, 8, 6),
            decoration: BoxDecoration(
              color: AppColors.card(context),
              border: Border(bottom: BorderSide(color: AppColors.line(context), width: 1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _tabs.map((tab) {
                        final isActive = tab.id == _activeTabId;
                        return Container(
                          margin: const EdgeInsets.only(right: 6),
                          decoration: BoxDecoration(
                            color: isActive
                                ? (isDark ? const Color(0xFF1E1E26) : const Color(0xFFE2E8F0))
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isActive ? AppColors.accentPrimary : Colors.transparent,
                              width: 1,
                            ),
                          ),
                          child: InkWell(
                            onTap: () => setState(() => _activeTabId = tab.id),
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    LucideIcons.terminal,
                                    size: 13,
                                    color: isActive ? AppColors.accentPrimary : AppColors.subtext(context),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    tab.name,
                                    style: AppTypography.codeSmall.copyWith(
                                      fontSize: 11.5,
                                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                                      color: isActive ? AppColors.text(context) : AppColors.subtext(context),
                                    ),
                                  ),
                                  if (_tabs.length > 1) ...[
                                    const SizedBox(width: 6),
                                    InkWell(
                                      onTap: () => _closeTab(tab.id),
                                      child: Icon(
                                        LucideIcons.x,
                                        size: 11,
                                        color: AppColors.muted(context),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'New Terminal Tab',
                  icon: const Icon(LucideIcons.plus, size: 16),
                  onPressed: _addNewTab,
                ),
                IconButton(
                  tooltip: 'Clear Output',
                  icon: Icon(LucideIcons.trash2, size: 15, color: AppColors.subtext(context)),
                  onPressed: _clearLogs,
                ),
              ],
            ),
          ),

          // Working Directory Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
            color: AppColors.cardElevated(context),
            child: Row(
              children: [
                Icon(LucideIcons.folder, size: 12, color: AppColors.muted(context)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'CWD: ${activeTab?.cwd ?? "/var/www/ava-code"}',
                    style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.subtext(context)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const ShadcnBadge(label: 'Bash Live', variant: ShadcnBadgeVariant.success, showDot: true),
              ],
            ),
          ),

          // ── Terminal Output Canvas ───────────────────────────────────────
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF080B11),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line(context)),
              ),
              child: activeTab == null
                  ? const SizedBox()
                  : ListView.builder(
                      controller: activeTab.scrollController,
                      itemCount: activeTab.logs.length,
                      itemBuilder: (context, idx) {
                        final item = activeTab.logs[idx];
                        final type = item['type'];
                        final text = item['text']?.toString() ?? '';

                        Color textColor;
                        FontWeight weight = FontWeight.w400;

                        switch (type) {
                          case 'input':
                            textColor = const Color(0xFF38BDF8);
                            weight = FontWeight.w700;
                            break;
                          case 'stderr':
                            textColor = const Color(0xFFEF4444);
                            break;
                          case 'system':
                            textColor = const Color(0xFF818CF8);
                            break;
                          default:
                            textColor = const Color(0xFFE2E8F0);
                        }

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: SelectableText(
                            text,
                            style: TextStyle(
                              color: textColor,
                              fontSize: 11.5,
                              fontFamily: 'JetBrainsMono',
                              fontWeight: weight,
                              height: 1.4,
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),

          // ── Quick Action / Command Bar ───────────────────────────────────
          Container(
            height: 32,
            margin: const EdgeInsets.symmetric(horizontal: 10),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _quickCommands.length,
              separatorBuilder: (_, __) => const SizedBox(width: 5),
              itemBuilder: (context, i) {
                final cmd = _quickCommands[i];
                return ActionChip(
                  labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                  backgroundColor: isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                  side: BorderSide(color: AppColors.line(context), width: 0.8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  label: Text(
                    cmd,
                    style: AppTypography.codeSmall.copyWith(fontSize: 10.5, color: AppColors.text(context)),
                  ),
                  onPressed: _isExecuting ? null : () => _runCommand(cmd),
                );
              },
            ),
          ),
          const SizedBox(height: 6),

          // ── Special Symbol Toolbar ───────────────────────────────────────
          Container(
            height: 28,
            margin: const EdgeInsets.symmetric(horizontal: 10),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _symbols.length,
              separatorBuilder: (_, __) => const SizedBox(width: 4),
              itemBuilder: (context, i) {
                final sym = _symbols[i];
                return InkWell(
                  onTap: () => _insertSymbol(sym),
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E26) : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: AppColors.line(context)),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      sym,
                      style: TextStyle(
                        fontFamily: 'JetBrainsMono',
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text(context),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // ── Interactive Command Input Field ──────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF13131A) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.line(context)),
                      ),
                      child: Row(
                        children: [
                          const Text(
                            '\$ ',
                            style: TextStyle(
                              color: Color(0xFF38BDF8),
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              fontFamily: 'JetBrainsMono',
                            ),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _cmdController,
                              focusNode: _cmdFocusNode,
                              style: TextStyle(
                                color: AppColors.text(context),
                                fontSize: 12.5,
                                fontFamily: 'JetBrainsMono',
                              ),
                              cursorColor: const Color(0xFF38BDF8),
                              decoration: InputDecoration(
                                hintText: 'Type bash command...',
                                hintStyle: AppTypography.codeSmall.copyWith(color: AppColors.muted(context)),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              onSubmitted: (_) => _runCommand(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.all(10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _isExecuting ? null : () => _runCommand(),
                    child: _isExecuting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(LucideIcons.play, size: 16),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
