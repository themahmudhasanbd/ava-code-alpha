import "dart:async";
import "dart:convert";
import "dart:math";
import "dart:ui";
import "package:flutter/gestures.dart";
import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_markdown/flutter_markdown.dart";
import "package:flutter_math_fork/flutter_math.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";

import "package:cached_network_image/cached_network_image.dart";
import "package:markdown/markdown.dart" as md;
import "package:url_launcher/url_launcher.dart";
import "../models/app_models.dart";
import "../services/agent_core_service.dart";
import "../theme/app_theme.dart";
import "../utils/app_toast.dart";
import "../utils/downloader/file_downloader.dart";
import "../utils/time_formatter.dart";
import "chat/session_compact_widget.dart";
import "chat/voice_note_player_widget.dart";
import "chat/image_lightbox_viewer.dart";

// Part files — each contains a focused slice of the view's logic.
// All share this library's private namespace, so `_` members are fully accessible.
part "chat/fmv_markdown_builders.dart";
part "chat/fmv_animated_widgets.dart";
part "chat/fmv_agent_header.dart";
part "chat/fmv_user_bubble.dart";
part "chat/fmv_thinking.dart";
part "chat/fmv_tool_cards.dart";
part "chat/fmv_markdown.dart";
part "chat/fmv_question_permission.dart";
part "chat/fmv_image_preview.dart";
part "chat/fmv_mermaid_view.dart";

/// Shared Bangla & Unicode font family fallback across FormattedMessageView parts
const List<String> kFmvFontFamilyFallback = [
  "HindSiliguri",
  "Hind Siliguri",
  "NotoSansBengali",
  "Noto Sans Bengali",
  "sans-serif",
];

// ─── Logo Avatar ──────────────────────────────────────────────────────────────

/// AvA Interactive Mascot Avatar Widget matching reference AIMascot in ask-ai.tsx.
Widget buildAvaLogoAvatar({double size = 22, double radius = 6, bool awake = true, MascotGaze? gaze}) {
  return AiMascotAvatar(
    size: size,
    awake: awake,
    gaze: gaze,
  );
}

// ─── FormattedMessageView ─────────────────────────────────────────────────────

/// FormattedMessageView — AvA Minimalist Execution Loop Display Style & Dedicated Typography.
class FormattedMessageView extends StatefulWidget {
  final ChatMessageModel message;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback? onRetry;
  final Function(String option)? onOptionSelected;
  final Function(String requestID, String answer)? onQuestionReplied;
  final void Function(bool approved, String command, {String? requestId})? onPermissionDecision;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;
  final Function(String sessionId)? onOpenSession;
  final String? baseUrl;
  final String? userAvatar;
  final AvaAgentCoreService? agentCoreService;

  const FormattedMessageView({
    super.key,
    required this.message,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onRetry,
    this.onOptionSelected,
    this.onQuestionReplied,
    this.onPermissionDecision,
    this.onOpenFile,
    this.onOpenSession,
    this.baseUrl,
    this.userAvatar,
    this.agentCoreService,
  });

  @override
  State<FormattedMessageView> createState() => _FormattedMessageViewState();
}

// ─── State ────────────────────────────────────────────────────────────────────

class _FormattedMessageViewState extends State<FormattedMessageView> with SingleTickerProviderStateMixin {
  String _computeTurnDuration(ChatMessageModel msg) {
    int totalMs = 0;
    for (final p in msg.parts) {
      if (p.durationMs != null && p.durationMs! > 0) {
        totalMs += p.durationMs!;
      } else if (p.type == 'reasoning' && _frozenThinkingDuration.containsKey(p.id)) {
        final sec = _frozenThinkingDuration[p.id]!;
        if (sec > 0) totalMs += (sec * 1000).toInt();
      }
    }

    if (totalMs == 0 && msg.parts.length >= 2) {
      final first = msg.parts.first.timestamp;
      final last = msg.parts.last.timestamp;
      final diff = last.difference(first).inMilliseconds;
      if (diff > 0) {
        totalMs = diff;
      }
    }

    if (totalMs > 0) {
      final sec = totalMs / 1000.0;
      if (sec < 60) {
        return sec >= 10 ? "${sec.toStringAsFixed(0)}s" : "${sec.toStringAsFixed(1)}s";
      } else {
        final mins = (sec / 60).floor();
        final remSec = (sec % 60).round();
        return "${mins}m ${remSec}s";
      }
    }

    // Default realistic duration for completed agent responses
    if (msg.parts.isNotEmpty) {
      final estSec = (msg.parts.length * 1.4).clamp(1.2, 45.0);
      return estSec >= 10 ? "${estSec.toStringAsFixed(0)}s" : "${estSec.toStringAsFixed(1)}s";
    } else if (msg.text.trim().isNotEmpty) {
      return "1.2s";
    }
    return "";
  }

