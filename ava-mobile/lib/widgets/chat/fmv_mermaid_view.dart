part of '../formatted_message_view.dart';

// ─── Mermaid Diagram Visualizer & Parser ───────────────────────────────────────
// Supports Flowcharts, Sequence Diagrams, Class Diagrams, State Diagrams,
// ER Diagrams, Pie Charts, Git Graphs, Timelines, Mindmaps, and Fallback Graphs.

/// Checks if a code block language or raw code content represents a Mermaid diagram.
bool isMermaidDiagram(String language, String rawText) {
  final lang = language.trim().toLowerCase();
  if (lang == 'mermaid' ||
      lang == 'flowchart' ||
      lang == 'sequencediagram' ||
      lang == 'classdiagram' ||
      lang == 'statediagram' ||
      lang == 'erdiagram' ||
      lang == 'gitgraph' ||
      lang == 'pie' ||
      lang == 'gantt' ||
      lang == 'journey' ||
      lang == 'mindmap' ||
      lang == 'timeline') {
    return true;
  }

  // Detect common mermaid opening statements even if language tag is plain / omitted
  final firstLine = rawText.trim().split('\n').first.trim().toLowerCase();
  return firstLine.startsWith('graph ') ||
      firstLine.startsWith('graph\n') ||
      firstLine.startsWith('flowchart ') ||
      firstLine.startsWith('flowchart\n') ||
      firstLine.startsWith('sequencediagram') ||
      firstLine.startsWith('classdiagram') ||
      firstLine.startsWith('statediagram') ||
      firstLine.startsWith('erdiagram') ||
      firstLine.startsWith('gitgraph') ||
      firstLine.startsWith('pie ') ||
      firstLine.startsWith('pie\n') ||
      firstLine.startsWith('gantt') ||
      firstLine.startsWith('journey') ||
      firstLine.startsWith('mindmap') ||
      firstLine.startsWith('timeline') ||
      firstLine.startsWith('c4context');
}

/// Rich interactive widget for rendering Mermaid diagrams with Pan/Zoom,
/// Visual Diagram View, Raw Code toggle, Copy button, and Fullscreen viewer.
class MermaidDiagramWidget extends StatefulWidget {
  final String rawCode;
  final Color codeBg;
  final Color borderColor;
  final Color accentColor;
  final double parentWidth;
  final bool isDark;

  const MermaidDiagramWidget({
    super.key,
    required this.rawCode,
    required this.codeBg,
    required this.borderColor,
    required this.accentColor,
    required this.parentWidth,
    this.isDark = true,
  });

  @override
  State<MermaidDiagramWidget> createState() => _MermaidDiagramWidgetState();
}

class _MermaidDiagramWidgetState extends State<MermaidDiagramWidget> {
  bool _showRawCode = false;
  late _MermaidParsedData _parsedData;
  final TransformationController _transformController = TransformationController();

  @override
  void initState() {
    super.initState();
    _parsedData = _parseMermaid(widget.rawCode);
  }

