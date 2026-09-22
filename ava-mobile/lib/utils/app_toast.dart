import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';

/// Toast severity / type for thematic styling
enum ToastType {
  success,
  error,
  warning,
  info,
  copied,
  file,
}

/// Unified, modern top-floating Toast / HUD notification system for AvA Code.
///
/// Features:
/// - Displays at the TOP of the screen (under safe area / status bar)
/// - Smooth spring slide-down and fade-in entrance animation
/// - Swipe-up or tap to dismiss
/// - Glassmorphic theme-aware palette with translucent icon badges
/// - Domain-specific presets: success, error, warning, info, copied, file
class AppToast {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  static OverlayEntry? _currentEntry;
  static AnimationController? _currentAnimController;

  /// Dismisses any currently active toast immediately.
  static void dismiss() {
    _currentAnimController?.reverse().then((_) {
      _currentEntry?.remove();
      _currentEntry = null;
      _currentAnimController = null;
    });
  }

  /// General top toast trigger
  static void show(
    BuildContext? context,
    String message, {
    ToastType type = ToastType.info,
    String? title,
    IconData? icon,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(milliseconds: 3000),
  }) {
    OverlayState? overlay;
    if (context != null && context.mounted) {
      overlay = Overlay.maybeOf(context, rootOverlay: true) ??
          Navigator.maybeOf(context)?.overlay;
    }
    overlay ??= navigatorKey.currentState?.overlay;

    if (overlay == null) return;

    // Dismiss existing toast
    if (_currentEntry != null) {
      _currentEntry?.remove();
      _currentEntry = null;
      _currentAnimController = null;
    }

    final isDark = AppTheme.isDark;
    final config = _resolveConfig(type, isDark, customIcon: icon);

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (ctx) => _TopToastWidget(
        message: message,
        title: title,
        config: config,
        isDark: isDark,
        actionLabel: actionLabel,
        onAction: onAction,
        duration: duration,
        onDismissed: () {
          if (_currentEntry == entry) {
            _currentEntry?.remove();
            _currentEntry = null;
            _currentAnimController = null;
          }
        },
      ),
    );

    _currentEntry = entry;
    overlay.insert(entry);
  }

  /// Convenience helper for success messages
  static void success(
    BuildContext? context,
    String message, {
    String? title,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(milliseconds: 2800),
  }) {
    show(
      context,
      message,
      type: ToastType.success,
      title: title,
      actionLabel: actionLabel,
      onAction: onAction,
      duration: duration,
    );
  }

  /// Convenience helper for error messages
  static void error(
    BuildContext? context,
    String message, {
    String? title = 'Error',
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(milliseconds: 4000),
  }) {
    show(
      context,
      message,
      type: ToastType.error,
      title: title,
      actionLabel: actionLabel,
      onAction: onAction,
      duration: duration,
    );
  }

  /// Convenience helper for warnings
  static void warning(
    BuildContext? context,
    String message, {
    String? title,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(milliseconds: 3200),
  }) {
    show(
      context,
      message,
      type: ToastType.warning,
      title: title,
      actionLabel: actionLabel,
      onAction: onAction,
      duration: duration,
    );
  }

  /// Convenience helper for info messages
  static void info(
    BuildContext? context,
    String message, {
    String? title,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(milliseconds: 2800),
  }) {
    show(
      context,
      message,
      type: ToastType.info,
      title: title,
      actionLabel: actionLabel,
      onAction: onAction,
      duration: duration,
    );
  }

  /// Convenience helper for copy-to-clipboard feedback
  static void copied(
    BuildContext? context, [
    String message = 'Copied to clipboard',
  ]) {
    show(
      context,
      message,
      type: ToastType.copied,
      duration: const Duration(milliseconds: 2200),
    );
  }

  /// Convenience helper for file saved feedback
  static void fileSaved(
    BuildContext? context,
    String filePath, {
    VoidCallback? onOpen,
  }) {
    final fileName = filePath.contains('/') ? filePath.split('/').last : filePath;
    show(
      context,
      'Saved $fileName',
      type: ToastType.file,
      actionLabel: onOpen != null ? 'Open' : null,
      onAction: onOpen,
      duration: const Duration(milliseconds: 2800),
    );
  }

  // ─── Internal Style Resolver ────────────────────────────────────────────────
  static _ToastStyleConfig _resolveConfig(ToastType type, bool isDark, {IconData? customIcon}) {
    switch (type) {
      case ToastType.success:
        return _ToastStyleConfig(
          icon: customIcon ?? LucideIcons.checkCheck,
          accentColor: const Color(0xFF10B981),
        );
      case ToastType.error:
        return _ToastStyleConfig(
          icon: customIcon ?? LucideIcons.circleAlert,
          accentColor: const Color(0xFFEF4444),
        );
      case ToastType.warning:
        return _ToastStyleConfig(
          icon: customIcon ?? LucideIcons.triangleAlert,
          accentColor: const Color(0xFFF59E0B),
        );
      case ToastType.copied:
        return _ToastStyleConfig(
          icon: customIcon ?? LucideIcons.copyCheck,
          accentColor: const Color(0xFF06B6D4),
        );
      case ToastType.file:
        return _ToastStyleConfig(
          icon: customIcon ?? LucideIcons.fileCheck2,
          accentColor: const Color(0xFF10B981),
        );
      case ToastType.info:
        return _ToastStyleConfig(
          icon: customIcon ?? LucideIcons.info,
          accentColor: const Color(0xFF6366F1),
        );
    }
  }
}

