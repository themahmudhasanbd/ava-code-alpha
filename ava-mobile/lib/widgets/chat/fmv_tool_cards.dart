part of '../formatted_message_view.dart';

// ─── Tool Cards, Subagent Cards, Todos & Helpers ──────────────────────────────

class _ToolMeta {
  final IconData icon;
  final Color color;
  final Color bg;
  final String label;
  const _ToolMeta(this.icon, this.color, this.bg, this.label);
}

// ignore_for_file: library_private_types_in_public_api, invalid_use_of_protected_member
extension FmvToolCardsExt on _FormattedMessageViewState {
  _ToolMeta _resolveToolMeta(String toolName, String? summary, {bool isFailed = false}) {
    if (isFailed) {
      return _ToolMeta(LucideIcons.circleAlert, _statusFailed, _statusFailedBg, "Failed");
    }

    final t = toolName.toLowerCase().trim();
    final s = (summary ?? "").toLowerCase().trim();
    final combined = "$t $s";

    // 1. Edit / Write / Patch / Create / Update / Save
    if (t == "edit_file" || t == "write_file" || t == "edit" || t == "write" || t == "apply_patch" ||
        combined.contains("edit") || combined.contains("write") || combined.contains("patch") ||
        combined.contains("create") || combined.contains("update") || combined.contains("save_memory")) {
      return _ToolMeta(
        LucideIcons.fileCode2,
        const Color(0xFFE2E8F0),
        const Color(0xFFF59E0B).withValues(alpha: 0.12),
        "Edit",
      );
    }

    // 2. Read / Inspect / Parse / View / Cat
    if (t == "read_file" || t == "file_read" || t == "read" || t == "inspect" ||
        combined.contains("read") || combined.contains("inspect") || combined.contains("parse") ||
        combined.contains("view") || combined.contains("get_context")) {
      return _ToolMeta(
        LucideIcons.fileText,
        const Color(0xFF94A3B8),
        const Color(0xFF94A3B8).withValues(alpha: 0.10),
        "Read",
      );
    }

    // 3. Run / Exec / Bash / Terminal / Cmd / Test / Compile / App Terminal
    if (t == "execute_command" || t == "bash" || t == "run" || t == "exec" || t == "terminal" || t == "app_terminal" ||
        combined.contains("bash") || combined.contains("terminal") || combined.contains("command") ||
        combined.contains("exec") || combined.contains("run") || combined.contains("test") || combined.contains("compile")) {
      return _ToolMeta(
        LucideIcons.terminal,
        const Color(0xFFA5B4FC),
        const Color(0xFF6366F1).withValues(alpha: 0.12),
        "Run",
      );
    }

    // 4. Search / Query / Lookup / Glob / Grep / Find
    if (t == "search_web" || t == "websearch" || t == "glob" || t == "grep" || t == "search" ||
        combined.contains("search") || combined.contains("grep") || combined.contains("glob") ||
        combined.contains("find") || combined.contains("lookup")) {
      return _ToolMeta(
        LucideIcons.search,
        const Color(0xFF7DD3FC),
        const Color(0xFF38BDF8).withValues(alpha: 0.10),
        "Search",
      );
    }

    // 5. Database / SQL / Redis / MySQL / Query Database
    if (t == "query_database" || t == "database" || t == "sql" || t == "db" ||
        combined.contains("database") || combined.contains("sql") || combined.contains("redis") || combined.contains("db")) {
      return _ToolMeta(
        LucideIcons.database,
        const Color(0xFF6EE7B7),
        const Color(0xFF10B981).withValues(alpha: 0.10),
        "SQL Query",
      );
    }

    // 6. Deploy / Canary / Cluster / Cpu / Preview / Sandbox
    if (t == "cluster_exec" || t == "deploy" || t == "preview" || t == "sandbox" ||
        combined.contains("deploy") || combined.contains("canary") || combined.contains("cluster") || combined.contains("preview") || combined.contains("cpu")) {
      return _ToolMeta(
        LucideIcons.cpu,
        const Color(0xFF67E8F9),
        const Color(0xFF06B6D4).withValues(alpha: 0.10),
        "Deploy",
      );
    }

    // 7. Security / Audit / Vulnerability / Shield
    if (t == "vuln_scan" || combined.contains("security") || combined.contains("audit") || combined.contains("shield")) {
      return _ToolMeta(
        LucideIcons.shieldAlert,
        const Color(0xFFFCA5A5),
        const Color(0xFFEF4444).withValues(alpha: 0.10),
        "Security",
      );
    }

    // 8. Speech / Voice / Audio / TTS / STT
    if (t == "speech" || t == "tts" || t == "stt" || combined.contains("voice") || combined.contains("audio") || combined.contains("speech")) {
      return _ToolMeta(
        LucideIcons.mic,
        const Color(0xFFF472B6),
        const Color(0xFFEC4899).withValues(alpha: 0.10),
        "Voice",
      );
    }

    // 9. Web / Browser / Scrape / Webfetch
    if (t == "browser" || t == "webfetch" || t == "scrape" || combined.contains("browser") || combined.contains("web") || combined.contains("http")) {
      return _ToolMeta(
        LucideIcons.globe,
        const Color(0xFF7DD3FC),
        const Color(0xFF38BDF8).withValues(alpha: 0.10),
        "Browser",
      );
    }

    // 10. Subagent / Task
    if (t == "task" || t == "subagent" || t == "invoke_subagent" || combined.contains("subagent")) {
      return _ToolMeta(
        LucideIcons.bot,
        const Color(0xFFC084FC),
        const Color(0xFFA855F7).withValues(alpha: 0.10),
        "Subagent",
      );
    }

    // 11. Manage Task / Schedule
    if (t == "manage_task" || t == "schedule" || combined.contains("task")) {
      return _ToolMeta(
        LucideIcons.layers,
        const Color(0xFFA5B4FC),
        const Color(0xFF6366F1).withValues(alpha: 0.10),
        "Task Manager",
      );
    }

    // 12. Questions & Permissions
    if (combined.contains("question") || combined.contains("permission")) {
      return _ToolMeta(
        LucideIcons.helpCircle,
        const Color(0xFFFCD34D),
        const Color(0xFFF59E0B).withValues(alpha: 0.10),
        "Agent Question",
      );
    }

    // 13. Mail / Postfix
    if (combined.contains("mail") || combined.contains("postfix")) {
      return _ToolMeta(
        LucideIcons.mail,
        const Color(0xFFF472B6),
        const Color(0xFFEC4899).withValues(alpha: 0.10),
        "Mail",
      );
    }

    // 14. cPanel
    if (combined.contains("cpanel")) {
      return _ToolMeta(
        LucideIcons.server,
        const Color(0xFFFDBA74),
        const Color(0xFFF97316).withValues(alpha: 0.10),
        "cPanel",
      );
    }

    // 15. Default Fallback
    return _ToolMeta(
      LucideIcons.command,
      _cSecondary,
      _cSecondary.withValues(alpha: 0.10),
      toolName.isNotEmpty ? toolName : "Tool",
    );
  }
  // ─── Shared helper: extract question data from a tool part ────────────────────

