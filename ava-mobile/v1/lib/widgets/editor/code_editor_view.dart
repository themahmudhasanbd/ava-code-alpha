import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../services/agent_core_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_toast.dart';
import '../../screens/file_edit_screen.dart';

/// Language definition with metadata for IDE styling
class EditorLanguageInfo {
  final String name;
  final String extension;
  final IconData icon;
  final Color color;
  final String defaultIndent;

  const EditorLanguageInfo({
    required this.name,
    required this.extension,
    required this.icon,
    required this.color,
    this.defaultIndent = 'Spaces: 2',
  });

  static EditorLanguageInfo fromExtension(String ext) {
    final clean = ext.toLowerCase().replaceAll('.', '');
    switch (clean) {
      case 'dart':
        return const EditorLanguageInfo(name: 'Dart', extension: 'dart', icon: LucideIcons.fileCode2, color: Color(0xFF00B4AB));
      case 'ts':
      case 'tsx':
        return const EditorLanguageInfo(name: 'TypeScript', extension: 'ts', icon: LucideIcons.fileCode2, color: Color(0xFF3178C6));
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return const EditorLanguageInfo(name: 'JavaScript', extension: 'js', icon: LucideIcons.fileCode2, color: Color(0xFFF7DF1E));
      case 'json':
        return const EditorLanguageInfo(name: 'JSON', extension: 'json', icon: LucideIcons.braces, color: Color(0xFFF59E0B));
      case 'py':
      case 'python':
        return const EditorLanguageInfo(name: 'Python', extension: 'py', icon: LucideIcons.fileCode2, color: Color(0xFF3776AB), defaultIndent: 'Spaces: 4');
      case 'html':
      case 'htm':
        return const EditorLanguageInfo(name: 'HTML', extension: 'html', icon: LucideIcons.code, color: Color(0xFFE34F26));
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return const EditorLanguageInfo(name: 'CSS', extension: 'css', icon: LucideIcons.palette, color: Color(0xFF1572B6));
      case 'md':
      case 'markdown':
        return const EditorLanguageInfo(name: 'Markdown', extension: 'md', icon: LucideIcons.fileText, color: Color(0xFF06B6D4));
      case 'yaml':
      case 'yml':
        return const EditorLanguageInfo(name: 'YAML', extension: 'yaml', icon: LucideIcons.fileText, color: Color(0xFFCB171E));
      case 'sh':
      case 'bash':
      case 'zsh':
        return const EditorLanguageInfo(name: 'Shell', extension: 'sh', icon: LucideIcons.terminal, color: Color(0xFF10B981));
      case 'sql':
        return const EditorLanguageInfo(name: 'SQL', extension: 'sql', icon: LucideIcons.database, color: Color(0xFFEC4899));
      case 'php':
        return const EditorLanguageInfo(name: 'PHP', extension: 'php', icon: LucideIcons.fileCode2, color: Color(0xFF777BB4), defaultIndent: 'Spaces: 4');
      case 'rs':
      case 'rust':
        return const EditorLanguageInfo(name: 'Rust', extension: 'rs', icon: LucideIcons.fileCode2, color: Color(0xFFDEA584), defaultIndent: 'Spaces: 4');
      case 'go':
        return const EditorLanguageInfo(name: 'Go', extension: 'go', icon: LucideIcons.fileCode2, color: Color(0xFF00ADD8), defaultIndent: 'Tabs');
      case 'c':
      case 'cpp':
      case 'h':
      case 'hpp':
        return const EditorLanguageInfo(name: 'C/C++', extension: 'cpp', icon: LucideIcons.fileCode2, color: Color(0xFF00599C), defaultIndent: 'Spaces: 4');
      case 'java':
        return const EditorLanguageInfo(name: 'Java', extension: 'java', icon: LucideIcons.fileCode2, color: Color(0xFFEA2D2E), defaultIndent: 'Spaces: 4');
      case 'kt':
      case 'kts':
        return const EditorLanguageInfo(name: 'Kotlin', extension: 'kt', icon: LucideIcons.fileCode2, color: Color(0xFF7F52FF));
      case 'swift':
        return const EditorLanguageInfo(name: 'Swift', extension: 'swift', icon: LucideIcons.fileCode2, color: Color(0xFFF05138));
      case 'env':
        return const EditorLanguageInfo(name: 'ENV', extension: 'env', icon: LucideIcons.settings2, color: Color(0xFF9CA3AF));
      case 'txt':
      default:
        return const EditorLanguageInfo(name: 'Plain Text', extension: 'txt', icon: LucideIcons.fileText, color: Color(0xFF94A3B8));
    }
  }
}

