part of '../formatted_message_view.dart';

// ─── Thinking Accordion & Timer ───────────────────────────────────────────────

// ignore_for_file: library_private_types_in_public_api, invalid_use_of_protected_member
extension FmvThinkingExt on _FormattedMessageViewState {
  Widget _buildThinkingTimer({required DateTime startTime, required TextStyle style}) {
    return _LiveThinkingTimer(startTime: startTime, style: style);
  }

  Widget _buildThinkingAccordion(
    String partId,
    String text, {
    bool isStreaming = false,
    required bool isTurnActive,
    int? durationMs,
    DateTime? startedAt,
  }) {
    final showLiveSpinner = isStreaming && isTurnActive;

    // ── Auto-collapse & Duration Freeze logic ────────────────────────────────
    // Track streaming→complete transition via a shadow key in _expandedState.
    final wasStreamingKey = '${partId}_wasStreaming';
    final wasStreaming = _expandedState[wasStreamingKey] == true;
    if (showLiveSpinner && !wasStreaming) {
      _expandedState[wasStreamingKey] = true;
    } else if (!showLiveSpinner && wasStreaming) {
      _expandedState[wasStreamingKey] = false;
      if (startedAt != null) {
        final diff = DateTime.now().difference(startedAt).inMilliseconds.abs();
        _frozenThinkingDuration[partId] = (diff / 1000.0).clamp(0.5, 300.0);
      }
    }

    final isExplicitlyExpanded = _expandedState[partId];
    // While streaming: open by default. When done: collapsed by default (or user-chosen).
    final isExpanded = isExplicitlyExpanded ?? showLiveSpinner;

    // ── Duration calculation (Frozen once completed, never increasing) ───────
    double durSec;
    if (durationMs != null && durationMs > 0) {
      durSec = (durationMs / 1000.0);
      if (durSec <= 0) durSec = 0.5;
    } else if (_frozenThinkingDuration[partId] != null) {
      durSec = _frozenThinkingDuration[partId]!;
    } else if (startedAt != null && showLiveSpinner) {
      final diff = DateTime.now().difference(startedAt).inMilliseconds.abs();
      durSec = (diff / 1000.0).clamp(0.5, 300.0);
    } else {
      final wordCount = text.split(RegExp(r"\s+")).where((s) => s.isNotEmpty).length;
      durSec = (wordCount / 20.0).clamp(0.5, 120.0);
    }
    final String durStr = durSec >= 10 ? durSec.toStringAsFixed(0) : durSec.toStringAsFixed(1);

    final cleanText = text.trim();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Seamless Unboxed Header Trigger
          InkWell(
            onTap: () {
              setState(() {
                _expandedState[partId] = !isExpanded;
              });
            },
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (showLiveSpinner)
                    _buildPixelDotsLoader()
                  else
                    Icon(
                      LucideIcons.brain,
                      size: 14,
                      color: _cSecondary,
                    ),
                  const SizedBox(width: 7),
                  // Label
                  if (showLiveSpinner)
                    (startedAt != null
                        ? _buildThinkingTimer(
                            startTime: startedAt,
                            style: TextStyle(
                              fontSize: 12,
                              fontFamily: "Inter",
                              color: _cSecondary,
                              fontWeight: FontWeight.w600,
                            ),
                          )
                        : _buildShimmerText("Thinking…"))
                  else
                    RichText(
                      text: TextSpan(
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: "Inter",
                          color: _cSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                        children: [
                          const TextSpan(text: "Thought for "),
                          TextSpan(
                            text: "${durStr}s",
                            style: TextStyle(
                              fontFamily: "JetBrainsMono",
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: _cPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(width: 6),
                  AnimatedRotation(
                    turns: isExpanded ? 0.0 : -0.25,
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutCubic,
                    child: Icon(
                      LucideIcons.chevronDown,
                      size: 13,
                      color: _cFaint.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Indented Thinking Stream inside vertical left border
          if (isExpanded)
            Container(
              margin: const EdgeInsets.only(left: 10, top: 4, bottom: 6),
              padding: const EdgeInsets.only(left: 10, top: 2, bottom: 2),
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(
                    color: _cBorder.withValues(alpha: 0.65),
                    width: 1.5,
                  ),
                ),
              ),
              child: showLiveSpinner
                  ? AnimatedTypewriterText(
                      text: cleanText.isNotEmpty ? cleanText : "Analyzing context & synthesizing plan…",
                      isLive: true,
                      builder: (animatedText) => _renderThinkingMarkdown(animatedText, isLive: true),
                    )
                  : _renderThinkingMarkdown(
                      cleanText.isNotEmpty ? cleanText : "Thinking process completed.",
                      isLive: false,
                    ),
            ),
        ],
      ),
    );
  }

  /// AvA Animated Mascot Emoji/Blob Icon Loader
  Widget _buildPixelDotsLoader() {
    return const AiMascotAvatar(
      size: 14,
      awake: true,
      gaze: MascotGaze.right,
    );
  }

  /// Shimmering text for live thinking indicator
  Widget _buildShimmerText(String text) {
    return ShimmerGradientText(
      text: text,
      style: const TextStyle(
        fontSize: 12,
        fontFamily: "Inter",
        fontWeight: FontWeight.w600,
      ),
      colors: [
        _cSecondary.withValues(alpha: 0.6),
        _cPrimary,
        _cSecondary.withValues(alpha: 0.9),
        _cSecondary.withValues(alpha: 0.6),
      ],
    );
  }

  Widget _renderThinkingMarkdown(String text, {bool isLive = false}) {
    final clean = text.trim();
    if (clean.isEmpty) {
      if (isLive) {
        return FadeTransition(
          opacity: _cursorOpacity,
          child: Container(
            margin: const EdgeInsets.only(top: 2),
            width: 7,
            height: 14,
            decoration: BoxDecoration(
              color: _cAccentPurple,
              borderRadius: BorderRadius.circular(1.5),
            ),
          ),
        );
      }
      return const SizedBox.shrink();
    }

    final String markdownData = isLive ? '$clean ▋' : clean;
    return MarkdownBody(
      data: markdownData,
      selectable: true,
      extensionSet: kMathExtensionSet,
      builders: {
        "latex-inline": LatexInlineElementBuilder(
          isDark: widget.isDark,
        ),
        "latex-block": LatexBlockElementBuilder(
          isDark: widget.isDark,
          cardBg: _cCardBg,
          borderColor: _cBorder,
        ),
        "pre": CopyableCodeBlockBuilder(
          context: context,
          borderColor: _cBorder,
          codeBg: _cCodeBg,
          accentColor: _cAccentPurple,
          baseUrl: widget.baseUrl,
          isDark: widget.isDark,
          textPrimary: _cPrimary,
          textSecondary: _cSecondary,
          onOpenFile: widget.onOpenFile,
        ),
        "img": InlineImageBuilder(
          context: context,
          baseUrl: widget.baseUrl,
          isDark: widget.isDark,
          cardBg: _cCardBg,
          borderColor: _cBorder,
          textPrimary: _cPrimary,
          textSecondary: _cSecondary,
          onOpenFile: widget.onOpenFile,
        ),
      },
      onTapLink: (text, href, title) async {
        if (href != null && href.isNotEmpty) {
          final uri = Uri.tryParse(href.trim());
          if (uri != null && await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        }
      },
      styleSheet: MarkdownStyleSheet(
        p: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.5,
          fontStyle: FontStyle.italic,
          height: 1.55,
          color: _cSecondary,
        ),
        pPadding: const EdgeInsets.only(bottom: 6),
        h1: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 14.5,
          fontWeight: FontWeight.w700,
          color: _cPrimary,
        ),
        h1Padding: const EdgeInsets.only(top: 8, bottom: 4),
        h2: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: _cPrimary,
        ),
        h2Padding: const EdgeInsets.only(top: 6, bottom: 4),
        h3: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 13.0,
          fontWeight: FontWeight.w600,
          color: _cPrimary,
        ),
        h3Padding: const EdgeInsets.only(top: 4, bottom: 2),
        strong: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontWeight: FontWeight.w700,
          color: _cPrimary,
        ),
        em: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontStyle: FontStyle.italic,
          color: _cSecondary,
        ),
        code: TextStyle(
          fontFamily: "JetBrainsMono",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: _cInlineCodeText,
          backgroundColor: _cInlineCodeBg,
        ),
        blockquote: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.0,
          fontStyle: FontStyle.italic,
          height: 1.45,
          color: _cSecondary,
        ),
        blockquoteDecoration: BoxDecoration(
          color: _cInset,
          borderRadius: BorderRadius.circular(4),
          border: Border(left: BorderSide(color: _cAccentPurple.withValues(alpha: 0.5), width: 2.5)),
        ),
        blockquotePadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        listIndent: 18.0,
        listBulletPadding: const EdgeInsets.only(right: 5),
        listBullet: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.5,
          color: _cAccentPurple,
          fontWeight: FontWeight.bold,
        ),
        horizontalRuleDecoration: BoxDecoration(
          border: Border(top: BorderSide(color: _cBorder.withValues(alpha: 0.4), width: 0.8)),
        ),
        a: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.5,
          color: _cAccentPurple,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }
}
