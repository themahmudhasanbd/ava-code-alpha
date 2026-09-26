import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:file_picker/file_picker.dart';
import '../services/agent_core_service.dart';
import '../theme/app_theme.dart';
import '../utils/app_toast.dart';
import '../utils/file_download_helper.dart';
import 'media_preview_view.dart';
import 'editor/code_editor_view.dart';

class FsNode {
  final String name;
  final String relativePath;
  final String fullPath;
  final bool isDirectory;
  final String size;
  final String type; // file extension or 'folder' / 'dotfile'
  final int lines;
  final String gitStatus;
  String content;
  bool isImage;
  String? imageBase64;
  final List<FsNode> children;
  bool isExpanded;
  bool isLoadingChildren;

  FsNode({
    required this.name,
    required this.relativePath,
    required this.fullPath,
    required this.isDirectory,
    this.size = '',
    this.type = '',
    this.lines = 0,
    this.gitStatus = '',
    this.content = '',
    this.isImage = false,
    this.imageBase64,
    List<FsNode>? children,
    this.isExpanded = false,
    this.isLoadingChildren = false,
  }) : children = children ?? [];
}

class WorkspaceFileExplorerWidget extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String vpsWorkspacePath;
  final AvaAgentCoreService agentCoreService;
  final ValueChanged<String>? onSelectFileForChat;
  final bool showHeaderBar;
  final ValueChanged<String>? onSelectDirectory;
  final bool isDirectoryPickerMode;
  final String? initialOpenFile;

  const WorkspaceFileExplorerWidget({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.vpsWorkspacePath,
    required this.agentCoreService,
    this.onSelectFileForChat,
    this.showHeaderBar = false,
    this.onSelectDirectory,
    this.isDirectoryPickerMode = false,
    this.initialOpenFile,
  });

  @override
  State<WorkspaceFileExplorerWidget> createState() => _WorkspaceFileExplorerWidgetState();
}

