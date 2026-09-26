import "package:flutter/material.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";
import "../../models/app_models.dart";

/// Session Compaction Stream Event Badge.
///
/// Renders as a lightweight, elegant inline stream event between turns:
/// - Running: "Compacting session…" with pulsing status dot
/// - Done: "Session compacted • Saved ~X tokens" with spark badge
class SessionCompactWidget extends StatefulWidget {
  final ChatMessageModel message;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final bool initiallyExpanded;

  const SessionCompactWidget({
    super.key,
    required this.message,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.initiallyExpanded = false,
  });

  @override
  State<SessionCompactWidget> createState() => _SessionCompactWidgetState();
}

class _SessionCompactWidgetState extends State<SessionCompactWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  static const _yellow = Color(0xFFF59E0B);
  static const _green = Color(0xFF22C55E);
  static const _red = Color(0xFFEF4444);

  bool get _isRunning {
    if (widget.message.isPending) {
      final hasCompletedPart = widget.message.parts.any((p) =>
          p.type == "compaction" &&
          (p.status == "completed" || (p.summary != null && p.summary!.isNotEmpty)));
      if (!hasCompletedPart && widget.message.text.isEmpty) return true;
    }
    return widget.message.parts.any((p) =>
        p.type == "compaction" &&
        (p.status == "running" || p.status == "pending"));
  }
  bool get _isError => widget.message.isError;

  Color get _statusColor => _isRunning ? _yellow : (_isError ? _red : _green);

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  String _formatSavedTokens(CompactionSummaryData data) {
    final len = data.rawText.trim().length;
    final estimatedTokens = len > 0 ? (len * 0.75).round() : 2400;
    if (estimatedTokens >= 1000) {
      return "~${(estimatedTokens / 1000).toStringAsFixed(1)}k tokens";
    }
    return "~$estimatedTokens tokens";
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.message.compactionData ??
        CompactionSummaryData.parse(widget.message.text);

    final savedTokensLabel = _formatSavedTokens(data);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: widget.isDark
                ? const Color(0xFF1E1E24).withValues(alpha: 0.75)
                : const Color(0xFFF1F5F9).withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: _statusColor.withValues(alpha: widget.isDark ? 0.35 : 0.25),
              width: 0.8,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: widget.isDark ? 0.2 : 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Status Indicator
              if (_isRunning)
                AnimatedBuilder(
                  animation: _pulseAnimation,
                  builder: (context, _) => Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: _yellow.withValues(alpha: _pulseAnimation.value),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: _yellow.withValues(alpha: _pulseAnimation.value * 0.5),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                  ),
                )
              else if (_isError)
                const Icon(
                  LucideIcons.circleAlert,
                  size: 13,
                  color: _red,
                )
              else
                const Icon(
                  LucideIcons.sparkles,
                  size: 13,
                  color: _green,
                ),
              const SizedBox(width: 8),

              // Title
              Text(
                _isRunning
                    ? "Compacting session…"
                    : (_isError ? "Compaction failed" : "Session compacted"),
                style: TextStyle(
                  fontFamily: "Inter",
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: widget.textPrimary,
                ),
              ),

              if (!_isRunning && !_isError) ...[
                const SizedBox(width: 6),
                Text(
                  "•",
                  style: TextStyle(
                    fontFamily: "Inter",
                    fontSize: 10,
                    color: widget.textSecondary.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  "Saved $savedTokensLabel",
                  style: TextStyle(
                    fontFamily: "JetBrainsMono",
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: widget.isDark
                        ? const Color(0xFF34D399)
                        : const Color(0xFF059669),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
