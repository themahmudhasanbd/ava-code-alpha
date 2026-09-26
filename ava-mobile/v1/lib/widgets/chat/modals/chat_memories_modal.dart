import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../services/agent_core_service.dart';

/// Modal bottom sheet to manage, search, and delete persistent memories
class ChatMemoriesModal extends StatefulWidget {
  final AvaAgentCoreService agentCoreService;
  final List<Map<String, dynamic>> initialMemories;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;

  const ChatMemoriesModal({
    super.key,
    required this.agentCoreService,
    required this.initialMemories,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
  });

  static void show(
    BuildContext context, {
    required AvaAgentCoreService agentCoreService,
    required List<Map<String, dynamic>> initialMemories,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => ChatMemoriesModal(
        agentCoreService: agentCoreService,
        initialMemories: initialMemories,
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
      ),
    );
  }

  @override
  State<ChatMemoriesModal> createState() => _ChatMemoriesModalState();
}

class _ChatMemoriesModalState extends State<ChatMemoriesModal> {
  late List<Map<String, dynamic>> _memories;
  String _selectedScope = 'all';
  String _searchQuery = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _memories = List.from(widget.initialMemories);
  }

  Future<void> _reload() async {
    setState(() => _isLoading = true);
    final fresh = await widget.agentCoreService.getMemories();
    if (mounted) {
      setState(() {
        _memories = fresh;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _memories.where((m) {
      if (_selectedScope != 'all' && (m['scope']?.toString() ?? 'project') != _selectedScope) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final c = (m['content'] ?? m['value'] ?? '').toString().toLowerCase();
        final d = (m['domain'] ?? m['key'] ?? '').toString().toLowerCase();
        return c.contains(q) || d.contains(q);
      }
      return true;
    }).toList();

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 8, bottom: 4),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: widget.textSecondary.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(LucideIcons.brain, size: 18, color: Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AvA Persistent Memories (${filtered.length}/${_memories.length})',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: widget.textPrimary),
                  ),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else ...[
                  IconButton(
                    icon: const Icon(LucideIcons.refreshCw, size: 16),
                    tooltip: 'Refresh',
                    onPressed: _reload,
                  ),
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.redAccent,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    ),
                    icon: const Icon(LucideIcons.rotateCcw, size: 14),
                    label: const Text('Reset', style: TextStyle(fontSize: 12)),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (dCtx) => AlertDialog(
                          backgroundColor: widget.cardBg,
                          title: Text('Reset Memories', style: TextStyle(color: widget.textPrimary)),
                          content: Text(
                            'Are you sure you want to completely wipe all persistent memories?',
                            style: TextStyle(color: widget.textSecondary),
                          ),
                          actions: [
                            TextButton(
                              child: const Text('Cancel'),
                              onPressed: () => Navigator.pop(dCtx, false),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                              child: const Text('Reset All', style: TextStyle(color: Colors.white)),
                              onPressed: () => Navigator.pop(dCtx, true),
                            ),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await widget.agentCoreService.resetMemory(scope: 'all');
                        await _reload();
                      }
                    },
                  ),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: widget.borderColor),
                    ),
                    child: Row(
                      children: [
                        Icon(LucideIcons.search, size: 14, color: widget.textSecondary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: TextField(
                            style: TextStyle(fontSize: 13, color: widget.textPrimary),
                            decoration: InputDecoration(
                              hintText: 'Search memories...',
                              hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            onChanged: (val) {
                              setState(() => _searchQuery = val);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _selectedScope,
                  dropdownColor: widget.cardBg,
                  underline: const SizedBox(),
                  style: TextStyle(fontSize: 12, color: widget.textPrimary),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All')),
                    DropdownMenuItem(value: 'project', child: Text('Project')),
                    DropdownMenuItem(value: 'global', child: Text('Global')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedScope = val);
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Text(
                      _memories.isEmpty ? 'No memories saved yet.' : 'No matching memories found.',
                      style: TextStyle(color: widget.textSecondary),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: filtered.length,
                    separatorBuilder: (context, index) => const Divider(height: 8),
                    itemBuilder: (c, i) {
                      final m = filtered[i];
                      final id = m['id']?.toString() ?? '';
                      final domain = m['domain']?.toString() ?? m['key']?.toString() ?? 'general';
                      final content = m['content']?.toString() ?? m['value']?.toString() ?? '';
                      final scope = m['scope']?.toString() ?? 'project';
                      final importance = m['importance']?.toString() ?? 'normal';

                      return Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: widget.isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: widget.borderColor.withValues(alpha: 0.5)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    domain,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF818CF8)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: scope == 'global'
                                        ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                        : Colors.blue.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    scope.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: scope == 'global' ? Colors.greenAccent : Colors.lightBlueAccent,
                                    ),
                                  ),
                                ),
                                if (importance == 'critical' || importance == 'high') ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: (importance == 'critical' ? Colors.redAccent : Colors.orangeAccent).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      importance.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: importance == 'critical' ? Colors.redAccent : Colors.orangeAccent,
                                      ),
                                    ),
                                  ),
                                ],
                                const Spacer(),
                                IconButton(
                                  icon: const Icon(LucideIcons.trash2, size: 14, color: Colors.redAccent),
                                  constraints: const BoxConstraints(),
                                  padding: EdgeInsets.zero,
                                  tooltip: 'Delete memory',
                                  onPressed: () async {
                                    if (id.isNotEmpty) {
                                      await widget.agentCoreService.deleteMemory(id: id);
                                      await _reload();
                                    }
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              content,
                              style: TextStyle(fontSize: 13, color: widget.textPrimary),
                            ),
                          ],
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
