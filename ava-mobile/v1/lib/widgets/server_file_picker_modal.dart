import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:file_picker/file_picker.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';

class ServerFilePickerModal extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String initialPath;
  final AvaAgentCoreService agentCoreService;
  final bool allowUpload;

  const ServerFilePickerModal({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.initialPath = '/root/shared-media',
    required this.agentCoreService,
    this.allowUpload = true,
  });

  @override
  State<ServerFilePickerModal> createState() => _ServerFilePickerModalState();
}

class _ServerFilePickerModalState extends State<ServerFilePickerModal> {
  late String _currentBrowsingPath;
  List<Map<String, dynamic>> _items = [];
  bool _isLoading = false;
  String? _selectedFilePath;
  String? _selectedFileName;
  String _searchQuery = '';
  String _activeCategory = 'all'; // all, media, docs, code
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _currentBrowsingPath = widget.initialPath;
    _loadDirectory(_currentBrowsingPath);
  }

  Future<void> _loadDirectory(String path) async {
    setState(() {
      _isLoading = true;
      _currentBrowsingPath = path;
    });

    try {
      final rawTree = await widget.agentCoreService.fetchWorkspaceFilesTree(path);
      if (mounted) {
        setState(() {
          _items = rawTree;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _goUpOneDirectory() {
    if (_currentBrowsingPath == '/' || _currentBrowsingPath.isEmpty) return;
    final lastSlash = _currentBrowsingPath.lastIndexOf('/');
    if (lastSlash <= 0) {
      _loadDirectory('/');
    } else {
      _loadDirectory(_currentBrowsingPath.substring(0, lastSlash));
    }
  }

  Future<void> _pickAndUploadNewFile() async {
    try {
      final files = await FilePicker.pickFiles(type: FileType.any);

      if (files.isNotEmpty) {
        setState(() => _isUploading = true);
        int successCount = 0;
        String? lastUploadedPath;
        String? lastUploadedName;

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
            lastUploadedPath = res['fullPath'] ?? '${_currentBrowsingPath == '/' ? '' : _currentBrowsingPath}/${file.name}';
            lastUploadedName = file.name;
          }
        }

        if (mounted) {
          setState(() => _isUploading = false);
          if (successCount > 0) {
            if (lastUploadedPath != null && lastUploadedName != null) {
              setState(() {
                _selectedFilePath = lastUploadedPath;
                _selectedFileName = lastUploadedName;
              });
            }
            AppToast.success(context, 'Uploaded $successCount file(s) to server.');
            _loadDirectory(_currentBrowsingPath);
          } else {
            AppToast.error(context, 'Upload failed. Please check VPS connection.');
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploading = false);
        AppToast.error(context, 'Error: $e');
      }
    }
  }

  IconData _getFileIcon(String ext) {
    switch (ext.toLowerCase()) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
      case 'gif':
        return LucideIcons.image;
      case 'pdf':
        return LucideIcons.fileText;
      case 'mp4':
      case 'mov':
      case 'webm':
        return LucideIcons.video;
      case 'mp3':
      case 'wav':
        return LucideIcons.music;
      case 'zip':
      case 'tar':
      case 'gz':
        return LucideIcons.archive;
      case 'dart':
      case 'js':
      case 'ts':
      case 'json':
      case 'py':
      case 'html':
      case 'css':
        return LucideIcons.fileCode;
      default:
        return LucideIcons.file;
    }
  }

  Color _getFileIconColor(String ext) {
    switch (ext.toLowerCase()) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
      case 'gif':
        return const Color(0xFF10B981);
      case 'pdf':
        return Colors.redAccent;
      case 'mp4':
      case 'mov':
      case 'webm':
        return const Color(0xFFF59E0B);
      case 'dart':
      case 'js':
      case 'ts':
      case 'json':
        return const Color(0xFF6366F1);
      default:
        return widget.textSecondary;
    }
  }

  bool _filterItem(Map<String, dynamic> item) {
    final name = (item['name'] ?? '').toString().toLowerCase();
    final isDir = item['isDirectory'] == true || item['type'] == 'directory';

    if (_searchQuery.isNotEmpty && !name.contains(_searchQuery.toLowerCase())) {
      return false;
    }

    if (isDir) return true;

    final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';

    if (_activeCategory == 'media') {
      return ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico', 'mp4', 'mov', 'mp3'].contains(ext);
    } else if (_activeCategory == 'docs') {
      return ['pdf', 'txt', 'md', 'doc', 'docx', 'csv', 'xlsx', 'log'].contains(ext);
    } else if (_activeCategory == 'code') {
      return ['dart', 'js', 'ts', 'jsx', 'tsx', 'json', 'py', 'php', 'html', 'css', 'yaml', 'yml'].contains(ext);
    }

    return true;
  }

  @override
  Widget build(BuildContext context) {
    final segments = _currentBrowsingPath.split('/').where((s) => s.isNotEmpty).toList();
    final filteredList = _items.where(_filterItem).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        children: [
          // Drag Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: widget.textSecondary.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Modal Top Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.server, size: 18, color: Color(0xFF6366F1)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select Server File',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: widget.textPrimary,
                        ),
                      ),
                      Text(
                        'Pick media or documents to attach to prompt',
                        style: TextStyle(fontSize: 11, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (widget.allowUpload) ...[
                  IconButton(
                    icon: _isUploading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                          )
                        : const Icon(LucideIcons.uploadCloud, size: 18, color: Color(0xFF6366F1)),
                    tooltip: 'Upload from Device to this folder',
                    onPressed: _isUploading ? null : _pickAndUploadNewFile,
                  ),
                ],
                IconButton(
                  icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Location Shortcuts Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildShortcutChip('Shared Media', '/root/shared-media', LucideIcons.images),
                  const SizedBox(width: 6),
                  _buildShortcutChip('Workspace', widget.agentCoreService.workspacePath, LucideIcons.folderGit2),
                  const SizedBox(width: 6),
                  _buildShortcutChip('Root /', '/', LucideIcons.hardDrive),
                ],
              ),
            ),
          ),

          const SizedBox(height: 6),

          // Breadcrumb Bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 14),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF141418) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: widget.borderColor, width: 0.8),
            ),
            child: Row(
              children: [
                InkWell(
                  onTap: _currentBrowsingPath != '/' ? _goUpOneDirectory : null,
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Icon(
                      LucideIcons.arrowUp,
                      size: 15,
                      color: _currentBrowsingPath != '/' ? const Color(0xFF6366F1) : widget.textSecondary.withValues(alpha: 0.4),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        InkWell(
                          onTap: () => _loadDirectory('/'),
                          child: Text(
                            '/',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              color: _currentBrowsingPath == '/' ? const Color(0xFF6366F1) : widget.textPrimary,
                            ),
                          ),
                        ),
                        for (int i = 0; i < segments.length; i++) ...[
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2),
                            child: Icon(LucideIcons.chevronRight, size: 12, color: widget.textSecondary.withValues(alpha: 0.5)),
                          ),
                          InkWell(
                            onTap: () {
                              final p = '/${segments.sublist(0, i + 1).join('/')}';
                              _loadDirectory(p);
                            },
                            child: Text(
                              segments[i],
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: i == segments.length - 1 ? FontWeight.bold : FontWeight.normal,
                                fontFamily: 'monospace',
                                color: i == segments.length - 1 ? const Color(0xFF6366F1) : widget.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                InkWell(
                  onTap: () => _loadDirectory(_currentBrowsingPath),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Icon(LucideIcons.refreshCw, size: 14, color: widget.textSecondary),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Search & Filter Category Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 34,
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF141418) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: widget.borderColor, width: 0.8),
                    ),
                    child: TextField(
                      style: TextStyle(fontSize: 12, color: widget.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Filter files in this folder...',
                        hintStyle: TextStyle(fontSize: 11, color: widget.textSecondary),
                        prefixIcon: Icon(LucideIcons.search, size: 14, color: widget.textSecondary),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _buildCategoryPill('All', 'all'),
                const SizedBox(width: 4),
                _buildCategoryPill('Media', 'media'),
                const SizedBox(width: 4),
                _buildCategoryPill('Docs', 'docs'),
              ],
            ),
          ),

          const SizedBox(height: 8),
          const Divider(height: 1),

          // Directory Content List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
                : filteredList.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.folderOpen, size: 36, color: widget.textSecondary.withValues(alpha: 0.3)),
                            const SizedBox(height: 8),
                            Text('No files found in this folder', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                            if (widget.allowUpload) ...[
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                icon: const Icon(LucideIcons.uploadCloud, size: 14),
                                label: const Text('Upload File Here', style: TextStyle(fontSize: 12)),
                                onPressed: _pickAndUploadNewFile,
                              ),
                            ],
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: filteredList.length,
                        itemBuilder: (ctx, index) {
                          final item = filteredList[index];
                          final name = item['name']?.toString() ?? '';
                          final isDir = item['isDirectory'] == true || item['type'] == 'directory';
                          final fullPath = item['fullPath']?.toString() ??
                              (_currentBrowsingPath == '/' ? '/$name' : '$_currentBrowsingPath/$name');
                          final size = item['size']?.toString() ?? '';
                          final ext = name.contains('.') ? name.split('.').last.toLowerCase() : '';
                          final isSelected = _selectedFilePath == fullPath;

                          if (isDir) {
                            return ListTile(
                              dense: true,
                              leading: const Icon(LucideIcons.folder, size: 18, color: Color(0xFF6366F1)),
                              title: Text(
                                name,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: widget.textPrimary,
                                ),
                              ),
                              trailing: Icon(LucideIcons.chevronRight, size: 14, color: widget.textSecondary),
                              onTap: () => _loadDirectory(fullPath),
                            );
                          }

                          return ListTile(
                            dense: true,
                            selected: isSelected,
                            selectedTileColor: const Color(0xFF6366F1).withValues(alpha: 0.12),
                            leading: Icon(_getFileIcon(ext), size: 18, color: _getFileIconColor(ext)),
                            title: Text(
                              name,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? const Color(0xFF6366F1) : widget.textPrimary,
                              ),
                            ),
                            subtitle: size.isNotEmpty
                                ? Text(size, style: TextStyle(fontSize: 10, color: widget.textSecondary, fontFamily: 'monospace'))
                                : null,
                            trailing: isSelected
                                ? const Icon(LucideIcons.checkCircle2, size: 18, color: Color(0xFF10B981))
                                : null,
                            onTap: () {
                              setState(() {
                                _selectedFilePath = fullPath;
                                _selectedFileName = name;
                              });
                            },
                          );
                        },
                      ),
          ),

          const Divider(height: 1),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _selectedFileName != null ? 'Selected: $_selectedFileName' : 'No file selected',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _selectedFileName != null ? widget.textPrimary : widget.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (_selectedFilePath != null)
                        Text(
                          _selectedFilePath!,
                          style: TextStyle(fontSize: 10, color: widget.textSecondary, fontFamily: 'monospace'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancel', style: TextStyle(color: widget.textSecondary, fontSize: 13)),
                ),
                const SizedBox(width: 6),
                ElevatedButton.icon(
                  icon: const Icon(LucideIcons.check, size: 15),
                  label: const Text('Attach File', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.3),
                    disabledForegroundColor: Colors.white.withValues(alpha: 0.5),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _selectedFilePath != null
                      ? () => Navigator.pop(context, _selectedFilePath)
                      : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutChip(String label, String path, IconData icon) {
    final isCurrent = _currentBrowsingPath == path;
    return InkWell(
      onTap: () => _loadDirectory(path),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isCurrent ? const Color(0xFF6366F1).withValues(alpha: 0.18) : widget.cardBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isCurrent ? const Color(0xFF6366F1) : widget.borderColor,
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: isCurrent ? const Color(0xFF6366F1) : widget.textSecondary),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                color: isCurrent ? const Color(0xFF6366F1) : widget.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryPill(String label, String cat) {
    final isSelected = _activeCategory == cat;
    return InkWell(
      onTap: () => setState(() => _activeCategory = cat),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF6366F1) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : widget.textSecondary,
          ),
        ),
      ),
    );
  }
}

Future<String?> showServerFilePickerModal(
  BuildContext context, {
  required AvaAgentCoreService agentCoreService,
  String initialPath = '/root/shared-media',
  required bool isDark,
  required Color cardBg,
  required Color borderColor,
  required Color textPrimary,
  required Color textSecondary,
}) async {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => ServerFilePickerModal(
      isDark: isDark,
      cardBg: cardBg,
      borderColor: borderColor,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      initialPath: initialPath,
      agentCoreService: agentCoreService,
    ),
  );
}