/// IDE Code Editor Theme Configuration
class CodeEditorTheme {
  final Color bg;
  final Color gutterBg;
  final Color gutterBorder;
  final Color gutterText;
  final Color activeLineGutterText;
  final Color textColor;
  final Color activeLineBg;
  final Color selectionColor;
  final Color cursorColor;
  final Color toolbarBg;
  final Color toolbarBorder;
  final Color statusBarBg;
  final Color statusBarText;
  final Color searchBg;
  final Color accentColor;

  const CodeEditorTheme({
    required this.bg,
    required this.gutterBg,
    required this.gutterBorder,
    required this.gutterText,
    required this.activeLineGutterText,
    required this.textColor,
    required this.activeLineBg,
    required this.selectionColor,
    required this.cursorColor,
    required this.toolbarBg,
    required this.toolbarBorder,
    required this.statusBarBg,
    required this.statusBarText,
    required this.searchBg,
    required this.accentColor,
  });

  static CodeEditorTheme dark() {
    return const CodeEditorTheme(
      bg: Color(0xFF1E1E2E), // Catppuccin Mocha / VS Code dark
      gutterBg: Color(0xFF181825),
      gutterBorder: Color(0xFF313244),
      gutterText: Color(0xFF6C7086),
      activeLineGutterText: Color(0xFF89B4FA),
      textColor: Color(0xFFCDD6F4),
      activeLineBg: Color(0xFF24273A),
      selectionColor: Color(0xFF45475A),
      cursorColor: Color(0xFF89B4FA),
      toolbarBg: Color(0xFF181825),
      toolbarBorder: Color(0xFF313244),
      statusBarBg: Color(0xFF11111B),
      statusBarText: Color(0xFFA6ADC8),
      searchBg: Color(0xFF1E1E2E),
      accentColor: AppTheme.accentTeal,
    );
  }

  static CodeEditorTheme light() {
    return const CodeEditorTheme(
      bg: Color(0xFFFFFFFF), // GitHub Light / One Light
      gutterBg: Color(0xFFF6F8FA),
      gutterBorder: Color(0xFFE2E8F0),
      gutterText: Color(0xFF8C959F),
      activeLineGutterText: Color(0xFF0969DA),
      textColor: Color(0xFF24292F),
      activeLineBg: Color(0xFFF1F5F9),
      selectionColor: Color(0xFFB6E3FF),
      cursorColor: Color(0xFF0969DA),
      toolbarBg: Color(0xFFF6F8FA),
      toolbarBorder: Color(0xFFE2E8F0),
      statusBarBg: Color(0xFFEAEEF2),
      statusBarText: Color(0xFF57606A),
      searchBg: Color(0xFFFFFFFF),
      accentColor: Color(0xFF0D9488),
    );
  }
}

/// Rich IDE Code Editor View with line numbers, gutter, status bar, toolbar,
/// find in file, word wrap, and shortcut controls.
class CodeEditorView extends StatefulWidget {
  final String fullPath;
  final String fileName;
  final String initialContent;
  final AvaAgentCoreService agentCoreService;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final ValueChanged<String>? onSave;
  final ValueChanged<String>? onSelectFileForChat;
  final bool isStandaloneScreen;
  final VoidCallback? onToggleCollapse;
  final bool isTreeCollapsed;

  const CodeEditorView({
    super.key,
    required this.fullPath,
    required this.fileName,
    required this.initialContent,
    required this.agentCoreService,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onSave,
    this.onSelectFileForChat,
    this.isStandaloneScreen = false,
    this.onToggleCollapse,
    this.isTreeCollapsed = false,
  });

  @override
  State<CodeEditorView> createState() => _CodeEditorViewState();
}

class _CodeEditorViewState extends State<CodeEditorView> {
  late TextEditingController _editorController;
  late ScrollController _verticalScrollController;
  late ScrollController _lineNumbersScrollController;
  late ScrollController _horizontalScrollController;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _editorFocusNode = FocusNode();

  late String _savedContent;
  bool _isSaving = false;
  bool _isWordWrap = true;
  bool _showSearchBar = false;
  double _fontSize = 12.5;
  int _currentLine = 1;
  int _currentColumn = 1;
  int _searchMatchIndex = 0;
  List<int> _searchMatchOffsets = [];

