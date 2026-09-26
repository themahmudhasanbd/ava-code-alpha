import 'package:flutter/material.dart';
import '../../config/chat_constants.dart';
import '../../theme/prompt_theme.dart';

/// A specialized [TextEditingController] that dynamically highlights registered slash
/// commands (`/command`) and context mentions (`@file`, `@agent`, etc.)
/// with distinct, theme-aware styling. Only registered slash commands are highlighted.
class PromptHighlightController extends TextEditingController {
  Set<String> _registeredCommands;
  final Set<String> _registeredMentions;

  PromptHighlightController({
    super.text,
    Set<String>? initialCommands,
    Set<String>? initialMentions,
  })  : _registeredCommands = initialCommands ??
            kDefaultSlashCommands.map((c) => c.command.toLowerCase()).toSet(),
        _registeredMentions = initialMentions ??
            kDefaultAtContextItems.map((m) => (m['label'] as String).toLowerCase()).toSet();

  void updateRegisteredCommands(Iterable<String> commands) {
    final updated = kDefaultSlashCommands.map((c) => c.command.toLowerCase()).toSet();
    for (final cmd in commands) {
      final normalized = cmd.trim().toLowerCase();
      if (normalized.isNotEmpty) {
        updated.add(normalized.startsWith('/') ? normalized : '/$normalized');
      }
    }
    _registeredCommands = updated;
    notifyListeners();
  }

  // Regex matching potential /commands and @mentions
  static final RegExp _syntaxRegex =
      RegExp(r'(\/[a-zA-Z0-9_\-]+)|(@[a-zA-Z0-9_\-\.\/]+)');

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    if (text.isEmpty) {
      return TextSpan(style: style, text: '');
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    final effectiveStyle = (style ?? const TextStyle()).copyWith(
      fontFamily: style?.fontFamily ?? 'HindSiliguri',
      fontFamilyFallback: style?.fontFamilyFallback ?? kBanglaFontFamilyFallback,
    );

    // Dynamic theme-aware command highlight style
    final dynamicPrimary = Theme.of(context).colorScheme.primary;
    final commandColor = isDark
        ? (dynamicPrimary.computeLuminance() > 0.35 ? dynamicPrimary : PromptTheme.primaryLight)
        : PromptTheme.primaryDark;

    final commandStyle = effectiveStyle.copyWith(
      color: commandColor,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.2,
    );

    final mentionColor = isDark ? const Color(0xFF2DD4BF) : const Color(0xFF0D9488); // Teal
    final mentionStyle = effectiveStyle.copyWith(
      color: mentionColor,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.2,
    );

    final spans = <InlineSpan>[];
    int start = 0;

    for (final match in _syntaxRegex.allMatches(text)) {
      if (match.start > start) {
        spans.add(TextSpan(
          text: text.substring(start, match.start),
          style: effectiveStyle,
        ));
      }

      final matchedText = match.group(0)!;
      final lowerMatched = matchedText.toLowerCase();

      // Only highlight if it is a registered slash command
      if (matchedText.startsWith('/')) {
        if (_registeredCommands.contains(lowerMatched)) {
          spans.add(TextSpan(
            text: matchedText,
            style: commandStyle,
          ));
        } else {
          spans.add(TextSpan(
            text: matchedText,
            style: effectiveStyle,
          ));
        }
      } else if (matchedText.startsWith('@')) {
        if (_registeredMentions.contains(lowerMatched)) {
          spans.add(TextSpan(
            text: matchedText,
            style: mentionStyle,
          ));
        } else {
          spans.add(TextSpan(
            text: matchedText,
            style: effectiveStyle,
          ));
        }
      }

      start = match.end;
    }

    if (start < text.length) {
      spans.add(TextSpan(
        text: text.substring(start),
        style: effectiveStyle,
      ));
    }

    return TextSpan(style: effectiveStyle, children: spans);
  }
}