class _WorkspaceFileExplorerWidgetState extends State<WorkspaceFileExplorerWidget> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _editorController = TextEditingController();
  String _searchQuery = '';
  String _activeFilterCategory = 'all';

  bool _isLoadingTree = true;
  bool _isLoadingContent = false;
  bool _isTreeCollapsed = false;
  bool _showSearchBar = false;
  bool _isUploadingFile = false;
  late String _currentBrowsingPath;

  final List<FsNode> _openTabs = [];
  FsNode? _activeTabItem;
  List<FsNode> _rootTreeNodes = [];

  // Multi-select & Folder View state
  final Set<String> _selectedItemsForArchive = {};
  bool _isSelectMode = false;
  bool _isGridView = false;
  bool _isArchiving = false;
  bool _isDownloading = false;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    _currentBrowsingPath = widget.vpsWorkspacePath.isNotEmpty ? widget.vpsWorkspacePath : '/root';
    _loadRealWorkspaceTree(_currentBrowsingPath);
    if (widget.initialOpenFile != null && widget.initialOpenFile!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _openPathDirectly(widget.initialOpenFile!);
      });
    }
  }

  @override
  void didUpdateWidget(covariant WorkspaceFileExplorerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.vpsWorkspacePath != widget.vpsWorkspacePath && widget.vpsWorkspacePath.isNotEmpty) {
      _currentBrowsingPath = widget.vpsWorkspacePath;
      _loadRealWorkspaceTree(_currentBrowsingPath);
    }
    if (widget.initialOpenFile != null &&
        widget.initialOpenFile!.isNotEmpty &&
        widget.initialOpenFile != oldWidget.initialOpenFile) {
      _openPathDirectly(widget.initialOpenFile!);
    }
  }

  void _openPathDirectly(String filePath) {
    final existing = _openTabs.where((t) => t.fullPath == filePath).firstOrNull;
    if (existing != null) {
      _openFileInTab(existing, collapseTreeOnMobile: true);
      return;
    }
    final fileName = filePath.split('/').last;
    final node = FsNode(
      name: fileName,
      relativePath: fileName,
      fullPath: filePath,
      isDirectory: false,
    );
    _openFileInTab(node, collapseTreeOnMobile: true);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _editorController.dispose();
    super.dispose();
  }

  void _goUpOneDirectory() {
    if (_currentBrowsingPath == '/' || _currentBrowsingPath.isEmpty) return;
    final lastSlash = _currentBrowsingPath.lastIndexOf('/');
    if (lastSlash <= 0) {
      _loadRealWorkspaceTree('/');
    } else {
      _loadRealWorkspaceTree(_currentBrowsingPath.substring(0, lastSlash));
    }
  }

  Future<void> _loadRealWorkspaceTree([String? path]) async {
    final target = path ?? _currentBrowsingPath;
    setState(() {
      _isLoadingTree = true;
      _currentBrowsingPath = target;
    });

    final rawTree = await widget.agentCoreService.fetchWorkspaceFilesTree(target);

    if (mounted) {
      setState(() {
        _rootTreeNodes = _convertRawListToFsNodes(rawTree, target);
        _isLoadingTree = false;
      });
    }
  }

  List<FsNode> _convertRawListToFsNodes(List list, [String? parentPath]) {
    final basePath = parentPath ?? _currentBrowsingPath;
    final List<FsNode> nodes = [];
    for (final item in list) {
      if (item is Map) {
        final isDir = item['isDirectory'] == true ||
            item['type'] == 'directory' ||
            (item['path'] != null && item['path'].toString().endsWith('/'));
        final name = item['name']?.toString() ?? '';
        final fullPath = item['absolute']?.toString() ??
            item['fullPath']?.toString() ??
            (basePath == '/' ? '/$name' : '$basePath/$name');
        final relPath = item['path']?.toString() ?? item['relativePath']?.toString() ?? name;
        final childrenRaw = item['children'];
        List<FsNode> childrenNodes = [];
        if (childrenRaw is List) {
          childrenNodes = _convertRawListToFsNodes(childrenRaw, fullPath);
        }

        String fileExt = 'file';
        if (isDir) {
          fileExt = 'folder';
        } else if (name.contains('.')) {
          fileExt = name.split('.').last.toLowerCase();
        }

        nodes.add(
          FsNode(
            name: name,
            relativePath: relPath,
            fullPath: fullPath,
            isDirectory: isDir,
            size: item['size']?.toString() ?? '',
            type: fileExt,
            lines: (item['lines'] as num?)?.toInt() ?? 0,
            gitStatus: item['gitStatus']?.toString() ?? '',
            content: item['content']?.toString() ?? '',
            children: childrenNodes,
            isExpanded: false,
          ),
        );
      }
    }
    nodes.sort((a, b) {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    return nodes;
  }

  Future<void> _toggleFolderExpand(FsNode folderNode) async {
    setState(() {
      folderNode.isExpanded = !folderNode.isExpanded;
    });

    if (folderNode.isExpanded && folderNode.children.isEmpty) {
      setState(() => folderNode.isLoadingChildren = true);
      final subRaw = await widget.agentCoreService.fetchWorkspaceFilesTree(folderNode.fullPath);
      if (mounted) {
        setState(() {
          folderNode.isLoadingChildren = false;
          if (subRaw.isNotEmpty) {
            folderNode.children.clear();
            folderNode.children.addAll(_convertRawListToFsNodes(subRaw, folderNode.fullPath));
          }
        });
      }
    }
  }

  Future<void> _openFileInTab(FsNode item, {bool collapseTreeOnMobile = false}) async {
    if (item.isDirectory) {
      setState(() {
        _activeTabItem = null;
      });
      _loadRealWorkspaceTree(item.fullPath);
      return;
    }

    if (!_openTabs.contains(item)) {
      _openTabs.add(item);
    }
    setState(() {
      _activeTabItem = item;
      if (collapseTreeOnMobile) {
        _isTreeCollapsed = true;
      }
    });

    if (!_isMediaNode(item) && item.content.isEmpty && item.imageBase64 == null) {
      setState(() => _isLoadingContent = true);
      final result = await widget.agentCoreService.fetchWorkspaceFileContent(item.fullPath);
      if (mounted) {
        setState(() {
          if (result != null) {
            item.content = result;
          } else {
            item.content = '// File: ${item.name}\n// Path: ${item.fullPath}\n// Ready for IDE editing.';
          }
          _editorController.text = item.content;
          _isLoadingContent = false;
        });
      }
    } else if (!_isMediaNode(item)) {
      _editorController.text = item.content;
    }
  }

  void _closeTab(FsNode item) {
    setState(() {
      _openTabs.remove(item);
      if (_activeTabItem == item) {
        _activeTabItem = _openTabs.isNotEmpty ? _openTabs.last : null;
        if (_activeTabItem != null) {
          _editorController.text = _activeTabItem!.content;
        }
      }
      if (_openTabs.isEmpty) {
        _isTreeCollapsed = false;
      }
    });
  }

  Future<void> _pickAndUploadFile() async {
    try {
      final files = await FilePicker.pickFiles(type: FileType.any);

      if (files.isNotEmpty) {
        setState(() => _isUploadingFile = true);
        int successCount = 0;
        for (final file in files) {
          final bytes = await file.readAsBytes();
          if (bytes.isEmpty) continue;

          final res = await widget.agentCoreService.uploadFile(
            targetDirectory: _currentBrowsingPath,
            fileName: file.name,
            fileBytes: bytes,
          );

          if (res != null && res['status'] == 'ok') {
            successCount++;
          }
        }

        if (mounted) {
          setState(() => _isUploadingFile = false);
          if (successCount > 0) {
            AppToast.success(context, 'Uploaded $successCount file(s) to $_currentBrowsingPath');
            _loadRealWorkspaceTree(_currentBrowsingPath);
          } else {
            AppToast.error(context, 'Failed to upload selected file(s)');
          }
        }
      }
    } catch (err) {
      if (mounted) {
        setState(() => _isUploadingFile = false);
        AppToast.error(context, 'Upload error: $err');
      }
    }
  }

  void _showDownloadFromUrlDialog() {
    final urlCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text(
          'Download from Remote URL',
          style: TextStyle(color: widget.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter remote asset/file URL to download directly into $_currentBrowsingPath:',
              style: TextStyle(color: widget.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlCtrl,
              style: TextStyle(color: widget.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'https://example.com/asset.zip or .png',
                hintStyle: TextStyle(color: widget.textSecondary.withValues(alpha: 0.5)),
                filled: true,
                fillColor: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                focusedBorder: OutlineInputBorder(borderRadius: const BorderRadius.all(Radius.circular(8)), borderSide: BorderSide(color: AppTheme.accentTeal)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: nameCtrl,
              style: TextStyle(color: widget.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Custom filename (optional)',
                hintStyle: TextStyle(color: widget.textSecondary.withValues(alpha: 0.5)),
                filled: true,
                fillColor: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                focusedBorder: OutlineInputBorder(borderRadius: const BorderRadius.all(Radius.circular(8)), borderSide: BorderSide(color: AppTheme.accentTeal)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
            onPressed: () async {
              final url = urlCtrl.text.trim();
              final customName = nameCtrl.text.trim();
              if (url.isNotEmpty) {
                Navigator.pop(ctx);
                setState(() => _isUploadingFile = true);
                AppToast.info(context, 'Downloading remote file into $_currentBrowsingPath...');
                final res = await widget.agentCoreService.downloadFileFromUrl(
                  targetDirectory: _currentBrowsingPath,
                  url: url,
                  fileName: customName.isNotEmpty ? customName : null,
                );
                if (mounted) {
                  setState(() => _isUploadingFile = false);
                  if (res != null && res['status'] == 'ok') {
                    AppToast.success(context, 'Downloaded "${res['fileName']}" successfully');
                    _loadRealWorkspaceTree(_currentBrowsingPath);
                  } else {
                    AppToast.error(context, 'Failed to download from URL');
                  }
                }
              }
            },
            child: const Text('Download', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showUploadOptionsBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: widget.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: widget.borderColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Upload / Import to VPS',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: widget.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  'Target: $_currentBrowsingPath',
                  style: TextStyle(fontSize: 11.5, color: widget.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 18),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.accentTeal.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.uploadCloud, color: AppTheme.accentTeal, size: 20),
                  ),
                  title: Text('Upload Local Files', style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.w600)),
                  subtitle: Text('Pick one or more files from your device to upload', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickAndUploadFile();
                  },
                ),
                const SizedBox(height: 6),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.link, color: Color(0xFF6366F1), size: 20),
                  ),
                  title: Text('Download from Web URL', style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.w600)),
                  subtitle: Text('Directly download remote asset/archive into this directory', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showDownloadFromUrlDialog();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  bool _isMediaNode(FsNode node) {
    if (node.isDirectory) return false;
    final name = node.name.toLowerCase();
    final ext = name.contains('.') ? name.split('.').last : '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'mp4', 'webm', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'zip', 'tar', 'gz', 'tgz'].contains(ext);
  }

  bool _isArchiveNode(FsNode node) {
    if (node.isDirectory) return false;
    final name = node.name.toLowerCase();
    return name.endsWith('.zip') || name.endsWith('.tar.gz') || name.endsWith('.tgz') || name.endsWith('.tar') || name.endsWith('.gz');
  }

  void _showArchiveDialog() async {
    if (_selectedItemsForArchive.isEmpty) return;

    final defaultName = 'archive-${DateTime.now().millisecondsSinceEpoch}';
    final nameCtrl = TextEditingController(text: defaultName);
    String selectedFormat = 'zip';

    try {
      await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: widget.cardBg,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: widget.borderColor),
              ),
              title: Row(
                children: [
                  const Icon(LucideIcons.archive, size: 20, color: Color(0xFF6366F1)),
                  const SizedBox(width: 8),
                  Text(
                    'Archive Selected Files',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: widget.textPrimary),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Compress ${_selectedItemsForArchive.length} selected item(s) into an archive inside: $_currentBrowsingPath',
                    style: TextStyle(fontSize: 11, color: widget.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameCtrl,
                    style: TextStyle(fontSize: 13, color: widget.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Archive Name',
                      labelStyle: TextStyle(fontSize: 12, color: widget.textSecondary),
                      hintText: 'e.g. bundle or backup',
                      isDense: true,
                      filled: true,
                      fillColor: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: widget.borderColor),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text('Format: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: widget.textPrimary)),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('ZIP (.zip)', style: TextStyle(fontSize: 11)),
                        selected: selectedFormat == 'zip',
                        onSelected: (val) {
                          if (val) setDialogState(() => selectedFormat = 'zip');
                        },
                      ),
                      const SizedBox(width: 6),
                      ChoiceChip(
                        label: const Text('TAR.GZ (.tar.gz)', style: TextStyle(fontSize: 11)),
                        selected: selectedFormat == 'tar.gz',
                        onSelected: (val) {
                          if (val) setDialogState(() => selectedFormat = 'tar.gz');
                        },
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
                ),
                ElevatedButton.icon(
                  icon: const Icon(LucideIcons.archive, size: 14),
                  label: const Text('Create Archive', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    final rawName = nameCtrl.text.trim();
                    final archiveName = rawName.isNotEmpty ? rawName : defaultName;
                    Navigator.pop(ctx);
                    _createArchive(archiveName, selectedFormat);
                  },
                ),
              ],
            );
          },
        );
      },
    );
    } finally {
      nameCtrl.dispose();
    }
  }

  Future<void> _createArchive(String archiveName, String format) async {
    setState(() => _isArchiving = true);
    final res = await widget.agentCoreService.archiveFiles(
      targetDirectory: _currentBrowsingPath,
      fileNames: _selectedItemsForArchive.toList(),
      archiveName: archiveName,
      format: format,
    );

    if (!mounted) return;
    setState(() {
      _isArchiving = false;
      _selectedItemsForArchive.clear();
      _isSelectMode = false;
    });
    if (res != null && res['status'] == 'ok') {
      AppToast.success(context, 'Created archive "${res['archiveName']}" (${res['size']})');
      _loadRealWorkspaceTree(_currentBrowsingPath);
    } else {
      AppToast.error(context, 'Archive failed: ${res?['message'] ?? 'Unknown error'}');
    }
  }

  Future<void> _downloadSelected() async {
    if (_selectedItemsForArchive.isEmpty) return;
    setState(() => _isDownloading = true);
    await FileDownloadHelper.downloadMultipleFilesAsZip(
      context: context,
      agentCoreService: widget.agentCoreService,
      targetDirectory: _currentBrowsingPath,
      fileNames: _selectedItemsForArchive.toList(),
    );
    if (mounted) {
      setState(() => _isDownloading = false);
    }
  }

  Future<void> _downloadSingleNode(FsNode node) async {
    await FileDownloadHelper.downloadSingleFile(
      context: context,
      agentCoreService: widget.agentCoreService,
      fullPath: node.fullPath,
      fileName: node.name,
    );
  }

  Future<void> _confirmAndDeleteSelected() async {
    if (_selectedItemsForArchive.isEmpty) return;
    final count = _selectedItemsForArchive.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.triangleAlert, size: 20, color: Colors.redAccent),
            const SizedBox(width: 8),
            Text(
              'Delete $count item(s)?',
              style: TextStyle(color: widget.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete $count selected item(s) from "$_currentBrowsingPath"?\n\nThis action cannot be undone.',
          style: TextStyle(color: widget.textSecondary, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton.icon(
            icon: const Icon(LucideIcons.trash2, size: 14),
            label: const Text('Delete Permanently', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isDeleting = true);
      int deletedCount = 0;
      for (final name in _selectedItemsForArchive) {
        final fullPath = _currentBrowsingPath.endsWith('/')
            ? '$_currentBrowsingPath$name'
            : '$_currentBrowsingPath/$name';
        final ok = await widget.agentCoreService.deleteWorkspaceFile(fullPath);
        if (ok) deletedCount++;
      }

      if (mounted) {
        setState(() {
          _isDeleting = false;
          _selectedItemsForArchive.clear();
          _isSelectMode = false;
        });
        if (deletedCount > 0) {
          AppToast.success(context, 'Deleted $deletedCount item(s) successfully');
          _loadRealWorkspaceTree(_currentBrowsingPath);
        } else {
          AppToast.error(context, 'Failed to delete selected item(s)');
        }
      }
    }
  }

  Future<void> _confirmDeleteSingleNode(FsNode node) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Row(
          children: [
            const Icon(LucideIcons.trash2, size: 20, color: Colors.redAccent),
            const SizedBox(width: 8),
            Text(
              'Delete ${node.isDirectory ? "Folder" : "File"}?',
              style: TextStyle(color: widget.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete "${node.name}" from server?\n\nPath: ${node.fullPath}',
          style: TextStyle(color: widget.textSecondary, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton.icon(
            icon: const Icon(LucideIcons.trash2, size: 14),
            label: const Text('Delete', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final ok = await widget.agentCoreService.deleteWorkspaceFile(node.fullPath);
      if (mounted) {
        if (ok) {
          AppToast.success(context, 'Deleted "${node.name}" successfully');
          _loadRealWorkspaceTree(_currentBrowsingPath);
        } else {
          AppToast.error(context, 'Failed to delete "${node.name}"');
        }
      }
    }
  }

  void _copyNodePath(FsNode node) {
    Clipboard.setData(ClipboardData(text: node.fullPath));
    AppToast.copied(context, 'Copied path: ${node.name}');
  }

  void _showUnarchiveConfirmDialog(FsNode node) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: widget.cardBg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: widget.borderColor),
          ),
          title: Row(
            children: [
              const Icon(LucideIcons.archiveRestore, size: 20, color: Color(0xFF10B981)),
              const SizedBox(width: 8),
              Text(
                'Extract Archive',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: widget.textPrimary),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Do you want to extract "${node.name}" into the current folder?',
                style: TextStyle(fontSize: 13, color: widget.textPrimary),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: widget.borderColor),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.folderInput, size: 14, color: Color(0xFF6366F1)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _currentBrowsingPath,
                        style: TextStyle(fontSize: 11, color: widget.textSecondary, fontFamily: 'monospace'),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
            ),
            ElevatedButton.icon(
              icon: const Icon(LucideIcons.archiveRestore, size: 14),
              label: const Text('Extract Here', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                Navigator.pop(ctx);
                final res = await widget.agentCoreService.unarchiveFile(
                  archivePath: node.fullPath,
                  targetDirectory: _currentBrowsingPath,
                );

                if (mounted) {
                  if (res != null && res['status'] == 'ok') {
                    AppToast.success(context, 'Extracted "${node.name}" successfully!');
                    _loadRealWorkspaceTree(_currentBrowsingPath);
                  } else {
                    AppToast.error(context, 'Extraction failed: ${res?['message'] ?? 'Unknown error'}');
                  }
                }
              },
            ),
          ],
        );
      },
    );
  }

  void _showCreateFileDialog() async {
    final nameController = TextEditingController();
    try {
      await showDialog(
        context: context,
        builder: (ctx) {
          return AlertDialog(
            backgroundColor: widget.cardBg,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: widget.borderColor),
            ),
            title: Row(
              children: [
                const Icon(LucideIcons.filePlus2, size: 20, color: Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Text(
                  'New File',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: widget.textPrimary),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Create in: $_currentBrowsingPath',
                  style: TextStyle(fontSize: 11, color: widget.textSecondary, fontFamily: 'monospace'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  autofocus: true,
                  style: TextStyle(fontSize: 13, color: widget.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'e.g. index.ts, main.dart, app.css',
                    hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary),
                    isDense: true,
                    filled: true,
                    fillColor: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: widget.borderColor),
                    ),
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
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  final name = nameController.text.trim();
                  if (name.isNotEmpty) {
                    Navigator.pop(ctx);
                    _createNewFile(name);
                  }
                },
                child: const Text('Create'),
              ),
            ],
          );
        },
      );
    } finally {
      nameController.dispose();
    }
  }

  void _showCreateFolderDialog() async {
    final nameController = TextEditingController();
    try {
      await showDialog(
        context: context,
        builder: (ctx) {
          return AlertDialog(
            backgroundColor: widget.cardBg,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: widget.borderColor),
            ),
            title: Row(
              children: [
                const Icon(LucideIcons.folderPlus, size: 20, color: Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Text(
                  'New Folder',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: widget.textPrimary),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Create in: $_currentBrowsingPath',
                  style: TextStyle(fontSize: 11, color: widget.textSecondary, fontFamily: 'monospace'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  autofocus: true,
                  style: TextStyle(fontSize: 13, color: widget.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'e.g. components, utils, styles',
                    hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary),
                    isDense: true,
                    filled: true,
                    fillColor: widget.isDark ? const Color(0xFF18181B) : const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: widget.borderColor),
                    ),
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
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  final name = nameController.text.trim();
                  if (name.isNotEmpty) {
                    Navigator.pop(ctx);
                    _createNewFolder(name);
                  }
                },
                child: const Text('Create'),
              ),
            ],
          );
        },
      );
    } finally {
      nameController.dispose();
    }
  }

  Future<void> _createNewFile(String fileName) async {
    final fullPath = _currentBrowsingPath == '/' ? '/$fileName' : '$_currentBrowsingPath/$fileName';
    final newNode = FsNode(
      name: fileName,
      relativePath: fileName,
      fullPath: fullPath,
      isDirectory: false,
      type: fileName.contains('.') ? fileName.split('.').last.toLowerCase() : 'file',
      content: '// New file: $fileName\n',
    );

    setState(() {
      _rootTreeNodes.add(newNode);
    });

    _openFileInTab(newNode);
    AppToast.fileSaved(context, fileName);
  }

  Future<void> _createNewFolder(String folderName) async {
    final fullPath = _currentBrowsingPath == '/' ? '/$folderName' : '$_currentBrowsingPath/$folderName';
    final newNode = FsNode(
      name: folderName,
      relativePath: folderName,
      fullPath: fullPath,
      isDirectory: true,
      type: 'folder',
    );

    setState(() {
      _rootTreeNodes.insert(0, newNode);
    });

    AppToast.success(context, 'Created folder: $folderName');
  }

  IconData _getFileIcon(String type, String name) {
    if (name.startsWith('.')) return LucideIcons.fileLock2;
    final ext = type.toLowerCase();
    switch (ext) {
      case 'dart':
        return LucideIcons.code2;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'vue':
      case 'svelte':
      case 'php':
      case 'py':
      case 'go':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'h':
      case 'java':
      case 'kt':
      case 'swift':
      case 'sql':
      case 'sh':
      case 'bash':
        return LucideIcons.fileCode2;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
      case 'lock':
      case 'xml':
      case 'ini':
      case 'conf':
      case 'env':
        return LucideIcons.fileJson;
      case 'md':
      case 'markdown':
      case 'txt':
      case 'log':
      case 'rst':
      case 'doc':
      case 'pdf':
        return LucideIcons.fileText;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
      case 'ico':
      case 'gif':
        return LucideIcons.image;
      case 'folder':
        return LucideIcons.folder;
      default:
        return LucideIcons.file;
    }
  }

  Color _getFileIconColor(String type, String name) {
    if (name.startsWith('.')) return const Color(0xFFEC4899);
    final ext = type.toLowerCase();
    switch (ext) {
      case 'dart':
        return const Color(0xFF38BDF8);
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'vue':
      case 'svelte':
        return const Color(0xFFFACC15);
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
      case 'lock':
        return const Color(0xFFFB923C);
      case 'md':
      case 'txt':
      case 'log':
        return const Color(0xFFA78BFA);
      case 'png':
      case 'jpg':
      case 'svg':
      case 'webp':
        return const Color(0xFF10B981);
      case 'php':
        return const Color(0xFF818CF8);
      case 'py':
        return const Color(0xFF3B82F6);
      case 'go':
      case 'rs':
      case 'cpp':
      case 'c':
        return const Color(0xFF06B6D4);
      case 'folder':
        return const Color(0xFF6366F1);
      default:
        return widget.textSecondary;
    }
  }

  bool _matchesCategoryFilter(FsNode node) {
    if (_activeFilterCategory == 'all') return true;
    if (node.isDirectory) return true; // Always allow entering folders

    final name = node.name.toLowerCase();
    final ext = node.type.toLowerCase();

    if (_activeFilterCategory == 'private') return name.startsWith('.');
    if (_activeFilterCategory == 'code') {
      return !['png', 'jpg', 'jpeg', 'svg', 'webp', 'ico', 'gif', 'mp4', 'mp3', 'pdf', 'zip', 'tar', 'gz'].contains(ext);
    }
    if (_activeFilterCategory == 'configs') {
      return ['json', 'yaml', 'yml', 'toml', 'lock', 'xml', 'env', 'ini', 'config', 'conf', 'cnf', 'properties'].contains(ext) ||
          name.contains('config') ||
          name.startsWith('.');
    }
    if (_activeFilterCategory == 'docs') return ['md', 'markdown', 'txt', 'pdf', 'doc', 'docx', 'rst', 'log'].contains(ext);
    if (_activeFilterCategory == 'images') return ['png', 'jpg', 'jpeg', 'svg', 'webp', 'ico', 'gif', 'bmp', 'tiff'].contains(ext);
    if (_activeFilterCategory == 'media') return _isMediaNode(node);
    if (_activeFilterCategory == 'archive') return _isArchiveNode(node);

    return true;
  }

  List<Widget> _buildTreeListRecursive(List<FsNode> nodes, int depth) {
    final List<Widget> widgets = [];

    for (final node in nodes) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matches = node.name.toLowerCase().contains(q) || node.relativePath.toLowerCase().contains(q);
        if (!node.isDirectory && !matches) continue;
      }

      if (!_matchesCategoryFilter(node) && !node.isDirectory) {
        continue;
      }

      final isSelected = !node.isDirectory && _activeTabItem == node;
      final indent = (depth * 8).toDouble();
      final isPrivateDotfile = node.name.startsWith('.');

      if (node.isDirectory) {
        widgets.add(
          InkWell(
            onTap: () => _toggleFolderExpand(node),
            onDoubleTap: () => _loadRealWorkspaceTree(node.fullPath),
            child: Container(
              padding: EdgeInsets.only(left: 6 + indent, right: 6, top: 5, bottom: 5),
              child: Row(
                children: [
                  InkWell(
                    onTap: () => _toggleFolderExpand(node),
                    child: Padding(
                      padding: const EdgeInsets.all(2.0),
                      child: Icon(
                        node.isExpanded ? LucideIcons.chevronDown : LucideIcons.chevronRight,
                        size: 12,
                        color: widget.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 3),
                  Icon(
                    node.isExpanded ? LucideIcons.folderOpen : LucideIcons.folder,
                    size: 14,
                    color: isPrivateDotfile ? const Color(0xFFEC4899) : const Color(0xFF6366F1),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      node.name,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isPrivateDotfile ? const Color(0xFFF472B6) : widget.textPrimary,
                      ),
                    ),
                  ),
                  if (node.isLoadingChildren)
                    const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF6366F1)),
                    )
                  else
                    InkWell(
                      onTap: () => _loadRealWorkspaceTree(node.fullPath),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Open', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
                            SizedBox(width: 2),
                            Icon(LucideIcons.arrowRight, size: 9, color: Color(0xFF6366F1)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );

        if (node.isExpanded) {
          widgets.addAll(_buildTreeListRecursive(node.children, depth + 1));
        }
      } else {
        widgets.add(
          InkWell(
            onTap: () => _openFileInTab(node),
            child: Container(
              padding: EdgeInsets.only(left: 6 + indent, right: 4, top: 4, bottom: 4),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF4F46E5).withValues(alpha: 0.18) : Colors.transparent,
                border: isSelected ? const Border(left: BorderSide(color: Color(0xFF6366F1), width: 3)) : null,
              ),
              child: Row(
                children: [
                  Icon(_getFileIcon(node.type, node.name), size: 13, color: _getFileIconColor(node.type, node.name)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      node.name,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected
                            ? const Color(0xFF6366F1)
                            : (isPrivateDotfile ? const Color(0xFFF472B6) : widget.textPrimary),
                      ),
                    ),
                  ),
                  if (node.size.isNotEmpty)
                    Text(node.size, style: TextStyle(fontSize: 8, color: widget.textSecondary, fontFamily: 'monospace')),
                ],
              ),
            ),
          ),
        );
      }
    }

    return widgets;
  }

  Widget _buildCategoryFilterChip(String label, String key, IconData icon) {
    final isSelected = _activeFilterCategory == key;
    return InkWell(
      onTap: () => setState(() => _activeFilterCategory = key),
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: isSelected
              ? null
              : (widget.isDark ? const Color(0xFF1E1E24) : const Color(0xFFE2E8F0)),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF818CF8).withValues(alpha: 0.5)
                : widget.borderColor.withValues(alpha: 0.4),
            width: 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 11,
              color: isSelected ? Colors.white : widget.textSecondary,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : widget.textSecondary,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFolderGridView(List<FsNode> nodes, bool isWide) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = (constraints.maxWidth / (isWide ? 150 : 115)).floor().clamp(2, 8);
        return GridView.builder(
          padding: const EdgeInsets.all(12),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.95,
          ),
          itemCount: nodes.length,
          itemBuilder: (ctx, idx) {
            final node = nodes[idx];
            final isSelected = _selectedItemsForArchive.contains(node.name);
            final isArchive = _isArchiveNode(node);

            return InkWell(
              onTap: () {
                if (_isSelectMode) {
                  setState(() {
                    if (isSelected) {
                      _selectedItemsForArchive.remove(node.name);
                    } else {
                      _selectedItemsForArchive.add(node.name);
                    }
                  });
                } else {
                  _openFileInTab(node);
                }
              },
              onLongPress: () {
                setState(() {
                  _isSelectMode = true;
                  if (!isSelected) {
                    _selectedItemsForArchive.add(node.name);
                  }
                });
              },
              borderRadius: BorderRadius.circular(10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                      : (widget.isDark ? const Color(0xFF141418) : Colors.white),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF6366F1)
                        : (widget.isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0)),
                    width: isSelected ? 1.5 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: widget.isDark ? 0.2 : 0.04),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(8),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            node.isDirectory ? LucideIcons.folder : _getFileIcon(node.type, node.name),
                            size: 34,
                            color: node.isDirectory ? const Color(0xFF6366F1) : _getFileIconColor(node.type, node.name),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            node.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: node.isDirectory ? FontWeight.bold : FontWeight.w500,
                              color: widget.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            node.isDirectory ? 'Folder' : (node.size.isNotEmpty ? node.size : node.type.toUpperCase()),
                            style: TextStyle(
                              fontSize: 9,
                              color: widget.textSecondary,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_isSelectMode)
                      Positioned(
                        top: 0,
                        left: 0,
                        child: Icon(
                          isSelected ? LucideIcons.checkSquare : LucideIcons.square,
                          size: 16,
                          color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary,
                        ),
                      ),
                    if (isArchive && !_isSelectMode)
                      Positioned(
                        top: 0,
                        right: 0,
                        child: InkWell(
                          onTap: () => _showUnarchiveConfirmDialog(node),
                          borderRadius: BorderRadius.circular(4),
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Icon(LucideIcons.archiveRestore, size: 13, color: Color(0xFF10B981)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildFolderListView(List<FsNode> nodes, bool isWide) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      itemCount: nodes.length,
      separatorBuilder: (context, index) => Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
      itemBuilder: (ctx, idx) {
        final node = nodes[idx];
        final isSelected = _selectedItemsForArchive.contains(node.name);
        final isArchive = _isArchiveNode(node);

        return InkWell(
          onTap: () {
            if (_isSelectMode) {
              setState(() {
                if (isSelected) {
                  _selectedItemsForArchive.remove(node.name);
                } else {
                  _selectedItemsForArchive.add(node.name);
                }
              });
            } else {
              _openFileInTab(node);
            }
          },
          onLongPress: () {
            setState(() {
              _isSelectMode = true;
              if (!isSelected) {
                _selectedItemsForArchive.add(node.name);
              }
            });
          },
          borderRadius: BorderRadius.circular(6),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFF6366F1).withValues(alpha: 0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              children: [
                if (_isSelectMode) ...[
                  Icon(
                    isSelected ? LucideIcons.checkSquare : LucideIcons.square,
                    size: 16,
                    color: isSelected ? const Color(0xFF6366F1) : widget.textSecondary,
                  ),
                  const SizedBox(width: 8),
                ],
                Icon(
                  node.isDirectory ? LucideIcons.folder : _getFileIcon(node.type, node.name),
                  size: 18,
                  color: node.isDirectory ? const Color(0xFF6366F1) : _getFileIconColor(node.type, node.name),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        node.name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: node.isDirectory ? FontWeight.bold : FontWeight.w500,
                          color: widget.textPrimary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (!node.isDirectory && node.size.isNotEmpty)
                        Text(
                          node.size,
                          style: TextStyle(
                            fontSize: 10,
                            color: widget.textSecondary,
                            fontFamily: 'monospace',
                          ),
                        ),
                    ],
                  ),
                ),
                if (isArchive) ...[
                  ElevatedButton.icon(
                    icon: const Icon(LucideIcons.archiveRestore, size: 12),
                    label: const Text('Extract', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      minimumSize: const Size(40, 24),
                      elevation: 0,
                    ),
                    onPressed: () => _showUnarchiveConfirmDialog(node),
                  ),
                  const SizedBox(width: 6),
                ],
                if (node.isDirectory)
                  Icon(LucideIcons.chevronRight, size: 14, color: widget.textSecondary)
                else
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
                    onSelected: (val) {
                      if (val == 'download') {
                        _downloadSingleNode(node);
                      } else if (val == 'delete') {
                        _confirmDeleteSingleNode(node);
                      } else if (val == 'chat') {
                        widget.onSelectFileForChat?.call(node.relativePath);
                        AppToast.info(context, 'Attached ${node.name} to chat');
                      } else if (val == 'select') {
                        setState(() {
                          _isSelectMode = true;
                          _selectedItemsForArchive.add(node.name);
                        });
                      } else if (val == 'copy_path') {
                        _copyNodePath(node);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'download',
                        child: Row(children: [Icon(LucideIcons.download, size: 14, color: Color(0xFF00B4AB)), SizedBox(width: 8), Text('Download to Device', style: TextStyle(fontSize: 12))]),
                      ),
                      const PopupMenuItem(
                        value: 'select',
                        child: Row(children: [Icon(LucideIcons.checkSquare, size: 14, color: Color(0xFF6366F1)), SizedBox(width: 8), Text('Select (Multi-select)', style: TextStyle(fontSize: 12))]),
                      ),
                      if (widget.onSelectFileForChat != null)
                        const PopupMenuItem(
                          value: 'chat',
                          child: Row(children: [Icon(LucideIcons.messageSquareQuote, size: 14), SizedBox(width: 8), Text('Attach to Chat', style: TextStyle(fontSize: 12))]),
                        ),
                      const PopupMenuItem(
                        value: 'copy_path',
                        child: Row(children: [Icon(LucideIcons.copy, size: 14), SizedBox(width: 8), Text('Copy Path', style: TextStyle(fontSize: 12))]),
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

  Widget _buildFolderContentsView(bool isWide) {
    final filteredNodes = _rootTreeNodes.where((node) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matches = node.name.toLowerCase().contains(q) || node.relativePath.toLowerCase().contains(q);
        if (!matches) return false;
      }
      return _matchesCategoryFilter(node);
    }).toList();

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: widget.cardBg,
            border: Border(bottom: BorderSide(color: widget.borderColor)),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                Icon(LucideIcons.folderOpen, size: 16, color: const Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Text(
                  _currentBrowsingPath.split('/').lastWhere((s) => s.isNotEmpty, orElse: () => 'Root'),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: widget.textPrimary,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${filteredNodes.length} items',
                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                  ),
                ),
                const SizedBox(width: 10),
                InkWell(
                  onTap: () {
                    setState(() {
                      _isSelectMode = !_isSelectMode;
                      if (!_isSelectMode) _selectedItemsForArchive.clear();
                    });
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _isSelectMode
                          ? const Color(0xFF6366F1).withValues(alpha: 0.2)
                          : (widget.isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9)),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: _isSelectMode ? const Color(0xFF6366F1) : widget.borderColor,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _isSelectMode ? LucideIcons.checkSquare : LucideIcons.square,
                          size: 12,
                          color: _isSelectMode ? const Color(0xFF6366F1) : widget.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isSelectMode ? 'Selecting' : 'Select',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: _isSelectMode ? const Color(0xFF6366F1) : widget.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  icon: Icon(_isGridView ? LucideIcons.list : LucideIcons.layoutGrid, size: 15, color: widget.textSecondary),
                  tooltip: _isGridView ? 'Switch to List View' : 'Switch to Grid View',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  onPressed: () => setState(() => _isGridView = !_isGridView),
                ),
                IconButton(
                  icon: _isUploadingFile
                      ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF6366F1)))
                      : const Icon(LucideIcons.uploadCloud, size: 15, color: Color(0xFF6366F1)),
                  tooltip: 'Upload / Import Files to Folder',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  onPressed: _isUploadingFile ? null : _showUploadOptionsBottomSheet,
                ),
                IconButton(
                  icon: const Icon(LucideIcons.folderPlus, size: 15, color: Color(0xFF6366F1)),
                  tooltip: 'New Folder',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  onPressed: _showCreateFolderDialog,
                ),
                IconButton(
                  icon: const Icon(LucideIcons.filePlus2, size: 15, color: Color(0xFF6366F1)),
                  tooltip: 'New File',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  onPressed: _showCreateFileDialog,
                ),
              ],
            ),
          ),
        ),
        if (_isSelectMode)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.1),
              border: Border(bottom: BorderSide(color: const Color(0xFF6366F1).withValues(alpha: 0.3))),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  InkWell(
                    onTap: () {
                      setState(() {
                        if (_selectedItemsForArchive.length == filteredNodes.length) {
                          _selectedItemsForArchive.clear();
                        } else {
                          _selectedItemsForArchive.addAll(filteredNodes.map((n) => n.name));
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(4),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                      child: Row(
                        children: [
                          Icon(
                            _selectedItemsForArchive.length == filteredNodes.length && filteredNodes.isNotEmpty
                                ? LucideIcons.checkSquare
                                : LucideIcons.square,
                            size: 14,
                            color: const Color(0xFF6366F1),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _selectedItemsForArchive.length == filteredNodes.length && filteredNodes.isNotEmpty
                                ? 'Deselect All'
                                : 'Select All',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${_selectedItemsForArchive.length} selected',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Download Selected
                  ElevatedButton.icon(
                    icon: _isDownloading
                        ? const SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.black))
                        : const Icon(LucideIcons.download, size: 12),
                    label: Text(
                      _selectedItemsForArchive.length > 1 ? 'Download Zip' : 'Download',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00B4AB),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: const Size(54, 26),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: (_selectedItemsForArchive.isEmpty || _isDownloading) ? null : _downloadSelected,
                  ),
                  const SizedBox(width: 6),

                  // Delete Selected
                  ElevatedButton.icon(
                    icon: _isDeleting
                        ? const SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white))
                        : const Icon(LucideIcons.trash2, size: 12),
                    label: const Text('Delete', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.redAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: const Size(54, 26),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: (_selectedItemsForArchive.isEmpty || _isDeleting) ? null : _confirmAndDeleteSelected,
                  ),
                  const SizedBox(width: 6),

                  // Archive Selected
                  ElevatedButton.icon(
                    icon: _isArchiving
                        ? const SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white))
                        : const Icon(LucideIcons.archive, size: 12),
                    label: const Text('Archive', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: const Size(54, 26),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: (_selectedItemsForArchive.isEmpty || _isArchiving) ? null : _showArchiveDialog,
                  ),
                  const SizedBox(width: 6),

                  // Cancel Selection
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 14),
                    tooltip: 'Cancel Selection',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                    onPressed: () {
                      setState(() {
                        _isSelectMode = false;
                        _selectedItemsForArchive.clear();
                      });
                    },
                  ),
                ],
              ),
            ),
          ),
        Expanded(
          child: _isLoadingTree
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
              : filteredNodes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.folderOpen, size: 44, color: widget.textSecondary.withValues(alpha: 0.3)),
                          const SizedBox(height: 10),
                          Text(
                            _searchQuery.isNotEmpty ? 'No files match "$_searchQuery"' : 'This folder is empty',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: widget.textPrimary),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _searchQuery.isNotEmpty
                                ? 'Try clearing your search query or switching categories'
                                : 'Upload files or create new items using the toolbar',
                            style: TextStyle(fontSize: 11, color: widget.textSecondary),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              ElevatedButton.icon(
                                icon: const Icon(LucideIcons.uploadCloud, size: 13),
                                label: const Text('Upload / Import', style: TextStyle(fontSize: 11)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF6366F1),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                onPressed: _showUploadOptionsBottomSheet,
                              ),
                              OutlinedButton.icon(
                                icon: const Icon(LucideIcons.filePlus2, size: 13),
                                label: const Text('New File', style: TextStyle(fontSize: 11)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: widget.textPrimary,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                onPressed: _showCreateFileDialog,
                              ),
                              OutlinedButton.icon(
                                icon: const Icon(LucideIcons.folderPlus, size: 13),
                                label: const Text('New Folder', style: TextStyle(fontSize: 11)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: widget.textPrimary,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                onPressed: _showCreateFolderDialog,
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                  : _isGridView
                      ? _buildFolderGridView(filteredNodes, isWide)
                      : _buildFolderListView(filteredNodes, isWide),
        ),
      ],
    );
  }

  // ─── Professional Top Header Bar ──────────────────────────────────────────
  Widget _buildRedesignedTopHeader() {
    final segments = _currentBrowsingPath.split('/').where((s) => s.isNotEmpty).toList();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: widget.cardBg,
        border: Border(bottom: BorderSide(color: widget.borderColor)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Up directory button
              IconButton(
                icon: Icon(LucideIcons.arrowUp, size: 16, color: _currentBrowsingPath != '/' ? const Color(0xFF6366F1) : widget.textSecondary.withValues(alpha: 0.4)),
                tooltip: 'Go Up',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: _currentBrowsingPath != '/' ? _goUpOneDirectory : null,
              ),

              // Interactive Breadcrumb Path
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      InkWell(
                        onTap: () => _loadRealWorkspaceTree('/'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: _currentBrowsingPath == '/' ? const Color(0xFF6366F1).withValues(alpha: 0.2) : Colors.transparent,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('/', style: TextStyle(fontSize: 12, fontFamily: 'monospace', fontWeight: FontWeight.bold, color: widget.textPrimary)),
                        ),
                      ),
                      for (int i = 0; i < segments.length; i++) ...[
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 1),
                          child: Icon(LucideIcons.chevronRight, size: 11, color: Color(0xFF94A3B8)),
                        ),
                        InkWell(
                          onTap: () {
                            final targetPath = '/${segments.sublist(0, i + 1).join('/')}';
                            _loadRealWorkspaceTree(targetPath);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: i == segments.length - 1 ? const Color(0xFF6366F1).withValues(alpha: 0.2) : Colors.transparent,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              segments[i],
                              style: TextStyle(
                                fontSize: 12,
                                fontFamily: 'monospace',
                                fontWeight: i == segments.length - 1 ? FontWeight.bold : FontWeight.normal,
                                color: i == segments.length - 1 ? const Color(0xFF6366F1) : widget.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Actions: New File, New Folder, Upload, Search, Tree Collapse, Refresh
              IconButton(
                icon: const Icon(LucideIcons.filePlus2, size: 16, color: Color(0xFF6366F1)),
                tooltip: 'New File',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: _showCreateFileDialog,
              ),
              IconButton(
                icon: const Icon(LucideIcons.folderPlus, size: 16, color: Color(0xFF6366F1)),
                tooltip: 'New Folder',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: _showCreateFolderDialog,
              ),
              IconButton(
                icon: _isUploadingFile
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                      )
                    : const Icon(LucideIcons.uploadCloud, size: 16, color: Color(0xFF6366F1)),
                tooltip: 'Upload / Import to $_currentBrowsingPath',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: _isUploadingFile ? null : _showUploadOptionsBottomSheet,
              ),
              IconButton(
                icon: Icon(LucideIcons.search, size: 16, color: _showSearchBar ? const Color(0xFF6366F1) : widget.textSecondary),
                tooltip: 'Search & Filter',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: () => setState(() => _showSearchBar = !_showSearchBar),
              ),
              IconButton(
                icon: Icon(_isTreeCollapsed ? LucideIcons.panelLeftOpen : LucideIcons.panelLeftClose, size: 16, color: widget.textSecondary),
                tooltip: _isTreeCollapsed ? 'Show File List' : 'Hide File List',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: () => setState(() => _isTreeCollapsed = !_isTreeCollapsed),
              ),
              IconButton(
                icon: Icon(LucideIcons.refreshCw, size: 15, color: widget.textSecondary),
                tooltip: 'Refresh Directory',
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                padding: EdgeInsets.zero,
                onPressed: () => _loadRealWorkspaceTree(_currentBrowsingPath),
              ),
            ],
          ),

          // UPGRADED SEARCH & CATEGORY BAR
          if (_showSearchBar) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: widget.borderColor),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: widget.isDark ? 0.25 : 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Row 1: Search Input
                  Container(
                    height: 36,
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF1A1A20) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _searchQuery.isNotEmpty
                            ? const Color(0xFF6366F1).withValues(alpha: 0.6)
                            : widget.borderColor,
                        width: 1,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.search, size: 15, color: Color(0xFF6366F1)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: TextStyle(fontSize: 12, color: widget.textPrimary),
                            onChanged: (val) => setState(() => _searchQuery = val),
                            decoration: InputDecoration(
                              hintText: 'Search files by name or extension...',
                              hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(vertical: 8),
                            ),
                          ),
                        ),
                        if (_searchQuery.isNotEmpty) ...[
                          InkWell(
                            onTap: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(4.0),
                              child: Icon(LucideIcons.x, size: 13, color: widget.textSecondary),
                            ),
                          ),
                          const SizedBox(width: 4),
                        ],
                        InkWell(
                          onTap: () => setState(() => _showSearchBar = false),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(4.0),
                            child: Icon(LucideIcons.minimize2, size: 12, color: widget.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 7),

                  // Row 2: Category Filters
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildCategoryFilterChip('ALL', 'all', LucideIcons.layers),
                        const SizedBox(width: 5),
                        _buildCategoryFilterChip('CODE', 'code', LucideIcons.code),
                        const SizedBox(width: 5),
                        _buildCategoryFilterChip('MEDIA', 'media', LucideIcons.image),
                        const SizedBox(width: 5),
                        _buildCategoryFilterChip('ARCHIVES', 'archive', LucideIcons.archive),
                        const SizedBox(width: 5),
                        _buildCategoryFilterChip('CONFIGS', 'configs', LucideIcons.settings2),
                        const SizedBox(width: 5),
                        _buildCategoryFilterChip('DOCS', 'docs', LucideIcons.fileText),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isDirectoryPickerMode) {
      return _buildDirectoryPickerMode();
    }

    return Column(
      children: [
        // Redesigned Top Header
        _buildRedesignedTopHeader(),

        // Two-column body layout
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 600;

              // Column 1: Files / Folders Tree List
              final treeListColumn = Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: widget.cardBg,
                  border: Border(right: BorderSide(color: widget.borderColor)),
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: _isLoadingTree
                          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
                          : _rootTreeNodes.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(LucideIcons.folderOpen, size: 32, color: widget.textSecondary.withValues(alpha: 0.4)),
                                      const SizedBox(height: 6),
                                      Text('Directory is empty', style: TextStyle(color: widget.textSecondary, fontSize: 11)),
                                    ],
                                  ),
                                )
                              : ListView(
                                  children: _buildTreeListRecursive(_rootTreeNodes, 0),
                                ),
                    ),
                  ],
                ),
              );

              // Column 2: IDE Code Viewer, Media Viewer & Folder Contents
              final ideEditorColumn = Container(
                color: widget.isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC),
                child: Column(
                  children: [
                    // IDE Tab Bar (rendered whenever there are open tabs)
                    if (_openTabs.isNotEmpty)
                      Container(
                        height: 36,
                        color: widget.isDark ? const Color(0xFF141416) : const Color(0xFFE2E8F0),
                        child: Row(
                          children: [
                            // Tab to switch back to folder contents view
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _activeTabItem = null;
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: _activeTabItem == null
                                      ? (widget.isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC))
                                      : Colors.transparent,
                                  border: Border(
                                    top: _activeTabItem == null
                                        ? const BorderSide(color: Color(0xFF6366F1), width: 2)
                                        : BorderSide.none,
                                    right: BorderSide(color: widget.borderColor),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(LucideIcons.folderOpen, size: 13, color: const Color(0xFF6366F1)),
                                    const SizedBox(width: 5),
                                    Text(
                                      'Files',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: _activeTabItem == null ? FontWeight.bold : FontWeight.w600,
                                        color: _activeTabItem == null ? widget.textPrimary : widget.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Expanded(
                              child: ListView.builder(
                                scrollDirection: Axis.horizontal,
                                itemCount: _openTabs.length,
                                itemBuilder: (ctx, idx) {
                                  final tab = _openTabs[idx];
                                  final isTabActive = tab == _activeTabItem;
                                  return InkWell(
                                    onTap: () {
                                      setState(() {
                                        _activeTabItem = tab;
                                        if (!_isMediaNode(tab)) {
                                          _editorController.text = tab.content;
                                        }
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                      decoration: BoxDecoration(
                                        color: isTabActive
                                            ? (widget.isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC))
                                            : Colors.transparent,
                                        border: Border(
                                          top: isTabActive ? const BorderSide(color: Color(0xFF6366F1), width: 2) : BorderSide.none,
                                          right: BorderSide(color: widget.borderColor),
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(_getFileIcon(tab.type, tab.name), size: 13, color: _getFileIconColor(tab.type, tab.name)),
                                          const SizedBox(width: 6),
                                          Text(
                                            tab.name,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: isTabActive ? FontWeight.bold : FontWeight.normal,
                                              color: isTabActive ? widget.textPrimary : widget.textSecondary,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          InkWell(
                                            onTap: () => _closeTab(tab),
                                            child: Icon(LucideIcons.x, size: 11, color: widget.textSecondary),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Main Pane: Folder Contents View OR File Editor / Media Viewer
                    Expanded(
                      child: _activeTabItem == null
                          ? _buildFolderContentsView(isWide)
                          : _isLoadingContent
                              ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
                              : _isMediaNode(_activeTabItem!)
                                  ? MediaPreviewView(
                                      fullPath: _activeTabItem!.fullPath,
                                      fileName: _activeTabItem!.name,
                                      fileSize: _activeTabItem!.size,
                                      agentCoreService: widget.agentCoreService,
                                      isDark: widget.isDark,
                                      cardBg: widget.cardBg,
                                      borderColor: widget.borderColor,
                                      textPrimary: widget.textPrimary,
                                      textSecondary: widget.textSecondary,
                                      onUnarchiveSuccess: () => _loadRealWorkspaceTree(_currentBrowsingPath),
                                    )
                                  : CodeEditorView(
                                      key: ValueKey(_activeTabItem!.fullPath),
                                      fullPath: _activeTabItem!.fullPath,
                                      fileName: _activeTabItem!.name,
                                      initialContent: _activeTabItem!.content,
                                      agentCoreService: widget.agentCoreService,
                                      isDark: widget.isDark,
                                      cardBg: widget.cardBg,
                                      borderColor: widget.borderColor,
                                      textPrimary: widget.textPrimary,
                                      textSecondary: widget.textSecondary,
                                      isTreeCollapsed: _isTreeCollapsed,
                                      onToggleCollapse: () => setState(() => _isTreeCollapsed = !_isTreeCollapsed),
                                      onSave: (savedText) {
                                        setState(() {
                                          _activeTabItem!.content = savedText;
                                        });
                                      },
                                      onSelectFileForChat: widget.onSelectFileForChat,
                                    ),
                    ),
                  ],
                ),
              );

              // Responsive Two-column rendering on both desktop and mobile
              final treeWidth = isWide ? 260.0 : (constraints.maxWidth * 0.38).clamp(120.0, 160.0);

              return Row(
                children: [
                  if (!_isTreeCollapsed)
                    SizedBox(
                      width: treeWidth,
                      child: treeListColumn,
                    ),
                  Expanded(child: ideEditorColumn),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  // ─── Direct Directory Picker Mode ──────────────────────────────────────────
  Widget _buildDirectoryPickerMode() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: widget.cardBg,
            border: Border(bottom: BorderSide(color: widget.borderColor)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.folderInput, size: 18, color: Color(0xFF6366F1)),
                  const SizedBox(width: 8),
                  Text(
                    'SELECT WORKSPACE PATH',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: widget.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(LucideIcons.x, size: 16, color: widget.textSecondary),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _buildRedesignedTopHeader(),
            ],
          ),
        ),

        Expanded(
          child: _isLoadingTree
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
              : _rootTreeNodes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.folderOpen, size: 32, color: widget.textSecondary.withValues(alpha: 0.4)),
                          const SizedBox(height: 6),
                          Text('Directory is empty', style: TextStyle(color: widget.textSecondary, fontSize: 11)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: _rootTreeNodes.length,
                      itemBuilder: (ctx, idx) {
                        final node = _rootTreeNodes[idx];
                        if (node.isDirectory) {
                          return ListTile(
                            dense: true,
                            leading: const Icon(LucideIcons.folder, size: 16, color: Color(0xFF6366F1)),
                            title: Text(
                              node.name,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: widget.textPrimary),
                            ),
                            subtitle: Text(
                              node.fullPath,
                              style: TextStyle(fontSize: 9, color: widget.textSecondary, fontFamily: 'monospace'),
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                foregroundColor: const Color(0xFF6366F1),
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              ),
                              onPressed: () {
                                if (widget.onSelectDirectory != null) {
                                  widget.onSelectDirectory!(node.fullPath);
                                }
                              },
                              child: const Text('Select', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                            onTap: () => _loadRealWorkspaceTree(node.fullPath),
                          );
                        } else {
                          return ListTile(
                            dense: true,
                            leading: Icon(_getFileIcon(node.type, node.name), size: 14, color: widget.textSecondary.withValues(alpha: 0.5)),
                            title: Text(
                              node.name,
                              style: TextStyle(fontSize: 11, color: widget.textSecondary),
                            ),
                            subtitle: Text(
                              node.size.isNotEmpty ? node.size : 'file',
                              style: TextStyle(fontSize: 9, color: widget.textSecondary.withValues(alpha: 0.7)),
                            ),
                          );
                        }
                      },
                    ),
        ),

        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: widget.cardBg,
            border: Border(top: BorderSide(color: widget.borderColor)),
          ),
          child: SafeArea(
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(LucideIcons.folderCheck, size: 14, color: Colors.white),
                label: Text(
                  'Select Current: $_currentBrowsingPath',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white),
                  overflow: TextOverflow.ellipsis,
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  if (widget.onSelectDirectory != null) {
                    widget.onSelectDirectory!(_currentBrowsingPath);
                  }
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}

Future<String?> showWorkspaceFileExplorerPickerModal(
  BuildContext context, {
  required String initialPath,
  required AvaAgentCoreService agentCoreService,
  required bool isDark,
  required Color cardBg,
  required Color borderColor,
  required Color textPrimary,
  required Color textSecondary,
}) async {
  String? selectedPath;
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return Container(
        height: MediaQuery.of(ctx).size.height * 0.85,
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          border: Border.all(color: borderColor),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: WorkspaceFileExplorerWidget(
            isDark: isDark,
            cardBg: cardBg,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            vpsWorkspacePath: initialPath,
            agentCoreService: agentCoreService,
            isDirectoryPickerMode: true,
            onSelectDirectory: (path) {
              selectedPath = path;
              Navigator.pop(ctx);
            },
          ),
        ),
      );
    },
  );
  return selectedPath;
}
