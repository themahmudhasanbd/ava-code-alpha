import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../theme/prompt_theme.dart';

/// Animated microphone button that toggles voice audio recording in the prompt bar.
class ChatVoiceInputButton extends StatelessWidget {
  final bool isRecording;
  final String? recordingDurationText;
  final Color borderColor;
  final Color textSecondary;
  final bool isDark;
  final VoidCallback onTap;

  const ChatVoiceInputButton({
    super.key,
    required this.isRecording,
    this.recordingDurationText,
    required this.borderColor,
    required this.textSecondary,
    this.isDark = true,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (isRecording && recordingDurationText != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: const Color(0xFFEF4444).withValues(alpha: 0.16),
            border: Border.all(
              color: const Color(0xFFEF4444),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFEF4444).withValues(alpha: 0.35),
                blurRadius: 10,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFEF4444),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                recordingDurationText!,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFEF4444),
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(width: 6),
              const Icon(
                LucideIcons.square,
                size: 11,
                color: Color(0xFFEF4444),
              ),
            ],
          ),
        ),
      );
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isRecording ? const Color(0xFFEF4444).withValues(alpha: 0.15) : PromptTheme.buttonBg(isDark),
          border: isRecording
              ? Border.all(
                  color: const Color(0xFFEF4444),
                  width: 1.5,
                )
              : null,
          boxShadow: isRecording
              ? [
                  BoxShadow(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                    blurRadius: 8,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: Center(
          child: Icon(
            isRecording ? LucideIcons.square : LucideIcons.mic,
            size: 18,
            color: isRecording ? const Color(0xFFEF4444) : textSecondary,
          ),
        ),
      ),
    );
  }
}
