import "package:flutter/material.dart";
import "package:lucide_icons_flutter/lucide_icons.dart";
import "../../models/app_models.dart";
import "../../utils/app_toast.dart";

/// Active Question Dock pinned directly above the Prompt Box
class StickyQuestionDock extends StatefulWidget {
  final Map<String, dynamic>? activeQuestion;

  static Map<String, dynamic>? getActiveQuestion(List<ChatMessageModel> messages, {String? dismissedQuestionId}) {
    final startIdx = (messages.length - 10).clamp(0, messages.length);
    for (int i = messages.length - 1; i >= startIdx; i--) {
      final msg = messages[i];
      if (msg.sender == 'user') continue;
      final q = msg.questionData;
      if (q != null && q['answered'] != true) {
        final qId = q['requestID']?.toString() ?? q['id']?.toString() ?? '';
        if (qId.isNotEmpty && qId != dismissedQuestionId) {
          return q;
        }
      }
      for (final p in msg.parts) {
        final toolName = (p.tool ?? p.type).toLowerCase();
        if ((toolName == 'question' || toolName == 'ask_question' || toolName == 'default_api:ask_question' || toolName.contains('question')) && p.status != 'completed') {
          final input = p.input is Map ? Map<String, dynamic>.from(p.input as Map) : <String, dynamic>{};
          final qList = input['questions'] is List ? (input['questions'] as List) : [];
          final firstQ = qList.isNotEmpty && qList.first is Map ? (qList.first as Map) : null;
          final qText = (firstQ?['question'] ?? firstQ?['header'] ?? input['question'] ?? input['header'] ?? 'Question').toString();
          final rawOpts = firstQ?['options'] is List ? (firstQ!['options'] as List) : (input['options'] is List ? (input['options'] as List) : []);
          final opts = rawOpts.map((o) => o is Map ? (o['label'] ?? o['description'] ?? o.toString()).toString() : o.toString()).toList();
          final reqId = (msg.questionData?['requestID'] ?? msg.questionData?['id'] ?? input['id'] ?? input['requestID'] ?? input['callID'] ?? p.id).toString();
          if (reqId.isNotEmpty && reqId != dismissedQuestionId) {
            return {
              'requestID': reqId,
              'id': reqId,
              'question': qText,
              'options': opts,
              'rawQuestions': qList,
              'answered': false,
            };
          }
        }
      }
    }
    return null;
  }
  final bool isDark;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final Function(String requestId, String answer)? onQuestionReplied;
  final ValueChanged<String> onDismiss;

  const StickyQuestionDock({
    super.key,
    required this.activeQuestion,
    required this.isDark,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onQuestionReplied,
    required this.onDismiss,
  });

  @override
  State<StickyQuestionDock> createState() => _StickyQuestionDockState();
}

class _StickyQuestionDockState extends State<StickyQuestionDock> {
  final TextEditingController _answerController = TextEditingController();
  String? _selectedOption;
  // Locally track submitted reqId so the dock hides immediately
  // without waiting for the server to update message.questionData
  String? _submittedReqId;

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  void _submitReply(String reqId, List<String> options) {
    if (reqId.isEmpty) return;
    final answer = _answerController.text.trim().isNotEmpty
        ? _answerController.text.trim()
        : (_selectedOption ?? (options.isNotEmpty ? options.first : 'Yes'));

    widget.onQuestionReplied?.call(reqId, answer);
    // Always dismiss (even if callback is null) and hide dock immediately
    setState(() {
      _submittedReqId = reqId;
      _answerController.clear();
      _selectedOption = null;
    });
    widget.onDismiss(reqId);
    AppToast.success(context, 'Answer submitted to agent!');
  }

