import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Sticky Pending Dock — pinned above the prompt box when agent is active.
///
/// Shows the current running tool name + elapsed timer.
/// Tapping the interrupt button calls [onInterrupt].
class ChatPendingDock extends StatefulWidget {
  final bool isSending;
  final bool isDark;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String? currentToolName;
  final VoidCallback? onInterrupt;

  const ChatPendingDock({
    super.key,
    required this.isSending,
    required this.isDark,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.currentToolName,
    this.onInterrupt,
  });

  @override
  State<ChatPendingDock> createState() => _ChatPendingDockState();
}

class _ChatPendingDockState extends State<ChatPendingDock>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;
  final _startTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isSending) return const SizedBox.shrink();

    final bg = widget.isDark ? const Color(0xFF13131A) : Colors.white;
    final runningTool = widget.currentToolName;

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 4, 14, 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(
          color: widget.borderColor.withValues(alpha: widget.isDark ? 0.5 : 0.35),
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: widget.isDark ? 0.2 : 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Pulsing activity dot
          FadeTransition(
            opacity: _pulseAnim,
            child: Container(
              width: 7,
              height: 7,
              decoration: const BoxDecoration(
                color: Color(0xFF38BDF8),
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Tool name / status label
          Expanded(
            child: runningTool != null && runningTool.isNotEmpty
                ? Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          runningTool,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontFamily: 'JetBrainsMono',
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF818CF8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 7),
                      Text(
                        'running…',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w500,
                          color: widget.textSecondary,
                        ),
                      ),
                    ],
                  )
                : Text(
                    'Agent running…',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w600,
                      color: widget.textSecondary,
                    ),
                  ),
          ),

          // Elapsed timer
          _ElapsedTimer(
            startTime: _startTime,
            textStyle: TextStyle(
              fontSize: 10.5,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w600,
              color: widget.textSecondary.withValues(alpha: 0.6),
            ),
          ),

          // Interrupt button
          if (widget.onInterrupt != null) ...[
            const SizedBox(width: 10),
            InkWell(
              onTap: widget.onInterrupt,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                    width: 0.8,
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.squareStop, size: 11, color: Color(0xFFEF4444)),
                    SizedBox(width: 5),
                    Text(
                      'Stop',
                      style: TextStyle(
                        fontSize: 11,
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFEF4444),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Elapsed Timer ────────────────────────────────────────────────────────────

class _ElapsedTimer extends StatefulWidget {
  final DateTime startTime;
  final TextStyle textStyle;

  const _ElapsedTimer({required this.startTime, required this.textStyle});

  @override
  State<_ElapsedTimer> createState() => _ElapsedTimerState();
}

class _ElapsedTimerState extends State<_ElapsedTimer> {
  late final Stream<int> _ticks;

  @override
  void initState() {
    super.initState();
    _ticks = Stream.periodic(const Duration(seconds: 1), (i) => i + 1);
  }

  String _format(int secs) {
    if (secs < 60) return '${secs}s';
    final m = secs ~/ 60;
    final s = secs % 60;
    return '${m}m ${s}s';
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<int>(
      stream: _ticks,
      initialData: 0,
      builder: (context, snap) {
        final elapsed = DateTime.now().difference(widget.startTime).inSeconds;
        return Text(_format(elapsed.clamp(0, 3600)), style: widget.textStyle);
      },
    );
  }
}