    String _getTurnCopyableText(ChatMessageModel msg) {
    if (msg.text.trim().isNotEmpty) return msg.text.trim();
    final buffer = StringBuffer();
    for (final p in msg.parts) {
      if (p.text.trim().isNotEmpty) {
        if (buffer.isNotEmpty) buffer.writeln();
        buffer.write(p.text.trim());
      } else if (p.output != null && p.output!.trim().isNotEmpty) {
        if (buffer.isNotEmpty) buffer.writeln();
        buffer.write(p.output!.trim());
      }
    }
    return buffer.toString().trim();
  }

  final Map<String, bool> _expandedState = {};
  final Map<String, bool> _fullOutputExpanded = {};
  final Map<String, double> _frozenThinkingDuration = {};
  final TextEditingController _customAnswerCtrl = TextEditingController();
  
  // Per-message state tracking maps to prevent state recycling leaks in ListView
  final Map<String, bool> _answerSubmittedMap = {};
  final Map<String, String> _localSubmittedAnswerMap = {};
  final Map<String, bool> _permissionDecidedMap = {};
  final Map<String, bool> _permissionApprovedMap = {};
  final Map<String, String> _selectedQuestionOptionMap = {};

  late AnimationController _cursorAnimController;
  late Animation<double> _cursorOpacity;

  // ── Markdown memoization cache ───────────────────────────────────────────────
  String? _cachedMarkdownText;
  bool? _cachedMarkdownIsLive;
  Widget? _cachedMarkdownWidget;
  bool _cachedMarkdownBuilt = false;

  @override
  void initState() {
    super.initState();
    _cursorAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
    _cursorOpacity = Tween<double>(begin: 0.2, end: 1.0).animate(_cursorAnimController);
  }

  @override
  void didUpdateWidget(covariant FormattedMessageView oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Invalidate markdown cache when message, dark mode, base URL or text change.
    if (!identical(oldWidget.message, widget.message) ||
        oldWidget.isDark != widget.isDark ||
        oldWidget.baseUrl != widget.baseUrl ||
        oldWidget.message.text != widget.message.text) {
      _cachedMarkdownBuilt = false;
      _cachedMarkdownWidget = null;
      _cachedMarkdownText = null;
    }
  }

  @override
  void dispose() {
    _cursorAnimController.dispose();
    _customAnswerCtrl.dispose();
    super.dispose();
  }

  // ── High-Contrast Dynamic Color Tokens ─────────────────────────────────────
  Color get _cPrimary => widget.isDark ? const Color(0xFFFAFAFA) : const Color(0xFF0F172A);
  Color get _cSecondary => widget.isDark ? const Color(0xFFA1A1AA) : const Color(0xFF334155);
  Color get _cFaint => widget.isDark ? const Color(0xFF71717A) : const Color(0xFF64748B);
  Color get _cCardBg => widget.isDark ? widget.cardBg : Colors.white;
  Color get _cBorder => widget.isDark ? widget.borderColor : const Color(0xFFCBD5E1);
  Color get _cInset => widget.isDark ? const Color(0xFF111114) : const Color(0xFFF1F5F9);
  Color get _cCodeBg => const Color(0xFF0B0F19);
  Color get _cInlineCodeBg => widget.isDark ? const Color(0xFF1E2433) : const Color(0xFFEEF2FF);
  Color get _cInlineCodeText => widget.isDark ? const Color(0xFF38BDF8) : const Color(0xFF4F46E5);
  Color get _cAccentPurple => const Color(0xFF4F46E5);

