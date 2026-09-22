import 'package:flutter/material.dart';

/// An interactive gesture container that enables smooth finger-following horizontal
/// swipe-to-back transitions with real-time visual feedback and cancellation support.
///
/// When the user drags from left to right:
/// - The current foreground screen translates horizontally, tracking the finger in real time.
/// - A realistic edge shadow and background scrim provide depth.
/// - If the drag exceeds 35% of the screen width or is flung with sufficient velocity,
///   it animates smoothly offscreen and triggers [onDismissed].
/// - If released before reaching the threshold, it springs back to position (cancelled).
class InteractiveSwipeToChat extends StatefulWidget {
  final Widget child;
  final VoidCallback onDismissed;
  final bool enabled;

  const InteractiveSwipeToChat({
    super.key,
    required this.child,
    required this.onDismissed,
    this.enabled = true,
  });

  @override
  State<InteractiveSwipeToChat> createState() => _InteractiveSwipeToChatState();
}

class _InteractiveSwipeToChatState extends State<InteractiveSwipeToChat>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _animation;
  double _dragOffset = 0.0;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    _animController.addListener(() {
      setState(() {
        _dragOffset = _animation.value;
      });
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _onHorizontalDragStart(DragStartDetails details) {
    if (!widget.enabled) return;
    _animController.stop();
    setState(() {
      _isDragging = true;
    });
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details, double screenWidth) {
    if (!widget.enabled) return;
    final newOffset = (_dragOffset + details.delta.dx).clamp(0.0, screenWidth);
    setState(() {
      _dragOffset = newOffset;
    });
  }

  void _onHorizontalDragEnd(DragEndDetails details, double screenWidth) {
    if (!widget.enabled) return;
    setState(() {
      _isDragging = false;
    });

    final velocity = details.primaryVelocity ?? 0.0;
    final progress = screenWidth > 0 ? (_dragOffset / screenWidth) : 0.0;

    final bool shouldComplete = velocity > 350 || (velocity >= 0 && progress > 0.35);

    if (shouldComplete) {
      // Animate to complete dismissal
      _animation = Tween<double>(begin: _dragOffset, end: screenWidth).animate(
        CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
      );
      _animController.forward(from: 0.0).then((_) {
        if (mounted) {
          widget.onDismissed();
          setState(() {
            _dragOffset = 0.0;
          });
        }
      });
    } else {
      // Animate back to cancel (spring back to 0)
      _animation = Tween<double>(begin: _dragOffset, end: 0.0).animate(
        CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
      );
      _animController.forward(from: 0.0);
    }
  }

  void _onHorizontalDragCancel() {
    if (!widget.enabled) return;
    setState(() {
      _isDragging = false;
    });
    _animation = Tween<double>(begin: _dragOffset, end: 0.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );
    _animController.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final double progress = screenWidth > 0 ? (_dragOffset / screenWidth).clamp(0.0, 1.0) : 0.0;

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragStart: _onHorizontalDragStart,
      onHorizontalDragUpdate: (details) => _onHorizontalDragUpdate(details, screenWidth),
      onHorizontalDragEnd: (details) => _onHorizontalDragEnd(details, screenWidth),
      onHorizontalDragCancel: _onHorizontalDragCancel,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Background Scrim during interactive swipe
          if (_dragOffset > 0 || _isDragging)
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: (0.45 * (1.0 - progress)).clamp(0.0, 0.45)),
              ),
            ),

          // Sliding Foreground Child
          Transform.translate(
            offset: Offset(_dragOffset, 0),
            child: Container(
              decoration: BoxDecoration(
                boxShadow: _dragOffset > 0
                    ? [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: (0.35 * (1.0 - progress)).clamp(0.0, 0.35)),
                          blurRadius: 16,
                          offset: const Offset(-4, 0),
                          spreadRadius: 2,
                        ),
                      ]
                    : null,
              ),
              child: widget.child,
            ),
          ),
        ],
      ),
    );
  }
}