  @override
  void didUpdateWidget(covariant MermaidDiagramWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.rawCode != widget.rawCode) {
      _parsedData = _parseMermaid(widget.rawCode);
      _transformController.value = Matrix4.identity();
    }
  }

  @override
  void dispose() {
    _transformController.dispose();
    super.dispose();
  }

  void _openFullscreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => _MermaidFullscreenModal(
          rawCode: widget.rawCode,
          parsedData: _parsedData,
          accentColor: widget.accentColor,
          borderColor: widget.borderColor,
          codeBg: widget.codeBg,
          isDark: widget.isDark,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cleanType = _parsedData.diagramType.toUpperCase();

    return Container(
      width: widget.parentWidth,
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: widget.codeBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: widget.borderColor.withValues(alpha: 0.6), width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: widget.isDark ? 0.3 : 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFF141926),
              border: Border(
                bottom: BorderSide(color: widget.borderColor.withValues(alpha: 0.35), width: 0.6),
              ),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.gitFork, size: 12, color: widget.accentColor),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    cleanType.isNotEmpty ? "MERMAID • $cleanType" : "MERMAID",
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10.0,
                      fontFamily: "JetBrainsMono",
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ),
                const SizedBox(width: 4),

                // Toggle Diagram / Code View
                InkWell(
                  onTap: () {
                    setState(() {
                      _showRawCode = !_showRawCode;
                    });
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                    margin: const EdgeInsets.only(right: 4),
                    decoration: BoxDecoration(
                      color: _showRawCode
                          ? widget.accentColor.withValues(alpha: 0.22)
                          : Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: _showRawCode
                            ? widget.accentColor.withValues(alpha: 0.5)
                            : Colors.white.withValues(alpha: 0.15),
                        width: 0.6,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _showRawCode ? LucideIcons.eye : LucideIcons.code,
                          size: 10.5,
                          color: _showRawCode ? widget.accentColor : const Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          _showRawCode ? "Diagram" : "Code",
                          style: TextStyle(
                            fontSize: 10,
                            fontFamily: "Inter",
                            fontWeight: FontWeight.w600,
                            color: _showRawCode ? widget.accentColor : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Fullscreen Button
                InkWell(
                  onTap: () => _openFullscreen(context),
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.all(3.5),
                    margin: const EdgeInsets.only(right: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.6),
                    ),
                    child: const Icon(LucideIcons.maximize2, size: 10.5, color: Color(0xFF94A3B8)),
                  ),
                ),

                // Copy Button
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: widget.rawCode.trim()));
                    AppToast.copied(context, "Mermaid code copied to clipboard");
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: widget.accentColor.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: widget.accentColor.withValues(alpha: 0.4), width: 0.6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.copy, size: 10.5, color: widget.accentColor),
                        const SizedBox(width: 3),
                        Text(
                          "Copy",
                          style: TextStyle(
                            fontSize: 10,
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

          // Content: Diagram Visualizer OR Raw Code
          if (_showRawCode)
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
                  child: Text(
                    widget.rawCode.trim(),
                    softWrap: false,
                    style: const TextStyle(
                      fontSize: 12.0,
                      fontFamily: "JetBrainsMono",
                      color: Color(0xFFF1F5F9),
                      height: 1.55,
                    ),
                  ),
                ),
              ),
            )
          else
            _buildInteractiveDiagramView(isModal: false),
        ],
      ),
    );
  }

  Widget _buildInteractiveDiagramView({required bool isModal}) {
    return Container(
      constraints: BoxConstraints(
        minHeight: isModal ? 300 : 160,
        maxHeight: isModal ? double.infinity : 320,
      ),
      color: const Color(0xFF090D16),
      child: Stack(
        children: [
          ScrollConfiguration(
            behavior: ScrollConfiguration.of(context).copyWith(
              dragDevices: {
                PointerDeviceKind.touch,
                PointerDeviceKind.mouse,
                PointerDeviceKind.trackpad,
                PointerDeviceKind.stylus,
              },
            ),
            child: InteractiveViewer(
              transformationController: _transformController,
              constrained: false,
              boundaryMargin: const EdgeInsets.all(60),
              minScale: 0.4,
              maxScale: 3.5,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: _renderDiagramTree(_parsedData, widget.accentColor, isModal: isModal),
              ),
            ),
          ),

          // Interactive Controls (Zoom Reset & Pan Hint)
          Positioned(
            right: 8,
            bottom: 8,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    children: const [
                      Icon(LucideIcons.move, size: 9, color: Color(0xFF94A3B8)),
                      SizedBox(width: 3),
                      Text(
                        "Pinch / Drag to zoom & pan",
                        style: TextStyle(fontSize: 9, fontFamily: "Inter", color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                InkWell(
                  onTap: () {
                    _transformController.value = Matrix4.identity();
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.5),
                    ),
                    child: const Icon(LucideIcons.rotateCcw, size: 10, color: Color(0xFF94A3B8)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Fullscreen Modal Dialog for Diagrams ──────────────────────────────────────

class _MermaidFullscreenModal extends StatefulWidget {
  final String rawCode;
  final _MermaidParsedData parsedData;
  final Color accentColor;
  final Color borderColor;
  final Color codeBg;
  final bool isDark;

  const _MermaidFullscreenModal({
    required this.rawCode,
    required this.parsedData,
    required this.accentColor,
    required this.borderColor,
    required this.codeBg,
    required this.isDark,
  });

  @override
  State<_MermaidFullscreenModal> createState() => _MermaidFullscreenModalState();
}

class _MermaidFullscreenModalState extends State<_MermaidFullscreenModal> {
  final TransformationController _controller = TransformationController();
  bool _showCode = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cleanType = widget.parsedData.diagramType.toUpperCase();

    return Scaffold(
      backgroundColor: const Color(0xFF070A11),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F1422),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "MERMAID $cleanType",
              style: const TextStyle(fontSize: 14, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700),
            ),
            if (widget.parsedData.title.isNotEmpty)
              Text(
                widget.parsedData.title,
                style: const TextStyle(fontSize: 11, fontFamily: "Inter", color: Color(0xFF94A3B8)),
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _showCode ? "View Diagram" : "View Code",
            icon: Icon(_showCode ? LucideIcons.eye : LucideIcons.code, size: 18),
            onPressed: () => setState(() => _showCode = !_showCode),
          ),
          IconButton(
            tooltip: "Reset Zoom",
            icon: const Icon(LucideIcons.rotateCcw, size: 18),
            onPressed: () => _controller.value = Matrix4.identity(),
          ),
          IconButton(
            tooltip: "Copy Mermaid Code",
            icon: const Icon(LucideIcons.copy, size: 18),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: widget.rawCode.trim()));
              AppToast.copied(context, "Mermaid diagram code copied");
            },
          ),
        ],
      ),
      body: _showCode
          ? SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Text(
                  widget.rawCode.trim(),
                  softWrap: false,
                  style: const TextStyle(
                    fontSize: 13,
                    fontFamily: "JetBrainsMono",
                    color: Color(0xFFF1F5F9),
                    height: 1.6,
                  ),
                ),
              ),
            )
          : Stack(
              children: [
                InteractiveViewer(
                  transformationController: _controller,
                  constrained: false,
                  boundaryMargin: const EdgeInsets.all(200),
                  minScale: 0.2,
                  maxScale: 5.0,
                  child: Container(
                    padding: const EdgeInsets.all(40),
                    child: _renderDiagramTree(widget.parsedData, widget.accentColor, isModal: true),
                  ),
                ),
                Positioned(
                  bottom: 16,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141926).withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.6),
                    ),
                    child: Text(
                      "Nodes: ${widget.parsedData.nodes.length} • Edges: ${widget.parsedData.edges.length}",
                      style: const TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: Color(0xFF94A3B8)),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

// ─── Mermaid Parsing Models & Logic ───────────────────────────────────────────

class _MermaidNode {
  final String id;
  final String label;
  final String shape; // rect, round, circle, diamond, database, stadium, subroutine

  _MermaidNode({
    required this.id,
    required this.label,
    this.shape = 'rect',
  });
}

class _MermaidEdge {
  final String from;
  final String to;
  final String label;
  final String style; // solid, dotted, thick

  _MermaidEdge({
    required this.from,
    required this.to,
    this.label = '',
    this.style = 'solid',
  });
}

class _MermaidSequenceMessage {
  final String from;
  final String to;
  final String text;
  final bool isDotted;
  final bool isAsync;

  _MermaidSequenceMessage({
    required this.from,
    required this.to,
    required this.text,
    this.isDotted = false,
    this.isAsync = false,
  });
}

class _MermaidPieSlice {
  final String label;
  final double value;
  final Color color;

  _MermaidPieSlice({
    required this.label,
    required this.value,
    required this.color,
  });
}

class _MermaidGitCommit {
  final String branch;
  final String id;
  final String tag;
  final String type; // commit, merge, branch, checkout

  _MermaidGitCommit({
    required this.branch,
    required this.id,
    this.tag = '',
    this.type = 'commit',
  });
}

class _MermaidParsedData {
  final String diagramType;
  final String direction; // TD, LR, BT, RL
  final String title;
  final List<_MermaidNode> nodes;
  final List<_MermaidEdge> edges;
  final List<String> sequenceParticipants;
  final List<_MermaidSequenceMessage> sequenceMessages;
  final List<_MermaidPieSlice> pieSlices;
  final List<_MermaidGitCommit> gitCommits;
  final List<String> rawLines;

  _MermaidParsedData({
    required this.diagramType,
    this.direction = 'TD',
    this.title = '',
    this.nodes = const [],
    this.edges = const [],
    this.sequenceParticipants = const [],
    this.sequenceMessages = const [],
    this.pieSlices = const [],
    this.gitCommits = const [],
    this.rawLines = const [],
  });
}

_MermaidParsedData _parseMermaid(String rawText) {
  final lines = rawText.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty && !l.startsWith('%%')).toList();
  if (lines.isEmpty) {
    return _MermaidParsedData(diagramType: 'flowchart');
  }

  final firstLine = lines.first.toLowerCase();
  String title = '';

  // Check for title directive
  for (final l in lines) {
    if (l.toLowerCase().startsWith('title ') || l.toLowerCase().startsWith('title:')) {
      title = l.substring(5).replaceAll(':', '').trim();
      break;
    }
  }

  // 1. Pie Chart Parser
  if (firstLine.startsWith('pie')) {
    final slices = <_MermaidPieSlice>[];
    final pieColors = [
      const Color(0xFF6366F1), // Indigo
      const Color(0xFF10B981), // Emerald
      const Color(0xFF38BDF8), // Sky
      const Color(0xFFF59E0B), // Amber
      const Color(0xFFEC4899), // Pink
      const Color(0xFFA855F7), // Purple
      const Color(0xFF06B6D4), // Cyan
      const Color(0xFFEF4444), // Red
      const Color(0xFF84CC16), // Lime
      const Color(0xFFEAB308), // Yellow
    ];

    int colorIdx = 0;
    for (int i = 1; i < lines.length; i++) {
      final line = lines[i];
      if (line.toLowerCase().startsWith('title')) continue;
      final match = RegExp(r'^"?(.*?)"?\s*:\s*([0-9.]+)').firstMatch(line);
      if (match != null) {
        final label = match.group(1)?.trim() ?? 'Item';
        final val = double.tryParse(match.group(2) ?? '0') ?? 0;
        slices.add(_MermaidPieSlice(
          label: label,
          value: val,
          color: pieColors[colorIdx % pieColors.length],
        ));
        colorIdx++;
      }
    }
    return _MermaidParsedData(
      diagramType: 'pie',
      title: title,
      pieSlices: slices,
      rawLines: lines,
    );
  }

  // 2. Sequence Diagram Parser
  if (firstLine.startsWith('sequencediagram')) {
    final participants = <String>[];
    final messages = <_MermaidSequenceMessage>[];

    for (int i = 1; i < lines.length; i++) {
      final line = lines[i];
      final lower = line.toLowerCase();
      if (lower.startsWith('autonumber') || lower.startsWith('title')) continue;

      if (lower.startsWith('participant ') || lower.startsWith('actor ')) {
        final parts = line.split(RegExp(r'\s+'));
        if (parts.length >= 2) {
          final p = parts[1].replaceAll('"', '').trim();
          if (!participants.contains(p)) participants.add(p);
        }
        continue;
      }

      // Check for message arrows: A->>B: text or A-->>B: text or A->B: text
      final msgMatch = RegExp(r'([\w\s]+?)(-->|-->>|->>|->|-x|--x)([\w\s]+?):(.*)$').firstMatch(line);
      if (msgMatch != null) {
        final from = msgMatch.group(1)?.trim() ?? '';
        final arrow = msgMatch.group(2)?.trim() ?? '';
        final to = msgMatch.group(3)?.trim() ?? '';
        final text = msgMatch.group(4)?.trim() ?? '';

        if (!participants.contains(from)) participants.add(from);
        if (!participants.contains(to)) participants.add(to);

        messages.add(_MermaidSequenceMessage(
          from: from,
          to: to,
          text: text,
          isDotted: arrow.startsWith('--'),
          isAsync: arrow.endsWith('>>'),
        ));
      }
    }
    return _MermaidParsedData(
      diagramType: 'sequence',
      title: title,
      sequenceParticipants: participants,
      sequenceMessages: messages,
      rawLines: lines,
    );
  }

  // 3. Git Graph Parser
  if (firstLine.startsWith('gitgraph')) {
    final commits = <_MermaidGitCommit>[];
    String currentBranch = 'main';

    for (int i = 1; i < lines.length; i++) {
      final line = lines[i];
      final lower = line.toLowerCase();
      if (lower.startsWith('branch ')) {
        final branchName = line.substring(7).trim();
        currentBranch = branchName;
        commits.add(_MermaidGitCommit(branch: branchName, id: 'branch: $branchName', type: 'branch'));
      } else if (lower.startsWith('checkout ')) {
        currentBranch = line.substring(9).trim();
      } else if (lower.startsWith('merge ')) {
        final mergeBranch = line.substring(6).trim();
        commits.add(_MermaidGitCommit(branch: currentBranch, id: 'merge $mergeBranch', type: 'merge'));
      } else if (lower.startsWith('commit')) {
        final tagMatch = RegExp(r'tag:\s*"([^"]+)"').firstMatch(line);
        final idMatch = RegExp(r'id:\s*"([^"]+)"').firstMatch(line);
        final id = idMatch?.group(1) ?? 'c${commits.length + 1}';
        final tag = tagMatch?.group(1) ?? '';
        commits.add(_MermaidGitCommit(branch: currentBranch, id: id, tag: tag, type: 'commit'));
      }
    }
    return _MermaidParsedData(
      diagramType: 'gitgraph',
      title: title,
      gitCommits: commits,
      rawLines: lines,
    );
  }

  // 4. Default: Flowchart / Graph / State / Class / ER Parser
  String direction = 'TD';
  if (firstLine.contains(' lr') || firstLine.contains(' LR')) {
    direction = 'LR';
  } else if (firstLine.contains(' rl') || firstLine.contains(' RL')) {
    direction = 'RL';
  } else if (firstLine.contains(' bt') || firstLine.contains(' BT')) {
    direction = 'BT';
  }

  final Map<String, _MermaidNode> nodeMap = {};
  final List<_MermaidEdge> edges = [];

  // Parse nodes and edges
  final nodeRegex = RegExp(r'([a-zA-Z0-9_\-]+)\s*(\[\[|\[\(|\[\/|\[\\|\(\(|\(\[|\(|\[|\{)(.*?)(\]\]|\)\]|\/\]|\\\]|\)\)|\)\]|\)|\}|\])');
  final edgeRegex = RegExp(r'([a-zA-Z0-9_\-]+)\s*(?:(\-\-\>|\=\=\>|\.\-\-\>|\-\.\-\>|\-\-\-|\-\.\-)\s*(?:\|([^|]+)\|)?\s*([a-zA-Z0-9_\-]+))');

  for (final line in lines) {
    if (line.toLowerCase().startsWith('graph') ||
        line.toLowerCase().startsWith('flowchart') ||
        line.toLowerCase().startsWith('classdiagram') ||
        line.toLowerCase().startsWith('statediagram') ||
        line.toLowerCase().startsWith('erdiagram') ||
        line.toLowerCase().startsWith('subgraph') ||
        line.toLowerCase().startsWith('end')) {
      continue;
    }

    // Match explicit nodes
    final nodeMatches = nodeRegex.allMatches(line);
    for (final m in nodeMatches) {
      final id = m.group(1)?.trim() ?? '';
      final openBracket = m.group(2)?.trim() ?? '';
      final label = m.group(3)?.trim() ?? id;

      String shape = 'rect';
      if (openBracket == '((') {
        shape = 'circle';
      } else if (openBracket == '([' || openBracket == '(') {
        shape = 'round';
      } else if (openBracket == '{') {
        shape = 'diamond';
      } else if (openBracket == '[(') {
        shape = 'database';
      } else if (openBracket == '[/' || openBracket == '[\\') {
        shape = 'parallelogram';
      }

      nodeMap[id] = _MermaidNode(id: id, label: label, shape: shape);
    }

    // Match edges
    final edgeMatches = edgeRegex.allMatches(line);
    for (final m in edgeMatches) {
      final from = m.group(1)?.trim() ?? '';
      final arrow = m.group(2)?.trim() ?? '-->';
      final edgeLabel = m.group(3)?.trim() ?? '';
      final to = m.group(4)?.trim() ?? '';

      if (from.isNotEmpty && to.isNotEmpty) {
        if (!nodeMap.containsKey(from)) {
          nodeMap[from] = _MermaidNode(id: from, label: from);
        }
        if (!nodeMap.containsKey(to)) {
          nodeMap[to] = _MermaidNode(id: to, label: to);
        }

        String edgeStyle = 'solid';
        if (arrow.contains('.')) {
          edgeStyle = 'dotted';
        } else if (arrow.contains('=')) {
          edgeStyle = 'thick';
        }

        edges.add(_MermaidEdge(from: from, to: to, label: edgeLabel, style: edgeStyle));
      }
    }
  }

  // If no edges parsed, build single nodes from lines
  if (nodeMap.isEmpty) {
    for (final line in lines) {
      if (line.contains(' ') && !line.startsWith('subgraph')) {
        final id = line.split(RegExp(r'\s+')).first;
        nodeMap[id] = _MermaidNode(id: id, label: line);
      }
    }
  }

  String diagramType = 'flowchart';
  if (firstLine.startsWith('classdiagram')) {
    diagramType = 'class';
  } else if (firstLine.startsWith('statediagram')) {
    diagramType = 'state';
  } else if (firstLine.startsWith('erdiagram')) {
    diagramType = 'er';
  } else if (firstLine.startsWith('mindmap')) {
    diagramType = 'mindmap';
  }

  return _MermaidParsedData(
    diagramType: diagramType,
    direction: direction,
    title: title,
    nodes: nodeMap.values.toList(),
    edges: edges,
    rawLines: lines,
  );
}

