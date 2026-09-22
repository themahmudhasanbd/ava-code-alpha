import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';
import '../widgets/editor/code_editor_view.dart';
import '../theme/app_theme.dart';

class FileEditScreen extends StatefulWidget {
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

  const FileEditScreen({
    super.key,
    required this.fullPath,
    required this.fileName,
    required this.initialContent,
    required this.agentCoreService,
    this.isDark = true,
    this.cardBg = const Color(0xFF181825),
    this.borderColor = const Color(0xFF313244),
    this.textPrimary = const Color(0xFFCDD6F4),
    this.textSecondary = const Color(0xFFA6ADC8),
    this.onSave,
    this.onSelectFileForChat,
  });

  @override
  State<FileEditScreen> createState() => _FileEditScreenState();
}

class _FileEditScreenState extends State<FileEditScreen> {
  late EditorLanguageInfo _langInfo;

  @override
  void initState() {
    super.initState();
    final ext = widget.fileName.contains('.') ? widget.fileName.split('.').last : '';
    _langInfo = EditorLanguageInfo.fromExtension(ext);
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.isDark ? CodeEditorTheme.dark() : CodeEditorTheme.light();

    return Scaffold(
      backgroundColor: theme.bg,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: AppBar(
          backgroundColor: theme.toolbarBg,
          elevation: 0,
          leading: IconButton(
            icon: Icon(LucideIcons.arrowLeft, size: 18, color: widget.textPrimary),
            onPressed: () => Navigator.of(context).pop(),
            tooltip: 'Back',
          ),
          titleSpacing: 0,
          title: Row(
            children: [
              Icon(_langInfo.icon, size: 16, color: _langInfo.color),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      widget.fileName,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.bold,
                        color: widget.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      widget.fullPath,
                      style: TextStyle(
                        fontSize: 9.5,
                        fontFamily: 'monospace',
                        color: widget.textSecondary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            // Language Badge
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _langInfo.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: _langInfo.color.withValues(alpha: 0.3), width: 0.8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(_langInfo.icon, size: 11, color: _langInfo.color),
                  const SizedBox(width: 4),
                  Text(
                    _langInfo.name,
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: _langInfo.color),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Attach to Chat
            if (widget.onSelectFileForChat != null)
              IconButton(
                icon: const Icon(LucideIcons.messageSquareQuote, size: 16, color: AppTheme.accentTeal),
                tooltip: 'Insert to Chat',
                onPressed: () {
                  widget.onSelectFileForChat!(widget.fullPath);
                  Navigator.of(context).pop();
                },
              ),

            const SizedBox(width: 6),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(
              height: 1,
              color: theme.toolbarBorder,
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: CodeEditorView(
          fullPath: widget.fullPath,
          fileName: widget.fileName,
          initialContent: widget.initialContent,
          agentCoreService: widget.agentCoreService,
          isDark: widget.isDark,
          cardBg: widget.cardBg,
          borderColor: widget.borderColor,
          textPrimary: widget.textPrimary,
          textSecondary: widget.textSecondary,
          onSave: widget.onSave,
          onSelectFileForChat: widget.onSelectFileForChat,
          isStandaloneScreen: true,
        ),
      ),
    );
  }
}
