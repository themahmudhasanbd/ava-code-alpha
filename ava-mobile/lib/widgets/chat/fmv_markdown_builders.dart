part of '../formatted_message_view.dart';

// ─── Markdown Element Builders ─────────────────────────────────────────────────
// CopyableCodeBlockBuilder: renders fenced code blocks or carousels with a 1-tap copy bar.
// InlineImageBuilder: renders inline markdown images with tap-to-zoom and lightbox.
// ScrollableTableBuilder: renders markdown tables inside a horizontal scroll view.

/// Renders fenced code blocks with a sleek language label and 1-tap copy button.
/// Automatically intercepts `carousel` and `gallery` code blocks to render interactive image carousels.
class CopyableCodeBlockBuilder extends MarkdownElementBuilder {
  final BuildContext context;
  final Color borderColor;
  final Color codeBg;
  final Color accentColor;
  final String? baseUrl;
  final bool isDark;
  final Color textPrimary;
  final Color textSecondary;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;

  CopyableCodeBlockBuilder({
    required this.context,
    required this.borderColor,
    required this.codeBg,
    required this.accentColor,
    this.baseUrl,
    this.isDark = true,
    this.textPrimary = const Color(0xFFFAFAFA),
    this.textSecondary = const Color(0xFFA1A1AA),
    this.onOpenFile,
  });

  @override
  bool isBlockElement() => true;

  @override
  Widget? visitText(md.Text text, TextStyle? preferredStyle) => const SizedBox.shrink();

  @override
  Widget? visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    // Extract language or default to COPYABLE TEXT
    String language = "";
    if (element.children != null) {
      for (final child in element.children!) {
        if (child is md.Element && child.tag == "code") {
          language = child.attributes["class"]?.replaceFirst("language-", "") ?? "";
          if (language.isNotEmpty) break;
        }
      }
    }
    if (language.isEmpty) {
      language = element.attributes["class"]?.replaceFirst("language-", "") ?? "";
    }
    final rawText = element.textContent.trimRight();

    // ── Special Handler: Multi-Image Carousel / Gallery Code Blocks ─────────────
    final langLower = language.toLowerCase();
    if (langLower == "carousel" || langLower == "gallery") {
      final imageRegex = RegExp(r'!\[(.*?)\]\((.*?)\)');
      final matches = imageRegex.allMatches(rawText);
      final List<MessageImageData> extractedImages = [];

      for (final m in matches) {
        final alt = m.group(1)?.trim();
        final src = m.group(2)?.trim();
        if (src != null && src.isNotEmpty) {
          extractedImages.add(MessageImageData(urlOrPath: src, alt: alt));
        }
      }

      // If no standard markdown ![alt](src) found, parse line by line
      if (extractedImages.isEmpty) {
        final lines = rawText.split("\n");
        for (final line in lines) {
          final trimmed = line.trim();
          if (trimmed.isEmpty || trimmed.startsWith("<!--") || trimmed.startsWith("#")) continue;
          if (trimmed.startsWith("http://") ||
              trimmed.startsWith("https://") ||
              trimmed.startsWith("/") ||
              trimmed.startsWith("data:image/") ||
              trimmed.startsWith("file://") ||
              trimmed.endsWith(".png") ||
              trimmed.endsWith(".jpg") ||
              trimmed.endsWith(".jpeg") ||
              trimmed.endsWith(".webp") ||
              trimmed.endsWith(".gif") ||
              trimmed.endsWith(".svg")) {
            extractedImages.add(MessageImageData(urlOrPath: trimmed));
          }
        }
      }

      if (extractedImages.isNotEmpty) {
        return MessageImageGallery(
          images: extractedImages,
          baseUrl: baseUrl,
          isDark: isDark,
          cardBg: codeBg,
          borderColor: borderColor,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
          onOpenFile: onOpenFile,
        );
      }
    }