// ─── Visual Diagram Tree Renderer ─────────────────────────────────────────────

Widget _renderDiagramTree(_MermaidParsedData data, Color accentColor, {required bool isModal}) {
  switch (data.diagramType) {
    case 'pie':
      return _buildPieChartDiagram(data, isModal: isModal);
    case 'sequence':
      return _buildSequenceDiagram(data, accentColor, isModal: isModal);
    case 'gitgraph':
      return _buildGitGraphDiagram(data, accentColor, isModal: isModal);
    case 'state':
      return _buildStateDiagram(data, accentColor, isModal: isModal);
    case 'class':
      return _buildClassDiagram(data, accentColor, isModal: isModal);
    case 'flowchart':
    default:
      return _buildFlowchartDiagram(data, accentColor, isModal: isModal);
  }
}

// ─── Flowchart Visualizer ─────────────────────────────────────────────────────

Widget _buildFlowchartDiagram(_MermaidParsedData data, Color accentColor, {required bool isModal}) {
  if (data.nodes.isEmpty) {
    return _buildFallbackVisualList(data.rawLines);
  }

  final bool isHorizontal = data.direction == 'LR' || data.direction == 'RL';

  // Build node color palette
  final nodeColors = [
    const Color(0xFF6366F1), // Indigo
    const Color(0xFF10B981), // Emerald
    const Color(0xFF38BDF8), // Cyan
    const Color(0xFFA855F7), // Purple
    const Color(0xFFF59E0B), // Amber
    const Color(0xFFEC4899), // Pink
  ];

  // Group connected nodes
  return Container(
    padding: const EdgeInsets.all(12),
    child: isHorizontal
        ? Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: _buildFlowchartElements(data, isHorizontal, nodeColors, accentColor),
          )
        : Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: _buildFlowchartElements(data, isHorizontal, nodeColors, accentColor),
          ),
  );
}