  Map<String, dynamic> _extractQuestionDataFromPart(
      MessagePartModel part, Map<String, dynamic>? msgQuestionData) {
    if (msgQuestionData != null && msgQuestionData.isNotEmpty) return msgQuestionData;
    final input = part.input is Map ? Map<String, dynamic>.from(part.input as Map) : <String, dynamic>{};
    final qList = input['questions'] is List ? (input['questions'] as List) : [];
    final firstQ = qList.isNotEmpty && qList.first is Map ? (qList.first as Map) : null;

    final questionText =
        (firstQ?['question'] ?? firstQ?['header'] ?? input['question'] ?? input['header'] ?? 'Question')
            .toString();

    final rawOpts = firstQ?['options'] is List
        ? (firstQ!['options'] as List)
        : (input['options'] is List ? (input['options'] as List) : []);
    final options = rawOpts.map((o) {
      if (o is Map) return (o['label'] ?? o['description'] ?? o.toString()).toString();
      return o.toString();
    }).toList();

    final reqId = (msgQuestionData?['requestId'] ??
            msgQuestionData?['requestID'] ??
            msgQuestionData?['call_id'] ??
            msgQuestionData?['callID'] ??
            msgQuestionData?['id'] ??
            input['requestId'] ??
            input['requestID'] ??
            input['call_id'] ??
            input['callID'] ??
            input['id'] ??
            part.callId ??
            part.id)
        .toString();
    return {
      'requestID': reqId,
      'id': reqId,
      'question': questionText,
      'options': options,
      'rawQuestions': qList,
      'answered': part.status == 'completed',
    };
  }

  // ─── Borderless Minimalist Tool Step & Clickable File Diff ────────────────────

