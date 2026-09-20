import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../state/app_state.dart';

/// Full-screen syntax-oriented code and file editor with direct VPS save capabilities
class FileEditorScreen extends StatefulWidget {
  final String filePath;
  final String fileName;
  final String initialContent;

  const FileEditorScreen({
    super.key,
    required this.filePath,
    required this.fileName,
    required this.initialContent,
  });

  @override
  State<FileEditorScreen> createState() => _FileEditorScreenState();
}

class _FileEditorScreenState extends State<FileEditorScreen> {
  late TextEditingController _codeController;
  bool _isSaving = false;
  bool _isModified = false;
  int _lineCount = 1;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.initialContent);
    _updateLineCount();
    _codeController.addListener(() {
      final modified = _codeController.text != widget.initialContent;
      if (modified != _isModified) {
        setState(() => _isModified = modified);
      }
      _updateLineCount();
    });
  }

  void _updateLineCount() {
    final lines = _codeController.text.split('\n').length;
    if (lines != _lineCount) {
      setState(() => _lineCount = lines);
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _saveFile() async {
    setState(() => _isSaving = true);
    final rpc = AppStateScope.of(context).rpcClient;

    try {
      final success = await rpc.writeWorkspaceFile(widget.filePath, _codeController.text);
      if (mounted) {
        setState(() {
          _isSaving = false;
          if (success) {
            _isModified = false;
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: success ? AppColors.accentSuccess : AppColors.accentDanger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            content: Row(
              children: [
                Icon(
                  success ? LucideIcons.checkCircle : LucideIcons.alertCircle,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  success ? 'File saved to VPS successfully' : 'Failed to save file to VPS',
                  style: AppTypography.bodySmall.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.accentDanger,
            content: Text('Save error: $e'),
          ),
        );
      }
    }
  }

  String _getFileExtension() {
    final parts = widget.fileName.split('.');
    if (parts.length > 1) {
      return parts.last.toUpperCase();
    }
    return 'FILE';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 18, color: AppColors.textPrimary),
          onPressed: () {
            if (_isModified) {
              _confirmExit();
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            const Icon(LucideIcons.fileCode2, size: 16, color: AppColors.accentPrimary),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          widget.fileName,
                          style: AppTypography.titleMedium.copyWith(fontSize: 14, fontWeight: FontWeight.w700),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (_isModified) ...[
                        const SizedBox(width: 6),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.accentWarning,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ],
                  ),
                  Text(
                    widget.filePath,
                    style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.textMuted),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ShadcnBadge(label: _getFileExtension(), variant: ShadcnBadgeVariant.outline),
          const SizedBox(width: 8),
          IconButton(
            tooltip: 'Copy Content',
            icon: const Icon(LucideIcons.copy, size: 16, color: AppColors.textSecondary),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: _codeController.text));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('File content copied to clipboard'),
                  duration: Duration(seconds: 1),
                ),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: _isModified ? AppColors.accentPrimary : AppColors.surfaceElevated,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(
                    color: _isModified ? Colors.transparent : AppColors.border,
                    width: 1,
                  ),
                ),
              ),
              onPressed: _isSaving ? null : _saveFile,
              icon: _isSaving
                  ? const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(LucideIcons.save, size: 14),
              label: Text(
                _isSaving ? 'Saving...' : 'Save',
                style: AppTypography.codeSmall.copyWith(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Code Editor Area with Line Numbers
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Line numbers column
                    Container(
                      width: 44,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                        color: Color(0x10000000),
                        border: Border(right: BorderSide(color: Color(0x15FFFFFF))),
                      ),
                      child: ListView.builder(
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _lineCount,
                        itemBuilder: (ctx, i) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 1.2),
                          child: Text(
                            '${i + 1}',
                            textAlign: TextAlign.center,
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 11,
                              color: AppColors.textMuted.withValues(alpha: 0.6),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Editable code field
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(12),
                        child: TextField(
                          controller: _codeController,
                          maxLines: null,
                          keyboardType: TextInputType.multiline,
                          style: AppTypography.codeSmall.copyWith(
                            fontSize: 12.5,
                            height: 1.45,
                            color: AppColors.textPrimary,
                          ),
                          cursorColor: AppColors.accentPrimary,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Footer status bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: const BoxDecoration(
                color: AppColors.surfaceElevated,
                border: Border(top: BorderSide(color: Color(0x18FFFFFF), width: 1)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.fileText, size: 13, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Text(
                    '$_lineCount lines • UTF-8',
                    style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  const Spacer(),
                  if (_isModified)
                    Text(
                      'Unsaved Changes',
                      style: AppTypography.codeSmall.copyWith(
                        fontSize: 11,
                        color: AppColors.accentWarning,
                        fontWeight: FontWeight.w600,
                      ),
                    )
                  else
                    Text(
                      'Synced with VPS',
                      style: AppTypography.codeSmall.copyWith(
                        fontSize: 11,
                        color: AppColors.accentSuccess,
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

  void _confirmExit() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF18181B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x40FFFFFF)),
        ),
        title: Text('Unsaved Changes', style: AppTypography.titleMedium),
        content: Text(
          'You have unsaved changes in this file. Are you sure you want to discard them?',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentDanger,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Discard & Exit'),
          ),
        ],
      ),
    );
  }
}