List<Widget> _buildFlowchartElements(
  _MermaidParsedData data,
  bool isHorizontal,
  List<Color> nodeColors,
  Color accentColor,
) {
  final List<Widget> widgets = [];
  final Set<String> renderedNodes = {};

  if (data.edges.isNotEmpty) {
    for (int i = 0; i < data.edges.length; i++) {
      final edge = data.edges[i];
      final fromNode = data.nodes.firstWhere((n) => n.id == edge.from, orElse: () => _MermaidNode(id: edge.from, label: edge.from));
      final toNode = data.nodes.firstWhere((n) => n.id == edge.to, orElse: () => _MermaidNode(id: edge.to, label: edge.to));

      if (!renderedNodes.contains(fromNode.id)) {
        widgets.add(_buildFlowNodeCard(fromNode, nodeColors[widgets.length % nodeColors.length]));
        renderedNodes.add(fromNode.id);
      }

      // Edge Arrow & Label
      widgets.add(_buildFlowEdge(edge, isHorizontal, accentColor));

      if (!renderedNodes.contains(toNode.id)) {
        widgets.add(_buildFlowNodeCard(toNode, nodeColors[widgets.length % nodeColors.length]));
        renderedNodes.add(toNode.id);
      }
    }
  }

  // Render any unconnected nodes
  for (final node in data.nodes) {
    if (!renderedNodes.contains(node.id)) {
      if (widgets.isNotEmpty) {
        widgets.add(const SizedBox(height: 12, width: 12));
      }
      widgets.add(_buildFlowNodeCard(node, nodeColors[widgets.length % nodeColors.length]));
      renderedNodes.add(node.id);
    }
  }

  return widgets;
}

