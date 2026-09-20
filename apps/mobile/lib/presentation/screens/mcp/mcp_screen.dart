import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../state/app_state.dart';

/// MCP (Model Context Protocol) Server and Tools Explorer
class McpScreen extends StatefulWidget {
  const McpScreen({super.key});

  @override
  State<McpScreen> createState() => _McpScreenState();
}

class _McpScreenState extends State<McpScreen> {
  Map<String, dynamic>? _mcpData;
  bool _isLoading = true;

  final List<Map<String, String>> _availableTools = [
    {
      'name': 'read_file',
      'server': 'Filesystem MCP',
      'description': 'Read text or binary file contents from the local VPS workspace.',
      'schema': '{"path": "string", "offset?": "number", "length?": "number"}',
    },
    {
      'name': 'write_file',
      'server': 'Filesystem MCP',
      'description': 'Create or overwrite files on the VPS with atomic file locking.',
      'schema': '{"path": "string", "content": "string", "overwrite?": "boolean"}',
    },
    {
      'name': 'execute_command',
      'server': 'Terminal MCP',
      'description': 'Run shell commands and scripts in persistent or ephemeral subshells.',
      'schema': '{"command": "string", "cwd?": "string", "timeoutMs?": "number"}',
    },
    {
      'name': 'git_status',
      'server': 'Terminal MCP',
      'description': 'Inspect git status, modified staging area, and branch drift.',
      'schema': '{"repoPath?": "string"}',
    },
    {
      'name': 'query_database',
      'server': 'MySQL Bridge',
      'description': 'Execute safe SELECT and analytical queries on local MySQL databases.',
      'schema': '{"query": "string", "database?": "string"}',
    },
    {
      'name': 'antigravity_stream_turn',
      'server': 'Google Antigravity SDK',
      'description': 'Stream multi-turn agentic coding sessions with Gemini 3.7 Flash.',
      'schema': '{"prompt": "string", "model": "string", "contextWindow?": "number"}',
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadMcpStatus();
  }

  Future<void> _loadMcpStatus() async {
    setState(() => _isLoading = true);
    final rpc = AppStateScope.of(context).rpcClient;

    try {
      final res = await rpc.getMcpStatus();
      if (mounted) {
        setState(() {
          _mcpData = res;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final servers = _mcpData?['servers'] as List<dynamic>? ?? [
      {'name': 'Filesystem MCP', 'path': '/var/www/ava-code-alpha', 'status': 'connected', 'pingMs': 1},
      {'name': 'Terminal MCP', 'shell': 'bash', 'status': 'connected', 'pingMs': 1},
      {'name': 'Google Antigravity SDK', 'provider': 'Gemini 3.7 Flash', 'status': 'active', 'pingMs': 12},
      {'name': 'MySQL Bridge', 'host': 'localhost', 'status': 'online', 'pingMs': 2},
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Sub-header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: Color(0x18FFFFFF), width: 1)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.plugZap, size: 15, color: AppColors.accentPrimary),
                const SizedBox(width: 8),
                Text(
                  'MCP Tools & Servers',
                  style: AppTypography.titleMedium.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                IconButton(
                  tooltip: 'Ping Servers',
                  icon: const Icon(LucideIcons.refreshCw, size: 15, color: AppColors.textSecondary),
                  onPressed: _loadMcpStatus,
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accentPrimary),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
                      // Active MCP Servers Section
                      Text(
                        'CONNECTED MCP PROTOCOL SERVERS',
                        style: AppTypography.codeSmall.copyWith(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMuted,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 10),

                      ...servers.map((srv) {
                        final name = srv['name']?.toString() ?? 'MCP Server';
                        final status = srv['status']?.toString() ?? 'connected';
                        final ping = srv['pingMs'] ?? 1;
                        final detail = srv['path'] ?? srv['shell'] ?? srv['provider'] ?? srv['host'] ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.accentPrimary.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(LucideIcons.network, size: 16, color: AppColors.accentPrimary),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      style: AppTypography.titleMedium.copyWith(fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                    Text(
                                      '$detail • ${ping}ms latency',
                                      style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                              ShadcnBadge(
                                label: status.toUpperCase(),
                                variant: status == 'connected' || status == 'active' || status == 'online'
                                    ? ShadcnBadgeVariant.success
                                    : ShadcnBadgeVariant.defaultVariant,
                                showDot: true,
                              ),
                            ],
                          ),
                        );
                      }),

                      const SizedBox(height: 20),

                      // Available Tools Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'AVAILABLE AGENT TOOLS',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMuted,
                              letterSpacing: 0.8,
                            ),
                          ),
                          Text(
                            '${_availableTools.length} Registered',
                            style: AppTypography.codeSmall.copyWith(fontSize: 10, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      ..._availableTools.map((tool) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(LucideIcons.wrench, size: 14, color: AppColors.accentCyan),
                                  const SizedBox(width: 6),
                                  Text(
                                    tool['name']!,
                                    style: AppTypography.codeSmall.copyWith(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const Spacer(),
                                  ShadcnBadge(label: tool['server']!, variant: ShadcnBadgeVariant.secondary),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                tool['description']!,
                                style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary, fontSize: 11.5),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceElevated,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        tool['schema']!,
                                        style: AppTypography.codeSmall.copyWith(
                                          fontSize: 10,
                                          color: AppColors.textMuted,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () {
                                        Clipboard.setData(ClipboardData(text: tool['schema']!));
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Schema copied to clipboard'),
                                            duration: Duration(seconds: 1),
                                          ),
                                        );
                                      },
                                      child: const Icon(LucideIcons.copy, size: 12, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
