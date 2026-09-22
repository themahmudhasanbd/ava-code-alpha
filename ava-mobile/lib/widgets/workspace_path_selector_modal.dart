import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../config/app_config.dart';
import '../services/agent_core_service.dart';

class WorkspacePathSelectorModal extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String currentPath;
  final AvaAgentCoreService agentCoreService;

  const WorkspacePathSelectorModal({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.currentPath,
    required this.agentCoreService,
  });

  @override
  State<WorkspacePathSelectorModal> createState() => _WorkspacePathSelectorModalState();
}

class _WorkspacePathSelectorModalState extends State<WorkspacePathSelectorModal> {
  late String _browsingPath;
  late TextEditingController _manualPathCtrl;
  List<Map<String, dynamic>> _folders = [];
  bool _isLoading = false;
  String _searchFilter = '';

  @override
  void initState() {
    super.initState();
    _browsingPath = widget.currentPath.isNotEmpty ? widget.currentPath : AppConfig.defaultWorkspacePath;
    _manualPathCtrl = TextEditingController(text: _browsingPath);
    _loadDirectories(_browsingPath);
  }

  @override
  void dispose() {
    _manualPathCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadDirectories(String path) async {
    setState(() {
      _isLoading = true;
      _browsingPath = path;
      _manualPathCtrl.text = path;
    });

    try {
      final rawTree = await widget.agentCoreService.fetchWorkspaceFilesTree(path);
      if (mounted) {
        // Filter only directories for dedicated workspace selector
        final dirs = rawTree.where((item) {
          final isDir = item['isDirectory'] == true ||
              item['type'] == 'directory' ||
              item['type'] == 'folder' ||
              (item['path'] != null && item['path'].toString().endsWith('/'));
          return isDir;
        }).toList();

        setState(() {
          _folders = dirs;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _goUp() {
    if (_browsingPath == '/' || _browsingPath.isEmpty) return;
    final lastSlash = _browsingPath.lastIndexOf('/');
    if (lastSlash <= 0) {
      _loadDirectories('/');
    } else {
      _loadDirectories(_browsingPath.substring(0, lastSlash));
    }
  }

  @override
  Widget build(BuildContext context) {
    final segments = _browsingPath.split('/').where((s) => s.isNotEmpty).toList();
    final filteredFolders = _folders.where((f) {
      final name = (f['name'] ?? '').toString().toLowerCase();
      if (_searchFilter.isEmpty) return true;
      return name.contains(_searchFilter.toLowerCase());
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
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

          // Dedicated Modal Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.folderGit2, size: 18, color: Colors.white),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select Workspace Directory',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: widget.textPrimary,
                        ),
                      ),
                      Text(
                        'Root path for AI Agent context, terminal & file tree',
                        style: TextStyle(fontSize: 11, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Shortcut Pills
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildShortcutChip('ava-code', '/var/www/ava-code'),
                  const SizedBox(width: 6),
                  _buildShortcutChip('shared-media', '/root/shared-media'),
                  const SizedBox(width: 6),
                  _buildShortcutChip('/var/www', '/var/www'),
                  const SizedBox(width: 6),
                  _buildShortcutChip('/root', '/root'),
                  const SizedBox(width: 6),
                  _buildShortcutChip('Root /', '/'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 6),

          // Manual Direct Path Input + Go Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 36,
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF141418) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: widget.borderColor, width: 0.8),
                    ),
                    child: TextField(
                      controller: _manualPathCtrl,
                      style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: widget.textPrimary),
                      decoration: InputDecoration(
                        prefixIcon: Icon(LucideIcons.folderSearch2, size: 14, color: widget.textSecondary),
                        hintText: 'Enter absolute path (e.g. /var/www)...',
                        hintStyle: TextStyle(fontSize: 11, color: widget.textSecondary),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      onSubmitted: (val) {
                        final trimmed = val.trim();
                        if (trimmed.isNotEmpty) _loadDirectories(trimmed);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    final trimmed = _manualPathCtrl.text.trim();
                    if (trimmed.isNotEmpty) _loadDirectories(trimmed);
                  },
                  child: const Text('Go', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Interactive Breadcrumbs Bar
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
                  onTap: _browsingPath != '/' ? _goUp : null,
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Icon(
                      LucideIcons.arrowUp,
                      size: 15,
                      color: _browsingPath != '/' ? const Color(0xFF6366F1) : widget.textSecondary.withValues(alpha: 0.4),
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
                          onTap: () => _loadDirectories('/'),
                          child: Text(
                            '/',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              color: _browsingPath == '/' ? const Color(0xFF6366F1) : widget.textPrimary,
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
                              _loadDirectories(p);
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
                  onTap: () => _loadDirectories(_browsingPath),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Icon(LucideIcons.refreshCw, size: 14, color: widget.textSecondary),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Real-time Folder Search
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Container(
              height: 32,
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF141418) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: widget.borderColor, width: 0.8),
              ),
              child: TextField(
                style: TextStyle(fontSize: 11, color: widget.textPrimary),
                decoration: InputDecoration(
                  prefixIcon: Icon(LucideIcons.search, size: 13, color: widget.textSecondary),
                  hintText: 'Filter folders in this directory...',
                  hintStyle: TextStyle(fontSize: 11, color: widget.textSecondary),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 7),
                ),
                onChanged: (val) => setState(() => _searchFilter = val),
              ),
            ),
          ),

          const SizedBox(height: 8),
          const Divider(height: 1),

          // Subdirectory List View
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
                : filteredFolders.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.folderOpen, size: 36, color: widget.textSecondary.withValues(alpha: 0.3)),
                            const SizedBox(height: 8),
                            Text('No subdirectories inside this path', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                            const SizedBox(height: 4),
                            Text('You can set this directory as your workspace below', style: TextStyle(color: widget.textSecondary.withValues(alpha: 0.7), fontSize: 10)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: filteredFolders.length,
                        itemBuilder: (ctx, idx) {
                          final folder = filteredFolders[idx];
                          final name = folder['name']?.toString() ?? '';
                          final fullPath = folder['fullPath']?.toString() ??
                              (_browsingPath == '/' ? '/$name' : '$_browsingPath/$name');

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
                            subtitle: Text(
                              fullPath,
                              style: TextStyle(fontSize: 9.5, color: widget.textSecondary, fontFamily: 'monospace'),
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    minimumSize: const Size(50, 26),
                                    side: const BorderSide(color: Color(0xFF6366F1), width: 0.8),
                                  ),
                                  onPressed: () => Navigator.pop(context, fullPath),
                                  child: const Text('Select', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
                                ),
                                const SizedBox(width: 4),
                                Icon(LucideIcons.chevronRight, size: 14, color: widget.textSecondary),
                              ],
                            ),
                            onTap: () => _loadDirectories(fullPath),
                          );
                        },
                      ),
          ),

          const Divider(height: 1),

          // Bottom Bar with "Set as Workspace"
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
                        'Target Workspace Path',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: widget.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _browsingPath,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: widget.textPrimary,
                          fontFamily: 'monospace',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancel', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                ),
                const SizedBox(width: 6),
                ElevatedButton.icon(
                  icon: const Icon(LucideIcons.check, size: 15),
                  label: const Text('Set as Workspace', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.pop(context, _browsingPath),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutChip(String label, String path) {
    final isCurrent = _browsingPath == path;
    return InkWell(
      onTap: () => _loadDirectories(path),
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
            Icon(LucideIcons.folder, size: 12, color: isCurrent ? const Color(0xFF6366F1) : widget.textSecondary),
            const SizedBox(width: 4),
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
}

Future<String?> showDedicatedWorkspacePathSelector(
  BuildContext context, {
  required String initialPath,
  required AvaAgentCoreService agentCoreService,
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
    builder: (ctx) => WorkspacePathSelectorModal(
      isDark: isDark,
      cardBg: cardBg,
      borderColor: borderColor,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      currentPath: initialPath,
      agentCoreService: agentCoreService,
    ),
  );
}