Widget _buildFlowNodeCard(_MermaidNode node, Color nodeAccent) {
  BorderRadius radius = BorderRadius.circular(8);
  if (node.shape == 'circle') {
    radius = BorderRadius.circular(30);
  } else if (node.shape == 'round') {
    radius = BorderRadius.circular(18);
  } else if (node.shape == 'diamond') {
    radius = BorderRadius.circular(4);
  }

  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
    constraints: const BoxConstraints(minWidth: 90, maxWidth: 220),
    decoration: BoxDecoration(
      color: const Color(0xFF131A2B),
      borderRadius: radius,
      border: Border.all(color: nodeAccent.withValues(alpha: 0.6), width: 1.2),
      boxShadow: [
        BoxShadow(
          color: nodeAccent.withValues(alpha: 0.15),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (node.id != node.label)
          Text(
            node.id,
            style: TextStyle(
              fontSize: 9.5,
              fontFamily: "JetBrainsMono",
              fontWeight: FontWeight.w700,
              color: nodeAccent,
            ),
          ),
        Text(
          node.label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12,
            fontFamily: "HindSiliguri",
            fontFamilyFallback: kFmvFontFamilyFallback,
            fontWeight: FontWeight.w600,
            color: Color(0xFFF1F5F9),
          ),
        ),
      ],
    ),
  );
}