  Widget _buildToolCardFromPart(MessagePartModel part, {required bool isTurnActive}) {
    final toolName = part.tool ?? "tool";
    final t = toolName.toLowerCase();

    if (t == "question" ||
        t == "ask_question" ||
        t == "default_api:ask_question" ||
        t.contains("question")) {
      final qData = _extractQuestionDataFromPart(part, widget.message.questionData);
      return _buildQuestionCard(qData);
    }

    final isSubagent = t == "task" ||
        t == "subagent" ||
        t == "sub_agent" ||
        t == "invoke_subagent" ||
        (part.input is Map && (part.input as Map).containsKey("subagent_type")) ||
        (part.metadata != null &&
            (part.metadata!.containsKey("subagentType") ||
                part.metadata!.containsKey("subagent_type")));

    if (isSubagent) return _buildSubagentCardFromPart(part, isTurnActive: isTurnActive);

    final bool isManageTask = t == "manage_task" ||
        t == "schedule" ||
        t == "task_manager" ||
        (part.metadata != null &&
            (part.metadata!["background"] == true ||
                part.metadata!["isBackground"] == true ||
                part.metadata!.containsKey("jobId") ||
                part.metadata!.containsKey("taskId")));

    if (isManageTask) return _buildManageTaskCardFromPart(part, isTurnActive: isTurnActive);

    // ── Speech / TTS / Voice Audio Tool Interception ───────────────────────────
    final bool isSpeechTool = t == "speech" || t == "tts" || t == "voice" || t == "text_to_voice";
    String? extractedAudioPath;
    if (part.metadata is Map) {
      extractedAudioPath = part.metadata?["audioPath"]?.toString() ?? part.metadata?["audioUrl"]?.toString();
    }
    if (extractedAudioPath == null && part.output != null && part.output!.isNotEmpty) {
      final audioRegex = RegExp(
        r'(?:https?://[^\s)"]+\.(?:mp3|wav|ogg|m4a|webm|aac)|(?:/[^\s)"]+|file:///[^\s)"]+)\.(?:mp3|wav|ogg|m4a|webm|aac))',
        caseSensitive: false,
      );
      final audioMatch = audioRegex.firstMatch(part.output!);
      if (audioMatch != null) {
        extractedAudioPath = audioMatch.group(0);
      }
    }
    if (isSpeechTool && extractedAudioPath != null && extractedAudioPath.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            VoiceNotePlayerWidget(
              filePath: extractedAudioPath,
              baseUrl: widget.baseUrl,
              isDark: widget.isDark,
            ),
            if (part.input is Map && (part.input as Map)["text"] != null)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 4),
                child: Text(
                  (part.input as Map)["text"].toString(),
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: _cSecondary,
                  ),
                ),
              ),
          ],
        ),
      );
    }
    final bool isExplicitImageTool = t == "generate_image" ||
        t == "edit_image" ||
        t == "generate_asset" ||
        t == "create_banner" ||
        t == "banner_design" ||
        t == "ai_artist" ||
        t == "screenshot" ||
        t == "take_screenshot" ||
        t == "capture_screenshot" ||
        t == "browser_subagent" ||
        t.contains("image") ||
        t.contains("screenshot") ||
        t.contains("banner");

    final List<MessageImageData> extractedImages = [];
    String? imagePrompt;
    String? imageAspectRatio;

    if (part.input != null) {
      if (part.input is Map) {
        final m = part.input as Map;
        imagePrompt = m["Prompt"]?.toString() ?? m["prompt"]?.toString();
        imageAspectRatio = m["AspectRatio"]?.toString() ??
            m["aspectRatio"]?.toString() ??
            m["aspect_ratio"]?.toString();

        final rawPaths = m["ImagePaths"] ??
            m["MediaPaths"] ??
            m["image_paths"] ??
            m["media_paths"] ??
            m["images"];
        if (rawPaths is List) {
          for (final item in rawPaths) {
            if (item != null && item.toString().trim().isNotEmpty) {
              extractedImages.add(MessageImageData(
                urlOrPath: item.toString().trim(),
                prompt: imagePrompt,
                aspectRatio: imageAspectRatio,
                toolName: toolName,
              ));
            }
          }
        }

        final singleTarget = m["TargetFile"]?.toString() ??
            m["targetFile"]?.toString() ??
            m["AbsolutePath"]?.toString() ??
            m["absolutePath"]?.toString() ??
            m["filePath"]?.toString() ??
            m["file_path"]?.toString() ??
            m["ImageName"]?.toString() ??
            m["image_name"]?.toString() ??
            m["path"]?.toString() ??
            m["file"]?.toString();
        if (singleTarget != null && _isImageExtension(singleTarget)) {
          if (!extractedImages.any((img) => img.urlOrPath == singleTarget)) {
            extractedImages.add(MessageImageData(
              urlOrPath: singleTarget,
              prompt: imagePrompt,
              aspectRatio: imageAspectRatio,
              toolName: toolName,
            ));
          }
        }
      } else if (part.input is String && (part.input as String).isNotEmpty) {
        final str = part.input as String;
        if (_isImageExtension(str)) {
          extractedImages.add(MessageImageData(
            urlOrPath: str,
            toolName: toolName,
          ));
        }
      }
    }

    if (part.output != null && part.output!.isNotEmpty) {
      final imgRegex = RegExp(
        r'(?:https?://[^\s)"]+\.(?:png|jpg|jpeg|webp|gif|svg|bmp|ico)|(?:/[^\s)"]+|file:///[^\s)"]+)\.(?:png|jpg|jpeg|webp|gif|svg|bmp|ico))',
        caseSensitive: false,
      );
      final matches = imgRegex.allMatches(part.output!);
      for (final match in matches) {
        final pathFound = match.group(0);
        if (pathFound != null && pathFound.isNotEmpty) {
          if (!extractedImages.any((img) => img.urlOrPath == pathFound)) {
            extractedImages.add(MessageImageData(
              urlOrPath: pathFound,
              prompt: imagePrompt,
              aspectRatio: imageAspectRatio,
              toolName: toolName,
            ));
          }
        }
      }
    }

    if (isExplicitImageTool || (extractedImages.isNotEmpty && (t.contains("view") || t.contains("read") || t.contains("write") || t.contains("file")))) {
      return _buildImageToolCard(
        part,
        extractedImages,
        isTurnActive: isTurnActive,
        prompt: imagePrompt,
        aspectRatio: imageAspectRatio,
      );
    }

    final isExpanded = _expandedState[part.id] ?? false;
    final isFullOutput = _fullOutputExpanded[part.id] ?? false;
    final hasDetails = part.output?.trim().isNotEmpty == true || part.input != null;

    final isPending = isTurnActive && (part.status == "running");
    final isQueued = isTurnActive && (part.status == "pending" || part.status == "queued");
    final isInterrupted = part.status == "interrupted";
    final isFailed = !isInterrupted && (part.status == "failed" || part.status == "error");

    final isFileOperation = t.contains("write") ||
        t.contains("edit") ||
        t.contains("replace") ||
        t.contains("create") ||
        t.contains("patch");

    String? targetFilePath;
    String? targetDiffRemoved;
    String? targetDiffAdded;
    String? instructionDescription;
    String? codeContentWritten;
    String argSummary = "";
    String? rawInputStr;

    if (part.input != null) {
      if (part.input is Map) {
        final m = part.input as Map;
        targetFilePath = m["TargetFile"]?.toString() ??
            m["targetFile"]?.toString() ??
            m["filePath"]?.toString() ??
            m["file_path"]?.toString() ??
            m["filename"]?.toString() ??
            m["file_name"]?.toString() ??
            m["absolutePath"]?.toString() ??
            m["absPath"]?.toString() ??
            m["relativePath"]?.toString() ??
            m["path_to_file"]?.toString() ??
            m["file"]?.toString() ??
            m["path"]?.toString() ??
            m["Target"]?.toString() ??
            m["target"]?.toString() ??
            m["destination"]?.toString() ??
            m["src"]?.toString() ??
            m["dest"]?.toString();

        targetDiffRemoved = m["TargetContent"]?.toString() ??
            m["oldString"]?.toString() ??
            m["old_string"]?.toString();
        targetDiffAdded = m["ReplacementContent"]?.toString() ??
            m["newString"]?.toString() ??
            m["new_string"]?.toString();
        instructionDescription = m["Instruction"]?.toString() ?? m["Description"]?.toString() ?? m["instruction"]?.toString();
        codeContentWritten = m["CodeContent"]?.toString() ??
            m["content"]?.toString() ??
            m["code"]?.toString() ??
            m["patch"]?.toString();

        final cmd = targetFilePath ??
            m["command"]?.toString() ??
            m["query"]?.toString() ??
            m["pattern"]?.toString() ??
            m["url"]?.toString();
        if (cmd != null && cmd.isNotEmpty) argSummary = cmd;
        rawInputStr = m.entries.map((e) => "${e.key}: ${e.value}").join("\n");
      } else if (part.input is String && (part.input as String).isNotEmpty) {
        argSummary = part.input as String;
        rawInputStr = argSummary;
      }
    }

    if ((targetFilePath == null || targetFilePath.isEmpty) && (rawInputStr != null && rawInputStr.isNotEmpty)) {
      final match = RegExp(r'((?:/[a-zA-Z0-9_\-./]+|[a-zA-Z0-9_\-./]+/[a-zA-Z0-9_\-./]+)\.[a-zA-Z0-9]+)').firstMatch(rawInputStr);
      if (match != null) targetFilePath = match.group(1);
    }

    final meta = _resolveToolMeta(toolName, argSummary, isFailed: isFailed);
    final toolIcon = meta.icon;
    final iconColor = meta.color;
    final iconBg = meta.bg;
    final displayLabel = meta.label;

    final Color statusColor = isPending
        ? _statusRunning
        : isFailed
            ? _statusFailed
            : isInterrupted
                ? const Color(0xFFF59E0B)
                : isQueued
                    ? const Color(0xFF94A3B8)
                    : _statusSuccess;
    final Color statusBg = isPending
        ? _statusRunningBg
        : isFailed
            ? _statusFailedBg
            : isInterrupted
                ? const Color(0xFFF59E0B).withValues(alpha: 0.12)
                : isQueued
                    ? const Color(0xFF94A3B8).withValues(alpha: 0.12)
                    : _statusSuccessBg;
    final Color statusBorder = isPending
        ? _statusRunningBorder
        : isFailed
            ? _statusFailedBorder
            : isInterrupted
                ? const Color(0xFFF59E0B).withValues(alpha: 0.35)
                : isQueued
                    ? const Color(0xFF94A3B8).withValues(alpha: 0.3)
                    : _statusSuccessBorder;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      builder: (context, animVal, child) {
        return Opacity(
          opacity: animVal,
          child: Transform.translate(offset: Offset(0, (1 - animVal) * 6), child: child),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Borderless Minimalist Timeline Trigger Line
            InkWell(
              onTap: hasDetails
                  ? () => setState(() => _expandedState[part.id] = !isExpanded)
                  : null,
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(5)),
                      child: Center(child: Icon(toolIcon, size: 12, color: iconColor)),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      displayLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontFamily: "Inter",
                        fontWeight: FontWeight.w600,
                        color: _cPrimary,
                      ),
                    ),
                    if (targetFilePath != null && targetFilePath.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: () {
                          widget.onOpenFile?.call(targetFilePath!, diffOrContent: targetDiffAdded ?? codeContentWritten);
                          setState(() => _expandedState[part.id] = true);
                        },
                        borderRadius: BorderRadius.circular(4),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.35), width: 0.7),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(LucideIcons.fileCode, size: 10, color: Color(0xFF10B981)),
                              const SizedBox(width: 4),
                              Text(
                                _fileNameFromPath(targetFilePath),
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontFamily: "JetBrainsMono",
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF10B981),
                                ),
                              ),
                              const SizedBox(width: 3),
                              const Icon(LucideIcons.externalLink, size: 9, color: Color(0xFF10B981)),
                            ],
                          ),
                        ),
                      ),
                    ] else if (argSummary.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _truncateMiddle(argSummary, 38),
                          style: TextStyle(fontSize: 10.5, fontFamily: "JetBrainsMono", color: _cSecondary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ] else
                      const Spacer(),

                    if (targetFilePath != null && targetFilePath.isNotEmpty) const Spacer(),

                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: statusBorder, width: 0.7),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isPending) ...[
                            _AnimatedToolSpinner(color: statusColor, size: 9.5),
                            const SizedBox(width: 4),
                            Text("Running",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: statusColor)),
                          ] else if (isQueued) ...[
                            Icon(LucideIcons.clock, size: 9.5, color: statusColor),
                            const SizedBox(width: 3.5),
                            Text("Pending",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w600, color: statusColor)),
                          ] else if (isInterrupted) ...[
                            Icon(LucideIcons.circleAlert, size: 10, color: statusColor),
                            const SizedBox(width: 3),
                            Text("Interrupted",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: statusColor)),
                          ] else if (isFailed) ...[
                            Icon(LucideIcons.x, size: 10, color: statusColor),
                            const SizedBox(width: 3),
                            Text("Failed",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: statusColor)),
                          ] else ...[
                            Icon(LucideIcons.check, size: 10, color: statusColor),
                            const SizedBox(width: 3),
                            Text("Done",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: statusColor)),
                          ],
                        ],
                      ),
                    ),
                    if (hasDetails) ...[
                      const SizedBox(width: 6),
                      Icon(isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 13, color: _cFaint),
                    ],
                  ],
                ),
              ),
            ),

            // Indented Details Drawer
            if (isExpanded && hasDetails)
              Container(
                margin: const EdgeInsets.only(left: 11, top: 4, bottom: 6),
                padding: const EdgeInsets.only(left: 12, top: 4, bottom: 4),
                decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: statusColor.withValues(alpha: 0.35), width: 2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // File Operation: Diff Preview
                    if (targetFilePath != null && targetFilePath.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _cCodeBg,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _cBorder.withValues(alpha: 0.6), width: 0.6),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(LucideIcons.fileCode, size: 13, color: Color(0xFF10B981)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    targetFilePath,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontFamily: "JetBrainsMono",
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFFF1F5F9),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                InkWell(
                                  onTap: () {
                                    Clipboard.setData(ClipboardData(text: targetFilePath!));
                                    AppToast.copied(context, "File path copied");
                                  },
                                  borderRadius: BorderRadius.circular(4),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    child: Icon(LucideIcons.copy, size: 12, color: _cFaint),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                InkWell(
                                  onTap: () => widget.onOpenFile?.call(
                                    targetFilePath!,
                                    diffOrContent: targetDiffAdded ?? codeContentWritten,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.18),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.45), width: 0.7),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: const [
                                        Icon(LucideIcons.folderOpen, size: 10, color: Color(0xFF10B981)),
                                        SizedBox(width: 4),
                                        Text("Open in Explorer",
                                            style: TextStyle(fontSize: 10, fontFamily: "Inter", fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (instructionDescription != null && instructionDescription.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                instructionDescription,
                                style: TextStyle(fontSize: 11, fontFamily: "Inter", color: _cSecondary, fontStyle: FontStyle.italic),
                              ),
                            ],
                            if (targetDiffRemoved != null && targetDiffRemoved.trim().isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3), width: 0.6),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("- REMOVED CONTENT",
                                        style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w800, color: Color(0xFFEF4444))),
                                    const SizedBox(height: 4),
                                    SingleChildScrollView(
                                      scrollDirection: Axis.horizontal,
                                      physics: const BouncingScrollPhysics(),
                                      child: Text(targetDiffRemoved.trim(),
                                          softWrap: false,
                                          style: const TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: Color(0xFFFCA5A5), height: 1.45)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (targetDiffAdded != null && targetDiffAdded.trim().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3), width: 0.6),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("+ ADDED / REPLACED CONTENT",
                                        style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w800, color: Color(0xFF10B981))),
                                    const SizedBox(height: 4),
                                    SingleChildScrollView(
                                      scrollDirection: Axis.horizontal,
                                      physics: const BouncingScrollPhysics(),
                                      child: Text(targetDiffAdded.trim(),
                                          softWrap: false,
                                          style: const TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: Color(0xFF86EFAC), height: 1.45)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (codeContentWritten != null && codeContentWritten.trim().isNotEmpty && targetDiffAdded == null) ...[
                              const SizedBox(height: 6),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3), width: 0.6),
                                ),
                                child: SingleChildScrollView(
                                  scrollDirection: Axis.horizontal,
                                  physics: const BouncingScrollPhysics(),
                                  child: Text(codeContentWritten.trim(),
                                      softWrap: false,
                                      style: const TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: Color(0xFF86EFAC), height: 1.45)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],

                    // Generic Input Parameters
                    if (!isFileOperation && rawInputStr != null && rawInputStr.trim().isNotEmpty) ...[
                      Row(
                        children: [
                          Text("INPUT",
                              style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w800, color: _cFaint, letterSpacing: 0.4)),
                          const Spacer(),
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: rawInputStr!));
                              AppToast.copied(context, "Input copied to clipboard");
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(2),
                              child: Icon(LucideIcons.copy, size: 11, color: _cFaint),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: _cInset,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _cBorder, width: 0.6),
                        ),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          child: Text(rawInputStr,
                              softWrap: false,
                              style: TextStyle(fontSize: 11, fontFamily: "JetBrainsMono", color: _cPrimary, height: 1.45)),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],

                    // Output Terminal Viewport
                    if (part.output != null && part.output!.trim().isNotEmpty) ...[
                      Row(
                        children: [
                          Text("OUTPUT",
                              style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w800, color: _cFaint, letterSpacing: 0.4)),
                          const SizedBox(width: 6),
                          Text("(${part.output!.trim().length} chars)",
                              style: TextStyle(fontSize: 9, fontFamily: "JetBrainsMono", color: _cFaint)),
                          const Spacer(),
                          InkWell(
                            onTap: () => setState(() => _fullOutputExpanded[part.id] = !isFullOutput),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              child: Text(
                                isFullOutput ? "Collapse" : "Expand Full",
                                style: TextStyle(fontSize: 10, fontFamily: "Inter", fontWeight: FontWeight.w600, color: _cAccentPurple),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: part.output!));
                              AppToast.copied(context, "Output copied to clipboard");
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(2),
                              child: Icon(LucideIcons.copy, size: 11, color: _cFaint),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        width: double.infinity,
                        constraints: BoxConstraints(maxHeight: isFullOutput ? double.infinity : 200),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _cCodeBg,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _cBorder, width: 0.6),
                        ),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.vertical,
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Text(
                              part.output!.trim(),
                              softWrap: false,
                              style: const TextStyle(fontSize: 11.5, fontFamily: "JetBrainsMono", color: Color(0xFFF1F5F9), height: 1.5),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ─── Subagent Deployment Card ─────────────────────────────────────────────────

  Widget _buildSubagentCardFromPart(MessagePartModel part, {required bool isTurnActive}) {
    Map<String, dynamic> inputMap = {};
    if (part.input is Map) inputMap = Map<String, dynamic>.from(part.input as Map);
    final metaMap = part.metadata ?? {};

    final String subagentType =
        (inputMap["subagent_type"] ?? metaMap["subagentType"] ?? metaMap["subagent_type"] ?? inputMap["agent"] ?? inputMap["role"] ?? "agent")
            .toString();

    final String taskDescription =
        (inputMap["description"] ?? metaMap["description"] ?? metaMap["title"] ?? (part.text.isNotEmpty ? part.text : "Autonomous Subagent Task"))
            .toString();

    final String taskPrompt = (inputMap["prompt"] ?? "").toString();

    final String? childSessionId = metaMap["sessionId"]?.toString() ??
        metaMap["session_id"]?.toString() ??
        inputMap["task_id"]?.toString() ??
        inputMap["taskId"]?.toString() ??
        inputMap["sessionId"]?.toString();

    final bool isBackground =
        inputMap["background"] == true || metaMap["background"] == true || inputMap["background"]?.toString().toLowerCase() == "true";

    final isRunning = isTurnActive && (part.status == "running" || part.status == "pending" || part.status == "queued");
    final isInterrupted = part.status == "interrupted";
    final isFailed = !isInterrupted && (part.status == "failed" || part.status == "error");

    final isExpanded = _expandedState[part.id] ?? false;
    final isFullOutput = _fullOutputExpanded[part.id] ?? false;

    IconData subagentIcon = LucideIcons.bot;
    Color subagentColor = const Color(0xFFA855F7);
    String roleLabel = "Autonomous Assistant";

    switch (subagentType.toLowerCase()) {
      case "explore":
      case "explorer":
        subagentIcon = LucideIcons.search;
        subagentColor = const Color(0xFF10B981);
        roleLabel = "Codebase Researcher";
      case "build":
      case "builder":
        subagentIcon = LucideIcons.hammer;
        subagentColor = const Color(0xFF6366F1);
        roleLabel = "Software Engineer";
      case "plan":
      case "planner":
        subagentIcon = LucideIcons.compass;
        subagentColor = const Color(0xFF38BDF8);
        roleLabel = "Architect & Planner";
      case "chat":
        subagentIcon = LucideIcons.messageSquare;
        subagentColor = const Color(0xFFEC4899);
        roleLabel = "Conversational Partner";
      case "triage":
        subagentIcon = LucideIcons.circleAlert;
        subagentColor = const Color(0xFFF59E0B);
        roleLabel = "Issue Triager";
      default:
        subagentIcon = LucideIcons.bot;
        subagentColor = const Color(0xFFA855F7);
        roleLabel = "Autonomous Assistant";
    }

    final Color statusColor = isRunning
        ? _statusRunning
        : isFailed
            ? _statusFailed
            : isInterrupted
                ? const Color(0xFFF59E0B)
                : _statusSuccess;

    final String statusText = isRunning
        ? (isBackground ? "BG RUNNING" : "RUNNING")
        : isFailed
            ? "FAILED"
            : isInterrupted
                ? "STOPPED"
                : "COMPLETED";

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: _cCardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isRunning
              ? subagentColor.withValues(alpha: 0.55)
              : subagentColor.withValues(alpha: widget.isDark ? 0.28 : 0.20),
          width: isRunning ? 1.2 : 0.9,
        ),
        boxShadow: [
          if (isRunning)
            BoxShadow(
              color: subagentColor.withValues(alpha: widget.isDark ? 0.12 : 0.08),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: subagentColor.withValues(alpha: widget.isDark ? 0.10 : 0.05),
              border: Border(bottom: BorderSide(color: subagentColor.withValues(alpha: widget.isDark ? 0.18 : 0.12), width: 0.8)),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: subagentColor.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: subagentColor.withValues(alpha: 0.4), width: 0.8),
                  ),
                  child: Center(child: Icon(subagentIcon, size: 16, color: subagentColor)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Text("SUBAGENT DEPLOYED",
                              style: TextStyle(fontSize: 10.0, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w800, letterSpacing: 0.6, color: subagentColor)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(color: subagentColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(5)),
                            child: Text("@${subagentType.toLowerCase()}",
                                style: TextStyle(fontSize: 9.5, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700, color: subagentColor)),
                          ),
                          if (isBackground) ...[
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(color: const Color(0xFF06B6D4).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
                              child: const Text("BG",
                                  style: TextStyle(fontSize: 8.5, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w800, color: Color(0xFF06B6D4))),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(roleLabel, style: TextStyle(fontSize: 11.0, fontFamily: "Inter", color: _cSecondary)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withValues(alpha: 0.35), width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isRunning) ...[
                        _AnimatedToolSpinner(color: statusColor, size: 10.5),
                        const SizedBox(width: 5),
                      ] else ...[
                        Icon(
                          isFailed ? LucideIcons.circleAlert : isInterrupted ? LucideIcons.circleStop : LucideIcons.check,
                          size: 11,
                          color: statusColor,
                        ),
                        const SizedBox(width: 4),
                      ],
                      Text(statusText,
                          style: TextStyle(fontSize: 9.5, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700, letterSpacing: 0.3, color: statusColor)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Body
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 2),
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(color: subagentColor.withValues(alpha: 0.12), shape: BoxShape.circle),
                      child: Icon(LucideIcons.arrowRight, size: 11, color: subagentColor),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(taskDescription,
                          style: TextStyle(fontSize: 13.0, fontFamily: "PlusJakartaSans", fontWeight: FontWeight.w600, color: _cPrimary, height: 1.35)),
                    ),
                  ],
                ),

                if (childSessionId != null && childSessionId.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () {
                      if (widget.onOpenSession != null) {
                        widget.onOpenSession!(childSessionId);
                      } else {
                        AppToast.info(context, "Subagent Session: $childSessionId");
                      }
                    },
                    borderRadius: BorderRadius.circular(9),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: subagentColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(color: subagentColor.withValues(alpha: 0.3), width: 0.8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.externalLink, size: 12, color: subagentColor),
                          const SizedBox(width: 6),
                          Text("View Subagent Session",
                              style: TextStyle(fontSize: 11, fontFamily: "PlusJakartaSans", fontWeight: FontWeight.w700, color: subagentColor)),
                          const SizedBox(width: 8),
                          Text(
                            childSessionId.length > 18 ? "#${childSessionId.substring(0, 16)}…" : "#$childSessionId",
                            style: TextStyle(fontSize: 9.5, fontFamily: "JetBrainsMono", color: _cSecondary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],

                if (taskPrompt.trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: () => setState(() => _expandedState[part.id] = !isExpanded),
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(isExpanded ? LucideIcons.chevronDown : LucideIcons.chevronRight, size: 13, color: _cSecondary),
                          const SizedBox(width: 4),
                          Text(isExpanded ? "Hide Directive" : "Show Subagent Directive",
                              style: TextStyle(fontSize: 11, fontFamily: "PlusJakartaSans", fontWeight: FontWeight.w600, color: _cSecondary)),
                        ],
                      ),
                    ),
                  ),
                  if (isExpanded) ...[
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: _cInset,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _cBorder.withValues(alpha: 0.5), width: 0.6),
                      ),
                      child: SelectableText(taskPrompt,
                          style: TextStyle(fontSize: 11.5, fontFamily: "Inter", color: _cSecondary, height: 1.45)),
                    ),
                  ],
                ],

                if (part.output != null && part.output!.trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: _cInset,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _cBorder.withValues(alpha: 0.6), width: 0.8),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: widget.isDark ? const Color(0xFF141926) : const Color(0xFFF1F5F9),
                            border: Border(bottom: BorderSide(color: _cBorder.withValues(alpha: 0.4), width: 0.6)),
                          ),
                          child: Row(
                            children: [
                              Icon(LucideIcons.fileText, size: 12, color: subagentColor),
                              const SizedBox(width: 6),
                              Text("SUBAGENT OUTPUT",
                                  style: TextStyle(fontSize: 10.0, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700, letterSpacing: 0.5, color: _cSecondary)),
                              const Spacer(),
                              InkWell(
                                onTap: () {
                                  Clipboard.setData(ClipboardData(text: part.output!));
                                  AppToast.copied(context, "Subagent output copied");
                                },
                                borderRadius: BorderRadius.circular(4),
                                child: Padding(padding: const EdgeInsets.all(3), child: Icon(LucideIcons.copy, size: 12, color: _cSecondary)),
                              ),
                            ],
                          ),
                        ),
                         Padding(
                          padding: const EdgeInsets.all(10),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxHeight: isFullOutput ? double.infinity : 220),
                            child: SingleChildScrollView(
                              physics: const BouncingScrollPhysics(),
                              child: SelectableText(part.output!.trim(),
                                  style: TextStyle(fontSize: 11.5, fontFamily: "JetBrainsMono", color: _cPrimary, height: 1.45)),
                            ),
                          ),
                        ),
                        if (part.output!.length > 400 && !isFullOutput)
                          InkWell(
                            onTap: () => setState(() => _fullOutputExpanded[part.id] = true),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 5),
                              alignment: Alignment.center,
                              color: subagentColor.withValues(alpha: 0.06),
                              child: Text("Expand Full Output",
                                  style: TextStyle(fontSize: 10.5, fontFamily: "PlusJakartaSans", fontWeight: FontWeight.w700, color: subagentColor)),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Agent Execution Todos / Task Checklist ───────────────────────────────────

  Widget _buildTodosCard(MessagePartModel part, {required bool isTurnActive}) {
    List<dynamic> rawTodos = [];
    if (part.input is Map && (part.input as Map).containsKey('todos')) {
      final t = (part.input as Map)['todos'];
      if (t is List) rawTodos = t;
    } else if (part.input is List) {
      rawTodos = part.input as List;
    }

    if (rawTodos.isEmpty) return _buildToolCardFromPart(part, isTurnActive: isTurnActive);

    final isExpanded = _expandedState[part.id] ?? true;
    final completedCount = rawTodos.where((t) {
      if (t is Map) {
        final s = t['status']?.toString();
        return s == 'completed' || s == 'done' || t['completed'] == true;
      }
      return false;
    }).length;
    final totalCount = rawTodos.length;
    final progress = totalCount > 0 ? (completedCount / totalCount) : 0.0;

    const accentIndigo = Color(0xFF6366F1);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: _cCardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: accentIndigo.withValues(alpha: isTurnActive ? 0.4 : 0.2), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expandedState[part.id] = !isExpanded),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(color: accentIndigo.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(5)),
                    child: const Center(child: Icon(LucideIcons.listChecks, size: 13, color: accentIndigo)),
                  ),
                  const SizedBox(width: 8),
                  const Text("Execution Tasks",
                      style: TextStyle(fontSize: 12, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w700, color: accentIndigo)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: accentIndigo.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                    child: Text("$completedCount/$totalCount done",
                        style: const TextStyle(fontSize: 10, fontFamily: "JetBrainsMono", fontWeight: FontWeight.w600, color: accentIndigo)),
                  ),
                  const Spacer(),
                  Icon(isExpanded ? LucideIcons.chevronDown : LucideIcons.chevronRight, size: 14, color: _cFaint),
                ],
              ),
            ),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              minHeight: 2.5,
              backgroundColor: _cBorder.withValues(alpha: 0.5),
              valueColor: const AlwaysStoppedAnimation<Color>(accentIndigo),
            ),
          ),
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: rawTodos.map((item) {
                  String content = 'Task';
                  String status = 'pending';
                  if (item is Map) {
                    content = item['content']?.toString() ?? item['task']?.toString() ?? item['title']?.toString() ?? 'Task';
                    status = item['status']?.toString() ?? (item['completed'] == true ? 'completed' : 'pending');
                  } else if (item != null) {
                    content = item.toString();
                  }

                  final isDone = status == 'completed' || status == 'done';
                  final isInProgress = isTurnActive && (status == 'in_progress' || status == 'running');

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: isDone
                                ? const Color(0xFF10B981)
                                : isInProgress
                                    ? const Color(0xFF38BDF8).withValues(alpha: 0.2)
                                    : Colors.transparent,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: isDone ? const Color(0xFF10B981) : isInProgress ? const Color(0xFF38BDF8) : _cFaint,
                              width: 1.2,
                            ),
                          ),
                          child: Center(
                            child: isDone
                                ? const Icon(LucideIcons.check, size: 10, color: Colors.white)
                                : isInProgress
                                    ? const SizedBox(
                                        width: 8,
                                        height: 8,
                                        child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF38BDF8)),
                                      )
                                    : null,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            content,
                            style: TextStyle(
                              fontSize: 12,
                              fontFamily: "PlusJakartaSans",
                              fontWeight: isInProgress ? FontWeight.w700 : FontWeight.w500,
                              decoration: isDone ? TextDecoration.lineThrough : null,
                              color: isDone ? _cFaint : isInProgress ? _cPrimary : _cSecondary,
                            ),
                          ),
                        ),
                        if (isInProgress)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(color: const Color(0xFF38BDF8).withValues(alpha: 0.14), borderRadius: BorderRadius.circular(4)),
                            child: const Text("In Progress",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w700, color: Color(0xFF38BDF8))),
                          )
                        else if (isDone)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                            child: const Text("Done",
                                style: TextStyle(fontSize: 9.5, fontFamily: "Inter", fontWeight: FontWeight.w600, color: Color(0xFF10B981))),
                          ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Legacy Timeline Fallback ─────────────────────────────────────────────────

  Widget _buildLegacyToolTimeline(List<AgentTimelineEvent> events, {required bool isTurnActive}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: events.map((ev) {
        return _buildToolCardFromPart(
          MessagePartModel(
            id: ev.id,
            type: "tool",
            status: ev.status,
            tool: ev.title,
            input: ev.command,
            output: ev.details,
            timestamp: ev.timestamp,
          ),
          isTurnActive: isTurnActive,
        );
      }).toList(),
    );
  }

  // ─── Shared Helpers ───────────────────────────────────────────────────────────

  Widget _pillBtn(IconData icon, String label, Color color, bool enabled, VoidCallback onTap) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: _cInset,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: enabled ? color.withValues(alpha: 0.6) : _cBorder, width: 0.8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: enabled ? color : _cFaint),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(fontSize: 12, fontFamily: "Inter", fontWeight: FontWeight.w700, color: enabled ? color : _cFaint),
            ),
          ],
        ),
      ),
    );
  }

  String _fileNameFromPath(String path) {
    final clean = path.replaceAll(r"\", "/");
    final last = clean.split("/").last;
    return last.isNotEmpty ? last : path;
  }

  String _truncateMiddle(String text, int maxChars) {
    if (text.length <= maxChars) return text;
    final half = (maxChars - 3) ~/ 2;
    return "${text.substring(0, half)}...${text.substring(text.length - half)}";
  }

  bool _isImageExtension(String path) {
    final lower = path.toLowerCase().split("?").first;
    return lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".svg") ||
        lower.endsWith(".bmp") ||
        lower.endsWith(".ico") ||
        lower.endsWith(".avif") ||
        lower.endsWith(".heic");
  }

  // ─── Image Generation & Media Preview Tool Card ──────────────────────────────

  Widget _buildImageToolCard(
    MessagePartModel part,
    List<MessageImageData> images, {
    required bool isTurnActive,
    String? prompt,
    String? aspectRatio,
  }) {
    final toolName = part.tool ?? "generate_image";
    final isExpanded = _expandedState[part.id] ?? false;
    final isFullOutput = _fullOutputExpanded[part.id] ?? false;
    final isPending = isTurnActive && (part.status == "running");
    final isQueued = isTurnActive && (part.status == "pending" || part.status == "queued");
    final isInterrupted = part.status == "interrupted";
    final isFailed = !isInterrupted && (part.status == "failed" || part.status == "error");

    const accentColor = Color(0xFFA855F7); // Purple / Magenta for creative AI visual tools
    final Color statusColor = isPending
        ? _statusRunning
        : isFailed
            ? _statusFailed
            : isInterrupted
                ? const Color(0xFFF59E0B)
                : isQueued
                    ? const Color(0xFF94A3B8)
                    : _statusSuccess;
    final Color statusBg = isPending
        ? _statusRunningBg
        : isFailed
            ? _statusFailedBg
            : isInterrupted
                ? const Color(0xFFF59E0B).withValues(alpha: 0.12)
                : isQueued
                    ? const Color(0xFF94A3B8).withValues(alpha: 0.12)
                    : _statusSuccessBg;
    final Color statusBorder = isPending
        ? _statusRunningBorder
        : isFailed
            ? _statusFailedBorder
            : isInterrupted
                ? const Color(0xFFF59E0B).withValues(alpha: 0.35)
                : isQueued
                    ? const Color(0xFF94A3B8).withValues(alpha: 0.3)
                    : _statusSuccessBorder;

    final String statusText = isPending
        ? "Generating..."
        : isQueued
            ? "Queued"
            : isFailed
                ? "Failed"
                : isInterrupted
                    ? "Stopped"
                    : "Done";

    final hasOutputLogs = part.output != null && part.output!.trim().isNotEmpty;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: _cCardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isPending
              ? accentColor.withValues(alpha: 0.55)
              : accentColor.withValues(alpha: widget.isDark ? 0.25 : 0.18),
          width: isPending ? 1.2 : 0.9,
        ),
        boxShadow: [
          if (isPending)
            BoxShadow(
              color: accentColor.withValues(alpha: widget.isDark ? 0.12 : 0.08),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: widget.isDark ? 0.10 : 0.05),
              border: Border(
                bottom: BorderSide(
                  color: accentColor.withValues(alpha: widget.isDark ? 0.18 : 0.12),
                  width: 0.8,
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: accentColor.withValues(alpha: 0.4), width: 0.8),
                  ),
                  child: const Center(
                    child: Icon(LucideIcons.sparkles, size: 13, color: accentColor),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  toolName.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontFamily: "JetBrainsMono",
                    fontWeight: FontWeight.w800,
                    color: accentColor,
                    letterSpacing: 0.4,
                  ),
                ),
                if (aspectRatio != null && aspectRatio.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      aspectRatio,
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontFamily: "JetBrainsMono",
                        fontWeight: FontWeight.w700,
                        color: accentColor,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: statusBorder, width: 0.7),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isPending) ...[
                        SizedBox(
                          width: 8,
                          height: 8,
                          child: CircularProgressIndicator(strokeWidth: 1.2, color: statusColor),
                        ),
                        const SizedBox(width: 4),
                      ] else ...[
                        Icon(
                          isFailed
                              ? LucideIcons.x
                              : isInterrupted
                                  ? LucideIcons.circleAlert
                                  : LucideIcons.check,
                          size: 10,
                          color: statusColor,
                        ),
                        const SizedBox(width: 3),
                      ],
                      Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 9.5,
                          fontFamily: "Inter",
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Main Card Content: Image Preview or Generator Shimmer
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Prompt Banner
                if (prompt != null && prompt.trim().isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: _cInset,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _cBorder.withValues(alpha: 0.6), width: 0.6),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(LucideIcons.quote, size: 12, color: accentColor),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            prompt.trim(),
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: "Inter",
                              fontStyle: FontStyle.italic,
                              color: _cPrimary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // Direct In-Message Image Preview or Multi-Image Gallery
                if (images.isNotEmpty)
                  MessageImageGallery(
                    images: images,
                    baseUrl: widget.baseUrl,
                    isDark: widget.isDark,
                    cardBg: _cCardBg,
                    borderColor: _cBorder,
                    textPrimary: _cPrimary,
                    textSecondary: _cSecondary,
                    onOpenFile: widget.onOpenFile,
                  )
                else if (isPending) ...[
                  // Shimmer Generating Placeholder
                  Container(
                    height: 150,
                    decoration: BoxDecoration(
                      color: widget.isDark ? const Color(0xFF0F141E) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: accentColor.withValues(alpha: 0.3), width: 0.8),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.2,
                              color: accentColor,
                            ),
                          ),
                          SizedBox(height: 10),
                          Text(
                            "AI Image Generator synthesizing visual...",
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: "Inter",
                              fontWeight: FontWeight.w600,
                              color: accentColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],

                // Optional Output Logs Toggle
                if (hasOutputLogs) ...[
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () => setState(() => _expandedState[part.id] = !isExpanded),
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          Icon(
                            isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                            size: 13,
                            color: _cSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isExpanded ? "Hide Execution Logs" : "Show Execution Logs",
                            style: TextStyle(
                              fontSize: 10.5,
                              fontFamily: "Inter",
                              fontWeight: FontWeight.w600,
                              color: _cSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isExpanded) ...[
                    const SizedBox(height: 4),
                    Container(
                      width: double.infinity,
                      constraints: BoxConstraints(maxHeight: isFullOutput ? double.infinity : 160),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _cCodeBg,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: _cBorder, width: 0.6),
                      ),
                      child: SingleChildScrollView(
                        child: SelectableText(
                          part.output!.trim(),
                          style: const TextStyle(
                            fontSize: 11,
                            fontFamily: "JetBrainsMono",
                            color: Color(0xFFF1F5F9),
                            height: 1.45,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Specialized Manage Task & Background Task Tool Card ─────────────────────

  Widget _buildManageTaskCardFromPart(MessagePartModel part, {required bool isTurnActive}) {
    final toolName = part.tool ?? "manage_task";
    final t = toolName.toLowerCase();
    Map<String, dynamic> inputMap = {};
    if (part.input is Map) inputMap = Map<String, dynamic>.from(part.input as Map);
    final metaMap = part.metadata ?? {};

    final String action = (inputMap["action"] ?? metaMap["action"] ?? (t == "schedule" ? "schedule" : "status")).toString().toLowerCase();
    final String? taskId = inputMap["task_id"]?.toString() ??
        inputMap["taskId"]?.toString() ??
        metaMap["taskId"]?.toString() ??
        metaMap["task_id"]?.toString() ??
        metaMap["jobId"]?.toString();

    final bool isRunning = isTurnActive && (part.status == "running" || part.status == "pending" || part.status == "queued");
    final bool isFailed = part.status == "failed" || part.status == "error";
    final bool isInterrupted = part.status == "interrupted";

    final isExpanded = _expandedState[part.id] ?? false;

    final Color accentColor = isRunning
        ? const Color(0xFF6366F1)
        : (isFailed
            ? const Color(0xFFEF4444)
            : (isInterrupted ? const Color(0xFFF59E0B) : const Color(0xFF10B981)));

    IconData actionIcon = LucideIcons.layers;
    String actionLabel = "Task Manager";
    if (action == "list") {
      actionIcon = LucideIcons.listFilter;
      actionLabel = "LIST TASKS";
    } else if (action == "status") {
      actionIcon = LucideIcons.activity;
      actionLabel = "TASK STATUS";
    } else if (action == "kill") {
      actionIcon = LucideIcons.square;
      actionLabel = "KILL TASK";
    } else if (action == "wait") {
      actionIcon = LucideIcons.clock;
      actionLabel = "WAIT TASK";
    } else if (action == "send_input") {
      actionIcon = LucideIcons.cornerDownLeft;
      actionLabel = "SEND INPUT";
    } else if (t == "schedule") {
      actionIcon = LucideIcons.timer;
      actionLabel = "SCHEDULE TIMER";
    }

    final String? logPath = metaMap["logPath"]?.toString() ??
        metaMap["log_file"]?.toString() ??
        metaMap["log_path"]?.toString() ??
        inputMap["logPath"]?.toString();

    final hasOutput = part.output != null && part.output!.trim().isNotEmpty;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: _cCardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRunning
              ? accentColor.withValues(alpha: 0.5)
              : (widget.isDark ? const Color(0xFF2E2E3E) : const Color(0xFFE2E8F0)),
          width: isRunning ? 1.1 : 0.85,
        ),
        boxShadow: [
          if (isRunning)
            BoxShadow(
              color: accentColor.withValues(alpha: widget.isDark ? 0.14 : 0.08),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          InkWell(
            onTap: hasOutput ? () => setState(() => _expandedState[part.id] = !isExpanded) : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: widget.isDark ? 0.18 : 0.12),
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: Icon(actionIcon, size: 13, color: accentColor),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    actionLabel,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontFamily: "JetBrainsMono",
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                      color: accentColor,
                    ),
                  ),
                  if (taskId != null && taskId.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: widget.isDark ? const Color(0xFF262633) : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        taskId,
                        style: TextStyle(
                          fontSize: 9.5,
                          fontFamily: "JetBrainsMono",
                          fontWeight: FontWeight.w600,
                          color: _cPrimary,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  // Status Pill with animated spinner when running
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: accentColor.withValues(alpha: 0.35), width: 0.8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isRunning) ...[
                          _AnimatedToolSpinner(color: accentColor, size: 10),
                          const SizedBox(width: 4),
                          Text(
                            "RUNNING",
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: "JetBrainsMono",
                              fontWeight: FontWeight.w800,
                              color: accentColor,
                            ),
                          ),
                        ] else if (isFailed) ...[
                          const Icon(LucideIcons.x, size: 10, color: Color(0xFFEF4444)),
                          const SizedBox(width: 3),
                          const Text(
                            "FAILED",
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: "JetBrainsMono",
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFEF4444),
                            ),
                          ),
                        ] else if (isInterrupted) ...[
                          const Icon(LucideIcons.circleAlert, size: 10, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 3),
                          const Text(
                            "STOPPED",
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: "JetBrainsMono",
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFF59E0B),
                            ),
                          ),
                        ] else ...[
                          const Icon(LucideIcons.check, size: 10, color: Color(0xFF10B981)),
                          const SizedBox(width: 3),
                          const Text(
                            "DONE",
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: "JetBrainsMono",
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF10B981),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (hasOutput) ...[
                    const SizedBox(width: 4),
                    Icon(
                      isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                      size: 13,
                      color: _cFaint,
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Log Path & Metadata row
          if (logPath != null && logPath.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 10, right: 10, bottom: 6),
              child: Row(
                children: [
                  const Icon(LucideIcons.fileText, size: 10.5, color: Color(0xFF64748B)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      logPath,
                      style: TextStyle(
                        fontFamily: "JetBrainsMono",
                        fontSize: 9.5,
                        color: _cSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: logPath));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Log path copied to clipboard"),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(2),
                      child: Icon(LucideIcons.copy, size: 10, color: _cFaint),
                    ),
                  ),
                ],
              ),
            ),

          // Output Drawer
          if (isExpanded && hasOutput)
            Container(
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF0F0F15) : const Color(0xFF1E293B),
                border: Border(top: BorderSide(color: widget.borderColor, width: 0.5)),
              ),
              padding: const EdgeInsets.all(10),
              child: SelectableText(
                part.output!.trim(),
                style: const TextStyle(
                  fontSize: 10.5,
                  fontFamily: "JetBrainsMono",
                  color: Color(0xFFF1F5F9),
                  height: 1.45,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Rotating tool spinner indicator providing smooth 60fps rotation animation for active tools.
class _AnimatedToolSpinner extends StatefulWidget {
  final Color color;
  final double size;

  const _AnimatedToolSpinner({
    this.color = const Color(0xFF6366F1),
    this.size = 12,
  });

  @override
  State<_AnimatedToolSpinner> createState() => _AnimatedToolSpinnerState();
}

class _AnimatedToolSpinnerState extends State<_AnimatedToolSpinner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _controller,
      child: Icon(LucideIcons.loader2, size: widget.size, color: widget.color),
    );
  }
}

