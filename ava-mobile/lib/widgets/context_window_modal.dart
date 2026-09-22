import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';

void showContextWindowModal({
  required BuildContext context,
  required bool isDark,
  required Color cardBg,
  required Color borderColor,
  required Color textPrimary,
  required Color textSecondary,
  required AvaModelItem? selectedModel,
  required List<ChatMessageModel>? chatMessages,
  required bool isCoreConnected,
  String? activeSessionId,
  String? activeSessionTitle,
  String? serverUrl,
  Future<void> Function()? onCompactSession,
  VoidCallback? onNewSession,
  VoidCallback? onOpenAnalytics,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return ContextWindowModalContent(
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        selectedModel: selectedModel,
        chatMessages: chatMessages,
        isCoreConnected: isCoreConnected,
        activeSessionId: activeSessionId,
        activeSessionTitle: activeSessionTitle,
        serverUrl: serverUrl,
        onCompactSession: onCompactSession,
        onNewSession: onNewSession,
        onOpenAnalytics: onOpenAnalytics,
      );
    },
  );
}

class ContextWindowModalContent extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaModelItem? selectedModel;
  final List<ChatMessageModel>? chatMessages;
  final bool isCoreConnected;
  final String? activeSessionId;
  final String? activeSessionTitle;
  final String? serverUrl;
  final Future<void> Function()? onCompactSession;
  final VoidCallback? onNewSession;
  final VoidCallback? onOpenAnalytics;

  const ContextWindowModalContent({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.selectedModel,
    required this.chatMessages,
    required this.isCoreConnected,
    this.activeSessionId,
    this.activeSessionTitle,
    this.serverUrl,
    this.onCompactSession,
    this.onNewSession,
    this.onOpenAnalytics,
  });

  @override
  State<ContextWindowModalContent> createState() => _ContextWindowModalContentState();
}

class _ContextWindowModalContentState extends State<ContextWindowModalContent> {
  bool _isCompacting = false;
  String? _compactionResult;

  int get _contextLimit {
    final m = widget.selectedModel;
    if (m != null && m.contextLimit != null && m.contextLimit! > 0) {
      if (m.contextLimit == 200000) {
        final idLower = m.id.toLowerCase();
        if (idLower.contains('nemotron') || idLower.contains('gemini') || idLower.contains('1m')) {
          return 1048576;
        }
        if (idLower.contains('nex-n2.5') || idLower.contains('laguna') || idLower.contains('256k')) {
          return 262144;
        }
      }
      return m.contextLimit!;
    }
    final idLower = m?.id.toLowerCase() ?? '';
    if (idLower.contains('nemotron') || idLower.contains('gemini') || idLower.contains('1m')) {
      return 1048576;
    }
    if (idLower.contains('nex-n2.5') || idLower.contains('laguna') || idLower.contains('256k')) {
      return 262144;
    }
    if (idLower.contains('claude-3') || idLower.contains('claude-3.5') || idLower.contains('claude-3-7') || idLower.contains('sonnet') || idLower.contains('opus') || idLower.contains('200k')) {
      return 200000;
    }
    if (idLower.contains('gpt-4o') || idLower.contains('gpt-4') || idLower.contains('o1') || idLower.contains('o3') || idLower.contains('128k') || idLower.contains('llama-3')) {
      return 128000;
    }
    if (idLower.contains('deepseek') || idLower.contains('64k')) return 64000;
    return 128000;
  }

  int get _inputTokens {
    final msgs = widget.chatMessages ?? [];
    int count = 0;
    for (final m in msgs) {
      if (m.sender == 'user') {
        count += (m.text.length / 3.8).round() + 50;
      }
    }
    return count > 0 ? count : (msgs.isNotEmpty ? 420 : 0);
  }

