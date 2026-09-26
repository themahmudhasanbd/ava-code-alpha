part of '../formatted_message_view.dart';

// ─── Animated Chat Widgets ─────────────────────────────────────────────────────
// AnimatedTypewriterText: progressive character reveal for live AI responses.
// _LiveThinkingTimer: real-time elapsed seconds ticker for active thinking turns.

/// Progressive typewriter character reveal animation for live AI streaming text.
class AnimatedTypewriterText extends StatefulWidget {
  final String text;
  final bool isLive;
  final bool isHistory;
  final Widget Function(String currentText) builder;

  const AnimatedTypewriterText({
    super.key,
    required this.text,
    this.isLive = false,
    this.isHistory = false,
    required this.builder,
  });

  @override
  State<AnimatedTypewriterText> createState() => _AnimatedTypewriterTextState();
}

class _AnimatedTypewriterTextState extends State<AnimatedTypewriterText> {
  int _visibleChars = 0;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    if (!widget.isLive || widget.isHistory) {
      _visibleChars = widget.text.length;
    } else {
      _visibleChars = widget.text.length <= 8 ? widget.text.length : 0;
      _startOrUpdateTicker();
    }
  }

  @override
  void didUpdateWidget(covariant AnimatedTypewriterText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.isLive || widget.isHistory) {
      _ticker?.cancel();
      _ticker = null;
      _visibleChars = widget.text.length;
    } else if (widget.isLive && _visibleChars < widget.text.length) {
      final diff = widget.text.length - _visibleChars;
      if (diff <= 8) {
        _visibleChars = widget.text.length;
      } else {
        _startOrUpdateTicker(restartIfActive: true);
      }
    }
  }

  void _startOrUpdateTicker({bool restartIfActive = false}) {
    final targetLen = widget.text.length;
    if (_visibleChars >= targetLen) return;
    if (restartIfActive && _ticker != null) {
      _ticker?.cancel();
      _ticker = null;
    }
    if (_ticker != null && _ticker!.isActive) return;

    _ticker = Timer.periodic(const Duration(milliseconds: 32), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        final remaining = widget.text.length - _visibleChars;
        if (remaining <= 0 || !widget.isLive) {
          _visibleChars = widget.text.length;
          t.cancel();
          _ticker = null;
          return;
        }

        // Adaptive catch-up: never lags behind the AI stream, smooth 30fps markdown parsing
        int step = 3;
        if (remaining <= 6) {
          step = remaining;
        } else if (remaining <= 25) {
          step = (remaining / 2).ceil().clamp(4, 12);
        } else {
          step = (remaining / 3).ceil().clamp(10, 60);
        }

        _visibleChars += step;
        if (_visibleChars >= widget.text.length) {
          _visibleChars = widget.text.length;
          t.cancel();
          _ticker = null;
        }
      });
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _ticker = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final len = widget.text.length;
    if (len == 0) return widget.builder('');
    final current = widget.text.substring(0, _visibleChars.clamp(0, len));
    return widget.builder(current);
  }
}

// ─── Live Thinking Timer ──────────────────────────────────────────────────────
class _LiveThinkingTimer extends StatefulWidget {
  final DateTime startTime;
  final TextStyle style;

  const _LiveThinkingTimer({
    required this.startTime,
    required this.style,
  });

  @override
  State<_LiveThinkingTimer> createState() => _LiveThinkingTimerState();
}

class _LiveThinkingTimerState extends State<_LiveThinkingTimer> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _timer = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final diff = DateTime.now().difference(widget.startTime).inSeconds;
    final elapsed = diff > 0 ? diff : 1;
    return Text("Thinking for $elapsed sec…", style: widget.style);
  }
}

// ─── 3x3 Staggered Pixel Dot Grid Loader (Matching PixelDotsLoader) ─────────
class PixelDotsLoader extends StatefulWidget {
  final Color? color;
  final double size;

  const PixelDotsLoader({
    super.key,
    this.color,
    this.size = 12.0,
  });

  @override
  State<PixelDotsLoader> createState() => _PixelDotsLoaderState();
}

