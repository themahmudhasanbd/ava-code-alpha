part of '../formatted_message_view.dart';

// ─── Markdown Renderer ─────────────────────────────────────────────────────────

// ignore_for_file: library_private_types_in_public_api, invalid_use_of_protected_member
extension FmvMarkdownExt on _FormattedMessageViewState {
  Widget _buildMarkdown(String text, {required bool isUser, bool isLive = false, bool isHistory = false}) {
    String clean = text.trim();
    if (clean.isEmpty) {
      if (isLive) {
        return FadeTransition(
          opacity: _cursorOpacity,
          child: Container(
            width: 8,
            height: 16,
            decoration: BoxDecoration(
              color: _cAccentPurple,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }
      return const SizedBox.shrink();
    }

    // Suppress raw internal engine callback tags from rendering as plain markdown
    if (!isUser) {
      if (clean.startsWith('<tool_result') ||
          clean.startsWith('<command_result') ||
          clean.startsWith('<task_result') ||
          clean.startsWith('<task_progress') ||
          clean.startsWith('<timer_notification') ||
          clean.startsWith('<task_status') ||
          clean.startsWith('<synthetic_prompt') ||
          (clean.startsWith('<task') && clean.contains('state='))) {
        return const SizedBox.shrink();
      }

      // Strip internal XML blocks and tool completion boilerplate from mixed text
      clean = clean.replaceAll(RegExp(r'<tool_result\b[\s\S]*?<\/tool_result>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<command_result\b[\s\S]*?<\/command_result>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<task_result\b[\s\S]*?<\/task_result>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<task_progress\b[\s\S]*?<\/task_progress>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<timer_notification\b[\s\S]*?<\/timer_notification>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<task_status\b[\s\S]*?<\/task_status>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<synthetic_prompt\b[\s\S]*?<\/synthetic_prompt>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'<(?:tool_result|command_result|task_result|task_progress|timer_notification|task_status|synthetic_prompt)\b[^>]*>', caseSensitive: false), '');
      clean = clean.replaceAll(RegExp(r'Background tool "[^"]*?" \(Task ID: [^\)]*?\) has completed with status "[^"]*?"\.\s*Log File: [^\n]*\s*Please review the result and provide the final completion summary to the user in their language\.', caseSensitive: false), '');
      clean = clean.trim();

      if (clean.isEmpty) {
        return const SizedBox.shrink();
      }
    }

    if (!isUser && clean.startsWith('{') && clean.endsWith('}')) {
      try {
        final decoded = jsonDecode(clean);
        if (decoded is Map && (decoded.containsKey('questions') || decoded.containsKey('question'))) {
          return const SizedBox.shrink();
        }
      } catch (err) {
        // Ignore non-JSON or malformed strings and continue normal markdown rendering
      }
    }

    if (isUser) {
      return _renderMarkdownBody(clean, isUser: true, isLive: false);
    }

    // Finished response: smooth fade-in, no typewriter delay
    if (!isLive) {
      return TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0.85, end: 1.0),
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        builder: (context, val, child) => Opacity(opacity: val, child: child),
        child: _renderMarkdownBody(clean, isUser: false, isLive: false),
      );
    }

    return AnimatedTypewriterText(
      text: clean,
      isLive: true,
      isHistory: isHistory,
      builder: (animatedText) => _renderMarkdownBody(animatedText, isUser: false, isLive: true),
    );
  }

  Widget _renderMarkdownBody(String text, {required bool isUser, bool isLive = false}) {
    if (_cachedMarkdownBuilt &&
        _cachedMarkdownText == text &&
        _cachedMarkdownIsLive == isLive &&
        _cachedMarkdownWidget != null) {
      return _cachedMarkdownWidget!;
    }

    final String markdownData = isLive ? '$text ▋' : text;
    _cachedMarkdownText = text;
    _cachedMarkdownIsLive = isLive;
    _cachedMarkdownBuilt = true;
    _cachedMarkdownWidget = MarkdownBody(
      data: markdownData,
      selectable: true,
      builders: {
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
        "table": ScrollableTableBuilder(
          context: context,
          borderColor: _cBorder,
          tableBg: _cCodeBg,
          headerBg: const Color(0xFF141926),
          headStyle: TextStyle(
            fontFamily: "HindSiliguri",
            fontFamilyFallback: kFmvFontFamilyFallback,
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: _cPrimary,
          ),
          bodyStyle: TextStyle(
            fontFamily: "HindSiliguri",
            fontFamilyFallback: kFmvFontFamilyFallback,
            fontSize: 12.5,
            height: 1.45,
            color: _cPrimary,
          ),
        ),
      },
      onTapLink: (text, href, title) async {
        if (href != null && href.isNotEmpty) {
          final cleanHref = href.trim();
          final bool isFilePath = cleanHref.startsWith("file://") ||
              cleanHref.startsWith("/var/www/") ||
              cleanHref.startsWith("/root/") ||
              cleanHref.startsWith("./") ||
              cleanHref.startsWith("../") ||
              cleanHref.contains("/api/workspace/raw") ||
              cleanHref.endsWith(".pdf") ||
              cleanHref.endsWith(".zip") ||
              cleanHref.endsWith(".dart") ||
              cleanHref.endsWith(".ts") ||
              cleanHref.endsWith(".js") ||
              cleanHref.endsWith(".py") ||
              cleanHref.endsWith(".json") ||
              cleanHref.endsWith(".html") ||
              cleanHref.endsWith(".tar.gz");

          if (isFilePath) {
            String path = cleanHref;
            if (path.startsWith("file://")) {
              path = path.replaceFirst("file://", "");
            }
            if (path.contains("?path=")) {
              final uri = Uri.tryParse(path);
              final queryPath = uri?.queryParameters["path"];
              if (queryPath != null && queryPath.isNotEmpty) {
                path = queryPath;
              }
            }
            if (widget.onOpenFile != null && !path.endsWith(".zip") && !path.endsWith(".tar.gz")) {
              widget.onOpenFile!(path);
              return;
            }
            final fileName = path.split("/").last;
            final downloadUrl = path.startsWith("http")
                ? path
                : (widget.baseUrl != null
                    ? "${widget.baseUrl}/api/workspace/raw?path=${Uri.encodeComponent(path)}&download=true"
                    : path);
            await FileDownloader.downloadFromUrl(
              url: downloadUrl,
              fileName: fileName.isNotEmpty ? fileName : "download",
            );
            return;
          }

          final uri = Uri.tryParse(cleanHref);
          if (uri != null && await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        }
      },
      styleSheet: MarkdownStyleSheet(
        p: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: isUser ? 14.5 : 14.0,
          height: 1.65,
          color: _cPrimary,
        ),
        pPadding: const EdgeInsets.only(bottom: 8),
        h1: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 18.5,
          fontWeight: FontWeight.w800,
          height: 1.35,
          color: _cPrimary,
          letterSpacing: -0.3,
        ),
        h1Padding: const EdgeInsets.only(top: 14, bottom: 6),
        h2: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 16.5,
          fontWeight: FontWeight.w700,
          height: 1.35,
          color: _cPrimary,
          letterSpacing: -0.2,
        ),
        h2Padding: const EdgeInsets.only(top: 12, bottom: 5),
        h3: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 15,
          fontWeight: FontWeight.w600,
          height: 1.35,
          color: _cPrimary,
        ),
        h3Padding: const EdgeInsets.only(top: 10, bottom: 4),
        h4: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          height: 1.35,
          color: _cPrimary,
        ),
        h4Padding: const EdgeInsets.only(top: 8, bottom: 4),
        strong: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontWeight: FontWeight.w800,
          color: _cPrimary,
        ),
        em: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontStyle: FontStyle.italic,
          color: _cPrimary,
        ),
        code: TextStyle(
          fontFamily: "JetBrainsMono",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.0,
          fontWeight: FontWeight.w600,
          color: _cInlineCodeText,
          backgroundColor: _cInlineCodeBg,
        ),
        blockquote: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 13,
          fontStyle: FontStyle.italic,
          height: 1.55,
          color: _cSecondary,
        ),
        blockquoteDecoration: BoxDecoration(
          color: _cInset,
          borderRadius: BorderRadius.circular(6),
          border: Border(left: BorderSide(color: _cAccentPurple, width: 3.5)),
        ),
        blockquotePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        tableHead: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          color: _cPrimary,
        ),
        tableBody: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 12.5,
          height: 1.45,
          color: _cPrimary,
        ),
        tableBorder: TableBorder.all(
          color: _cBorder,
          width: 0.8,
          borderRadius: BorderRadius.circular(8),
        ),
        tableCellsPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        tableHeadAlign: TextAlign.left,
        listIndent: 22.0,
        listBulletPadding: const EdgeInsets.only(right: 6),
        listBullet: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 14,
          color: _cAccentPurple,
          fontWeight: FontWeight.bold,
        ),
        horizontalRuleDecoration: BoxDecoration(
          border: Border(top: BorderSide(color: _cBorder.withValues(alpha: 0.6), width: 1.0)),
        ),
        a: TextStyle(
          fontFamily: "HindSiliguri",
          fontFamilyFallback: kFmvFontFamilyFallback,
          fontSize: 14,
          color: _cAccentPurple,
          decoration: TextDecoration.underline,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
    _cachedMarkdownBuilt = true;
    return _cachedMarkdownWidget!;
  }
}
