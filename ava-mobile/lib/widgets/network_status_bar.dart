import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';

/// YouTube-style slim, animated network status banner bar.
/// Appears directly beneath the app header bar when connection drops or is reconnecting,
/// transitions to "Back online" upon reconnect, and smoothly auto-dismisses.
class NetworkStatusBar extends StatefulWidget {
  final ValueNotifier<CoreConnectionStatus> statusNotifier;
  final VoidCallback? onRetry;
  final bool isDark;

  const NetworkStatusBar({
    super.key,
    required this.statusNotifier,
    this.onRetry,
    required this.isDark,
  });

  @override
  State<NetworkStatusBar> createState() => _NetworkStatusBarState();
}

class _NetworkStatusBarState extends State<NetworkStatusBar> with SingleTickerProviderStateMixin {
  late CoreConnectionStatus _currentStatus;
  bool _showBackOnline = false;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.statusNotifier.value;
    widget.statusNotifier.addListener(_onStatusChanged);
  }

  @override
  void didUpdateWidget(covariant NetworkStatusBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.statusNotifier != widget.statusNotifier) {
      oldWidget.statusNotifier.removeListener(_onStatusChanged);
      widget.statusNotifier.addListener(_onStatusChanged);
      _currentStatus = widget.statusNotifier.value;
    }
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    widget.statusNotifier.removeListener(_onStatusChanged);
    super.dispose();
  }

  void _onStatusChanged() {
    final nextStatus = widget.statusNotifier.value;
    if (!mounted) return;

    if (_currentStatus != nextStatus) {
      // Transitioning from disconnected/reconnecting back to connected
      if ((_currentStatus == CoreConnectionStatus.disconnected ||
              _currentStatus == CoreConnectionStatus.reconnecting ||
              _currentStatus == CoreConnectionStatus.connecting) &&
          nextStatus == CoreConnectionStatus.connected) {
        _dismissTimer?.cancel();
        setState(() {
          _currentStatus = nextStatus;
          _showBackOnline = true;
        });

        _dismissTimer = Timer(const Duration(milliseconds: 2500), () {
          if (mounted) {
            setState(() {
              _showBackOnline = false;
            });
          }
        });
      } else {
        if (nextStatus != CoreConnectionStatus.connected) {
          _dismissTimer?.cancel();
          _showBackOnline = false;
        }
        setState(() {
          _currentStatus = nextStatus;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSyncing = _currentStatus == CoreConnectionStatus.syncing;
    final isDisconnected = _currentStatus == CoreConnectionStatus.disconnected;
    final isReconnecting = _currentStatus == CoreConnectionStatus.reconnecting ||
        _currentStatus == CoreConnectionStatus.connecting;
    final isVisible = isDisconnected || isReconnecting || isSyncing || _showBackOnline;

    Color bgColor;
    Color fgColor;
    IconData iconData;
    String text;
    bool isSpinning = false;

    if (_showBackOnline) {
      bgColor = widget.isDark
          ? const Color(0xFF065F46).withValues(alpha: 0.95)
          : const Color(0xFF10B981);
      fgColor = Colors.white;
      iconData = LucideIcons.checkCircle2;
      text = 'Back online';
    } else if (isSyncing) {
      bgColor = widget.isDark
          ? const Color(0xFF312E81).withValues(alpha: 0.95)
          : const Color(0xFF4F46E5);
      fgColor = Colors.white;
      iconData = LucideIcons.refreshCw;
      text = 'Syncing with AvA Core…';
      isSpinning = true;
    } else if (isReconnecting) {
      bgColor = widget.isDark
          ? const Color(0xFF78350F).withValues(alpha: 0.95)
          : const Color(0xFFD97706);
      fgColor = Colors.white;
      iconData = LucideIcons.loader2;
      text = 'Connecting to AvA Core…';
      isSpinning = true;
    } else if (isDisconnected) {
      bgColor = widget.isDark
          ? const Color(0xFF7F1D1D).withValues(alpha: 0.95)
          : const Color(0xFFDC2626);
      fgColor = Colors.white;
      iconData = LucideIcons.wifiOff;
      text = 'No connection — Retrying…';
    } else {
      bgColor = Colors.transparent;
      fgColor = Colors.transparent;
      iconData = LucideIcons.wifi;
      text = '';
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeInOutCubic,
      height: isVisible ? 28.0 : 0.0,
      width: double.infinity,
      color: bgColor,
      child: ClipRect(
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: isVisible ? 1.0 : 0.0,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: (isDisconnected || isReconnecting) ? widget.onRetry : null,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    if (isSpinning)
                      _SpinningIcon(icon: iconData, color: fgColor, size: 12)
                    else
                      Icon(iconData, size: 12, color: fgColor),
                    const SizedBox(width: 7),
                    Text(
                      text,
                      style: TextStyle(
                        color: fgColor,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.1,
                      ),
                    ),
                    if (isDisconnected && widget.onRetry != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Retry',
                          style: TextStyle(
                            color: fgColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
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

class _SpinningIcon extends StatefulWidget {
  final IconData icon;
  final Color color;
  final double size;

  const _SpinningIcon({
    required this.icon,
    required this.color,
    required this.size,
  });

  @override
  State<_SpinningIcon> createState() => _SpinningIconState();
}

class _SpinningIconState extends State<_SpinningIcon> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _controller,
      child: Icon(widget.icon, size: widget.size, color: widget.color),
    );
  }
}