Widget _buildFlowEdge(_MermaidEdge edge, bool isHorizontal, Color accentColor) {
  final hasLabel = edge.label.isNotEmpty;

  return Container(
    padding: isHorizontal
        ? const EdgeInsets.symmetric(horizontal: 8)
        : const EdgeInsets.symmetric(vertical: 6),
    child: isHorizontal
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 14, height: edge.style == 'thick' ? 2.5 : 1.5, color: const Color(0xFF64748B)),
              if (hasLabel) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFF475569), width: 0.5),
                  ),
                  child: Text(
                    edge.label,
                    style: const TextStyle(fontSize: 10, fontFamily: "Inter", color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                  ),
                ),
                Container(width: 14, height: edge.style == 'thick' ? 2.5 : 1.5, color: const Color(0xFF64748B)),
              ],
              const Icon(LucideIcons.arrowRight, size: 13, color: Color(0xFF94A3B8)),
            ],
          )
        : Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: edge.style == 'thick' ? 2.5 : 1.5, height: 12, color: const Color(0xFF64748B)),
              if (hasLabel) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFF475569), width: 0.5),
                  ),
                  child: Text(
                    edge.label,
                    style: const TextStyle(fontSize: 10, fontFamily: "Inter", color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                  ),
                ),
                Container(width: edge.style == 'thick' ? 2.5 : 1.5, height: 12, color: const Color(0xFF64748B)),
              ],
              const Icon(LucideIcons.arrowDown, size: 13, color: Color(0xFF94A3B8)),
            ],
          ),
  );
}