class _ToastStyleConfig {
  final IconData icon;
  final Color accentColor;

  const _ToastStyleConfig({
    required this.icon,
    required this.accentColor,
  });
}

class _TopToastWidget extends StatefulWidget {
  final String message;
  final String? title;
  final _ToastStyleConfig config;
  final bool isDark;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Duration duration;
  final VoidCallback onDismissed;

  const _TopToastWidget({
    required this.message,
    this.title,
    required this.config,
    required this.isDark,
    this.actionLabel,
    this.onAction,
    required this.duration,
    required this.onDismissed,
  });

  @override
  State<_TopToastWidget> createState() => _TopToastWidgetState();
}

class _TopToastWidgetState extends State<_TopToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _offsetAnim;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );

    AppToast._currentAnimController = _controller;

    _offsetAnim = Tween<Offset>(
      begin: const Offset(0, -0.6),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    ));

    _fadeAnim = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
      reverseCurve: Curves.easeIn,
    );

    _controller.forward();

    Future.delayed(widget.duration, () {
      if (mounted) _dismiss();
    });
  }

  void _dismiss() {
    if (!mounted) return;
    _controller.reverse().then((_) {
      if (mounted) widget.onDismissed();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top + 8;

    return Positioned(
      top: topPadding,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _offsetAnim,
        child: FadeTransition(
          opacity: _fadeAnim,
          child: GestureDetector(
            onVerticalDragEnd: (details) {
              if ((details.primaryVelocity ?? 0) < -100) {
                _dismiss();
              }
            },
            child: Material(
              color: Colors.transparent,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: widget.isDark
                      ? const Color(0xFF18181F).withValues(alpha: 0.95)
                      : Colors.white.withValues(alpha: 0.96),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: widget.config.accentColor.withValues(
                      alpha: widget.isDark ? 0.35 : 0.25,
                    ),
                    width: 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(
                        alpha: widget.isDark ? 0.55 : 0.12,
                      ),
                      blurRadius: 22,
                      offset: const Offset(0, 8),
                    ),
                    BoxShadow(
                      color: widget.config.accentColor.withValues(
                        alpha: widget.isDark ? 0.16 : 0.08,
                      ),
                      blurRadius: 14,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // ── Icon Badge ───────────────────────────────────────────
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: widget.config.accentColor.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                          color: widget.config.accentColor.withValues(alpha: 0.28),
                          width: 0.8,
                        ),
                      ),
                      child: Center(
                        child: Icon(
                          widget.config.icon,
                          size: 18,
                          color: widget.config.accentColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // ── Title & Message ──────────────────────────────────────
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.title != null && widget.title!.isNotEmpty) ...[
                            Text(
                              widget.title!,
                              style: TextStyle(
                                fontSize: 12,
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.w700,
                                color: widget.config.accentColor,
                                letterSpacing: 0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                          ],
                          Text(
                            widget.message,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontFamily: 'PlusJakartaSans',
                              fontFamilyFallback: const [
                                'NotoSansBengali',
                                'sans-serif'
                              ],
                              fontWeight: FontWeight.w500,
                              height: 1.35,
                              color: widget.isDark
                                  ? const Color(0xFFF1F5F9)
                                  : const Color(0xFF0F172A),
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // ── Action Button (Optional) ─────────────────────────────
                    if (widget.actionLabel != null && widget.onAction != null) ...[
                      const SizedBox(width: 10),
                      InkWell(
                        onTap: () {
                          _dismiss();
                          widget.onAction?.call();
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: widget.config.accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: widget.config.accentColor.withValues(alpha: 0.3),
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            widget.actionLabel!,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: 'Inter',
                              fontWeight: FontWeight.w700,
                              color: widget.config.accentColor,
                            ),
                          ),
                        ),
                      ),
                    ],

                    // ── Dismiss Close Button ─────────────────────────────────
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: _dismiss,
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(4.0),
                        child: Icon(
                          LucideIcons.x,
                          size: 14,
                          color: (widget.isDark
                                  ? const Color(0xFF94A3B8)
                                  : const Color(0xFF64748B))
                              .withValues(alpha: 0.7),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