class _PixelDotsLoaderState extends State<PixelDotsLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  static final List<double> _chevronDelays = List.generate(9, (i) {
    final r = i ~/ 3;
    final c = i % 3;
    return (c + (r - 1).abs()) * 0.14; // Staggered diagonal phase delay
  });

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dotColor = widget.color ?? const Color(0xFF6366F1);
    final dotSize = (widget.size - 3.0) / 3.0;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Wrap(
            spacing: 1.5,
            runSpacing: 1.5,
            children: List.generate(9, (idx) {
              final phase = (_controller.value - _chevronDelays[idx]) % 1.0;
              final normalized = (sin(phase * 2 * pi) + 1.0) / 2.0;
              final opacity = (0.2 + (normalized * 0.75)).clamp(0.2, 0.95);
              final scale = 0.85 + (normalized * 0.3);

              return Transform.scale(
                scale: scale,
                child: Container(
                  width: dotSize.clamp(2.0, 3.5),
                  height: dotSize.clamp(2.0, 3.5),
                  decoration: BoxDecoration(
                    color: dotColor.withValues(alpha: opacity),
                    borderRadius: BorderRadius.circular(0.9),
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

// ─── Organic Morphing Glowing Blob Loader ───────────────────────────────────
class OrganicBlobGlowLoader extends StatefulWidget {
  final double size;
  final Color primaryColor;
  final Color secondaryColor;
  final Widget? child;

  const OrganicBlobGlowLoader({
    super.key,
    this.size = 22.0,
    this.primaryColor = const Color(0xFF6366F1),
    this.secondaryColor = const Color(0xFF8B5CF6),
    this.child,
  });

  @override
  State<OrganicBlobGlowLoader> createState() => _OrganicBlobGlowLoaderState();
}

class _OrganicBlobGlowLoaderState extends State<OrganicBlobGlowLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value;
        final rotation = t * 2 * pi;
        final pulseScale = 0.92 + (sin(t * 2 * pi) * 0.08);
        final glowAlpha = 0.3 + (sin(t * 2 * pi) * 0.15);

        return Transform.rotate(
          angle: rotation,
          child: Transform.scale(
            scale: pulseScale,
            child: Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  colors: [
                    widget.primaryColor,
                    widget.secondaryColor,
                    const Color(0xFF06B6D4),
                    widget.primaryColor,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: widget.primaryColor.withValues(alpha: glowAlpha),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: widget.child != null
                  ? Transform.rotate(
                      angle: -rotation,
                      child: Center(child: widget.child!),
                    )
                  : null,
            ),
          ),
        );
      },
    );
  }
}

// ─── Shimmering Gradient Text for Live Thinking / Working Labels ─────────────
class ShimmerGradientText extends StatefulWidget {
  final String text;
  final TextStyle style;
  final List<Color> colors;

  const ShimmerGradientText({
    super.key,
    required this.text,
    required this.style,
    this.colors = const [
      Color(0xFF94A3B8),
      Color(0xFF6366F1),
      Color(0xFF38BDF8),
      Color(0xFF94A3B8),
    ],
  });

  @override
  State<ShimmerGradientText> createState() => _ShimmerGradientTextState();
}

class _ShimmerGradientTextState extends State<ShimmerGradientText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              colors: widget.colors,
              stops: const [0.0, 0.4, 0.7, 1.0],
              begin: Alignment(-1.5 + (_controller.value * 3.0), 0.0),
              end: Alignment(0.5 + (_controller.value * 3.0), 0.0),
              tileMode: TileMode.clamp,
            ).createShader(bounds);
          },
          child: Text(
            widget.text,
            style: widget.style.copyWith(color: Colors.white),
          ),
        );
      },
    );
  }
}

// ─── Interactive AI Mascot Avatar (Matching reference AIMascot in ask-ai.tsx) ───
enum MascotGaze { up, down, left, right }

class AiMascotAvatar extends StatefulWidget {
  final bool awake;
  final MascotGaze? gaze;
  final double size;
  final Color? color;
  final Color? eyeColor;

  const AiMascotAvatar({
    super.key,
    this.awake = false,
    this.gaze,
    this.size = 24.0,
    this.color,
    this.eyeColor,
  });

  @override
  State<AiMascotAvatar> createState() => _AiMascotAvatarState();
}