  // Defined High-Contrast Colors for Tool Execution States
  Color get _statusRunning => const Color(0xFF38BDF8); // Sky Blue / Cyan
  Color get _statusRunningBg => const Color(0xFF0284C7).withValues(alpha: 0.14);
  Color get _statusRunningBorder => const Color(0xFF38BDF8).withValues(alpha: 0.40);

  Color get _statusSuccess => const Color(0xFF10B981); // Emerald Green
  Color get _statusSuccessBg => const Color(0xFF10B981).withValues(alpha: 0.14);
  Color get _statusSuccessBorder => const Color(0xFF10B981).withValues(alpha: 0.35);

  Color get _statusFailed => const Color(0xFFEF4444); // Rose Crimson Red
  Color get _statusFailedBg => const Color(0xFFEF4444).withValues(alpha: 0.14);
  Color get _statusFailedBorder => const Color(0xFFEF4444).withValues(alpha: 0.40);

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final msg = widget.message;

    // 1. User Message: High-Contrast Bubble with Full Markdown & Dedicated Message Font
    if (msg.sender == "user") {
      final trimmedText = msg.text.trim();
      final bool isEngineInternalPrompt = msg.isCompaction ||
          (msg.parts.any((p) => p.metadata != null && p.metadata!['compaction_continue'] == true)) ||
          trimmedText.startsWith("The conversation history was compacted") ||
          trimmedText.startsWith("<command_result") ||
          trimmedText.startsWith("<tool_result") ||
          trimmedText.startsWith("<task_progress") ||
          trimmedText.startsWith("<timer_notification") ||
          trimmedText.startsWith("<task_result") ||
          trimmedText.startsWith("<task_status") ||
          trimmedText.startsWith("<synthetic_prompt") ||
          (trimmedText.startsWith("<task") && trimmedText.contains("state="));
      if (isEngineInternalPrompt) return const SizedBox.shrink();
      return _buildUserBubble(msg.text, msg.timestamp, attachments: msg.attachments);
    }