// ─── Sequence Diagram Visualizer ──────────────────────────────────────────────

Widget _buildSequenceDiagram(_MermaidParsedData data, Color accentColor, {required bool isModal}) {
  final participants = data.sequenceParticipants;
  if (participants.isEmpty) return _buildFallbackVisualList(data.rawLines);

  const double colWidth = 130.0;

  return Container(
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Top Participant Badges
        Row(
          mainAxisSize: MainAxisSize.min,
          children: participants.map((p) {
            return Container(
              width: colWidth,
              margin: const EdgeInsets.symmetric(horizontal: 6),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF475569), width: 1.0),
              ),
              child: Text(
                p,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontFamily: "JetBrainsMono",
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFF1F5F9),
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 12),

        // Sequential Message Calls
        ...data.sequenceMessages.map((msg) {
          final fromIdx = participants.indexOf(msg.from);
          final toIdx = participants.indexOf(msg.to);
          final bool isSelf = fromIdx == toIdx;
          final int leftIdx = fromIdx < toIdx ? fromIdx : toIdx;
          final int rightIdx = fromIdx < toIdx ? toIdx : fromIdx;
          final double spanWidth = (rightIdx - leftIdx).abs() * (colWidth + 12);

          return Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(width: (leftIdx >= 0 ? leftIdx : 0) * (colWidth + 12) + (colWidth / 2)),
                Container(
                  width: spanWidth > 0 ? spanWidth : colWidth,
                  padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131A2B),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: msg.isDotted ? const Color(0xFF64748B) : accentColor.withValues(alpha: 0.5),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (fromIdx > toIdx) const Icon(LucideIcons.arrowLeft, size: 12, color: Color(0xFF94A3B8)),
                      Flexible(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(
                            msg.text,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 11, fontFamily: "Inter", color: Color(0xFFCBD5E1)),
                          ),
                        ),
                      ),
                      if (fromIdx < toIdx || isSelf) const Icon(LucideIcons.arrowRight, size: 12, color: Color(0xFF94A3B8)),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),

        const SizedBox(height: 12),

        // Bottom Participant Badges
        Row(
          mainAxisSize: MainAxisSize.min,
          children: participants.map((p) {
            return Container(
              width: colWidth,
              margin: const EdgeInsets.symmetric(horizontal: 6),
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFF334155), width: 0.8),
              ),
              child: Text(
                p,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: Color(0xFF94A3B8)),
              ),
            );
          }).toList(),
        ),
      ],
    ),
  );
}

