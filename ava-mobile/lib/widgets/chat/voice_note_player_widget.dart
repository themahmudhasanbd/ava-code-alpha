import 'dart:math';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../services/audio_player_service.dart';

/// Ultra-premium Voice Note Player Widget adhering to Thunder Design System
/// - Double-bezel container
/// - Zero emojis (clean Lucide icons)
/// - Interactive play/pause, seek, waveform, and duration display
class VoiceNotePlayerWidget extends StatefulWidget {
  final String filePath;
  final String? baseUrl;
  final bool isDark;

  const VoiceNotePlayerWidget({
    super.key,
    required this.filePath,
    this.baseUrl,
    required this.isDark,
  });

  @override
  State<VoiceNotePlayerWidget> createState() => _VoiceNotePlayerWidgetState();
}

class _VoiceNotePlayerWidgetState extends State<VoiceNotePlayerWidget>
    with SingleTickerProviderStateMixin {
  bool _isPlaying = false;
  double _currentSeconds = 0.0;
  double _totalSeconds = 0.0;
  bool _hasError = false;
  String? _errorMessage;

  // Waveform bar heights (pseudo-randomized based on file path for consistency)
  late final List<double> _waveformBars;

  @override
  void initState() {
    super.initState();
    _waveformBars = _generateWaveform(widget.filePath);
  }

  @override
  void dispose() {
    if (_isPlaying) {
      AudioPlayerService.stop();
    }
    super.dispose();
  }

  List<double> _generateWaveform(String seedStr) {
    final rand = Random(seedStr.hashCode.abs());
    const count = 28;
    return List.generate(count, (i) {
      final base = 6.0 + rand.nextDouble() * 18.0;
      return base.clamp(4.0, 24.0);
    });
  }

  String _resolveAudioUrl(String path) {
    final trimmed = path.trim();
    if (trimmed.isEmpty) return '';
    if (trimmed.startsWith('data:audio/') ||
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://')) {
      return trimmed;
    }
    String cleanPath = trimmed;
    if (cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.substring(7);
    }
    if (cleanPath.startsWith('/api/workspace/raw') || cleanPath.startsWith('api/workspace/raw')) {
      final prefix = widget.baseUrl ?? '';
      final pathSuffix = cleanPath.startsWith('/') ? cleanPath : '/$cleanPath';
      return prefix.isNotEmpty ? '$prefix$pathSuffix' : pathSuffix;
    }
    final effectiveBaseUrl = (widget.baseUrl != null && widget.baseUrl!.isNotEmpty) ? widget.baseUrl! : '';
    return '$effectiveBaseUrl/api/workspace/raw?path=${Uri.encodeComponent(cleanPath)}';
  }

  void _togglePlayPause() {
    if (_isPlaying) {
      AudioPlayerService.pause();
      setState(() => _isPlaying = false);
    } else {
      final url = _resolveAudioUrl(widget.filePath);
      if (url.isEmpty) {
        setState(() {
          _hasError = true;
          _errorMessage = 'Invalid audio URL';
        });
        return;
      }

      setState(() {
        _isPlaying = true;
        _hasError = false;
        _errorMessage = null;
      });

      AudioPlayerService.play(
        url: url,
        onTimeUpdate: (current, total) {
          if (!mounted) return;
          setState(() {
            _currentSeconds = current;
            if (total > 0) _totalSeconds = total;
          });
        },
        onEnded: () {
          if (!mounted) return;
          setState(() {
            _isPlaying = false;
            _currentSeconds = 0.0;
          });
        },
        onError: (err) {
          if (!mounted) return;
          setState(() {
            _isPlaying = false;
            _hasError = true;
            _errorMessage = err;
          });
        },
      );
    }
  }

  void _seekToFraction(double fraction) {
    if (_totalSeconds <= 0) return;
    final targetSec = (fraction * _totalSeconds).clamp(0.0, _totalSeconds);
    AudioPlayerService.seek(targetSec);
    setState(() => _currentSeconds = targetSec);
  }

  String _formatTime(double sec) {
    final s = sec.toInt();
    final m = s ~/ 60;
    final rem = s % 60;
    return '${m.toString().padLeft(2, '0')}:${rem.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final cardBg = widget.isDark ? const Color(0xFF0F1523) : const Color(0xFFF1F5F9);
    final borderColor = widget.isDark ? const Color(0xFF1E293B) : const Color(0xFFCBD5E1);
    final textSecondary = widget.isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    final progress = (_totalSeconds > 0) ? (_currentSeconds / _totalSeconds).clamp(0.0, 1.0) : 0.0;

    return Container(
      constraints: const BoxConstraints(minWidth: 220, maxWidth: 280),
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: widget.isDark ? 0.3 : 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Play / Pause Circle Button
              GestureDetector(
                onTap: _togglePlayPause,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Icon(
                      _isPlaying ? LucideIcons.pause : LucideIcons.play,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 10),

              // Waveform Bars & Time Row
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Waveform Bars (Clickable Seek Bar)
                    GestureDetector(
                      onHorizontalDragUpdate: (details) {
                        final RenderBox? box = context.findRenderObject() as RenderBox?;
                        if (box != null && box.hasSize) {
                          final localX = details.localPosition.dx.clamp(0.0, box.size.width - 56);
                          final fraction = (localX / (box.size.width - 56)).clamp(0.0, 1.0);
                          _seekToFraction(fraction);
                        }
                      },
                      onTapUp: (details) {
                        final RenderBox? box = context.findRenderObject() as RenderBox?;
                        if (box != null && box.hasSize) {
                          final localX = details.localPosition.dx.clamp(0.0, box.size.width - 56);
                          final fraction = (localX / (box.size.width - 56)).clamp(0.0, 1.0);
                          _seekToFraction(fraction);
                        }
                      },
                      child: SizedBox(
                        height: 24,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: List.generate(_waveformBars.length, (i) {
                            final barFraction = i / _waveformBars.length;
                            final isPassed = barFraction <= progress;
                            return Container(
                              width: 3,
                              height: _waveformBars[i],
                              decoration: BoxDecoration(
                                color: isPassed
                                    ? const Color(0xFF6366F1)
                                    : (widget.isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            );
                          }),
                        ),
                      ),
                    ),

                    const SizedBox(height: 4),

                    // Progress & Duration Text
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _totalSeconds > 0
                              ? '${_formatTime(_currentSeconds)} / ${_formatTime(_totalSeconds)}'
                              : (_currentSeconds > 0 ? _formatTime(_currentSeconds) : 'Voice Note'),
                          style: TextStyle(
                            fontSize: 10,
                            fontFamily: 'JetBrainsMono',
                            fontWeight: FontWeight.w600,
                            color: textSecondary,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              LucideIcons.mic,
                              size: 10,
                              color: textSecondary.withValues(alpha: 0.7),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              'AUDIO',
                              style: TextStyle(
                                fontSize: 9,
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                                color: textSecondary.withValues(alpha: 0.7),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (_hasError && _errorMessage != null) ...[
            const SizedBox(height: 4),
            Text(
              _errorMessage!,
              style: const TextStyle(
                fontSize: 9.5,
                color: Color(0xFFEF4444),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