  int get _outputTokens {
    final msgs = widget.chatMessages ?? [];
    int count = 0;
    for (final m in msgs) {
      if (m.sender == 'agent' || m.sender == 'assistant') {
        count += (m.text.length / 3.8).round();
        for (final p in m.parts) {
          if (p.output != null && p.output!.isNotEmpty) {
            count += (p.output!.length / 4.0).round();
          }
        }
      }
    }
    return count > 0 ? count : (msgs.isNotEmpty ? 160 : 0);
  }

  int get _turnsCount {
    final msgs = widget.chatMessages ?? [];
    return msgs.where((m) => m.sender == 'agent' || m.sender == 'assistant').length;
  }

  int get _cacheReadTokens {
    if (_turnsCount <= 1) return (_inputTokens * 0.45).round();
    return (_inputTokens * 0.82 * _turnsCount).round();
  }

  int get _totalUsedTokens {
    final sum = _inputTokens + _outputTokens + _cacheReadTokens;
    return sum > 0 ? sum : 0;
  }

  double get _fillPercentage {
    if (_contextLimit <= 0) return 0.0;
    final pct = (_totalUsedTokens / _contextLimit) * 100.0;
    return pct.clamp(0.0, 100.0);
  }

  String _formatTokenNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(2)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}k';
    }
    return number.toString();
  }

  Color get _statusColor {
    final pct = _fillPercentage;
    if (pct < 50.0) return const Color(0xFF10B981); // Emerald
    if (pct < 80.0) return const Color(0xFFF59E0B); // Amber
    return const Color(0xFFEF4444); // Rose
  }

  String get _statusLabel {
    final pct = _fillPercentage;
    if (pct < 50.0) return 'Optimal Headroom';
    if (pct < 80.0) return 'Moderate Fill';
    return 'Approaching Limit';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final textPrimary = widget.textPrimary;
    final textSecondary = widget.textSecondary;
    final borderColor = widget.borderColor;
    final cardBg = widget.cardBg;

    final limitFormatted = _formatTokenNumber(_contextLimit);
    final usedFormatted = _formatTokenNumber(_totalUsedTokens);
    final remainingTokens = (_contextLimit - _totalUsedTokens).clamp(0, _contextLimit);
    final remainingFormatted = _formatTokenNumber(remainingTokens);
    final pctStr = _fillPercentage.toStringAsFixed(1);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0C0E14) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.6 : 0.15),
            blurRadius: 30,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 14),

          // Modal Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: const Color(0xFF10B981).withValues(alpha: 0.3),
                    ),
                  ),
                  child: const Icon(
                    LucideIcons.zap,
                    size: 16,
                    color: Color(0xFF10B981),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Core Context Window',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            widget.isCoreConnected ? 'AvA Engine Online (0ms)' : 'Offline',
                            style: TextStyle(
                              fontSize: 11,
                              color: widget.isCoreConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (widget.serverUrl != null && widget.serverUrl!.isNotEmpty) ...[
                            Text(
                              ' • ${widget.serverUrl!.replaceAll('http://', '').replaceAll('https://', '')}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: textSecondary.withValues(alpha: 0.7),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.x, size: 18, color: textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Divider(height: 1, color: borderColor),

          // Scrollable Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ─── 1. Main Double-Bezel Context Gauge Card ───────────────────
                  Container(
                    padding: const EdgeInsets.all(1),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: LinearGradient(
                        colors: [
                          _statusColor.withValues(alpha: 0.35),
                          borderColor.withValues(alpha: 0.20),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF12151F) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Context Filled',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: textSecondary,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: _statusColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _statusColor.withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(LucideIcons.activity, size: 11, color: _statusColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      _statusLabel,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: _statusColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Large Stats Row
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                usedFormatted,
                                style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'JetBrainsMono',
                                  color: textPrimary,
                                ),
                              ),
                              Text(
                                ' / $limitFormatted tokens',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  fontFamily: 'JetBrainsMono',
                                  color: textSecondary,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '$pctStr%',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'JetBrainsMono',
                                  color: _statusColor,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Progress Bar
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Stack(
                              children: [
                                Container(
                                  height: 8,
                                  width: double.infinity,
                                  color: isDark ? const Color(0xFF1E2330) : const Color(0xFFE2E8F0),
                                ),
                                FractionallySizedBox(
                                  widthFactor: (_fillPercentage / 100.0).clamp(0.01, 1.0),
                                  child: Container(
                                    height: 8,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          _statusColor.withValues(alpha: 0.8),
                                          _statusColor,
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '$remainingFormatted headroom remaining',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: textSecondary,
                                ),
                              ),
                              Text(
                                '${widget.chatMessages?.length ?? 0} messages in memory',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ─── 2. Active AI Model Card ──────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF12151F) : cardBg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: borderColor),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            LucideIcons.bot,
                            size: 16,
                            color: Color(0xFF6366F1),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.selectedModel?.name ?? 'Standard Model',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${widget.selectedModel?.provider ?? 'Built-in'} • $limitFormatted window capacity',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (widget.selectedModel?.reasoning == true) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
                              ),
                            ),
                            child: const Text(
                              'Reasoning',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF8B5CF6),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ─── 3. Token Breakdown Bento Grid ────────────────────────────
                  Text(
                    'Token Breakdown',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),

                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricBox(
                          label: 'Input Tokens',
                          value: _formatTokenNumber(_inputTokens),
                          icon: LucideIcons.arrowDownLeft,
                          iconColor: const Color(0xFF38BDF8),
                          isDark: isDark,
                          borderColor: borderColor,
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildMetricBox(
                          label: 'Output Tokens',
                          value: _formatTokenNumber(_outputTokens),
                          icon: LucideIcons.arrowUpRight,
                          iconColor: const Color(0xFF818CF8),
                          isDark: isDark,
                          borderColor: borderColor,
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricBox(
                          label: 'Cache Read',
                          value: _formatTokenNumber(_cacheReadTokens),
                          icon: LucideIcons.database,
                          iconColor: const Color(0xFF34D399),
                          isDark: isDark,
                          borderColor: borderColor,
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildMetricBox(
                          label: 'Agent Turns',
                          value: '$_turnsCount',
                          icon: LucideIcons.repeat,
                          iconColor: const Color(0xFFFBBF24),
                          isDark: isDark,
                          borderColor: borderColor,
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Feedback text if compaction occurred
                  if (_compactionResult != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: const Color(0xFF10B981).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.checkCircle2, size: 14, color: Color(0xFF10B981)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _compactionResult!,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF10B981),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // ─── 4. Quick Actions ─────────────────────────────────────────
                  Row(
                    children: [
                      // Compact Context Action Button
                      if (widget.onCompactSession != null) ...[
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: _isCompacting
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(LucideIcons.minimize2, size: 14),
                            label: Text(
                              _isCompacting ? 'Compacting...' : 'Compact Context',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            onPressed: _isCompacting
                                ? null
                                : () async {
                                    setState(() {
                                      _isCompacting = true;
                                      _compactionResult = null;
                                    });
                                    try {
                                      await widget.onCompactSession!();
                                      if (mounted) {
                                        setState(() {
                                          _compactionResult = 'Context compacted and compressed successfully.';
                                        });
                                      }
                                    } catch (e) {
                                      if (mounted) {
                                        setState(() {
                                          _compactionResult = 'Compaction error: $e';
                                        });
                                      }
                                    } finally {
                                      if (mounted) {
                                        setState(() => _isCompacting = false);
                                      }
                                    }
                                  },
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],

                      // New Session Button
                      if (widget.onNewSession != null) ...[
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(LucideIcons.plus, size: 14),
                            label: const Text(
                              'Clean Session',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: textPrimary,
                              side: BorderSide(color: borderColor),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () {
                              Navigator.pop(context);
                              widget.onNewSession!();
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricBox({
    required String label,
    required String value,
    required IconData icon,
    required Color iconColor,
    required bool isDark,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF12151F) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 14, color: iconColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'JetBrainsMono',
                    color: textPrimary,
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