// ─── Pie Chart Visualizer ─────────────────────────────────────────────────────

Widget _buildPieChartDiagram(_MermaidParsedData data, {required bool isModal}) {
  final slices = data.pieSlices;
  if (slices.isEmpty) return _buildFallbackVisualList(data.rawLines);

  final total = slices.fold<double>(0, (sum, s) => sum + s.value);

  return Container(
    padding: const EdgeInsets.all(16),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Donut Pie Painter
        SizedBox(
          width: isModal ? 180 : 130,
          height: isModal ? 180 : 130,
          child: CustomPaint(
            painter: _MermaidPiePainter(slices: slices, total: total),
          ),
        ),

        const SizedBox(width: 24),

        // Legend Column
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: slices.map((s) {
            final pct = total > 0 ? ((s.value / total) * 100).toStringAsFixed(1) : '0';
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(color: s.color, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    s.label,
                    style: const TextStyle(fontSize: 11.5, fontFamily: "Inter", fontWeight: FontWeight.w600, color: Color(0xFFF1F5F9)),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    "($pct%)",
                    style: const TextStyle(fontSize: 10.5, fontFamily: "JetBrainsMono", color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    ),
  );
}

class _MermaidPiePainter extends CustomPainter {
  final List<_MermaidPieSlice> slices;
  final double total;

  _MermaidPiePainter({required this.slices, required this.total});

  @override
  void paint(Canvas canvas, Size size) {
    if (total <= 0 || slices.isEmpty) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    double startAngle = -3.1415926535 / 2;

    final paint = Paint()
      ..style = PaintingStyle.fill;

    for (final slice in slices) {
      final sweepAngle = (slice.value / total) * 2 * 3.1415926535;
      paint.color = slice.color;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        paint,
      );
      startAngle += sweepAngle;
    }

    // Inner Cutout for Modern Donut Style
    final cutoutPaint = Paint()..color = const Color(0xFF090D16);
    canvas.drawCircle(center, radius * 0.52, cutoutPaint);
  }

  @override
  bool shouldRepaint(covariant _MermaidPiePainter oldDelegate) => true;
}

// ─── Git Graph Visualizer ─────────────────────────────────────────────────────

Widget _buildGitGraphDiagram(_MermaidParsedData data, Color accentColor, {required bool isModal}) {
  final commits = data.gitCommits;
  if (commits.isEmpty) return _buildFallbackVisualList(data.rawLines);

  return Container(
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: commits.map((c) {
        Color commitColor = const Color(0xFF6366F1);
        if (c.type == 'merge') {
          commitColor = const Color(0xFF10B981);
        } else if (c.type == 'branch') {
          commitColor = const Color(0xFF38BDF8);
        }

        return Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: commitColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: commitColor.withValues(alpha: 0.5), width: 0.8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      c.branch,
                      style: TextStyle(fontSize: 10, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700, color: commitColor),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      c.id,
                      style: const TextStyle(fontSize: 11, fontFamily: "Inter", color: Color(0xFFF1F5F9)),
                    ),
                    if (c.tag.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          c.tag,
                          style: const TextStyle(fontSize: 9, fontFamily: "JetBrainsMono", color: Color(0xFFF59E0B)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    ),
  );
}

// ─── State Diagram Visualizer ─────────────────────────────────────────────────

Widget _buildStateDiagram(_MermaidParsedData data, Color accentColor, {required bool isModal}) {
  return _buildFlowchartDiagram(data, accentColor, isModal: isModal);
}

// ─── Class Diagram Visualizer ─────────────────────────────────────────────────

Widget _buildClassDiagram(_MermaidParsedData data, Color accentColor, {required bool isModal}) {
  return _buildFlowchartDiagram(data, accentColor, isModal: isModal);
}

// ─── Fallback Visual List ─────────────────────────────────────────────────────

Widget _buildFallbackVisualList(List<String> lines) {
  return Container(
    padding: const EdgeInsets.all(12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: lines.map((l) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.cornerDownRight, size: 11, color: Color(0xFF94A3B8)),
              const SizedBox(width: 6),
              Text(
                l,
                style: const TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: Color(0xFFCBD5E1)),
              ),
            ],
          ),
        );
      }).toList(),
    ),
  );
}
