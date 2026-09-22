import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/agent_core_service.dart';
import '../theme/app_theme.dart';
import '../widgets/workspace_file_explorer.dart';
import '../widgets/media_preview_view.dart';
import '../widgets/media/video_element.dart';
import '../utils/app_toast.dart';
import '../utils/file_download_helper.dart';

enum MediaCategoryFilter {
  all,
  images,
  vectors,
  videos,
  audio,
  archives,
  documents,
}

enum MediaSortOption {
  nameAsc,
  nameDesc,
  sizeDesc,
  sizeAsc,
  type,
}

enum MediaViewMode {
  grid,
  list,
  tree,
}

class MediaItem {
  final String name;
  final String relativePath;
  final String fullPath;
  final String size;
  final String extension;
  final bool isDirectory;

  MediaItem({
    required this.name,
    required this.relativePath,
    required this.fullPath,
    this.size = '',
    this.extension = '',
    this.isDirectory = false,
  });

  bool get isImage => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'avif'].contains(extension.toLowerCase());
  bool get isVector => ['svg'].contains(extension.toLowerCase());
  bool get isVideo => ['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv', '3gp', 'm4v'].contains(extension.toLowerCase());
  bool get isAudio => ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'].contains(extension.toLowerCase());
  bool get isArchive => ['zip', 'tar.gz', 'tgz', 'tar', 'gz', '7z', 'rar'].contains(extension.toLowerCase());
  bool get isDocument => ['pdf', 'doc', 'docx', 'txt', 'md', 'json', 'csv'].contains(extension.toLowerCase());

  int get sizeInBytes {
    if (size.isEmpty) return 0;
    final clean = size.trim().toLowerCase();
    final numStr = clean.replaceAll(RegExp(r'[^0-9.]'), '');
    final val = double.tryParse(numStr) ?? 0.0;
    if (clean.contains('gb')) return (val * 1024 * 1024 * 1024).toInt();
    if (clean.contains('mb')) return (val * 1024 * 1024).toInt();
    if (clean.contains('kb')) return (val * 1024).toInt();
    return val.toInt();
  }
}

class MediaScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService agentCoreService;
  final ValueChanged<String>? onSelectFileForChat;
  final String? initialOpenFile;
  final String? vpsWorkspacePath;
  final VoidCallback? onBackToChat;

  const MediaScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.agentCoreService,
    this.onSelectFileForChat,
    this.initialOpenFile,
    this.vpsWorkspacePath,
    this.onBackToChat,
  });

  @override
  State<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends State<MediaScreen> {
  late String _currentDirectory;
  bool _isLoading = false;
  String _searchQuery = '';
  MediaCategoryFilter _selectedFilter = MediaCategoryFilter.all;
  MediaSortOption _sortOption = MediaSortOption.nameAsc;
  MediaViewMode _viewMode = MediaViewMode.grid;
  List<MediaItem> _mediaItems = [];
  final TextEditingController _searchController = TextEditingController();
  String? _selectedOpenFile;
  bool _isSelectMode = false;
  final Set<String> _selectedPaths = {};
  bool _isDownloading = false;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    _currentDirectory = (widget.vpsWorkspacePath != null && widget.vpsWorkspacePath!.isNotEmpty)
        ? widget.vpsWorkspacePath!
        : '/root/shared-media';
    _selectedOpenFile = widget.initialOpenFile;
    _loadMediaFiles();
  }

  void _openInFileExplorer(String fullPath) {
    setState(() {
      _selectedOpenFile = fullPath;
      _viewMode = MediaViewMode.tree;
    });
  }

  @override
  void didUpdateWidget(MediaScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.vpsWorkspacePath != widget.vpsWorkspacePath &&
        widget.vpsWorkspacePath != null &&
        widget.vpsWorkspacePath!.isNotEmpty) {
      _currentDirectory = widget.vpsWorkspacePath!;
      _loadMediaFiles();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMediaFiles() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final List<MediaItem> items = [];
      final mediaList = await widget.agentCoreService.fetchWorkspaceMediaFiles(_currentDirectory);
      if (mediaList.isNotEmpty) {
        for (final m in mediaList) {
          final name = (m['name'] ?? '').toString();
          final ext = (m['extension'] ?? (name.contains('.') ? name.split('.').last.toLowerCase() : '')).toString();
          items.add(
            MediaItem(
              name: name,
              relativePath: (m['relativePath'] ?? m['path'] ?? name).toString(),
              fullPath: (m['fullPath'] ?? m['path'] ?? '$_currentDirectory/$name').toString(),
              size: (m['size'] ?? '').toString(),
              extension: ext,
              isDirectory: m['isDirectory'] == true || m['type'] == 'directory',
            ),
          );
        }
      } else {
        final rawTree = await widget.agentCoreService.fetchWorkspaceFilesTree(_currentDirectory);
        _extractMediaRecursive(rawTree, items);
      }

      if (mounted) {
        setState(() {
          _mediaItems = items;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _extractMediaRecursive(List<Map<String, dynamic>> nodes, List<MediaItem> result) {
    for (final node in nodes) {
      final isDir = node['isDirectory'] == true || node['type'] == 'directory' || node['type'] == 'folder';
      final name = (node['name'] ?? node['path'] ?? '').toString();
      final fullPath = (node['fullPath'] ?? node['path'] ?? '').toString();
      final size = (node['size'] ?? '').toString();
      final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';

      if (isDir) {
        if (node['children'] is List) {
          final children = (node['children'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
          _extractMediaRecursive(children, result);
        }
      } else {
        final mediaExts = [
          'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'tiff', 'tif', 'heic', 'avif',
          'mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv', '3gp', 'm4v',
          'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus',
          'zip', 'tar.gz', 'tgz', 'tar', 'gz', '7z', 'rar',
          'pdf', 'doc', 'docx', 'txt', 'md', 'json', 'csv',
        ];
        if (mediaExts.contains(ext)) {
          result.add(
            MediaItem(
              name: name,
              relativePath: node['relativePath']?.toString() ?? name,
              fullPath: fullPath.isNotEmpty ? fullPath : '$_currentDirectory/$name',
              size: size,
              extension: ext,
              isDirectory: false,
            ),
          );
        }
      }
    }
  }

  void _navigateUpDirectory() {
    if (_currentDirectory == '/' || _currentDirectory.isEmpty) return;
    final lastSlash = _currentDirectory.lastIndexOf('/');
    if (lastSlash > 0) {
      setState(() => _currentDirectory = _currentDirectory.substring(0, lastSlash));
    } else if (lastSlash == 0 && _currentDirectory.length > 1) {
      setState(() => _currentDirectory = '/');
    }
    _loadMediaFiles();
  }

  void _navigateToDirectory(String path) {
    setState(() => _currentDirectory = path);
    _loadMediaFiles();
  }

  int get _countImages => _mediaItems.where((i) => i.isImage).length;
  int get _countVectors => _mediaItems.where((i) => i.isVector).length;
  int get _countVideos => _mediaItems.where((i) => i.isVideo).length;
  int get _countAudio => _mediaItems.where((i) => i.isAudio).length;
  int get _countArchives => _mediaItems.where((i) => i.isArchive).length;
  int get _countDocuments => _mediaItems.where((i) => i.isDocument).length;

  List<MediaItem> get _filteredAndSortedItems {
    final filtered = _mediaItems.where((item) {
      if (_selectedFilter == MediaCategoryFilter.images && !item.isImage) return false;
      if (_selectedFilter == MediaCategoryFilter.vectors && !item.isVector) return false;
      if (_selectedFilter == MediaCategoryFilter.videos && !item.isVideo) return false;
      if (_selectedFilter == MediaCategoryFilter.audio && !item.isAudio) return false;
      if (_selectedFilter == MediaCategoryFilter.archives && !item.isArchive) return false;
      if (_selectedFilter == MediaCategoryFilter.documents && !item.isDocument) return false;

      if (_searchQuery.isNotEmpty && !item.name.toLowerCase().contains(_searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    filtered.sort((a, b) {
      switch (_sortOption) {
        case MediaSortOption.nameAsc:
          return a.name.toLowerCase().compareTo(b.name.toLowerCase());
        case MediaSortOption.nameDesc:
          return b.name.toLowerCase().compareTo(a.name.toLowerCase());
        case MediaSortOption.sizeDesc:
          return b.sizeInBytes.compareTo(a.sizeInBytes);
        case MediaSortOption.sizeAsc:
          return a.sizeInBytes.compareTo(b.sizeInBytes);
        case MediaSortOption.type:
          return a.extension.compareTo(b.extension);
      }
    });

    return filtered;
  }

  void _showUniversalUploaderModal() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _UniversalUploaderDialog(
        currentDirectory: _currentDirectory,
        agentCoreService: widget.agentCoreService,
        isDark: widget.isDark,
        cardBg: widget.cardBg,
        borderColor: widget.borderColor,
        textPrimary: widget.textPrimary,
        textSecondary: widget.textSecondary,
        onSuccess: (targetDir) {
          setState(() => _currentDirectory = targetDir);
          _loadMediaFiles();
        },
      ),
    );
  }

  void _showCustomDirectoryDialog() {
    final controller = TextEditingController(text: _currentDirectory);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.folderInput, size: 18, color: AppTheme.accentTeal),
            const SizedBox(width: 8),
            Text(
              'Custom Directory Path',
              style: TextStyle(color: widget.textPrimary, fontSize: 15, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter an absolute VPS directory path to view or manage assets:',
              style: TextStyle(color: widget.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: TextStyle(color: widget.textPrimary, fontSize: 13, fontFamily: 'monospace'),
              decoration: InputDecoration(
                filled: true,
                fillColor: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppTheme.accentTeal)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                prefixIcon: const Icon(LucideIcons.hardDrive, size: 15, color: AppTheme.accentTeal),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentTeal,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              final path = controller.text.trim();
              if (path.isNotEmpty) {
                Navigator.pop(ctx);
                _navigateToDirectory(path);
              }
            },
            child: const Text('Open Folder', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteFile(MediaItem item) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.trash2, size: 18, color: Colors.redAccent),
            ),
            const SizedBox(width: 10),
            Text('Delete File', style: TextStyle(color: widget.textPrimary, fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete "${item.name}" from VPS?\n\nPath: ${item.fullPath}',
          style: TextStyle(color: widget.textSecondary, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await widget.agentCoreService.deleteWorkspaceFile(item.fullPath);
              if (mounted) {
                if (ok) {
                  AppToast.success(context, 'Deleted "${item.name}" successfully');
                  _loadMediaFiles();
                } else {
                  AppToast.error(context, 'Failed to delete file from VPS');
                }
              }
            },
            child: const Text('Delete Permanently', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _toggleSelectMode([bool? enabled]) {
    setState(() {
      _isSelectMode = enabled ?? !_isSelectMode;
      if (!_isSelectMode) {
        _selectedPaths.clear();
      }
    });
  }

  void _toggleSelection(String path) {
    setState(() {
      if (_selectedPaths.contains(path)) {
        _selectedPaths.remove(path);
      } else {
        _selectedPaths.add(path);
      }
    });
  }

  void _onItemLongPress(MediaItem item) {
    HapticFeedback.mediumImpact();
    setState(() {
      if (!_isSelectMode) {
        _isSelectMode = true;
        _selectedPaths.add(item.fullPath);
      } else {
        if (_selectedPaths.contains(item.fullPath)) {
          _selectedPaths.remove(item.fullPath);
        } else {
          _selectedPaths.add(item.fullPath);
        }
      }
    });
  }

  void _selectAll(List<MediaItem> items) {
    setState(() {
      final allSelected = items.isNotEmpty && items.every((i) => _selectedPaths.contains(i.fullPath));
      if (allSelected) {
        _selectedPaths.clear();
      } else {
        for (final item in items) {
          _selectedPaths.add(item.fullPath);
        }
      }
    });
  }

  Future<void> _downloadSingleItem(MediaItem item) async {
    await FileDownloadHelper.downloadSingleFile(
      context: context,
      agentCoreService: widget.agentCoreService,
      fullPath: item.fullPath,
      fileName: item.name,
    );
  }

  Future<void> _downloadSelected(List<MediaItem> items) async {
    if (_selectedPaths.isEmpty) {
      AppToast.warning(context, 'No files selected to download');
      return;
    }

    setState(() => _isDownloading = true);
    try {
      if (_selectedPaths.length == 1) {
        final path = _selectedPaths.first;
        final name = path.split('/').last;
        await FileDownloadHelper.downloadSingleFile(
          context: context,
          agentCoreService: widget.agentCoreService,
          fullPath: path,
          fileName: name,
        );
      } else {
        final fileNames = _selectedPaths.map((p) {
          if (p.startsWith(_currentDirectory)) {
            final rel = p.substring(_currentDirectory.length);
            return rel.startsWith('/') ? rel.substring(1) : rel;
          }
          return p.split('/').last;
        }).toList();

        await FileDownloadHelper.downloadMultipleFilesAsZip(
          context: context,
          agentCoreService: widget.agentCoreService,
          targetDirectory: _currentDirectory,
          fileNames: fileNames,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isDownloading = false);
      }
    }
  }

  void _confirmAndDeleteSelected() {
    if (_selectedPaths.isEmpty) return;
    final count = _selectedPaths.length;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.trash2, size: 18, color: Colors.redAccent),
            ),
            const SizedBox(width: 10),
            Text('Delete Selected Files', style: TextStyle(color: widget.textPrimary, fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete $count selected file${count > 1 ? "s" : ""} from VPS?\nThis action cannot be undone.',
          style: TextStyle(color: widget.textSecondary, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isDeleting = true);
              int successCount = 0;
              final pathsToDelete = _selectedPaths.toList();
              for (final path in pathsToDelete) {
                final ok = await widget.agentCoreService.deleteWorkspaceFile(path);
                if (ok) successCount++;
              }
              if (mounted) {
                setState(() {
                  _isDeleting = false;
                  _isSelectMode = false;
                  _selectedPaths.clear();
                });
                AppToast.success(context, 'Deleted $successCount of $count file(s)');
                _loadMediaFiles();
              }
            },
            child: const Text('Delete Permanently', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildMultiSelectBar(List<MediaItem> items) {
    if (!_isSelectMode) return const SizedBox.shrink();
    final count = _selectedPaths.length;
    final allSelected = items.isNotEmpty && items.every((i) => _selectedPaths.contains(i.fullPath));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF131525) : const Color(0xFFE0E7FF),
        border: Border(bottom: BorderSide(color: AppTheme.accentTeal.withValues(alpha: 0.5), width: 1.2)),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () => _selectAll(items),
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(
                children: [
                  Icon(
                    allSelected ? LucideIcons.checkSquare : LucideIcons.square,
                    size: 16,
                    color: AppTheme.accentTeal,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    allSelected ? 'Deselect All' : 'Select All',
                    style: TextStyle(color: widget.textPrimary, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.accentTeal.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count selected',
              style: const TextStyle(color: AppTheme.accentTeal, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          const Spacer(),
          // Download Selected Button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentTeal,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            icon: _isDownloading
                ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                : const Icon(LucideIcons.download, size: 13),
            label: Text(_isDownloading ? 'Downloading...' : (count > 1 ? 'Download ($count)' : 'Download'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            onPressed: (_isDownloading || count == 0) ? null : () => _downloadSelected(items),
          ),
          const SizedBox(width: 6),
          // Delete Selected Button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            icon: _isDeleting
                ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(LucideIcons.trash2, size: 13),
            label: Text(_isDeleting ? 'Deleting...' : (count > 1 ? 'Delete ($count)' : 'Delete'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            onPressed: (_isDeleting || count == 0) ? null : _confirmAndDeleteSelected,
          ),
          const SizedBox(width: 6),
          IconButton(
            icon: const Icon(LucideIcons.x, size: 16),
            color: widget.textSecondary,
            tooltip: 'Exit multi-select',
            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
            padding: EdgeInsets.zero,
            onPressed: () => _toggleSelectMode(false),
          ),
        ],
      ),
    );
  }

  void _showMediaLightbox(MediaItem item) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 780, maxHeight: 800),
          decoration: BoxDecoration(
            color: widget.cardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: widget.borderColor),
            boxShadow: const [
              BoxShadow(color: Colors.black54, blurRadius: 28, spreadRadius: 4),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Lightbox Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: widget.borderColor)),
                ),
                child: Row(
                  children: [
                    _buildCategoryBadge(item, isSmall: true),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.name,
                        style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (item.size.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: widget.isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          item.size,
                          style: TextStyle(color: widget.textSecondary, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      color: widget.textSecondary,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),

              // Lightbox Preview Area
              Flexible(
                child: Container(
                  width: double.infinity,
                  color: widget.isDark ? const Color(0xFF090A0F) : const Color(0xFFF1F5F9),
                  child: item.isImage
                      ? InteractiveViewer(
                          panEnabled: true,
                          minScale: 0.5,
                          maxScale: 5.0,
                          child: Center(
                            child: Image.network(
                              widget.agentCoreService.getRawFileUrl(item.fullPath),
                              fit: BoxFit.contain,
                              loadingBuilder: (context, child, progress) {
                                if (progress == null) return child;
                                return const Center(
                                  child: SizedBox(
                                    width: 28,
                                    height: 28,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentTeal),
                                  ),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) => Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(LucideIcons.imageOff, size: 42, color: Colors.redAccent),
                                  const SizedBox(height: 8),
                                  Text('Unable to preview image', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                        )
                      : item.isVideo
                          ? Center(
                              child: buildPlatformVideoView(
                                url: widget.agentCoreService.getRawFileUrl(item.fullPath),
                                viewId: 'lightbox_${item.fullPath.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}',
                                isDark: widget.isDark,
                              ),
                            )
                          : Padding(
                              padding: const EdgeInsets.all(12),
                              child: MediaPreviewView(
                                fullPath: item.fullPath,
                                fileName: item.name,
                                fileSize: item.size,
                                agentCoreService: widget.agentCoreService,
                                isDark: widget.isDark,
                                cardBg: widget.cardBg,
                                borderColor: widget.borderColor,
                                textPrimary: widget.textPrimary,
                                textSecondary: widget.textSecondary,
                                onUnarchiveSuccess: () {
                                  _loadMediaFiles();
                                  Navigator.pop(ctx);
                                },
                              ),
                            ),
                ),
              ),

              // Details & Action Footer
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: widget.borderColor)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Path pill with copy
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.folder, size: 12, color: AppTheme.accentTeal),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              item.fullPath,
                              style: TextStyle(color: widget.textSecondary, fontSize: 11, fontFamily: 'monospace'),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: item.fullPath));
                              AppToast.copied(context, 'Copied: ${item.fullPath}');
                            },
                            child: const Padding(
                              padding: EdgeInsets.all(2),
                              child: Icon(LucideIcons.copy, size: 13, color: AppTheme.accentTeal),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Action Buttons Row
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.accentTeal,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(LucideIcons.messageSquareQuote, size: 14),
                          label: const Text('Insert to Chat', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: () {
                            Navigator.pop(ctx);
                            final chatSnippet = item.isImage ? '![${item.name}](${item.fullPath})' : item.fullPath;
                            widget.onSelectFileForChat?.call(chatSnippet);
                          },
                        ),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: widget.borderColor),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(LucideIcons.folderTree, size: 14, color: AppTheme.accentTeal),
                          label: const Text('File Explorer', style: TextStyle(fontSize: 12, color: AppTheme.accentTeal, fontWeight: FontWeight.w600)),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _openInFileExplorer(item.fullPath);
                          },
                        ),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: widget.borderColor),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(LucideIcons.download, size: 14, color: AppTheme.accentTeal),
                          label: const Text('Download', style: TextStyle(fontSize: 12, color: AppTheme.accentTeal, fontWeight: FontWeight.w600)),
                          onPressed: () => _downloadSingleItem(item),
                        ),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: widget.borderColor),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: Icon(LucideIcons.externalLink, size: 14, color: widget.textPrimary),
                          label: Text('Open in Browser', style: TextStyle(fontSize: 12, color: widget.textPrimary)),
                          onPressed: () async {
                            final rawUrl = widget.agentCoreService.getRawFileUrl(item.fullPath);
                            final uri = Uri.parse(rawUrl);
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri, mode: LaunchMode.externalApplication);
                            }
                          },
                        ),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: widget.borderColor),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: Icon(LucideIcons.link, size: 13, color: widget.textPrimary),
                          label: Text('Copy URL', style: TextStyle(fontSize: 12, color: widget.textPrimary)),
                          onPressed: () {
                            final rawUrl = widget.agentCoreService.getRawFileUrl(item.fullPath);
                            Clipboard.setData(ClipboardData(text: rawUrl));
                            AppToast.copied(context, 'URL copied to clipboard!');
                          },
                        ),
                        if (item.isArchive)
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFF59E0B)),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(LucideIcons.archive, size: 13, color: Color(0xFFF59E0B)),
                            label: const Text('Extract', style: TextStyle(fontSize: 12, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
                            onPressed: () async {
                              Navigator.pop(ctx);
                              final res = await widget.agentCoreService.unarchiveFile(
                                archivePath: item.fullPath,
                                targetDirectory: _currentDirectory,
                              );
                              if (mounted) {
                                if (res != null && res['status'] == 'ok') {
                                  AppToast.success(context, 'Archive extracted to ${res['extractedDir']}');
                                  _loadMediaFiles();
                                }
                              }
                            },
                          ),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.redAccent.withValues(alpha: 0.5)),
                            foregroundColor: Colors.redAccent,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(LucideIcons.trash2, size: 13, color: Colors.redAccent),
                          label: const Text('Delete', style: TextStyle(fontSize: 12, color: Colors.redAccent)),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _confirmDeleteFile(item);
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryBadge(MediaItem item, {bool isSmall = false}) {
    Color bg;
    Color fg;
    String label = item.extension.isNotEmpty ? item.extension.toUpperCase() : 'FILE';

    if (item.isImage) {
      bg = const Color(0xFF06B6D4).withValues(alpha: 0.16);
      fg = const Color(0xFF22D3EE);
    } else if (item.isVector) {
      bg = const Color(0xFF10B981).withValues(alpha: 0.16);
      fg = const Color(0xFF34D399);
    } else if (item.isVideo) {
      bg = const Color(0xFF8B5CF6).withValues(alpha: 0.18);
      fg = const Color(0xFFA78BFA);
    } else if (item.isAudio) {
      bg = const Color(0xFFF59E0B).withValues(alpha: 0.18);
      fg = const Color(0xFFFBBF24);
    } else if (item.isArchive) {
      bg = const Color(0xFFEF4444).withValues(alpha: 0.16);
      fg = const Color(0xFFF87171);
    } else {
      bg = const Color(0xFF3B82F6).withValues(alpha: 0.16);
      fg = const Color(0xFF60A5FA);
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: isSmall ? 5 : 6, vertical: isSmall ? 1.5 : 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: isSmall ? 9.5 : 10.5,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Widget _buildScopeChip(String label, String path, IconData icon) {
    final isSelected = _currentDirectory == path;
    return InkWell(
      onTap: () => _navigateToDirectory(path),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.accentTeal.withValues(alpha: 0.2)
              : (widget.isDark ? const Color(0xFF161926) : const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppTheme.accentTeal : widget.borderColor.withValues(alpha: 0.7),
            width: isSelected ? 1.2 : 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12.5, color: isSelected ? AppTheme.accentTeal : widget.textSecondary),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? (widget.isDark ? Colors.white : Colors.black) : widget.textPrimary,
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, MediaCategoryFilter filter, int count) {
    final isSelected = _selectedFilter == filter;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = filter),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.accentTeal.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.accentTeal : widget.borderColor.withValues(alpha: 0.5),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppTheme.accentTeal : widget.textSecondary,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.accentTeal.withValues(alpha: 0.3) : widget.borderColor.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? AppTheme.accentTeal : widget.textSecondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBreadcrumbBar() {
    final parts = _currentDirectory.split('/').where((p) => p.isNotEmpty).toList();
    final isRoot = _currentDirectory == '/' || _currentDirectory.isEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0F111A) : const Color(0xFFF1F5F9),
        border: Border(bottom: BorderSide(color: widget.borderColor.withValues(alpha: 0.6), width: 0.8)),
      ),
      child: Row(
        children: [
          // Up-One-Level button
          InkWell(
            onTap: isRoot ? null : _navigateUpDirectory,
            borderRadius: BorderRadius.circular(4),
            child: Padding(
              padding: const EdgeInsets.all(3),
              child: Icon(
                LucideIcons.arrowUp,
                size: 14,
                color: isRoot ? widget.textSecondary.withValues(alpha: 0.3) : AppTheme.accentTeal,
              ),
            ),
          ),
          const SizedBox(width: 6),
          const Icon(LucideIcons.folder, size: 13, color: AppTheme.accentTeal),
          const SizedBox(width: 6),

          // Clickable path crumbs
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  InkWell(
                    onTap: () => _navigateToDirectory('/'),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Text(
                        '/',
                        style: TextStyle(
                          color: parts.isEmpty ? AppTheme.accentTeal : widget.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ),
                  for (int i = 0; i < parts.length; i++) ...[
                    if (i > 0)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Text('/', style: TextStyle(color: widget.textSecondary.withValues(alpha: 0.4), fontSize: 11)),
                      ),
                    InkWell(
                      onTap: () {
                        final targetPath = '/${parts.sublist(0, i + 1).join('/')}';
                        _navigateToDirectory(targetPath);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Text(
                          parts[i],
                          style: TextStyle(
                            color: (i == parts.length - 1) ? AppTheme.accentTeal : widget.textSecondary,
                            fontSize: 11,
                            fontWeight: (i == parts.length - 1) ? FontWeight.bold : FontWeight.w500,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Total files count
          Text(
            '${_mediaItems.length} items',
            style: TextStyle(color: widget.textSecondary, fontSize: 10.5, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_viewMode == MediaViewMode.tree) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: widget.cardBg,
              border: Border(bottom: BorderSide(color: widget.borderColor)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.folderTree, size: 15, color: AppTheme.accentTeal),
                const SizedBox(width: 8),
                Text('Tree Explorer Mode', style: TextStyle(color: widget.textPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => setState(() => _viewMode = MediaViewMode.grid),
                  icon: const Icon(LucideIcons.layoutGrid, size: 13),
                  label: const Text('Back to Gallery', style: TextStyle(fontSize: 11.5)),
                  style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                ),
              ],
            ),
          ),
          Expanded(
            child: WorkspaceFileExplorerWidget(
              isDark: widget.isDark,
              cardBg: widget.cardBg,
              borderColor: widget.borderColor,
              textPrimary: widget.textPrimary,
              textSecondary: widget.textSecondary,
              vpsWorkspacePath: _currentDirectory,
              agentCoreService: widget.agentCoreService,
              onSelectFileForChat: widget.onSelectFileForChat,
              showHeaderBar: false,
              initialOpenFile: _selectedOpenFile ?? widget.initialOpenFile,
            ),
          ),
        ],
      );
    }

    final workspace = widget.agentCoreService.workspacePath;
    final items = _filteredAndSortedItems;

    return Container(
      color: widget.isDark ? const Color(0xFF090A0F) : const Color(0xFFF8FAFC),
      child: Column(
        children: [
          // Responsive Top Header (Zero Overflow on 390px Mobile)
          Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            decoration: BoxDecoration(
              color: widget.cardBg,
              border: Border(bottom: BorderSide(color: widget.borderColor)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Top Row
                Row(
                  children: [
                    if (widget.onBackToChat != null) ...[
                      IconButton(
                        icon: Icon(LucideIcons.arrowLeft, size: 17, color: widget.textSecondary),
                        onPressed: widget.onBackToChat,
                        tooltip: 'Back to Chat',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      ),
                      const SizedBox(width: 4),
                    ],
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.accentTeal, Color(0xFF0D9488)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(LucideIcons.images, size: 15, color: Colors.black),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Media Library',
                            style: TextStyle(color: widget.textPrimary, fontSize: 14.5, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            _currentDirectory,
                            style: TextStyle(color: widget.textSecondary, fontSize: 10.5, fontFamily: 'monospace'),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),

                    // View Mode Switcher
                    Container(
                      decoration: BoxDecoration(
                        color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: widget.borderColor.withValues(alpha: 0.6)),
                      ),
                      padding: const EdgeInsets.all(2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          InkWell(
                            onTap: () => setState(() => _viewMode = MediaViewMode.grid),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: _viewMode == MediaViewMode.grid ? AppTheme.accentTeal : Colors.transparent,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Icon(
                                LucideIcons.layoutGrid,
                                size: 14,
                                color: _viewMode == MediaViewMode.grid ? Colors.black : widget.textSecondary,
                              ),
                            ),
                          ),
                          InkWell(
                            onTap: () => setState(() => _viewMode = MediaViewMode.list),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: _viewMode == MediaViewMode.list ? AppTheme.accentTeal : Colors.transparent,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Icon(
                                LucideIcons.list,
                                size: 14,
                                color: _viewMode == MediaViewMode.list ? Colors.black : widget.textSecondary,
                              ),
                            ),
                          ),
                          InkWell(
                            onTap: () => setState(() => _viewMode = MediaViewMode.tree),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: _viewMode == MediaViewMode.tree ? AppTheme.accentTeal : Colors.transparent,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Icon(
                                LucideIcons.folderTree,
                                size: 14,
                                color: _viewMode == MediaViewMode.tree ? Colors.black : widget.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),

                    // Refresh
                    IconButton(
                      tooltip: 'Refresh',
                      icon: _isLoading
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentTeal))
                          : Icon(LucideIcons.refreshCw, size: 15, color: widget.textSecondary),
                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      padding: EdgeInsets.zero,
                      onPressed: _isLoading ? null : _loadMediaFiles,
                    ),
                    const SizedBox(width: 4),

                    // Upload Button
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentTeal,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(LucideIcons.uploadCloud, size: 13),
                      label: const Text('Upload', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                      onPressed: _showUniversalUploaderModal,
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Folder Scope Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildScopeChip('Shared Media', '/root/shared-media', LucideIcons.cloud),
                      const SizedBox(width: 6),
                      if (workspace.isNotEmpty) ...[
                        _buildScopeChip('Public', '$workspace/public', LucideIcons.globe),
                        const SizedBox(width: 6),
                        _buildScopeChip('Assets', '$workspace/assets', LucideIcons.palette),
                        const SizedBox(width: 6),
                        _buildScopeChip('Workspace', workspace, LucideIcons.folderGit2),
                        const SizedBox(width: 6),
                      ],
                      InkWell(
                        onTap: _showCustomDirectoryDialog,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: widget.borderColor.withValues(alpha: 0.7)),
                          ),
                          child: Row(
                            children: [
                              Icon(LucideIcons.folderPlus, size: 12, color: widget.textSecondary),
                              const SizedBox(width: 4),
                              Text('Custom...', style: TextStyle(color: widget.textSecondary, fontSize: 11)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Breadcrumb Bar
          _buildBreadcrumbBar(),

          // Search, Filter & Sort Toolbar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: widget.cardBg.withValues(alpha: 0.7),
              border: Border(bottom: BorderSide(color: widget.borderColor)),
            ),
            child: Column(
              children: [
                // Search Input & Sort Row
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 32,
                        decoration: BoxDecoration(
                          color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: widget.borderColor.withValues(alpha: 0.8)),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: (val) => setState(() => _searchQuery = val),
                          style: TextStyle(color: widget.textPrimary, fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Search media in directory...',
                            hintStyle: TextStyle(color: widget.textSecondary, fontSize: 11.5),
                            prefixIcon: Icon(LucideIcons.search, size: 13, color: widget.textSecondary),
                            prefixIconConstraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(LucideIcons.x, size: 13),
                                    color: widget.textSecondary,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 7),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),

                    // Sort Dropdown
                    PopupMenuButton<MediaSortOption>(
                      tooltip: 'Sort by',
                      initialValue: _sortOption,
                      onSelected: (val) => setState(() => _sortOption = val),
                      color: widget.cardBg,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(color: widget.borderColor),
                      ),
                      child: Container(
                        height: 32,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: widget.borderColor.withValues(alpha: 0.8)),
                        ),
                        child: Row(
                          children: [
                            Icon(LucideIcons.arrowUpDown, size: 12.5, color: widget.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              _sortOption == MediaSortOption.nameAsc
                                  ? 'A-Z'
                                  : (_sortOption == MediaSortOption.nameDesc
                                      ? 'Z-A'
                                      : (_sortOption == MediaSortOption.sizeDesc
                                          ? 'Size'
                                          : (_sortOption == MediaSortOption.sizeAsc ? 'Size ↑' : 'Type'))),
                              style: TextStyle(color: widget.textPrimary, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      itemBuilder: (context) => [
                        const PopupMenuItem(value: MediaSortOption.nameAsc, child: Text('Name (A-Z)', style: TextStyle(fontSize: 12))),
                        const PopupMenuItem(value: MediaSortOption.nameDesc, child: Text('Name (Z-A)', style: TextStyle(fontSize: 12))),
                        const PopupMenuItem(value: MediaSortOption.sizeDesc, child: Text('Size (Largest)', style: TextStyle(fontSize: 12))),
                        const PopupMenuItem(value: MediaSortOption.sizeAsc, child: Text('Size (Smallest)', style: TextStyle(fontSize: 12))),
                        const PopupMenuItem(value: MediaSortOption.type, child: Text('Type (Extension)', style: TextStyle(fontSize: 12))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Category Filter Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', MediaCategoryFilter.all, _mediaItems.length),
                      const SizedBox(width: 5),
                      _buildFilterChip('Images', MediaCategoryFilter.images, _countImages),
                      const SizedBox(width: 5),
                      _buildFilterChip('Vectors', MediaCategoryFilter.vectors, _countVectors),
                      const SizedBox(width: 5),
                      _buildFilterChip('Videos', MediaCategoryFilter.videos, _countVideos),
                      const SizedBox(width: 5),
                      _buildFilterChip('Audio', MediaCategoryFilter.audio, _countAudio),
                      const SizedBox(width: 5),
                      _buildFilterChip('Archives', MediaCategoryFilter.archives, _countArchives),
                      const SizedBox(width: 5),
                      _buildFilterChip('Docs', MediaCategoryFilter.documents, _countDocuments),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Multi-Select Action Bar (Shows when long-pressing or in select mode)
          _buildMultiSelectBar(items),

          // Main Media Gallery View
          Expanded(
            child: _isLoading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 32,
                          height: 32,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.accentTeal),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Loading media assets...',
                          style: TextStyle(color: widget.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : items.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: widget.cardBg,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: widget.borderColor),
                                ),
                                child: Icon(LucideIcons.imageOff, size: 32, color: widget.textSecondary),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _searchQuery.isNotEmpty ? 'No media matching "$_searchQuery"' : 'No media assets found in this folder',
                                style: TextStyle(color: widget.textPrimary, fontSize: 13.5, fontWeight: FontWeight.bold),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _currentDirectory,
                                style: TextStyle(color: widget.textSecondary, fontSize: 11, fontFamily: 'monospace'),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 14),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accentTeal,
                                  foregroundColor: Colors.black,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                ),
                                icon: const Icon(LucideIcons.uploadCloud, size: 14),
                                label: const Text('Upload Files / Import URL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                onPressed: _showUniversalUploaderModal,
                              ),
                            ],
                          ),
                        ),
                      )
                    : _viewMode == MediaViewMode.grid
                        ? _buildGridView(items)
                        : _buildListView(items),
          ),
        ],
      ),
    );
  }

  Widget _buildGridView(List<MediaItem> items) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 900
            ? 4
            : (constraints.maxWidth > 580 ? 3 : 2);

        return GridView.builder(
          padding: const EdgeInsets.all(10),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 0.84,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return _buildGridCard(item);
          },
        );
      },
    );
  }

  Widget _buildGridCard(MediaItem item) {
    final isSelected = _selectedPaths.contains(item.fullPath);

    return InkWell(
      onTap: () {
        if (_isSelectMode) {
          _toggleSelection(item.fullPath);
          return;
        }
        if (item.isDirectory) {
          _navigateToDirectory(item.fullPath);
        } else if (item.isImage || item.isVideo) {
          _showMediaLightbox(item);
        } else {
          _openInFileExplorer(item.fullPath);
        }
      },
      onLongPress: () => _onItemLongPress(item),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.accentTeal.withValues(alpha: widget.isDark ? 0.18 : 0.1)
              : widget.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.accentTeal : widget.borderColor.withValues(alpha: 0.9),
            width: isSelected ? 2.0 : 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? AppTheme.accentTeal.withValues(alpha: 0.25)
                  : Colors.black.withValues(alpha: widget.isDark ? 0.25 : 0.04),
              blurRadius: isSelected ? 8 : 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Thumbnail Container with Floating Badges
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                    child: item.isImage
                        ? Image.network(
                            widget.agentCoreService.getRawFileUrl(item.fullPath),
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, progress) {
                              if (progress == null) return child;
                              return const Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentTeal),
                                ),
                              );
                            },
                            errorBuilder: (context, error, stackTrace) => Center(
                              child: Icon(LucideIcons.imageOff, size: 26, color: widget.textSecondary),
                            ),
                          )
                        : Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: (item.isVideo
                                            ? Colors.purple
                                            : (item.isAudio ? Colors.amber : (item.isVector ? Colors.teal : (item.isArchive ? Colors.red : Colors.blue))))
                                        .withValues(alpha: 0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    item.isVideo
                                        ? LucideIcons.film
                                        : (item.isAudio
                                            ? LucideIcons.music
                                            : (item.isVector
                                                ? LucideIcons.shapes
                                                : (item.isArchive ? LucideIcons.fileArchive : LucideIcons.fileText))),
                                    size: 24,
                                    color: item.isVideo
                                        ? Colors.purpleAccent
                                        : (item.isAudio
                                            ? Colors.amberAccent
                                            : (item.isVector ? Colors.tealAccent : (item.isArchive ? Colors.redAccent : Colors.lightBlueAccent))),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  item.extension.toUpperCase(),
                                  style: TextStyle(color: widget.textSecondary, fontSize: 10, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                  ),

                  // Top-Left Category Tag
                  Positioned(
                    top: 6,
                    left: 6,
                    child: _buildCategoryBadge(item, isSmall: true),
                  ),

                  // Top-Right Checkbox Badge or Size Pill
                  if (_isSelectMode || isSelected)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.accentTeal : Colors.black54,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        child: Icon(
                          isSelected ? LucideIcons.check : LucideIcons.circle,
                          size: 12,
                          color: isSelected ? Colors.black : Colors.transparent,
                        ),
                      ),
                    )
                  else if (item.size.isNotEmpty)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.size,
                          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Card Footer
            Container(
              padding: const EdgeInsets.fromLTRB(8, 6, 4, 6),
              decoration: BoxDecoration(
                color: widget.cardBg,
                border: Border(top: BorderSide(color: widget.borderColor.withValues(alpha: 0.5), width: 0.8)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name,
                          style: TextStyle(color: widget.textPrimary, fontSize: 11.5, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          item.relativePath.isNotEmpty ? item.relativePath : item.name,
                          style: TextStyle(color: widget.textSecondary, fontSize: 9.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // 1-Tap Insert to Chat
                  InkWell(
                    onTap: () {
                      final chatSnippet = item.isImage ? '![${item.name}](${item.fullPath})' : item.fullPath;
                      widget.onSelectFileForChat?.call(chatSnippet);
                    },
                    borderRadius: BorderRadius.circular(4),
                    child: const Padding(
                      padding: EdgeInsets.all(3),
                      child: Icon(LucideIcons.messageSquareQuote, size: 14, color: AppTheme.accentTeal),
                    ),
                  ),

                  // 3-Dot Options Menu
                  PopupMenuButton<String>(
                    tooltip: 'More actions',
                    padding: EdgeInsets.zero,
                    icon: Icon(LucideIcons.ellipsisVertical, size: 14, color: widget.textSecondary),
                    constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                    color: widget.cardBg,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(color: widget.borderColor),
                    ),
                    onSelected: (val) async {
                      if (val == 'explorer') {
                        _openInFileExplorer(item.fullPath);
                      } else if (val == 'preview') {
                        _showMediaLightbox(item);
                      } else if (val == 'chat') {
                        final chatSnippet = item.isImage ? '![${item.name}](${item.fullPath})' : item.fullPath;
                        widget.onSelectFileForChat?.call(chatSnippet);
                      } else if (val == 'download') {
                        await _downloadSingleItem(item);
                      } else if (val == 'select') {
                        _onItemLongPress(item);
                      } else if (val == 'copy_path') {
                        Clipboard.setData(ClipboardData(text: item.fullPath));
                        AppToast.copied(context, 'Copied path: ${item.fullPath}');
                      } else if (val == 'copy_url') {
                        final rawUrl = widget.agentCoreService.getRawFileUrl(item.fullPath);
                        Clipboard.setData(ClipboardData(text: rawUrl));
                        AppToast.copied(context, 'Copied URL to clipboard');
                      } else if (val == 'open') {
                        final rawUrl = widget.agentCoreService.getRawFileUrl(item.fullPath);
                        final uri = Uri.parse(rawUrl);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      } else if (val == 'extract') {
                        final res = await widget.agentCoreService.unarchiveFile(
                          archivePath: item.fullPath,
                          targetDirectory: _currentDirectory,
                        );
                        if (mounted && res != null && res['status'] == 'ok') {
                          AppToast.success(context, 'Extracted archive');
                          _loadMediaFiles();
                        }
                      } else if (val == 'delete') {
                        _confirmDeleteFile(item);
                      }
                    },
                    itemBuilder: (context) => [
                      if (item.isImage || item.isVideo)
                        const PopupMenuItem(
                          value: 'preview',
                          child: Row(children: [Icon(LucideIcons.eye, size: 14), SizedBox(width: 8), Text('Preview', style: TextStyle(fontSize: 12))]),
                        ),
                      const PopupMenuItem(
                        value: 'download',
                        child: Row(children: [Icon(LucideIcons.download, size: 14, color: AppTheme.accentTeal), SizedBox(width: 8), Text('Download to Device', style: TextStyle(fontSize: 12, color: AppTheme.accentTeal, fontWeight: FontWeight.w600))]),
                      ),
                      const PopupMenuItem(
                        value: 'select',
                        child: Row(children: [Icon(LucideIcons.checkSquare, size: 14), SizedBox(width: 8), Text('Select / Multi-select', style: TextStyle(fontSize: 12))]),
                      ),
                      const PopupMenuItem(
                        value: 'explorer',
                        child: Row(children: [Icon(LucideIcons.folderTree, size: 14, color: AppTheme.accentTeal), SizedBox(width: 8), Text('Open in File Explorer', style: TextStyle(fontSize: 12, color: AppTheme.accentTeal))]),
                      ),
                      const PopupMenuItem(
                        value: 'chat',
                        child: Row(children: [Icon(LucideIcons.messageSquareQuote, size: 14), SizedBox(width: 8), Text('Insert to Chat', style: TextStyle(fontSize: 12))]),
                      ),
                      const PopupMenuItem(
                        value: 'copy_path',
                        child: Row(children: [Icon(LucideIcons.copy, size: 14), SizedBox(width: 8), Text('Copy VPS Path', style: TextStyle(fontSize: 12))]),
                      ),
                      const PopupMenuItem(
                        value: 'copy_url',
                        child: Row(children: [Icon(LucideIcons.link, size: 14), SizedBox(width: 8), Text('Copy Raw URL', style: TextStyle(fontSize: 12))]),
                      ),
                      const PopupMenuItem(
                        value: 'open',
                        child: Row(children: [Icon(LucideIcons.externalLink, size: 14), SizedBox(width: 8), Text('Open in Browser', style: TextStyle(fontSize: 12))]),
                      ),
                      if (item.isArchive)
                        const PopupMenuItem(
                          value: 'extract',
                          child: Row(children: [Icon(LucideIcons.archive, size: 14, color: Color(0xFFF59E0B)), SizedBox(width: 8), Text('Extract Archive', style: TextStyle(fontSize: 12, color: Color(0xFFF59E0B)))]),
                        ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(children: [Icon(LucideIcons.trash2, size: 14, color: Colors.redAccent), SizedBox(width: 8), Text('Delete File', style: TextStyle(fontSize: 12, color: Colors.redAccent))]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListView(List<MediaItem> items) {
    return ListView.separated(
      padding: const EdgeInsets.all(10),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 6),
      itemBuilder: (context, index) {
        final item = items[index];
        final isSelected = _selectedPaths.contains(item.fullPath);

        return Container(
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.accentTeal.withValues(alpha: widget.isDark ? 0.18 : 0.1)
                : widget.cardBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.accentTeal : widget.borderColor.withValues(alpha: 0.8),
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: ListTile(
            dense: true,
            onTap: () {
              if (_isSelectMode) {
                _toggleSelection(item.fullPath);
                return;
              }
              if (item.isDirectory) {
                _navigateToDirectory(item.fullPath);
              } else if (item.isImage || item.isVideo) {
                _showMediaLightbox(item);
              } else {
                _openInFileExplorer(item.fullPath);
              }
            },
            onLongPress: () => _onItemLongPress(item),
            leading: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isSelectMode) ...[
                  Icon(
                    isSelected ? LucideIcons.checkSquare : LucideIcons.square,
                    size: 18,
                    color: isSelected ? AppTheme.accentTeal : widget.textSecondary,
                  ),
                  const SizedBox(width: 8),
                ],
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    width: 40,
                    height: 40,
                    color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                    child: item.isImage
                        ? Image.network(
                            widget.agentCoreService.getRawFileUrl(item.fullPath),
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Icon(LucideIcons.imageOff, size: 16, color: widget.textSecondary),
                          )
                        : Icon(
                            item.isVideo
                                ? LucideIcons.film
                                : (item.isAudio ? LucideIcons.music : (item.isArchive ? LucideIcons.archive : LucideIcons.fileText)),
                            size: 18,
                            color: AppTheme.accentTeal,
                          ),
                  ),
                ),
              ],
            ),
            title: Text(item.name, style: TextStyle(color: widget.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600)),
            subtitle: Text(
              '${item.extension.toUpperCase()} • ${item.size.isNotEmpty ? item.size : "File"} • ${item.relativePath}',
              style: TextStyle(color: widget.textSecondary, fontSize: 10.5),
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.folderTree, size: 14),
                  color: widget.textSecondary,
                  tooltip: 'Open in File Explorer',
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  padding: EdgeInsets.zero,
                  onPressed: () => _openInFileExplorer(item.fullPath),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.download, size: 14),
                  color: widget.textSecondary,
                  tooltip: 'Download to Device',
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  padding: EdgeInsets.zero,
                  onPressed: () => _downloadSingleItem(item),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.messageSquareQuote, size: 14),
                  color: AppTheme.accentTeal,
                  tooltip: 'Insert to Chat',
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  padding: EdgeInsets.zero,
                  onPressed: () {
                    final chatSnippet = item.isImage ? '![${item.name}](${item.fullPath})' : item.fullPath;
                    widget.onSelectFileForChat?.call(chatSnippet);
                  },
                ),
                PopupMenuButton<String>(
                  tooltip: 'More actions',
                  padding: EdgeInsets.zero,
                  icon: Icon(LucideIcons.ellipsisVertical, size: 14, color: widget.textSecondary),
                  constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                  color: widget.cardBg,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: widget.borderColor),
                  ),
                  onSelected: (val) async {
                    if (val == 'select') {
                      _onItemLongPress(item);
                    } else if (val == 'copy_path') {
                      Clipboard.setData(ClipboardData(text: item.fullPath));
                      AppToast.copied(context, 'Path copied to clipboard!');
                    } else if (val == 'copy_url') {
                      final rawUrl = widget.agentCoreService.getRawFileUrl(item.fullPath);
                      Clipboard.setData(ClipboardData(text: rawUrl));
                      AppToast.copied(context, 'URL copied to clipboard');
                    } else if (val == 'open') {
                      final rawUrl = widget.agentCoreService.getRawFileUrl(item.fullPath);
                      final uri = Uri.parse(rawUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    } else if (val == 'delete') {
                      _confirmDeleteFile(item);
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'select',
                      child: Row(children: [Icon(LucideIcons.checkSquare, size: 14), SizedBox(width: 8), Text('Select / Multi-select', style: TextStyle(fontSize: 12))]),
                    ),
                    const PopupMenuItem(
                      value: 'copy_path',
                      child: Row(children: [Icon(LucideIcons.copy, size: 14), SizedBox(width: 8), Text('Copy VPS Path', style: TextStyle(fontSize: 12))]),
                    ),
                    const PopupMenuItem(
                      value: 'copy_url',
                      child: Row(children: [Icon(LucideIcons.link, size: 14), SizedBox(width: 8), Text('Copy Raw URL', style: TextStyle(fontSize: 12))]),
                    ),
                    const PopupMenuItem(
                      value: 'open',
                      child: Row(children: [Icon(LucideIcons.externalLink, size: 14), SizedBox(width: 8), Text('Open in Browser', style: TextStyle(fontSize: 12))]),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(children: [Icon(LucideIcons.trash2, size: 14, color: Colors.redAccent), SizedBox(width: 8), Text('Delete File', style: TextStyle(fontSize: 12, color: Colors.redAccent))]),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Universal Media & Asset Uploader Dialog
/// Supports multiple local file uploads or direct web URL download to VPS.
class _UniversalUploaderDialog extends StatefulWidget {
  final String currentDirectory;
  final AvaAgentCoreService agentCoreService;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final ValueChanged<String> onSuccess;

  const _UniversalUploaderDialog({
    required this.currentDirectory,
    required this.agentCoreService,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onSuccess,
  });

  @override
  State<_UniversalUploaderDialog> createState() => _UniversalUploaderDialogState();
}

class _PickedFileItem {
  final String name;
  final int size;
  final Uint8List bytes;

  _PickedFileItem({required this.name, required this.size, required this.bytes});

  String get formattedSize {
    if (size > 1048576) {
      return '${(size / 1048576).toStringAsFixed(1)} MB';
    }
    return '${(size / 1024).toStringAsFixed(1)} KB';
  }
}

class _UniversalUploaderDialogState extends State<_UniversalUploaderDialog> {
  int _selectedTab = 0; // 0 = Local Files, 1 = Download from URL
  late String _targetDir;
  final List<_PickedFileItem> _pickedFiles = [];
  final TextEditingController _urlCtrl = TextEditingController();
  final TextEditingController _fileNameCtrl = TextEditingController();
  final TextEditingController _customDirCtrl = TextEditingController();

  bool _isProcessing = false;
  double _uploadProgress = 0.0;
  String _statusText = '';

  @override
  void initState() {
    super.initState();
    _targetDir = widget.currentDirectory;
    _customDirCtrl.text = _targetDir;
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _fileNameCtrl.dispose();
    _customDirCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickFiles() async {
    try {
      final files = await FilePicker.pickFiles(type: FileType.any);
      if (files.isNotEmpty) {
        for (final f in files) {
          final bytes = await f.readAsBytes();
          if (bytes.isNotEmpty) {
            _pickedFiles.add(_PickedFileItem(
              name: f.name,
              size: bytes.length,
              bytes: bytes,
            ));
          }
        }
        if (mounted) setState(() {});
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Picker error: $e');
      }
    }
  }

  Future<void> _startLocalUpload() async {
    if (_pickedFiles.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _uploadProgress = 0.0;
      _statusText = 'Preparing files for VPS upload...';
    });

    int uploadedCount = 0;
    final total = _pickedFiles.length;

    for (int i = 0; i < total; i++) {
      final item = _pickedFiles[i];
      if (!mounted) break;
      setState(() {
        _statusText = 'Uploading ${i + 1}/$total: "${item.name}"...';
        _uploadProgress = (i) / total;
      });

      final res = await widget.agentCoreService.uploadFile(
        targetDirectory: _targetDir,
        fileName: item.name,
        fileBytes: item.bytes,
      );

      if (res != null && res['status'] == 'ok') {
        uploadedCount++;
      }
    }

    if (mounted) {
      setState(() {
        _isProcessing = false;
        _uploadProgress = 1.0;
      });
      Navigator.pop(context);
      if (uploadedCount > 0) {
        AppToast.success(context, 'Uploaded $uploadedCount file(s) to $_targetDir');
        widget.onSuccess(_targetDir);
      } else {
        AppToast.error(context, 'Upload failed. Please check VPS connection.');
      }
    }
  }

  Future<void> _startUrlDownload() async {
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) {
      AppToast.warning(context, 'Please enter a valid remote media URL');
      return;
    }

    setState(() {
      _isProcessing = true;
      _statusText = 'Downloading asset directly to VPS disk...';
    });

    final fileName = _fileNameCtrl.text.trim();
    final res = await widget.agentCoreService.downloadFileFromUrl(
      targetDirectory: _targetDir,
      url: url,
      fileName: fileName.isNotEmpty ? fileName : null,
    );

    if (mounted) {
      setState(() => _isProcessing = false);
      if (res != null && res['status'] == 'ok') {
        Navigator.pop(context);
        AppToast.success(context, 'Downloaded "${res['fileName']}" directly to VPS!');
        widget.onSuccess(_targetDir);
      } else {
        AppToast.error(context, 'Download failed: ${res?['error'] ?? 'Server could not fetch URL'}');
      }
    }
  }

  Widget _buildTargetFolderSelector() {
    final ws = widget.agentCoreService.workspacePath;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.folderInput, size: 13, color: AppTheme.accentTeal),
            const SizedBox(width: 5),
            Text(
              'TARGET VPS DIRECTORY',
              style: TextStyle(
                color: widget.textSecondary,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFolderChoiceChip('Shared Media', '/root/shared-media'),
              if (ws.isNotEmpty) ...[
                const SizedBox(width: 5),
                _buildFolderChoiceChip('Public', '$ws/public'),
                const SizedBox(width: 5),
                _buildFolderChoiceChip('Assets', '$ws/assets'),
                const SizedBox(width: 5),
                _buildFolderChoiceChip('Workspace', ws),
              ],
            ],
          ),
        ),
        const SizedBox(height: 6),
        Container(
          height: 32,
          decoration: BoxDecoration(
            color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: widget.borderColor),
          ),
          child: TextField(
            controller: _customDirCtrl,
            style: TextStyle(color: widget.textPrimary, fontSize: 11, fontFamily: 'monospace'),
            onChanged: (val) => _targetDir = val.trim(),
            decoration: const InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              border: InputBorder.none,
              prefixIcon: Icon(LucideIcons.hardDrive, size: 13, color: AppTheme.accentTeal),
              prefixIconConstraints: BoxConstraints(minWidth: 26, minHeight: 26),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFolderChoiceChip(String label, String path) {
    final isSelected = _targetDir == path;
    return InkWell(
      onTap: () {
        setState(() {
          _targetDir = path;
          _customDirCtrl.text = path;
        });
      },
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.accentTeal : (widget.isDark ? const Color(0xFF1F2336) : const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: isSelected ? AppTheme.accentTeal : widget.borderColor),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black : widget.textPrimary,
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: widget.cardBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: widget.borderColor),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 540, maxHeight: 680),
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.accentTeal.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.uploadCloud, size: 18, color: AppTheme.accentTeal),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Upload & Import Media',
                          style: TextStyle(color: widget.textPrimary, fontSize: 14.5, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Upload local files or download from remote URL to VPS',
                          style: TextStyle(color: widget.textSecondary, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 17),
                    color: widget.textSecondary,
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                    padding: EdgeInsets.zero,
                    onPressed: _isProcessing ? null : () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Tab Selector: Local vs URL
              Container(
                decoration: BoxDecoration(
                  color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: widget.borderColor),
                ),
                padding: const EdgeInsets.all(2.5),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: _isProcessing ? null : () => setState(() => _selectedTab = 0),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 7),
                          decoration: BoxDecoration(
                            color: _selectedTab == 0 ? AppTheme.accentTeal : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.hardDrive, size: 13, color: _selectedTab == 0 ? Colors.black : widget.textSecondary),
                              const SizedBox(width: 5),
                              Text(
                                'Local Files (${_pickedFiles.length})',
                                style: TextStyle(
                                  color: _selectedTab == 0 ? Colors.black : widget.textPrimary,
                                  fontSize: 11.5,
                                  fontWeight: _selectedTab == 0 ? FontWeight.bold : FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: _isProcessing ? null : () => setState(() => _selectedTab = 1),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 7),
                          decoration: BoxDecoration(
                            color: _selectedTab == 1 ? AppTheme.accentTeal : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.link, size: 13, color: _selectedTab == 1 ? Colors.black : widget.textSecondary),
                              const SizedBox(width: 5),
                              Text(
                                'Download URL',
                                style: TextStyle(
                                  color: _selectedTab == 1 ? Colors.black : widget.textPrimary,
                                  fontSize: 11.5,
                                  fontWeight: _selectedTab == 1 ? FontWeight.bold : FontWeight.w500,
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
              const SizedBox(height: 12),

              // Target Folder Selector
              _buildTargetFolderSelector(),
              const SizedBox(height: 12),

              // Tab Content
              _selectedTab == 0 ? _buildLocalUploadTab() : _buildUrlDownloadTab(),

              // Processing indicator
              if (_isProcessing) ...[
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: _selectedTab == 0 && _uploadProgress > 0 ? _uploadProgress : null,
                  backgroundColor: widget.borderColor,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accentTeal),
                ),
                const SizedBox(height: 5),
                Text(
                  _statusText,
                  style: TextStyle(color: widget.textSecondary, fontSize: 11, fontFamily: 'monospace'),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLocalUploadTab() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_pickedFiles.isEmpty)
          InkWell(
            onTap: _isProcessing ? null : _pickFiles,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF11131C) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.accentTeal.withValues(alpha: 0.4), style: BorderStyle.solid),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.accentTeal.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.fileUp, size: 24, color: AppTheme.accentTeal),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Select Media & Asset Files',
                    style: TextStyle(color: widget.textPrimary, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Images, Videos, Audio, Archives (.zip), Documents\nMulti-file selection supported',
                    style: TextStyle(color: widget.textSecondary, fontSize: 10.5),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else ...[
          Row(
            children: [
              Text(
                'SELECTED FILES (${_pickedFiles.length})',
                style: TextStyle(color: widget.textSecondary, fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.5),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: _isProcessing ? null : _pickFiles,
                icon: const Icon(LucideIcons.plus, size: 12),
                label: const Text('Add More', style: TextStyle(fontSize: 10.5)),
                style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
              ),
              TextButton(
                onPressed: _isProcessing ? null : () => setState(() => _pickedFiles.clear()),
                style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                child: const Text('Clear', style: TextStyle(fontSize: 10.5, color: Colors.redAccent)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            constraints: const BoxConstraints(maxHeight: 160),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: widget.borderColor),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              itemCount: _pickedFiles.length,
              separatorBuilder: (context, index) => Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.4)),
              itemBuilder: (ctx, i) {
                final f = _pickedFiles[i];
                return Row(
                  children: [
                    const Icon(LucideIcons.file, size: 13, color: AppTheme.accentTeal),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        f.name,
                        style: TextStyle(color: widget.textPrimary, fontSize: 11, fontWeight: FontWeight.w500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(f.formattedSize, style: TextStyle(color: widget.textSecondary, fontSize: 9.5)),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 12),
                      color: widget.textSecondary,
                      constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                      padding: EdgeInsets.zero,
                      onPressed: _isProcessing ? null : () => setState(() => _pickedFiles.removeAt(i)),
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentTeal,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(LucideIcons.uploadCloud, size: 15),
            label: Text('Upload All ${_pickedFiles.length} File(s)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
            onPressed: _isProcessing ? null : _startLocalUpload,
          ),
        ],
      ],
    );
  }

  Widget _buildUrlDownloadTab() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'ASSET WEB URL',
          style: TextStyle(color: widget.textSecondary, fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 4),
        Container(
          decoration: BoxDecoration(
            color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: widget.borderColor),
          ),
          child: Row(
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Icon(LucideIcons.globe, size: 14, color: AppTheme.accentTeal),
              ),
              Expanded(
                child: TextField(
                  controller: _urlCtrl,
                  style: TextStyle(color: widget.textPrimary, fontSize: 11.5),
                  decoration: const InputDecoration(
                    hintText: 'https://example.com/asset.png, video.mp4, archive.zip...',
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(LucideIcons.clipboard, size: 13),
                color: widget.textSecondary,
                tooltip: 'Paste from clipboard',
                constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                padding: EdgeInsets.zero,
                onPressed: () async {
                  final data = await Clipboard.getData('text/plain');
                  if (data?.text != null) {
                    _urlCtrl.text = data!.text!.trim();
                  }
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'CUSTOM FILENAME (OPTIONAL)',
          style: TextStyle(color: widget.textSecondary, fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
        const SizedBox(height: 4),
        Container(
          decoration: BoxDecoration(
            color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: widget.borderColor),
          ),
          child: TextField(
            controller: _fileNameCtrl,
            style: TextStyle(color: widget.textPrimary, fontSize: 11.5),
            decoration: const InputDecoration(
              hintText: 'e.g. hero-banner.png (leave blank to auto-derive from URL)',
              border: InputBorder.none,
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              prefixIcon: Icon(LucideIcons.fileSignature, size: 13, color: AppTheme.accentTeal),
              prefixIconConstraints: BoxConstraints(minWidth: 26, minHeight: 26),
            ),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.accentTeal,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          icon: const Icon(LucideIcons.downloadCloud, size: 15),
          label: const Text('Download Directly to VPS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
          onPressed: _isProcessing ? null : _startUrlDownload,
        ),
      ],
    );
  }
}