  @override
  Widget build(BuildContext context) {
    final q = widget.activeQuestion;
    if (q == null) return const SizedBox.shrink();

    final reqId = q['requestID']?.toString() ?? q['id']?.toString() ?? '';
    // Already submitted locally — hide until parent propagates the answer
    if (reqId.isNotEmpty && reqId == _submittedReqId) return const SizedBox.shrink();
    String questionText = q['question']?.toString() ?? q['text']?.toString() ?? '';
    if (questionText.isEmpty && q['rawQuestions'] is List && (q['rawQuestions'] as List).isNotEmpty) {
      final fq = (q['rawQuestions'] as List).first;
      if (fq is Map) {
        questionText = fq['question']?.toString() ?? fq['header']?.toString() ?? '';
      }
    }
    if (questionText.isEmpty) questionText = 'How would you like to proceed?';

    List<String> options = [];
    if (q['options'] is List) {
      for (final opt in (q['options'] as List)) {
        if (opt is Map) {
          options.add(opt['label']?.toString() ?? opt['description']?.toString() ?? opt.toString());
        } else if (opt != null) {
          options.add(opt.toString());
        }
      }
    }
    if (options.isEmpty && q['rawQuestions'] is List && (q['rawQuestions'] as List).isNotEmpty) {
      final fq = (q['rawQuestions'] as List).first;
      if (fq is Map && fq['options'] is List) {
        for (final opt in (fq['options'] as List)) {
          if (opt is Map) {
            options.add(opt['label']?.toString() ?? opt['description']?.toString() ?? opt.toString());
          } else if (opt != null) {
            options.add(opt.toString());
          }
        }
      }
    }

    const accentPurple = Color(0xFF6366F1);

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 4, 14, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF13131A) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: accentPurple.withValues(alpha: widget.isDark ? 0.45 : 0.35),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: accentPurple.withValues(alpha: widget.isDark ? 0.12 : 0.06),
            blurRadius: 16,
            spreadRadius: 1,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: accentPurple.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(LucideIcons.helpCircle, size: 13, color: accentPurple),
              ),
              const SizedBox(width: 8),
              const Text(
                'Agent Question',
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w800,
                  color: accentPurple,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                decoration: BoxDecoration(
                  color: accentPurple.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Action Required',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w700,
                    color: accentPurple,
                  ),
                ),
              ),
              const Spacer(),
              InkWell(
                onTap: () => widget.onDismiss(reqId),
                borderRadius: BorderRadius.circular(4),
                child: Padding(
                  padding: const EdgeInsets.all(3),
                  child: Icon(LucideIcons.x, size: 14, color: widget.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            questionText,
            style: TextStyle(
              fontSize: 13,
              fontFamily: 'PlusJakartaSans',
              fontWeight: FontWeight.w700,
              height: 1.45,
              color: widget.textPrimary,
            ),
          ),
          if (options.isNotEmpty) ...[
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: options.map((opt) {
                  final isSelected = _selectedOption == opt;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: InkWell(
                      onTap: () {
                        if (isSelected) {
                          _submitReply(reqId, options);
                        } else {
                          setState(() {
                            _selectedOption = opt;
                            _answerController.text = opt;
                          });
                        }
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 120),
                        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? accentPurple.withValues(alpha: 0.22)
                              : (widget.isDark ? const Color(0xFF1E1E28) : const Color(0xFFF1F5F9)),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected ? accentPurple : widget.borderColor,
                            width: isSelected ? 1.2 : 0.7,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isSelected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                              size: 12,
                              color: isSelected ? accentPurple : widget.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              opt,
                              style: TextStyle(
                                fontSize: 12,
                                fontFamily: 'PlusJakartaSans',
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? accentPurple : widget.textPrimary,
                              ),
                            ),
                            if (isSelected) ...[
                              const SizedBox(width: 6),
                              const Icon(LucideIcons.arrowRight, size: 10, color: accentPurple),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: widget.isDark ? const Color(0xFF1A1A24) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: widget.borderColor, width: 0.8),
                  ),
                  child: TextField(
                    controller: _answerController,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontFamily: 'PlusJakartaSans',
                      color: widget.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Type answer or select above\u2026',
                      hintStyle: TextStyle(fontSize: 11.5, fontFamily: 'Inter', color: widget.textSecondary),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 9),
                    ),
                    onSubmitted: (_) => _submitReply(reqId, options),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => _submitReply(reqId, options),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.cornerDownLeft, size: 13, color: Colors.white),
                      SizedBox(width: 5),
                      Text(
                        'Reply',
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