    // ── Special Handler: Mermaid & Visual Diagrams ─────────────────────────────
    if (isMermaidDiagram(language, rawText)) {
      return LayoutBuilder(
        builder: (context, constraints) {
          final double parentWidth = constraints.maxWidth.isFinite
              ? constraints.maxWidth
              : (MediaQuery.of(context).size.width - 32);

          return MermaidDiagramWidget(
            rawCode: rawText,
            codeBg: codeBg,
            borderColor: borderColor,
            accentColor: accentColor,
            parentWidth: parentWidth,
            isDark: isDark,
          );
        },
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final double parentWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : (MediaQuery.of(context).size.width - 32);

        return _CodeBlockContainer(
          rawText: rawText,
          language: language,
          codeBg: codeBg,
          borderColor: borderColor,
          accentColor: accentColor,
          parentWidth: parentWidth,
        );
      },
    );
  }
}

/// Stateful container for code blocks supporting Word Wrap toggle, Diff rendering, Line Count, Fullscreen view, and 1-tap copy.
class _CodeBlockContainer extends StatefulWidget {
  final String rawText;
  final String language;
  final Color codeBg;
  final Color borderColor;
  final Color accentColor;
  final double parentWidth;

  const _CodeBlockContainer({
    required this.rawText,
    required this.language,
    required this.codeBg,
    required this.borderColor,
    required this.accentColor,
    required this.parentWidth,
  });

  @override
  State<_CodeBlockContainer> createState() => _CodeBlockContainerState();
}

class _CodeBlockContainerState extends State<_CodeBlockContainer> {
  bool _isWordWrap = false;

