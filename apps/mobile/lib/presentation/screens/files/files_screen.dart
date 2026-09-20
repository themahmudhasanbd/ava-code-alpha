import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../state/app_state.dart';
import 'file_editor_screen.dart';

/// Workspace File Explorer with interactive folder navigation, breadcrumbs,
/// category filters, grid/list view toggles, file creation, deletion, and code editor.
class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  String _currentPath = '/var/www/ava-code-alpha';
  List<Map<String, dynamic>> _files = [];
  bool _isLoading = true;
  bool _isGridView = false;
  String _searchQuery = '';
  String _activeFilterCategory = 'all'; // 'all', 'code', 'config', 'docs', 'media'
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
            _currentPath = res['currentPath']?.toString() ?? path;
            final rawFiles = res['files'] as List<dynamic>? ?? [];
            _files = rawFiles.cast<Map<String, dynamic>>();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showToast('Failed to list files: $e', isError: true);
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
      _showToast('Failed to read file from VPS', isError: true);
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

  void _navigateToSegment(int index, List<String> segments) {
    if (index < 0) {
      _loadDirectory('/');
      return;
    }
    final targetPath = '/${segments.sublist(0, index + 1).join('/')}';
    _loadDirectory(targetPath);
  }

  Future<void> _createNewFile() async {
    final rpc = AppStateScope.of(context).rpcClient;
    final nameController = TextEditingController();
    final isDark = AppColors.isDark(context);

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.line(context)),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.filePlus, size: 18, color: AppColors.accentPrimary),
            const SizedBox(width: 8),
            Text('New File', style: AppTypography.titleMedium.copyWith(color: AppColors.text(context))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Create a file in: $_currentPath',
              style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.muted(context)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              autofocus: true,
              style: AppTypography.bodyMedium.copyWith(color: AppColors.text(context)),
              decoration: InputDecoration(
                hintText: 'e.g. index.ts, config.json',
                hintStyle: AppTypography.bodySmall.copyWith(color: AppColors.muted(context)),
                filled: true,
                fillColor: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.line(context)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.accentPrimary),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentPrimary,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );

    if (created == true && nameController.text.trim().isNotEmpty) {
      final fileName = nameController.text.trim();
      final fullPath = _currentPath == '/' ? '/$fileName' : '$_currentPath/$fileName';
      final ok = await rpc.writeWorkspaceFile(fullPath, '');
      if (ok) {
        _showToast('Created $fileName');
        await _loadDirectory(_currentPath);
        if (mounted) {
          _openFile(fullPath, fileName);
        }
      } else {
        _showToast('Failed to create $fileName', isError: true);
      }
    }
    nameController.dispose();
  }

  Future<void> _createNewFolder() async {
    final rpc = AppStateScope.of(context).rpcClient;
    final nameController = TextEditingController();
    final isDark = AppColors.isDark(context);

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.line(context)),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.folderPlus, size: 18, color: AppColors.accentPrimary),
            const SizedBox(width: 8),
            Text('New Folder', style: AppTypography.titleMedium.copyWith(color: AppColors.text(context))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Create folder in: $_currentPath',
              style: AppTypography.codeSmall.copyWith(fontSize: 11, color: AppColors.muted(context)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              autofocus: true,
              style: AppTypography.bodyMedium.copyWith(color: AppColors.text(context)),
              decoration: InputDecoration(
                hintText: 'e.g. components, utils',
                hintStyle: AppTypography.bodySmall.copyWith(color: AppColors.muted(context)),
                filled: true,
                fillColor: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.line(context)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.accentPrimary),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentPrimary,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );

    if (created == true && nameController.text.trim().isNotEmpty) {
      final folderName = nameController.text.trim();
      final fullPath = _currentPath == '/' ? '/$folderName' : '$_currentPath/$folderName';
      final res = await rpc.executeTerminal('mkdir -p "$fullPath"');
      if (res != null) {
        _showToast('Created folder $folderName');
        _loadDirectory(_currentPath);
      } else {
        _showToast('Failed to create folder', isError: true);
      }
    }
    nameController.dispose();
  }

  Future<void> _deleteItem(String fullPath, String name, bool isDirectory) async {
    final rpc = AppStateScope.of(context).rpcClient;
    final isDark = AppColors.isDark(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppColors.line(context)),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.trash2, size: 18, color: AppColors.accentDanger),
            const SizedBox(width: 8),
            Text(
              isDirectory ? 'Delete Folder?' : 'Delete File?',
              style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to delete "$name"? This action cannot be undone on the VPS.',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.subtext(context)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentDanger,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final ok = await rpc.deleteWorkspaceFile(fullPath);
      if (ok) {
        _showToast('Deleted $name');
        _loadDirectory(_currentPath);
      } else {
        _showToast('Failed to delete $name', isError: true);
      }
    }
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: isError ? AppColors.accentDanger : AppColors.accentSuccess,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        content: Text(
          message,
          style: AppTypography.bodySmall.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _getFileCategory(String fileName, bool isDir) {
    if (isDir) return 'folder';
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'dart':
      case 'rs':
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'py':
      case 'go':
      case 'c':
      case 'cpp':
      case 'html':
      case 'css':
        return 'code';
      case 'json':
      case 'toml':
      case 'yaml':
      case 'yml':
      case 'env':
      case 'lock':
        return 'config';
      case 'md':
      case 'txt':
      case 'pdf':
      case 'doc':
        return 'docs';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'gif':
      case 'webp':
      case 'ico':
        return 'media';
      default:
        return 'other';
    }
  }

  IconData _getFileIcon(String fileName, bool isDirectory) {
    if (isDirectory) return LucideIcons.folder;
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'dart':
      case 'rs':
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
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
      case 'jpeg':
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
        return const Color(0xFF00B4AB);
      case 'rs':
        return const Color(0xFFF97316);
      case 'ts':
      case 'js':
      case 'tsx':
      case 'jsx':
        return const Color(0xFFFACC15);
      case 'json':
      case 'yaml':
      case 'toml':
        return const Color(0xFFA78BFA);
      case 'md':
        return AppColors.accentSuccess;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final segments = _currentPath.split('/').where((s) => s.isNotEmpty).toList();

    final filteredFiles = _files.where((f) {
      final name = f['name']?.toString().toLowerCase() ?? '';
      final isDir = f['isDirectory'] == true;
      final category = _getFileCategory(name, isDir);

      final matchesSearch = name.contains(_searchQuery.toLowerCase());
      final matchesCategory = _activeFilterCategory == 'all' ||
          (isDir && _activeFilterCategory != 'media') ||
          category == _activeFilterCategory;

      return matchesSearch && matchesCategory;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      body: Column(
        children: [
          // Breadcrumb Navigation Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.card(context),
              border: Border(bottom: BorderSide(color: AppColors.line(context), width: 1)),
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => _loadDirectory('/'),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.accentPrimary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(LucideIcons.server, size: 14, color: AppColors.accentPrimary),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        GestureDetector(
                          onTap: () => _loadDirectory('/'),
                          child: Text(
                            'root',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: segments.isEmpty ? AppColors.accentPrimary : AppColors.muted(context),
                            ),
                          ),
                        ),
                        for (int i = 0; i < segments.length; i++) ...[
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(LucideIcons.chevronRight, size: 12, color: AppColors.muted(context)),
                          ),
                          GestureDetector(
                            onTap: () => _navigateToSegment(i, segments),
                            child: Text(
                              segments[i],
                              style: AppTypography.codeSmall.copyWith(
                                fontSize: 12,
                                fontWeight: i == segments.length - 1 ? FontWeight.w700 : FontWeight.w500,
                                color: i == segments.length - 1 ? AppColors.text(context) : AppColors.subtext(context),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                IconButton(
                  tooltip: 'Go Up',
                  visualDensity: VisualDensity.compact,
                  icon: Icon(LucideIcons.arrowUp, size: 16, color: AppColors.subtext(context)),
                  onPressed: _navigateUp,
                ),
                IconButton(
                  tooltip: 'Refresh',
                  visualDensity: VisualDensity.compact,
                  icon: Icon(LucideIcons.refreshCw, size: 15, color: AppColors.subtext(context)),
                  onPressed: () => _loadDirectory(_currentPath),
                ),
              ],
            ),
          ),

          // Action Toolbar & Search
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: Row(
              children: [
                Expanded(
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
                              hintText: 'Search in active folder...',
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
                const SizedBox(width: 8),
                // New File
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardElevated(context),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.line(context)),
                  ),
                  child: IconButton(
                    tooltip: 'New File',
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(LucideIcons.filePlus, size: 16, color: AppColors.accentPrimary),
                    onPressed: _createNewFile,
                  ),
                ),
                const SizedBox(width: 6),
                // New Folder
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardElevated(context),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.line(context)),
                  ),
                  child: IconButton(
                    tooltip: 'New Folder',
                    visualDensity: VisualDensity.compact,
                    icon: Icon(LucideIcons.folderPlus, size: 16, color: AppColors.subtext(context)),
                    onPressed: _createNewFolder,
                  ),
                ),
                const SizedBox(width: 6),
                // Grid / List View Toggle
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardElevated(context),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.line(context)),
                  ),
                  child: IconButton(
                    tooltip: _isGridView ? 'List View' : 'Grid View',
                    visualDensity: VisualDensity.compact,
                    icon: Icon(_isGridView ? LucideIcons.list : LucideIcons.layoutGrid, size: 16, color: AppColors.subtext(context)),
                    onPressed: () => setState(() => _isGridView = !_isGridView),
                  ),
                ),
              ],
            ),
          ),

          // Filter Category Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Row(
              children: [
                _buildFilterChip('all', 'All Files', LucideIcons.layers),
                _buildFilterChip('code', 'Code', LucideIcons.fileCode2),
                _buildFilterChip('config', 'Configs', LucideIcons.settings),
                _buildFilterChip('docs', 'Docs', LucideIcons.fileText),
                _buildFilterChip('media', 'Media', LucideIcons.image),
              ],
            ),
          ),
          const SizedBox(height: 4),

          // File List / Grid View
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
                              'No files matching criteria',
                              style: AppTypography.bodyMedium.copyWith(color: AppColors.muted(context)),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => _loadDirectory(_currentPath),
                        color: AppColors.accentPrimary,
                        child: _isGridView
                            ? GridView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 1.6,
                                  crossAxisSpacing: 10,
                                  mainAxisSpacing: 10,
                                ),
                                itemCount: filteredFiles.length,
                                itemBuilder: (context, idx) => _buildGridItem(filteredFiles[idx]),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                itemCount: filteredFiles.length,
                                itemBuilder: (context, idx) => _buildListItem(filteredFiles[idx]),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label, IconData icon) {
    final isSelected = _activeFilterCategory == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        avatar: Icon(
          icon,
          size: 13,
          color: isSelected ? Colors.white : AppColors.subtext(context),
        ),
        label: Text(
          label,
          style: AppTypography.codeSmall.copyWith(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.text(context),
          ),
        ),
        selected: isSelected,
        selectedColor: AppColors.accentPrimary,
        backgroundColor: AppColors.card(context),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isSelected ? AppColors.accentPrimary : AppColors.line(context),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        onSelected: (_) => setState(() => _activeFilterCategory = key),
      ),
    );
  }

  Widget _buildListItem(Map<String, dynamic> file) {
    final name = file['name']?.toString() ?? '';
    final isDir = file['isDirectory'] == true;
    final size = file['size'] as int? ?? 0;
    final fullPath = file['path']?.toString() ?? (_currentPath == '/' ? '/$name' : '$_currentPath/$name');
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
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isDir)
              IconButton(
                tooltip: 'Open Editor',
                icon: Icon(LucideIcons.fileEdit, size: 15, color: AppColors.subtext(context)),
                onPressed: () => _openFile(fullPath, name),
              ),
            PopupMenuButton<String>(
              icon: Icon(LucideIcons.moreVertical, size: 15, color: AppColors.muted(context)),
              padding: EdgeInsets.zero,
              color: AppColors.cardElevated(context),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(color: AppColors.line(context)),
              ),
              onSelected: (val) {
                if (val == 'copy_path') {
                  Clipboard.setData(ClipboardData(text: fullPath));
                  _showToast('Copied path to clipboard');
                } else if (val == 'delete') {
                  _deleteItem(fullPath, name, isDir);
                }
              },
              itemBuilder: (ctx) => [
                PopupMenuItem(
                  value: 'copy_path',
                  child: Row(
                    children: [
                      const Icon(LucideIcons.copy, size: 14),
                      const SizedBox(width: 8),
                      Text('Copy Full Path', style: AppTypography.bodySmall),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(LucideIcons.trash2, size: 14, color: AppColors.accentDanger),
                      const SizedBox(width: 8),
                      Text('Delete', style: AppTypography.bodySmall.copyWith(color: AppColors.accentDanger)),
                    ],
                  ),
                ),
              ],
            ),
          ],
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
  }

  Widget _buildGridItem(Map<String, dynamic> file) {
    final name = file['name']?.toString() ?? '';
    final isDir = file['isDirectory'] == true;
    final size = file['size'] as int? ?? 0;
    final fullPath = file['path']?.toString() ?? (_currentPath == '/' ? '/$name' : '$_currentPath/$name');
    final fileColor = _getFileColor(name, isDir);

    return GestureDetector(
      onTap: () {
        if (isDir) {
          _loadDirectory(fullPath);
        } else {
          _openFile(fullPath, name);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.card(context),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.line(context)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: fileColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(_getFileIcon(name, isDir), size: 16, color: fileColor),
                ),
                PopupMenuButton<String>(
                  icon: Icon(LucideIcons.moreHorizontal, size: 14, color: AppColors.muted(context)),
                  padding: EdgeInsets.zero,
                  color: AppColors.cardElevated(context),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: AppColors.line(context)),
                  ),
                  onSelected: (val) {
                    if (val == 'copy_path') {
                      Clipboard.setData(ClipboardData(text: fullPath));
                      _showToast('Copied path');
                    } else if (val == 'delete') {
                      _deleteItem(fullPath, name, isDir);
                    }
                  },
                  itemBuilder: (ctx) => [
                    PopupMenuItem(
                      value: 'copy_path',
                      child: Text('Copy Path', style: AppTypography.bodySmall),
                    ),
                    PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete', style: AppTypography.bodySmall.copyWith(color: AppColors.accentDanger)),
                    ),
                  ],
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.titleMedium.copyWith(
                    fontSize: 12,
                    fontWeight: isDir ? FontWeight.w600 : FontWeight.w500,
                    color: AppColors.text(context),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isDir ? 'Directory' : _formatFileSize(size),
                  style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.muted(context)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