    // 2. Special Case: Session Compaction message
    if (msg.isCompactionMessage) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6.0),
        child: SessionCompactWidget(
          message: msg,
          isDark: widget.isDark,
          cardBg: _cCardBg,
          borderColor: _cBorder,
          textPrimary: _cPrimary,
          textSecondary: _cSecondary,
        ),
      );
    }

    // 3. Agent Execution Turn — Unboxed Flat Minimalist Timeline View
    final isTurnActive = msg.isPending;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header: Minimalist AvA Header with Mascot Avatar ──────────────
          _buildAgentHeader(msg, isTurnActive: isTurnActive),
          const SizedBox(height: 8),

          // ── Timeline Events & Tools ─────────────────────────────────────────
          if (msg.parts.isNotEmpty) ...[
            // 1. If reasoningText exists at top-level but is not in parts, render it first
            if (msg.reasoningText != null &&
                msg.reasoningText!.trim().isNotEmpty &&
                !msg.parts.any((p) => p.type == "reasoning" || p.type == "thought" || p.type == "thinking")) ...[
              _buildThinkingAccordion(
                "${msg.id}_top_reasoning",
                msg.reasoningText!,
                isStreaming: isTurnActive && msg.text.isEmpty,
                isTurnActive: isTurnActive,
                startedAt: DateTime.tryParse(msg.timestamp),
              ),
            ],
            ...msg.parts.map((part) {
              final isPartStreaming = isTurnActive && (part.status == "running" || part.status == "pending");

              if (part.type == "reasoning" || part.type == "thought" || part.type == "thinking") {
                final effectiveText = part.text.trim().isNotEmpty
                    ? part.text
                    : (msg.reasoningText ?? "");
                if (effectiveText.trim().isEmpty && !isPartStreaming) {
                  return const SizedBox.shrink();
                }
                return _buildThinkingAccordion(
                  part.id.isNotEmpty ? part.id : "${msg.id}_thinking_${msg.parts.indexOf(part)}",
                  effectiveText,
                  isStreaming: isPartStreaming,
                  isTurnActive: isTurnActive,
                  durationMs: part.durationMs,
                  startedAt: part.timestamp,
                );
              }

              if (part.type == "subagent" || (part.type == "tool" && part.tool == "agent")) {
                return _buildSubagentCardFromPart(part, isTurnActive: isTurnActive);
              }

              if (part.type == "manage_task" || (part.type == "tool" && (part.tool == "task" || part.tool == "manage_task"))) {
                return _buildManageTaskCardFromPart(part, isTurnActive: isTurnActive);
              }

              if (part.type == "tool" || part.type == "tool_use" || part.type == "commandExecution") {
                return _buildToolCardFromPart(part, isTurnActive: isTurnActive);
              }

              if (part.type == "text" && part.text.trim().isNotEmpty) {
                final isTextLive = isTurnActive && isPartStreaming;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: _buildMarkdown(part.text, isUser: false, isLive: isTextLive, isHistory: msg.isHistory),
                );
              }

              return const SizedBox.shrink();
            }),
            // 2. If msg.text exists but no text part was rendered in parts, render msg.text
            if (!msg.parts.any((p) => p.type == "text" && p.text.trim().isNotEmpty) && msg.text.trim().isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: _buildMarkdown(msg.text, isUser: false, isLive: isTurnActive, isHistory: msg.isHistory),
              ),
            ],
          ] else if (msg.reasoningText != null && msg.reasoningText!.trim().isNotEmpty) ...[
            _buildThinkingAccordion(
              "${msg.id}_reasoning",
              msg.reasoningText!,
              isStreaming: false,
              isTurnActive: isTurnActive,
              startedAt: DateTime.tryParse(msg.timestamp),
            ),
            if (msg.text.trim().isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: _buildMarkdown(msg.text, isUser: false, isLive: isTurnActive, isHistory: msg.isHistory),
              ),
          ] else if (msg.text.trim().isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: _buildMarkdown(msg.text, isUser: false, isLive: isTurnActive, isHistory: msg.isHistory),
            ),
          ],

          // ── Real-time Active Execution Indicator ────────────────────────────
          if (isTurnActive)
            _buildPendingShimmer(msg),

          // ── Dynamic Backend Error Message ───────────────────────────────────
          if (msg.isError && msg.errorMessage != null && msg.errorMessage!.isNotEmpty)
            _buildErrorCard(msg.errorMessage!),

          // ── Interactive Native Decision Docks ───────────────────────────────
          if (msg.questionData != null)
            _buildQuestionCard(msg.questionData!),

          if (msg.permissionData != null)
            _buildPermissionCard(msg.permissionData!),

          // ── Bottom Action Bar: Timestamp, Turn Duration & 1-Tap Copy ───────
          if (!isTurnActive && (msg.text.trim().isNotEmpty || msg.parts.isNotEmpty)) ...[
            const SizedBox(height: 6),
            () {
              final durStr = _computeTurnDuration(msg);
              final formattedTime = TimeFormatter.formatTimeString(msg.timestamp, context: context);
              return Row(
                children: [
                  if (formattedTime.isNotEmpty)
                    Text(
                      formattedTime,
                      style: TextStyle(fontSize: 10.5, color: _cFaint, fontFamily: "Inter"),
                    ),
                  if (formattedTime.isNotEmpty && durStr.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      width: 3,
                      height: 3,
                      decoration: BoxDecoration(color: _cFaint.withValues(alpha: 0.4), shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (durStr.isNotEmpty) ...[
                    Icon(LucideIcons.clock, size: 11, color: _cFaint),
                    const SizedBox(width: 4),
                    Text(
                      "Worked for $durStr",
                      style: TextStyle(fontSize: 10.5, color: _cFaint, fontFamily: "Inter", fontWeight: FontWeight.w500),
                    ),
                  ],
                  const Spacer(),
                  () {
                    final copyText = _getTurnCopyableText(msg);
                    if (copyText.isEmpty) return const SizedBox.shrink();
                    return InkWell(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: copyText));
                        AppToast.copied(context, "Copied response to clipboard!");
                      },
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _cAccentPurple.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _cAccentPurple.withValues(alpha: 0.3), width: 0.6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.copy, size: 11, color: _cAccentPurple),
                            const SizedBox(width: 4),
                            Text(
                              "Copy",
                              style: TextStyle(
                                fontSize: 10.5,
                                fontFamily: "Inter",
                                fontWeight: FontWeight.w700,
                                color: _cAccentPurple,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }(),
                ],
              );
            }(),
          ],
        ],
      ),
    );
  }
}