  void _openFullscreenCodeModal(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => Scaffold(
          backgroundColor: const Color(0xFF0B0F19),
          appBar: AppBar(
            backgroundColor: const Color(0xFF141926),
            title: Text(
              widget.language.isNotEmpty ? widget.language.toUpperCase() : "CODE",
              style: const TextStyle(fontSize: 14, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700),
            ),
            actions: [
              IconButton(
                icon: const Icon(LucideIcons.copy, size: 18),
                tooltip: "Copy Code",
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: widget.rawText));
                  AppToast.copied(ctx, "Code copied to clipboard");
                },
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: _buildCodeContentWidget(isModal: true),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCodeContentWidget({bool isModal = false}) {
    final cleanLang = widget.language.trim().toLowerCase();
    final isDiff = cleanLang == "diff" || cleanLang == "patch";

    if (isDiff) {
      final lines = widget.rawText.split("\n");
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: lines.map((line) {
          Color lineTextColor = const Color(0xFFF1F5F9);
          Color? lineBgColor;
          FontWeight fontWeight = FontWeight.normal;

          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineTextColor = const Color(0xFF86EFAC);
            lineBgColor = const Color(0xFF10B981).withValues(alpha: 0.15);
            fontWeight = FontWeight.w600;
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineTextColor = const Color(0xFFFCA5A5);
            lineBgColor = const Color(0xFFEF4444).withValues(alpha: 0.15);
            fontWeight = FontWeight.w600;
          } else if (line.startsWith("@@")) {
            lineTextColor = const Color(0xFFA5B4FC);
            lineBgColor = const Color(0xFF6366F1).withValues(alpha: 0.12);
            fontWeight = FontWeight.w700;
          }

          return Container(
            color: lineBgColor,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            child: Text(
              line,
              softWrap: false,
              style: TextStyle(
                fontSize: 12.0,
                fontFamily: "JetBrainsMono",
                fontFamilyFallback: kFmvFontFamilyFallback,
                color: lineTextColor,
                fontWeight: fontWeight,
                height: 1.5,
              ),
            ),
          );
        }).toList(),
      );
    }

    return Text(
      widget.rawText,
      softWrap: false,
      style: TextStyle(
        fontSize: 12.0,
        fontFamily: "JetBrainsMono",
        fontFamilyFallback: kFmvFontFamilyFallback,
        color: const Color(0xFFF1F5F9),
        height: 1.55,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cleanLang = widget.language.trim().toUpperCase();
    final showLangLabel = cleanLang.isNotEmpty &&
        cleanLang != "TEXT" &&
        cleanLang != "TXT" &&
        cleanLang != "PLAINTEXT";

    final lineCount = widget.rawText.split("\n").length;

    return Container(
      width: widget.parentWidth,
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: widget.codeBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: widget.borderColor.withValues(alpha: 0.5), width: 0.8),
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar with Language, Line Count, Word Wrap Toggle, Fullscreen, and Copy Button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF141926),
              border: Border(bottom: BorderSide(color: widget.borderColor.withValues(alpha: 0.3), width: 0.6)),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.fileCode, size: 12, color: widget.accentColor),
                const SizedBox(width: 6),
                Text(
                  showLangLabel ? cleanLang : "CODE",
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontFamily: "JetBrainsMono",
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF94A3B8),
                    letterSpacing: 0.5,
                  ),
                ),
                if (lineCount > 1) ...[
                  const SizedBox(width: 6),
                  Text(
                    "($lineCount lines)",
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontFamily: "JetBrainsMono",
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
                const Spacer(),

                // Fullscreen Button (for code longer than 8 lines)
                if (lineCount > 8)
                  InkWell(
                    onTap: () => _openFullscreenCodeModal(context),
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.6),
                      ),
                      child: const Icon(LucideIcons.maximize2, size: 11, color: Color(0xFF94A3B8)),
                    ),
                  ),

                // 1-Tap Word Wrap Toggle Button
                InkWell(
                  onTap: () {
                    setState(() {
                      _isWordWrap = !_isWordWrap;
                    });
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    margin: const EdgeInsets.only(right: 6),
                    decoration: BoxDecoration(
                      color: _isWordWrap
                          ? widget.accentColor.withValues(alpha: 0.22)
                          : Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: _isWordWrap
                            ? widget.accentColor.withValues(alpha: 0.5)
                            : Colors.white.withValues(alpha: 0.15),
                        width: 0.6,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          LucideIcons.wrapText,
                          size: 11,
                          color: _isWordWrap ? widget.accentColor : const Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isWordWrap ? "Wrap" : "Unwrap",
                          style: TextStyle(
                            fontSize: 10.5,
                            fontFamily: "Inter",
                            fontWeight: FontWeight.w600,
                            color: _isWordWrap ? widget.accentColor : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // 1-Tap Copy Button
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: widget.rawText));
                    AppToast.copied(context, "Code copied to clipboard");
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: widget.accentColor.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: widget.accentColor.withValues(alpha: 0.4), width: 0.6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.copy, size: 11, color: widget.accentColor),
                        const SizedBox(width: 4),
                        Text(
                          "Copy",
                          style: TextStyle(
                            fontSize: 10.5,
                            fontFamily: "Inter",
                            fontWeight: FontWeight.w700,
                            color: widget.accentColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Code Content Body (Wrapped or Horizontal Scrollable)
          if (_isWordWrap)
            Padding(
              padding: const EdgeInsets.all(12),
              child: _buildCodeContentWidget(),
            )
          else
            SizedBox(
              width: widget.parentWidth,
              child: ScrollConfiguration(
                behavior: ScrollConfiguration.of(context).copyWith(
                  dragDevices: {
                    PointerDeviceKind.touch,
                    PointerDeviceKind.mouse,
                    PointerDeviceKind.trackpad,
                    PointerDeviceKind.stylus,
                  },
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(12),
                  child: _buildCodeContentWidget(),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Renders standard markdown images `![alt](src)` with rich in-message preview and tap-to-zoom lightbox.
class InlineImageBuilder extends MarkdownElementBuilder {
  final BuildContext context;
  final String? baseUrl;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;

  InlineImageBuilder({
    required this.context,
    this.baseUrl,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onOpenFile,
  });

  @override
  bool isBlockElement() => false;

  @override
  Widget? visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    final src = element.attributes['src'] ?? '';
    final alt = element.attributes['alt'];
    if (src.trim().isEmpty) return const SizedBox.shrink();

    return MessageImageGallery(
      images: [
        MessageImageData(
          urlOrPath: src.trim(),
          alt: alt != null && alt.trim().isNotEmpty ? alt.trim() : null,
        ),
      ],
      baseUrl: baseUrl,
      isDark: isDark,
      cardBg: cardBg,
      borderColor: borderColor,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      onOpenFile: onOpenFile,
    );
  }
}

/// Renders markdown tables in a horizontal scroll view with drag support.
class ScrollableTableBuilder extends MarkdownElementBuilder {
  final BuildContext context;
  final Color borderColor;
  final Color tableBg;
  final Color headerBg;
  final TextStyle headStyle;
  final TextStyle bodyStyle;

  ScrollableTableBuilder({
    required this.context,
    required this.borderColor,
    required this.tableBg,
    required this.headerBg,
    required this.headStyle,
    required this.bodyStyle,
  });

  @override
  bool isBlockElement() => true;

  @override
  Widget? visitText(md.Text text, TextStyle? preferredStyle) => const SizedBox.shrink();

  @override
  Widget? visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    final List<List<Widget>> rawRows = [];
    final List<bool> rowIsHeader = [];
    int maxCols = 0;

    void parseRows(List<md.Node>? nodes, bool isHeader) {
      if (nodes == null) return;
      for (final node in nodes) {
        if (node is md.Element) {
          if (node.tag == 'tr') {
            final List<Widget> cells = [];
            if (node.children != null) {
              for (final cellNode in node.children!) {
                if (cellNode is md.Element && (cellNode.tag == 'th' || cellNode.tag == 'td')) {
                  final text = cellNode.textContent.trim();
                  cells.add(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      color: isHeader ? headerBg : null,
                      child: Text(text, style: isHeader ? headStyle : bodyStyle),
                    ),
                  );
                }
              }
            }
            if (cells.isNotEmpty) {
              if (cells.length > maxCols) maxCols = cells.length;
              rawRows.add(cells);
              rowIsHeader.add(isHeader);
            }
          } else if (node.tag == 'thead') {
            parseRows(node.children, true);
          } else if (node.tag == 'tbody') {
            parseRows(node.children, false);
          }
        }
      }
    }

    parseRows(element.children, false);
    if (rawRows.isEmpty || maxCols == 0) return const SizedBox.shrink();

    final List<TableRow> tableRows = [];
    for (int i = 0; i < rawRows.length; i++) {
      final cells = rawRows[i];
      final isHeader = rowIsHeader[i];
      while (cells.length < maxCols) {
        cells.add(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: isHeader ? headerBg : null,
            child: Text('', style: isHeader ? headStyle : bodyStyle),
          ),
        );
      }
      tableRows.add(TableRow(children: cells));
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final double parentWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : (MediaQuery.of(context).size.width - 32);

        return Container(
          width: parentWidth,
          margin: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: tableBg,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor.withValues(alpha: 0.5), width: 0.8),
          ),
          clipBehavior: Clip.hardEdge,
          child: SizedBox(
            width: parentWidth,
            child: ScrollConfiguration(
              behavior: ScrollConfiguration.of(context).copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                  PointerDeviceKind.trackpad,
                  PointerDeviceKind.stylus,
                },
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Table(
                  defaultColumnWidth: const IntrinsicColumnWidth(),
                  border: TableBorder.all(color: borderColor.withValues(alpha: 0.3), width: 0.6),
                  children: tableRows,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}


// ─── Mathematical Expression (LaTeX / TeX) Syntaxes & Builders ───────────────

class MathInlineSyntax extends md.InlineSyntax {
  MathInlineSyntax() : super(r"(?<!\\)\$(?!\$)(.+?)(?<!\\)\$|(?<!\\)\\\((.+?)(?<!\\)\\\)");

  @override
  bool onMatch(md.InlineParser parser, Match match) {
    final raw = match[1] ?? match[2] ?? "";
    if (raw.trim().isEmpty) return false;
    final element = md.Element.text("latex-inline", raw.trim());
    parser.addNode(element);
    return true;
  }
}

class MathBlockSyntax extends md.BlockSyntax {
  @override
  RegExp get pattern => RegExp(r"^(?:\$\$|\\\[)");

  const MathBlockSyntax();

  @override
  bool canParse(md.BlockParser parser) {
    final line = parser.current.content.trim();
    return line.startsWith(r"$$") || line.startsWith(r"\[");
  }

  @override
  md.Node parse(md.BlockParser parser) {
    final firstLine = parser.current.content.trim();

    // Single line block: $$...$$ or \[...\]
    if (firstLine.startsWith(r"$$") && firstLine.endsWith(r"$$") && firstLine.length > 4) {
      final content = firstLine.substring(2, firstLine.length - 2).trim();
      parser.advance();
      return md.Element.text("latex-block", content);
    }

    if (firstLine.startsWith(r"\[") && firstLine.endsWith(r"\]") && firstLine.length > 4) {
      final content = firstLine.substring(2, firstLine.length - 2).trim();
      parser.advance();
      return md.Element.text("latex-block", content);
    }

    final lines = <String>[];
    if (firstLine.length > 2 && (firstLine.startsWith(r"$$") || firstLine.startsWith(r"\["))) {
      final startContent = firstLine.substring(2).trim();
      if (startContent.isNotEmpty) lines.add(startContent);
    }

    parser.advance();
    while (!parser.isDone) {
      final line = parser.current.content;
      final trimmed = line.trim();
      if (trimmed.endsWith(r"$$") || trimmed.endsWith(r"\]")) {
        final endContent = trimmed.substring(0, trimmed.length - 2).trim();
        if (endContent.isNotEmpty) lines.add(endContent);
        parser.advance();
        break;
      }
      lines.add(line);
      parser.advance();
    }
    return md.Element.text("latex-block", lines.join("\n"));
  }
}

final md.ExtensionSet kMathExtensionSet = md.ExtensionSet(
  [const MathBlockSyntax(), ...md.ExtensionSet.gitHubFlavored.blockSyntaxes],
  [MathInlineSyntax(), ...md.ExtensionSet.gitHubFlavored.inlineSyntaxes],
);

class LatexInlineElementBuilder extends MarkdownElementBuilder {
  final TextStyle? defaultStyle;
  final bool isDark;

  LatexInlineElementBuilder({this.defaultStyle, this.isDark = true});

  @override
  Widget? visitText(md.Text text, TextStyle? preferredStyle) => const SizedBox.shrink();

  @override
  Widget? visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    final text = element.textContent.trim();
    if (text.isEmpty) return const SizedBox.shrink();

    final effectiveStyle = (preferredStyle ?? defaultStyle)?.copyWith(
      color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
    );

    return Math.tex(
      text,
      textStyle: effectiveStyle,
      mathStyle: MathStyle.text,
      onErrorFallback: (err) => Text(
        "\$$text\$",
        style: (preferredStyle ?? defaultStyle)?.copyWith(
          fontFamily: "JetBrainsMono",
          fontSize: 12.0,
          fontWeight: FontWeight.w600,
          color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF4F46E5),
        ),
      ),
    );
  }
}

class LatexBlockElementBuilder extends MarkdownElementBuilder {
  final TextStyle? defaultStyle;
  final bool isDark;
  final Color? cardBg;
  final Color? borderColor;

  LatexBlockElementBuilder({
    this.defaultStyle,
    this.isDark = true,
    this.cardBg,
    this.borderColor,
  });

  @override
  bool isBlockElement() => true;

  @override
  Widget? visitText(md.Text text, TextStyle? preferredStyle) => const SizedBox.shrink();

  @override
  Widget? visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    final text = element.textContent.trim();
    if (text.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Center(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: cardBg ?? (isDark ? const Color(0xFF11141E) : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: borderColor ?? (isDark ? const Color(0xFF272F45) : const Color(0xFFE2E8F0)),
                width: 0.8,
              ),
            ),
            child: Math.tex(
              text,
              textStyle: (preferredStyle ?? defaultStyle)?.copyWith(
                fontSize: 15.0,
                color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
              ),
              mathStyle: MathStyle.display,
              onErrorFallback: (err) => SelectableText(
                "\$\$\n$text\n\$\$",
                style: (preferredStyle ?? defaultStyle)?.copyWith(
                  fontFamily: "JetBrainsMono",
                  fontSize: 12,
                  color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF4F46E5),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
