import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../state/app_state.dart';
import 'file_editor_screen.dart';

/// Workspace File Explorer with interactive folder navigation and VPS code editor
class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  String _currentPath = '/var/www/ava-code-alpha';
  List<Map<String, dynamic>> _files = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadDirectory(_currentPath);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDirectory(String path) async {
    setState(() => _isLoading = true);
    final rpc = AppStateScope.of(context).rpcClient;

    try {
      final res = await rpc.getWorkspaceFiles(path);
      if (mounted) {
        setState(() {
          _isLoading = false;
          if (res != null) {
            _currentPath = res['currentPath'] ?? path;
            final rawFiles = res['files'] as List<dynamic>? ?? [];
            _files = rawFiles.cast<Map<String, dynamic>>();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _openFile(String filePath, String fileName) async {
    final rpc = AppStateScope.of(context).rpcClient;
    final res = await rpc.readWorkspaceFile(filePath);

    if (!mounted) return;

    if (res != null) {
      final content = res['content']?.toString() ?? '';
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (ctx) => FileEditorScreen(
            filePath: filePath,
            fileName: fileName,
            initialContent: content,
          ),
        ),
      ).then((_) => _loadDirectory(_currentPath));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to read file from VPS')),
      );
    }
  }

  void _navigateUp() {
    if (_currentPath == '/' || _currentPath.isEmpty) return;
    final segments = _currentPath.split('/').where((s) => s.isNotEmpty).toList();
    if (segments.isNotEmpty) {
      segments.removeLast();
      final parentPath = '/${segments.join('/')}';
      _loadDirectory(parentPath.isEmpty ? '/' : parentPath);
    }
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  IconData _getFileIcon(String fileName, bool isDirectory) {
    if (isDirectory) return LucideIcons.folder;
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'dart':
      case 'rs':
      case 'ts':
      case 'js':
      case 'py':
        return LucideIcons.fileCode2;
      case 'json':
      case 'toml':
      case 'yaml':
      case 'yml':
        return LucideIcons.fileJson;
      case 'md':
      case 'txt':
        return LucideIcons.fileText;
      case 'png':
      case 'jpg':
      case 'svg':
      case 'ico':
        return LucideIcons.image;
      default:
        return LucideIcons.file;
    }
  }

  Color _getFileColor(String fileName, bool isDirectory) {
    if (isDirectory) return const Color(0xFF60A5FA); // Blue
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'dart':
        return const Color(0xFF00B4AB); // Teal/Cyan
      case 'rs':
        return const Color(0xFFF97316); // Orange
      case 'ts':
      case 'js':
        return const Color(0xFFFACC15); // Yellow
      case 'json':
      case 'yaml':
      case 'toml':
        return const Color(0xFFA78BFA); // Purple
      case 'md':
        return AppColors.textPrimary;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredFiles = _files.where((f) {
      final name = f['name']?.toString().toLowerCase() ?? '';
      return name.contains(_searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      body: Column(
        children: [
          // Sub-header bar with breadcrumbs & controls
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.card(context),
              border: Border(bottom: BorderSide(color: AppColors.line(context), width: 1)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.folderTree, size: 15, color: AppColors.accentPrimary),
                const SizedBox(width: 8),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        Text(
                          _currentPath,
                          style: AppTypography.codeSmall.copyWith(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Navigate Up',
                  icon: Icon(LucideIcons.arrowUp, size: 16, color: AppColors.subtext(context)),
                  onPressed: _navigateUp,
                ),
                IconButton(
                  tooltip: 'Refresh',
                  icon: Icon(LucideIcons.refreshCw, size: 16, color: AppColors.subtext(context)),
                  onPressed: () => _loadDirectory(_currentPath),
                ),
              ],
            ),
          ),

          // Search Filter Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: AppColors.cardElevated(context),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.line(context)),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.search, size: 14, color: AppColors.muted(context)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: AppTypography.bodySmall.copyWith(color: AppColors.text(context)),
                      decoration: InputDecoration(
                        hintText: 'Filter files in active directory...',
                        hintStyle: AppTypography.bodySmall.copyWith(color: AppColors.muted(context)),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                      child: Icon(LucideIcons.x, size: 14, color: AppColors.muted(context)),
                    ),
                ],
              ),
            ),
          ),

          // File List View
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentPrimary),
                    ),
                  )
                : filteredFiles.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.folderOpen, size: 36, color: AppColors.muted(context)),
                            const SizedBox(height: 10),
                            Text(
                              'No files found in this directory',
                              style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context)),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        itemCount: filteredFiles.length,
                        itemBuilder: (context, idx) {
                          final file = filteredFiles[idx];
                          final name = file['name']?.toString() ?? '';
                          final isDir = file['isDirectory'] == true;
                          final size = file['size'] as int? ?? 0;
                          final fullPath = file['path']?.toString() ?? '$_currentPath/$name';
                          final fileColor = _getFileColor(name, isDir);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            decoration: BoxDecoration(
                              color: AppColors.card(context),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.line(context)),
                            ),
                            child: ListTile(
                              dense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                              leading: Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: fileColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  _getFileIcon(name, isDir),
                                  size: 16,
                                  color: fileColor,
                                ),
                              ),
                              title: Text(
                                name,
                                style: AppTypography.titleMedium.copyWith(
                                  fontSize: 13,
                                  fontWeight: isDir ? FontWeight.w600 : FontWeight.w500,
                                  color: AppColors.text(context),
                                ),
                              ),
                              subtitle: isDir
                                  ? Text('Directory', style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.muted(context)))
                                  : Text(
                                      _formatFileSize(size),
                                      style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.muted(context)),
                                    ),
                              trailing: isDir
                                  ? Icon(LucideIcons.chevronRight, size: 15, color: AppColors.muted(context))
                                  : IconButton(
                                      icon: Icon(LucideIcons.externalLink, size: 14, color: AppColors.subtext(context)),
                                      onPressed: () => _openFile(fullPath, name),
                                    ),
                              onTap: () {
                                if (isDir) {
                                  _loadDirectory(fullPath);
                                } else {
                                  _openFile(fullPath, name);
                                }
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
