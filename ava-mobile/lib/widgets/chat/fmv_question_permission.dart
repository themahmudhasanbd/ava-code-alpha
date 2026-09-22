part of '../formatted_message_view.dart';

// ─── Question & Permission Cards ──────────────────────────────────────────────

// ignore_for_file: library_private_types_in_public_api, invalid_use_of_protected_member
extension FmvQuestionPermissionExt on _FormattedMessageViewState {
  // ─── Question Card ────────────────────────────────────────────────────────────

  Widget _buildQuestionCard(Map<String, dynamic> qData) {
    final reqId = (qData["requestID"] ?? qData["id"] ?? "").toString();
    String questionText = qData["question"]?.toString() ?? qData["text"]?.toString() ?? "";
    if (questionText.isEmpty && qData["rawQuestions"] is List && (qData["rawQuestions"] as List).isNotEmpty) {
      final fq = (qData["rawQuestions"] as List).first;
      if (fq is Map) {
        questionText = fq["question"]?.toString() ?? fq["header"]?.toString() ?? "";
      }
    }
    if (questionText.isEmpty) questionText = "How would you like to proceed?";

    List<String> options = [];
    if (qData["options"] is List) {
      for (final opt in (qData["options"] as List)) {
        if (opt is Map) {
          options.add(opt["label"]?.toString() ?? opt["description"]?.toString() ?? opt.toString());
        } else if (opt != null) {
          options.add(opt.toString());
        }
      }
    }
    if (options.isEmpty && qData["rawQuestions"] is List && (qData["rawQuestions"] as List).isNotEmpty) {
      final fq = (qData["rawQuestions"] as List).first;
      if (fq is Map && fq["options"] is List) {
        for (final opt in (fq["options"] as List)) {
          if (opt is Map) {
            options.add(opt["label"]?.toString() ?? opt["description"]?.toString() ?? opt.toString());
          } else if (opt != null) {
            options.add(opt.toString());
          }
        }
      }
    }

    final msgId = widget.message.id;
    final isAlreadyAnswered = qData["answered"] == true || _answerSubmittedMap[msgId] == true;
    final submittedAnswer = qData["submittedAnswer"]?.toString() ?? _localSubmittedAnswerMap[msgId];

    if (!isAlreadyAnswered) {
      if (!widget.message.isPending) {
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: _cInset,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _cBorder, width: 0.8),
          ),
          child: Row(
            children: [
              Icon(LucideIcons.circleSlash, size: 13, color: _cSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "Question closed: Agent stopped / turn ended",
                  style: TextStyle(fontSize: 11.5, fontFamily: "Inter", fontWeight: FontWeight.w500, color: _cSecondary),
                ),
              ),
            ],
          ),
        );
      }

      return Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _cAccentPurple.withValues(alpha: widget.isDark ? 0.08 : 0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _cAccentPurple.withValues(alpha: 0.35), width: 1.1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: _cAccentPurple.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(LucideIcons.helpCircle, size: 14, color: _cAccentPurple),
                ),
                const SizedBox(width: 8),
                Text(
                  "AGENT QUESTION",
                  style: TextStyle(
                    fontSize: 10.5,
                    fontFamily: "Inter",
                    fontWeight: FontWeight.w800,
                    color: _cAccentPurple,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: _cAccentPurple.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    "Action Required",
                    style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: _cAccentPurple),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Question Text
            Text(
              questionText,
              style: TextStyle(
                fontSize: 13,
                fontFamily: "HindSiliguri",
                fontFamilyFallback: kFmvFontFamilyFallback,
                fontWeight: FontWeight.w600,
                height: 1.45,
                color: _cPrimary,
              ),
            ),
            // Interactive Options
            if (options.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: options.map((opt) {
                  final isSelected = _selectedQuestionOptionMap[msgId] == opt;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedQuestionOptionMap[msgId] = opt;
                        _customAnswerCtrl.text = opt;
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 120),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? _cAccentPurple.withValues(alpha: 0.22) : _cInset,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? _cAccentPurple : _cBorder,
                          width: isSelected ? 1.2 : 0.8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isSelected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                            size: 11,
                            color: isSelected ? _cAccentPurple : _cSecondary,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            opt,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: "PlusJakartaSans",
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? _cAccentPurple : _cPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
            const SizedBox(height: 10),
            // Inline Answer Input & Submit
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: _cInset,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _cBorder, width: 0.8),
                    ),
                    child: TextField(
                      controller: _customAnswerCtrl,
                      style: TextStyle(fontSize: 12, fontFamily: "PlusJakartaSans", color: _cPrimary),
                      decoration: InputDecoration(
                        hintText: options.isNotEmpty ? "Type answer or choose above…" : "Type your answer…",
                        hintStyle: TextStyle(fontSize: 11, fontFamily: "Inter", color: _cSecondary),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      onSubmitted: (_) {
                        final ans = _customAnswerCtrl.text.trim().isNotEmpty
                            ? _customAnswerCtrl.text.trim()
                            : (_selectedQuestionOptionMap[msgId] ?? (options.isNotEmpty ? options.first : "Yes"));
                        widget.onQuestionReplied?.call(reqId, ans);
                        setState(() {
                          _answerSubmittedMap[msgId] = true;
                          _localSubmittedAnswerMap[msgId] = ans;
                        });
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    final ans = _customAnswerCtrl.text.trim().isNotEmpty
                        ? _customAnswerCtrl.text.trim()
                        : (_selectedQuestionOptionMap[msgId] ?? (options.isNotEmpty ? options.first : "Yes"));
                    widget.onQuestionReplied?.call(reqId, ans);
                    setState(() {
                      _answerSubmittedMap[msgId] = true;
                      _localSubmittedAnswerMap[msgId] = ans;
                    });
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF4F46E5)]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.cornerDownLeft, size: 12, color: Colors.white),
                        SizedBox(width: 5),
                        Text(
                          "Reply",
                          style: TextStyle(fontSize: 11.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: Colors.white),
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

    // Question Answered View
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _cCardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _statusSuccessBorder, width: 0.9),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(LucideIcons.checkCircle2, size: 14, color: _statusSuccess),
              const SizedBox(width: 6),
              Text(
                "Question Answered",
                style: TextStyle(fontSize: 12, fontFamily: "Inter", fontWeight: FontWeight.w700, color: _statusSuccess),
              ),
              const Spacer(),
              if (submittedAnswer != null && submittedAnswer.isNotEmpty)
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _statusSuccessBg,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _statusSuccessBorder, width: 0.8),
                    ),
                    child: Text(
                      submittedAnswer,
                      style: TextStyle(fontSize: 11, fontFamily: "PlusJakartaSans", fontWeight: FontWeight.w700, color: _statusSuccess),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            questionText,
            style: TextStyle(
              fontSize: 12,
              fontFamily: "HindSiliguri",
              fontFamilyFallback: kFmvFontFamilyFallback,
              height: 1.4,
              fontWeight: FontWeight.w500,
              color: _cSecondary,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Permission Card ──────────────────────────────────────────────────────────

  Widget _buildPermissionCard(Map<String, dynamic> pData) {
    final msgId = widget.message.id;
    final reqId = (pData["requestID"] ?? pData["id"] ?? "").toString();
    final command = pData["command"]?.toString() ?? pData["description"]?.toString() ?? "run operation";
    final isDecided = pData["answered"] == true || _permissionDecidedMap[msgId] == true;
    final isApproved = _permissionApprovedMap[msgId] == true || pData["decision"] == "approved";

    if (isDecided) {
      final color = isApproved ? _statusSuccess : _statusFailed;
      final bg = isApproved ? _statusSuccessBg : _statusFailedBg;
      final border = isApproved ? _statusSuccessBorder : _statusFailedBorder;

      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8), border: Border.all(color: border, width: 0.9)),
        child: Row(
          children: [
            Icon(isApproved ? LucideIcons.shieldCheck : LucideIcons.shieldX, size: 14, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isApproved ? "Permission Approved: $command" : "Permission Denied: $command",
                style: TextStyle(fontSize: 11.5, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w600, color: color),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    if (!widget.message.isPending) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: _cInset,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: _cBorder, width: 0.8),
        ),
        child: Row(
          children: [
            Icon(LucideIcons.shieldOff, size: 13, color: _cSecondary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                "Permission request expired: Agent stopped",
                style: TextStyle(fontSize: 11.5, fontFamily: "Inter", fontWeight: FontWeight.w500, color: _cSecondary),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFD97706).withValues(alpha: widget.isDark ? 0.08 : 0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.4), width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.shieldAlert, size: 14, color: Color(0xFFD97706)),
              const SizedBox(width: 6),
              const Text(
                "Permission Request",
                style: TextStyle(fontSize: 12, fontFamily: "Inter", fontWeight: FontWeight.w700, color: Color(0xFFD97706)),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  "Confirmation Required",
                  style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: Color(0xFFD97706)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text("The assistant needs permission to execute:", style: TextStyle(fontSize: 12, fontFamily: "Inter", color: _cSecondary)),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: _cInset,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: _cBorder, width: 0.8),
            ),
            child: SelectableText(
              command,
              style: const TextStyle(fontFamily: "JetBrainsMono", fontSize: 11.5, color: Color(0xFFD97706)),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _pillBtn(LucideIcons.check, "Approve", _statusSuccess, true, () {
                  widget.onPermissionDecision?.call(true, command, requestId: reqId);
                  setState(() {
                    _permissionDecidedMap[msgId] = true;
                    _permissionApprovedMap[msgId] = true;
                  });
                }),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _pillBtn(LucideIcons.x, "Deny", _statusFailed, true, () {
                  widget.onPermissionDecision?.call(false, command, requestId: reqId);
                  setState(() {
                    _permissionDecidedMap[msgId] = true;
                    _permissionApprovedMap[msgId] = false;
                  });
                }),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