class _AiMascotAvatarState extends State<AiMascotAvatar>
    with TickerProviderStateMixin {
  late AnimationController _blobController;
  late AnimationController _blinkController;

  @override
  void initState() {
    super.initState();
    _blobController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 9000),
    )..repeat();

    _blinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6500),
    )..repeat();
  }

  @override
  void dispose() {
    _blobController.dispose();
    _blinkController.dispose();
    super.dispose();
  }

  BorderRadius _calculateBlobBorderRadius(double progress, double s) {
    double tl, tr, br, bl;
    if (progress < 0.33) {
      final t = progress / 0.33;
      tl = lerpDouble(0.58, 0.45, t)! * s;
      tr = lerpDouble(0.42, 0.55, t)! * s;
      br = lerpDouble(0.55, 0.48, t)! * s;
      bl = lerpDouble(0.45, 0.52, t)! * s;
    } else if (progress < 0.66) {
      final t = (progress - 0.33) / 0.33;
      tl = lerpDouble(0.45, 0.52, t)! * s;
      tr = lerpDouble(0.55, 0.48, t)! * s;
      br = lerpDouble(0.48, 0.42, t)! * s;
      bl = lerpDouble(0.52, 0.58, t)! * s;
    } else {
      final t = (progress - 0.66) / 0.34;
      tl = lerpDouble(0.52, 0.58, t)! * s;
      tr = lerpDouble(0.48, 0.42, t)! * s;
      br = lerpDouble(0.42, 0.55, t)! * s;
      bl = lerpDouble(0.58, 0.45, t)! * s;
    }
    return BorderRadius.only(
      topLeft: Radius.circular(tl),
      topRight: Radius.circular(tr),
      bottomRight: Radius.circular(br),
      bottomLeft: Radius.circular(bl),
    );
  }

  Offset _getEyeOffset(MascotGaze? gaze, bool awake) {
    if (!awake) return const Offset(0.5, -0.5);
    switch (gaze) {
      case MascotGaze.down:
        return const Offset(0.5, 2.5);
      case MascotGaze.left:
        return const Offset(-2.5, -0.5);
      case MascotGaze.right:
        return const Offset(2.5, -0.5);
      case MascotGaze.up:
      default:
        return const Offset(0.5, -2.5);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final blobBg = widget.color ?? const Color(0xFF6366F1);
    final eyesColor = widget.eyeColor ?? Colors.white;

    final eyeWidth = (s * 0.10).clamp(2.0, 4.0);
    final eyeHeight = (s * 0.25).clamp(4.0, 10.0);
    final eyeGap = (s * 0.20).clamp(3.0, 8.0);

    return AnimatedBuilder(
      animation: Listenable.merge([_blobController, _blinkController]),
      builder: (context, child) {
        final borderRadius = _calculateBlobBorderRadius(_blobController.value, s);

        final blinkVal = _blinkController.value;
        double scaleY = 1.0;
        if (blinkVal >= 0.42 && blinkVal <= 0.46) {
          final blinkProgress = (blinkVal - 0.42) / 0.04;
          scaleY = 0.12 + (sin(blinkProgress * pi) * 0.88);
        }

        final tiltAngle = widget.awake ? (6.0 * pi / 180.0) : (-7.0 * pi / 180.0);
        final blobScale = widget.awake ? 1.05 : 1.0;
        final eyeShift = _getEyeOffset(widget.gaze, widget.awake);

        return Transform.rotate(
          angle: tiltAngle,
          child: Transform.scale(
            scale: blobScale,
            child: Container(
              width: s,
              height: s,
              decoration: BoxDecoration(
                color: blobBg,
                borderRadius: borderRadius,
                boxShadow: widget.awake
                    ? [
                        BoxShadow(
                          color: blobBg.withValues(alpha: 0.45),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
              child: Center(
                child: Transform.translate(
                  offset: eyeShift,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Transform.scale(
                        scaleY: scaleY,
                        child: Container(
                          width: eyeWidth,
                          height: eyeHeight,
                          decoration: BoxDecoration(
                            color: eyesColor,
                            borderRadius: BorderRadius.circular(eyeWidth),
                          ),
                        ),
                      ),
                      SizedBox(width: eyeGap),
                      Transform.scale(
                        scaleY: scaleY,
                        child: Container(
                          width: eyeWidth,
                          height: eyeHeight,
                          decoration: BoxDecoration(
                            color: eyesColor,
                            borderRadius: BorderRadius.circular(eyeWidth),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