  late EditorLanguageInfo _langInfo;

  @override
  void initState() {
    super.initState();
    _savedContent = widget.initialContent;
    _editorController = TextEditingController(text: widget.initialContent);
    _verticalScrollController = ScrollController();
    _lineNumbersScrollController = ScrollController();
    _horizontalScrollController = ScrollController();

    _updateLangInfo();

    // Sync vertical scroll between line numbers and code text
    _verticalScrollController.addListener(_syncGutterScroll);
    _editorController.addListener(_handleTextAndCursorChange);
  }

  @override
  void didUpdateWidget(covariant CodeEditorView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fullPath != widget.fullPath || oldWidget.fileName != widget.fileName) {
      _updateLangInfo();
      _savedContent = widget.initialContent;
      _editorController.text = widget.initialContent;
      _searchController.clear();
      _searchMatchOffsets.clear();
      _searchMatchIndex = 0;
    } else if (oldWidget.initialContent != widget.initialContent && _editorController.text == _savedContent) {
      _savedContent = widget.initialContent;
      _editorController.text = widget.initialContent;
    }
  }

  void _updateLangInfo() {
    final ext = widget.fileName.contains('.') ? widget.fileName.split('.').last : '';
    _langInfo = EditorLanguageInfo.fromExtension(ext);
  }

  void _syncGutterScroll() {
    if (_lineNumbersScrollController.hasClients && _verticalScrollController.hasClients) {
      if (_lineNumbersScrollController.offset != _verticalScrollController.offset) {
        _lineNumbersScrollController.jumpTo(_verticalScrollController.offset);
      }
    }
  }

  void _handleTextAndCursorChange() {
    if (!mounted) return;
    final text = _editorController.text;
    final selection = _editorController.selection;

    int line = 1;
    int col = 1;

    if (selection.isValid && selection.baseOffset >= 0 && selection.baseOffset <= text.length) {
      final textBeforeCursor = text.substring(0, selection.baseOffset);
      final linesBefore = textBeforeCursor.split('\n');
      line = linesBefore.length;
      col = linesBefore.last.length + 1;
    }

    setState(() {
      _currentLine = line;
      _currentColumn = col;
    });

    if (_showSearchBar && _searchController.text.isNotEmpty) {
      _updateSearchMatches();
    }
  }

  @override
  void dispose() {
    _verticalScrollController.removeListener(_syncGutterScroll);
    _verticalScrollController.dispose();
    _lineNumbersScrollController.dispose();
    _horizontalScrollController.dispose();
    _editorController.dispose();
    _searchController.dispose();
    _editorFocusNode.dispose();
    super.dispose();
  }

  bool get _isDirty => _editorController.text != _savedContent;

  List<String> get _lines => _editorController.text.split('\n');

  int get _totalLines => _lines.isEmpty ? 1 : _lines.length;

  String get _formattedFileSize {
    final bytes = _editorController.text.length;
    if (bytes > 1048576) {
      return '${(bytes / 1048576).toStringAsFixed(1)} MB';
    }
    if (bytes > 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '$bytes B';
  }

  Future<void> _handleSave() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);
    final textToSave = _editorController.text;

    try {
      final success = await widget.agentCoreService.updateWorkspaceFileContent(
        widget.fullPath,
        textToSave,
      );

      if (mounted) {
        setState(() {
          _isSaving = false;
          if (success) {
            _savedContent = textToSave;
          }
        });

        if (success) {
          AppToast.fileSaved(context, widget.fileName);
          widget.onSave?.call(textToSave);
        } else {
          AppToast.error(context, 'Failed to save "${widget.fileName}"');
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSaving = false);
        AppToast.error(context, 'Save error');
      }
    }
  }

  void _handleRevert() {
    setState(() {
      _editorController.text = _savedContent;
    });
    AppToast.info(context, 'Reverted unsaved changes');
  }

  void _handleCopyAll() {
    Clipboard.setData(ClipboardData(text: _editorController.text));
    AppToast.copied(context, 'Copied ${_editorController.text.length} characters');
  }

  void _toggleFind() {
    setState(() {
      _showSearchBar = !_showSearchBar;
      if (!_showSearchBar) {
        _searchController.clear();
        _searchMatchOffsets.clear();
        _searchMatchIndex = 0;
      }
    });
  }

  void _updateSearchMatches() {
    final query = _searchController.text;
    if (query.isEmpty) {
      setState(() {
        _searchMatchOffsets = [];
        _searchMatchIndex = 0;
      });
      return;
    }

    final text = _editorController.text;
    final List<int> offsets = [];
    int index = text.toLowerCase().indexOf(query.toLowerCase());
    while (index != -1) {
      offsets.add(index);
      index = text.toLowerCase().indexOf(query.toLowerCase(), index + 1);
    }

    setState(() {
      _searchMatchOffsets = offsets;
      if (_searchMatchIndex >= offsets.length) {
        _searchMatchIndex = offsets.isEmpty ? 0 : offsets.length - 1;
      }
    });
  }

  void _jumpToNextMatch() {
    if (_searchMatchOffsets.isEmpty) return;
    setState(() {
      _searchMatchIndex = (_searchMatchIndex + 1) % _searchMatchOffsets.length;
    });
    _selectCurrentMatch();
  }

  void _jumpToPreviousMatch() {
    if (_searchMatchOffsets.isEmpty) return;
    setState(() {
      _searchMatchIndex = (_searchMatchIndex - 1 + _searchMatchOffsets.length) % _searchMatchOffsets.length;
    });
    _selectCurrentMatch();
  }

  void _selectCurrentMatch() {
    if (_searchMatchOffsets.isEmpty) return;
    final offset = _searchMatchOffsets[_searchMatchIndex];
    final length = _searchController.text.length;

    _editorController.selection = TextSelection(
      baseOffset: offset,
      extentOffset: offset + length,
    );
  }

  void _openFullscreenModal() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => FileEditScreen(
          fullPath: widget.fullPath,
          fileName: widget.fileName,
          initialContent: _editorController.text,
          agentCoreService: widget.agentCoreService,
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          onSave: (savedText) {
            setState(() {
              _savedContent = savedText;
              _editorController.text = savedText;
            });
            widget.onSave?.call(savedText);
          },
          onSelectFileForChat: widget.onSelectFileForChat,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.isDark ? CodeEditorTheme.dark() : CodeEditorTheme.light();
    final parts = widget.fullPath.split('/').where((p) => p.isNotEmpty).toList();

    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.keyS, control: true): _handleSave,
        const SingleActivator(LogicalKeyboardKey.keyS, meta: true): _handleSave,
        const SingleActivator(LogicalKeyboardKey.keyF, control: true): _toggleFind,
        const SingleActivator(LogicalKeyboardKey.keyF, meta: true): _toggleFind,
      },
      child: Focus(
        autofocus: false,
        child: Container(
          color: theme.bg,
          child: Column(
            children: [
              // ─── 1. IDE Breadcrumb & Action Toolbar ─────────────────────────
              _buildToolbar(theme, parts),

              // ─── 2. Slide-in Find Bar ──────────────────────────────────────
              if (_showSearchBar) _buildSearchBar(theme),

              // ─── 3. Main Monaco/VSCode Editor Buffer with Line Numbers ──────
              Expanded(
                child: _buildEditorBuffer(theme),
              ),

              // ─── 4. IDE Status Bar at Bottom ──────────────────────────────
              _buildStatusBar(theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToolbar(CodeEditorTheme theme, List<String> parts) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: theme.toolbarBg,
        border: Border(bottom: BorderSide(color: theme.toolbarBorder, width: 0.8)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            // Toggle File Explorer Sidebar
            if (widget.onToggleCollapse != null) ...[
              InkWell(
                onTap: widget.onToggleCollapse,
                borderRadius: BorderRadius.circular(5),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: theme.accentColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        widget.isTreeCollapsed ? LucideIcons.panelLeftOpen : LucideIcons.panelLeftClose,
                        size: 13,
                        color: theme.accentColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        widget.isTreeCollapsed ? 'Explorer' : 'Hide',
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: theme.accentColor),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],

            // Language File Icon & Breadcrumbs
            Icon(_langInfo.icon, size: 14, color: _langInfo.color),
            const SizedBox(width: 6),
            for (int i = 0; i < parts.length; i++) ...[
              if (i > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: Text('›', style: TextStyle(color: theme.gutterText, fontSize: 11)),
                ),
              Text(
                parts[i],
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: (i == parts.length - 1) ? FontWeight.bold : FontWeight.normal,
                  color: (i == parts.length - 1) ? widget.textPrimary : widget.textSecondary,
                ),
              ),
            ],
            if (_isDirty) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.4), width: 0.8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.circleDot, size: 9, color: Colors.amber),
                    SizedBox(width: 3),
                    Text('Unsaved', style: TextStyle(color: Colors.amber, fontSize: 9.5, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
            const SizedBox(width: 14),

            // Separator
            Container(height: 14, width: 1, color: theme.toolbarBorder),
            const SizedBox(width: 8),

            // Font Size Adjuster
            InkWell(
              onTap: () => setState(() => _fontSize = (_fontSize - 1).clamp(10.0, 18.0)),
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Text('A-', style: TextStyle(fontSize: 11, color: widget.textSecondary, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 2),
            InkWell(
              onTap: () => setState(() => _fontSize = (_fontSize + 1).clamp(10.0, 18.0)),
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Text('A+', style: TextStyle(fontSize: 11, color: widget.textSecondary, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 4),

            // Word Wrap Toggle
            IconButton(
              icon: Icon(
                _isWordWrap ? LucideIcons.wrapText : LucideIcons.alignLeft,
                size: 14,
                color: _isWordWrap ? theme.accentColor : widget.textSecondary,
              ),
              tooltip: _isWordWrap ? 'Word Wrap: ON' : 'Word Wrap: OFF (Scroll H)',
              constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
              padding: EdgeInsets.zero,
              onPressed: () => setState(() => _isWordWrap = !_isWordWrap),
            ),

            // Search / Find Toggle
            IconButton(
              icon: Icon(LucideIcons.search, size: 14, color: _showSearchBar ? theme.accentColor : widget.textSecondary),
              tooltip: 'Find (Ctrl+F)',
              constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
              padding: EdgeInsets.zero,
              onPressed: _toggleFind,
            ),

            // Revert Button (when dirty)
            if (_isDirty) ...[
              IconButton(
                icon: const Icon(LucideIcons.undo2, size: 14, color: Colors.amber),
                tooltip: 'Revert changes',
                constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                padding: EdgeInsets.zero,
                onPressed: _handleRevert,
              ),
            ],

            // Copy All Code
            IconButton(
              icon: Icon(LucideIcons.copy, size: 14, color: widget.textSecondary),
              tooltip: 'Copy all code',
              constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
              padding: EdgeInsets.zero,
              onPressed: _handleCopyAll,
            ),

            // Fullscreen Mode (if inside embedded explorer)
            if (!widget.isStandaloneScreen) ...[
              IconButton(
                icon: Icon(LucideIcons.maximize2, size: 14, color: widget.textSecondary),
                tooltip: 'Fullscreen Editor',
                constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                padding: EdgeInsets.zero,
                onPressed: _openFullscreenModal,
              ),
            ],

            const SizedBox(width: 4),

            // Save Button
            ElevatedButton.icon(
              icon: _isSaving
                  ? const SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.black))
                  : const Icon(LucideIcons.save, size: 12),
              label: Text(
                _isDirty ? 'Save *' : 'Saved',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isDirty ? theme.accentColor : const Color(0xFF10B981),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                minimumSize: const Size(54, 26),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
              ),
              onPressed: _isSaving ? null : _handleSave,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar(CodeEditorTheme theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: theme.searchBg,
        border: Border(bottom: BorderSide(color: theme.toolbarBorder, width: 0.8)),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.search, size: 14, color: AppTheme.accentTeal),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: 28,
              child: TextField(
                controller: _searchController,
                autofocus: true,
                onChanged: (val) => _updateSearchMatches(),
                style: TextStyle(color: widget.textPrimary, fontSize: 12, fontFamily: 'monospace'),
                decoration: InputDecoration(
                  hintText: 'Find in file...',
                  hintStyle: TextStyle(color: widget.textSecondary, fontSize: 11.5),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 6),
                ),
              ),
            ),
          ),
          if (_searchMatchOffsets.isNotEmpty) ...[
            Text(
              '${_searchMatchIndex + 1} of ${_searchMatchOffsets.length}',
              style: TextStyle(color: widget.textSecondary, fontSize: 11, fontFamily: 'monospace'),
            ),
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(LucideIcons.chevronUp, size: 14),
              color: widget.textSecondary,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
              onPressed: _jumpToPreviousMatch,
            ),
            IconButton(
              icon: const Icon(LucideIcons.chevronDown, size: 14),
              color: widget.textSecondary,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
              onPressed: _jumpToNextMatch,
            ),
          ] else if (_searchController.text.isNotEmpty) ...[
            const Text(
              'No match',
              style: TextStyle(color: Colors.redAccent, fontSize: 11),
            ),
          ],
          IconButton(
            icon: const Icon(LucideIcons.x, size: 14),
            color: widget.textSecondary,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
            onPressed: _toggleFind,
          ),
        ],
      ),
    );
  }

  Widget _buildEditorBuffer(CodeEditorTheme theme) {
    const lineHeight = 1.55;
    final totalLines = _totalLines;
    final gutterWidth = totalLines > 999 ? 54.0 : (totalLines > 99 ? 44.0 : 36.0);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Gutter / Line Numbers ──────────────────────────────────────────
        Container(
          width: gutterWidth,
          decoration: BoxDecoration(
            color: theme.gutterBg,
            border: Border(right: BorderSide(color: theme.gutterBorder, width: 0.8)),
          ),
          child: ListView.builder(
            controller: _lineNumbersScrollController,
            padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
            itemCount: totalLines,
            itemBuilder: (context, index) {
              final lineNum = index + 1;
              final isActive = lineNum == _currentLine;
              return Container(
                height: _fontSize * lineHeight,
                alignment: Alignment.centerRight,
                child: Text(
                  '$lineNum',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: _fontSize,
                    height: lineHeight,
                    color: isActive ? theme.activeLineGutterText : theme.gutterText,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              );
            },
          ),
        ),

        // ── Text Editor Buffer ─────────────────────────────────────────────
        Expanded(
          child: Container(
            color: theme.bg,
            child: _isWordWrap
                ? TextField(
                    controller: _editorController,
                    focusNode: _editorFocusNode,
                    scrollController: _verticalScrollController,
                    maxLines: null,
                    expands: true,
                    keyboardType: TextInputType.multiline,
                    cursorColor: theme.cursorColor,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: _fontSize,
                      height: lineHeight,
                      color: theme.textColor,
                      letterSpacing: 0.2,
                    ),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.fromLTRB(10, 8, 12, 8),
                    ),
                  )
                : SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    controller: _horizontalScrollController,
                    child: SizedBox(
                      width: 2400,
                      child: TextField(
                        controller: _editorController,
                        focusNode: _editorFocusNode,
                        scrollController: _verticalScrollController,
                        maxLines: null,
                        expands: true,
                        keyboardType: TextInputType.multiline,
                        cursorColor: theme.cursorColor,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: _fontSize,
                          height: lineHeight,
                          color: theme.textColor,
                          letterSpacing: 0.2,
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.fromLTRB(10, 8, 12, 8),
                        ),
                      ),
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBar(CodeEditorTheme theme) {
    return Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: theme.statusBarBg,
        border: Border(top: BorderSide(color: theme.toolbarBorder, width: 0.8)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            // Cursor Line & Col
            Icon(LucideIcons.crosshair, size: 11, color: theme.statusBarText),
            const SizedBox(width: 4),
            Text(
              'Ln $_currentLine, Col $_currentColumn',
              style: TextStyle(fontSize: 10.5, fontFamily: 'monospace', color: theme.statusBarText),
            ),
            const SizedBox(width: 12),

            // Total Lines
            Text(
              '$_totalLines lines',
              style: TextStyle(fontSize: 10.5, color: theme.statusBarText),
            ),
            const SizedBox(width: 12),

            // File Size
            Text(
              _formattedFileSize,
              style: TextStyle(fontSize: 10.5, fontFamily: 'monospace', color: theme.statusBarText),
            ),
            const SizedBox(width: 16),

            // Indentation Info
            Text(
              _langInfo.defaultIndent,
              style: TextStyle(fontSize: 10.5, color: theme.statusBarText),
            ),
            const SizedBox(width: 10),

            // Encoding Info
            Text(
              'UTF-8',
              style: TextStyle(fontSize: 10.5, color: theme.statusBarText),
            ),
            const SizedBox(width: 10),

            // Language Mode Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: _langInfo.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(_langInfo.icon, size: 10.5, color: _langInfo.color),
                  const SizedBox(width: 4),
                  Text(
                    _langInfo.name,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: _langInfo.color,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
