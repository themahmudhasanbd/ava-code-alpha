import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';
import '../widgets/mcp_server_modal.dart';

class McpScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String? serverUrl;
  final AvaAgentCoreService? agentCoreService;

  const McpScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.serverUrl,
    this.agentCoreService,
  });

  @override
  State<McpScreen> createState() => _McpScreenState();
}

class _McpScreenState extends State<McpScreen> {
  List<Map<String, dynamic>> _servers = [];
  bool _isLoading = true;
  String? _error;
  final _busy = <String>{};

  static const _accent = Color(0xFF6366F1);
  static const _ok = Color(0xFF10B981);
  static const _warn = Color(0xFFF59E0B);
  static const _bad = Color(0xFFEF4444);

  @override
  void initState() {
    super.initState();
    _fetchServers();
  }

  Future<void> _fetchServers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final svc = widget.agentCoreService;
    if (svc == null) {
      setState(() {
        _servers = [];
        _isLoading = false;
        _error = 'Not connected to the AvA Core engine.';
      });
      return;
    }

    try {
      final result = await svc.fetchMcpServers();
      if (!mounted) return;
      final dynamic rawList = result['servers'];
      final List<Map<String, dynamic>> parsedList = [];
      if (rawList is List) {
        for (final item in rawList) {
          if (item is Map) {
            parsedList.add(Map<String, dynamic>.from(item));
          }
        }
      }
      setState(() {
        _servers = parsedList;
        _isLoading = false;
        _error = (_servers.isEmpty && result['status'] == 'unavailable')
            ? 'Could not reach the MCP registry.'
            : null;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load MCP servers: $err';
        _isLoading = false;
      });
    }
  }

  Future<void> _openSheet({Map<String, dynamic>? existing}) async {
    final svc = widget.agentCoreService;
    if (svc == null) {
      _toast('Not connected to the AvA Core engine.', isError: true);
      return;
    }
    final saved = await showMcpServerModal(
      context: context,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      service: svc,
      existing: existing,
    );
    if (saved != true || !mounted) return;
    await _fetchServers();
    if (!mounted) return;
    _toast(existing == null ? 'MCP server added' : 'MCP server updated');
  }

  Future<void> _toggle(Map<String, dynamic> server) async {
    final svc = widget.agentCoreService;
    final name = server['name']?.toString() ?? '';
    if (svc == null || name.isEmpty) return;

    final currentlyEnabled = server['enabled'] != false;
    setState(() => _busy.add(name));
    final res = await svc.toggleMcpServer(name, !currentlyEnabled);
    if (!mounted) return;
    setState(() => _busy.remove(name));

    if (res == true) {
      await _fetchServers();
      if (!mounted) return;
      _toast('$name ${currentlyEnabled ? 'disabled' : 'enabled'}');
    } else {
      _toast('Failed to update MCP server', isError: true);
    }
  }

  Future<void> _delete(Map<String, dynamic> server) async {
    final svc = widget.agentCoreService;
    final name = server['name']?.toString() ?? '';
    if (svc == null || name.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text('Remove "$name"?',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: widget.textPrimary)),
        content: Text(
          'The server is removed from the config along with any stored headers or environment values. '
          'Its tools stop being offered to the model.',
          style: TextStyle(fontSize: 12.5, color: widget.textSecondary, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: _bad, foregroundColor: Colors.white, elevation: 0),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _busy.add(name));
    final res = await svc.deleteMcpServer(name);
    if (!mounted) return;
    setState(() => _busy.remove(name));

    if (res == true) {
      await _fetchServers();
      if (!mounted) return;
      _toast('Removed $name');
    } else {
      _toast('Failed to update MCP server', isError: true);
    }
  }

  void _toast(String message, {bool isError = false}) {
    if (!mounted) return;
    if (isError) {
      AppToast.error(context, message);
    } else {
      AppToast.success(context, message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabledCount = _servers.where((s) => s['enabled'] != false).length;

    return RefreshIndicator(
      onRefresh: _fetchServers,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('MCP Servers',
                          style: TextStyle(
                              fontSize: 20, fontWeight: FontWeight.bold, color: widget.textPrimary)),
                      const SizedBox(height: 2),
                      Text(
                        _servers.isEmpty
                            ? 'Extend the agent with Model Context Protocol tools.'
                            : '$enabledCount of ${_servers.length} enabled',
                        style: TextStyle(fontSize: 12, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () => _openSheet(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accent,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.plus, size: 15),
                  label: const Text('Add server',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 18),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            else ...[
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _bad.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _bad.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.circleAlert, size: 15, color: _bad),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(_error!,
                              style: const TextStyle(fontSize: 12, color: _bad))),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (_servers.isEmpty)
                _emptyState()
              else
                ..._servers.map(_serverCard),
            ],
          ],
        ),
      ),
    );
  }

  Widget _emptyState() => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
        decoration: BoxDecoration(
          color: widget.cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: widget.borderColor),
        ),
        child: Column(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: _accent.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(LucideIcons.server, size: 22, color: _accent),
            ),
            const SizedBox(height: 14),
            Text('No MCP servers configured',
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700, color: widget.textPrimary)),
            const SizedBox(height: 6),
            Text(
              'Add a remote HTTP endpoint or a local stdio process to give the agent extra tools.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: widget.textSecondary, height: 1.45),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => _openSheet(),
              icon: const Icon(LucideIcons.plus, size: 14, color: _accent),
              label: const Text('Add your first server',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _accent)),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                side: BorderSide(color: _accent.withValues(alpha: 0.45)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
              ),
            ),
          ],
        ),
      );

  Widget _serverCard(Map<String, dynamic> mcp) {
    final name = mcp['name']?.toString() ?? mcp['id']?.toString() ?? 'Unknown';
    final rawType = mcp['type']?.toString() ?? (mcp['url'] != null ? 'remote' : 'local');
    final isRemote = rawType == 'remote';
    final target = isRemote
        ? (mcp['url']?.toString() ?? '')
        : [
            mcp['command']?.toString() ?? '',
            if (mcp['args'] is List)
              ...((mcp['args'] as List).map((a) => a.toString())),
          ].where((s) => s.isNotEmpty).join(' ');
    final enabled = mcp['enabled'] != false;
    final status = mcp['status']?.toString() ?? 'unknown';
    final err = mcp['error']?.toString();
    final isBusy = _busy.contains(name);

    final connected = status == 'connected' || status == 'active';
    final Color statusColor = !enabled ? widget.textSecondary : (connected ? _ok : (err != null ? _bad : _warn));
    final String statusLabel = !enabled ? 'Disabled' : (connected ? 'Connected' : (err != null ? 'Error' : status));

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: widget.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 13, 6, 10),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: (enabled ? _accent : widget.textSecondary).withValues(alpha: 0.11),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(
                    isRemote ? LucideIcons.globe : LucideIcons.terminal,
                    size: 17,
                    color: enabled ? _accent : widget.textSecondary,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: enabled ? widget.textPrimary : widget.textSecondary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: widget.textSecondary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              isRemote ? 'REMOTE' : 'LOCAL',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.4,
                                  color: widget.textSecondary),
                            ),
                          ),
                        ],
                      ),
                      if (target.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          target,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 10.5, fontFamily: 'JetBrainsMono', color: widget.textSecondary),
                        ),
                      ],
                    ],
                  ),
                ),
                if (isBusy)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: SizedBox(width: 15, height: 15, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                else
                  Switch(
                    value: enabled,
                    onChanged: (_) => _toggle(mcp),
                    activeTrackColor: _accent,
                  ),
              ],
            ),
          ),
          if (err != null && enabled)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: _bad.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: _bad.withValues(alpha: 0.28)),
              ),
              child: Text(err,
                  style: const TextStyle(fontSize: 10.5, color: _bad, height: 1.35)),
            ),
          Divider(height: 1, color: widget.borderColor),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              children: [
                Container(
                  margin: const EdgeInsets.only(left: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 5),
                      Text(statusLabel,
                          style: TextStyle(
                              fontSize: 10.5, fontWeight: FontWeight.w700, color: statusColor)),
                    ],
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: isBusy ? null : () => _openSheet(existing: mcp),
                  icon: Icon(LucideIcons.pencil, size: 13, color: widget.textSecondary),
                  label: Text('Edit',
                      style: TextStyle(fontSize: 11.5, color: widget.textSecondary, fontWeight: FontWeight.w600)),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(0, 34),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
                TextButton.icon(
                  onPressed: isBusy ? null : () => _delete(mcp),
                  icon: const Icon(LucideIcons.trash2, size: 13, color: _bad),
                  label: const Text('Remove',
                      style: TextStyle(fontSize: 11.5, color: _bad, fontWeight: FontWeight.w600)),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(0, 34),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
