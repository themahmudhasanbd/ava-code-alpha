part of '../formatted_message_view.dart';

// ─── Codex Style Agent Header, Status Indicators & Dynamic Error Card ──────────

// ignore_for_file: library_private_types_in_public_api, invalid_use_of_protected_member
extension FmvAgentHeaderExt on _FormattedMessageViewState {
  // ─── AvA Codex Agent Header ──────────────────────────────────────────────────

  Widget _buildAgentHeader(ChatMessageModel msg, {required bool isTurnActive}) {
    final String? modelName = msg.modelName;
    final bool hasModel = modelName != null &&
        modelName.isNotEmpty &&
        modelName != 'Session Manager' &&
        modelName != 'compaction' &&
        !modelName.startsWith('Loading');

    return Row(
      children: [
        buildAvaLogoAvatar(
          size: 24,
          radius: 7,
          awake: isTurnActive,
          gaze: isTurnActive ? MascotGaze.right : MascotGaze.up,
        ),
        const SizedBox(width: 8),
        Text(
          "AvA",
          style: TextStyle(
            fontSize: 13.5,
            fontFamily: "Inter",
            fontWeight: FontWeight.w800,
            color: _cPrimary,
          ),
        ),
        if (hasModel) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: _cAccentPurple.withValues(alpha: widget.isDark ? 0.16 : 0.09),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: _cAccentPurple.withValues(alpha: 0.3),
                width: 0.7,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.cpu, size: 10, color: _cAccentPurple),
                const SizedBox(width: 4),
                Text(
                  modelName,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontFamily: "JetBrainsMono",
                    fontWeight: FontWeight.w700,
                    color: _cAccentPurple,
                  ),
                ),
              ],
            ),
          ),
        ],
        const Spacer(),
        if (msg.timestamp.isNotEmpty)
          Text(
            msg.timestamp,
            style: TextStyle(
              fontSize: 10.5,
              fontFamily: "Inter",
              fontWeight: FontWeight.w500,
              color: _cFaint,
            ),
          ),
        const SizedBox(width: 6),
        InkWell(
          onTap: () {
            final String copyText = msg.text.trim().isNotEmpty
                ? msg.text
                : msg.parts.where((p) => p.text.trim().isNotEmpty).map((p) => p.text).join('\n\n');
            Clipboard.setData(ClipboardData(text: copyText));
            AppToast.copied(context, "Copied response to clipboard");
          },
          borderRadius: BorderRadius.circular(4),
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: Icon(LucideIcons.copy, size: 13, color: _cFaint),
          ),
        ),
      ],
    );
  }

  // ─── Working Shimmer Indicator ──────────────────────────────────────────────

  Widget _buildAestheticCookingIndicator([String? statusText]) {
    final text = (statusText != null && statusText.isNotEmpty) ? statusText : "Working…";
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const OrganicBlobGlowLoader(
            size: 14,
            primaryColor: Color(0xFF6366F1),
            secondaryColor: Color(0xFF8B5CF6),
          ),
          const SizedBox(width: 8),
          _buildShimmerText(text),
        ],
      ),
    );
  }

  // ─── Pending Shimmer (Real-time Stream Timeline Indicator) ───────────────────

  Widget _buildPendingShimmer([ChatMessageModel? msg]) {
    final String statusText = msg?.currentExecutionStatus ?? "Analyzing prompt & context…";

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const OrganicBlobGlowLoader(
            size: 16,
            primaryColor: Color(0xFF6366F1),
            secondaryColor: Color(0xFF8B5CF6),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _cAccentPurple.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _cAccentPurple.withValues(alpha: 0.20), width: 0.8),
            ),
            child: _buildShimmerText(statusText),
          ),
        ],
      ),
    );
  }

  // ─── Dynamic Backend Error Card (Direct from Core Engine) ───────────────────

  Widget _buildErrorCard(String message) {
    const red = Color(0xFFEF4444);
    final bg = widget.isDark ? red.withValues(alpha: 0.08) : const Color(0xFFFEF2F2);
    final borderC = red.withValues(alpha: widget.isDark ? 0.35 : 0.25);

    final lines = message.split('\n');
    final bool isMultiLine = lines.length > 2;
    final String headline = lines.first.trim();
    final String detail = isMultiLine ? lines.skip(1).join('\n').trim() : '';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderC, width: 1.0),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Stripe
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: red.withValues(alpha: widget.isDark ? 0.14 : 0.08),
              border: Border(bottom: BorderSide(color: borderC, width: 0.7)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: red.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.triangleAlert, size: 12, color: red),
                ),
                const SizedBox(width: 8),
                const Text(
                  "Execution Error",
                  style: TextStyle(
                    fontSize: 11.5,
                    fontFamily: "Inter",
                    fontWeight: FontWeight.w800,
                    color: red,
                    letterSpacing: 0.2,
                  ),
                ),
                const Spacer(),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: message));
                    AppToast.copied(context, "Error details copied");
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(LucideIcons.copy, size: 12, color: widget.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          // Body with dynamic error message
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SelectableText(
                  headline.isNotEmpty ? headline : message,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontFamily: "HindSiliguri",
                    fontFamilyFallback: kFmvFontFamilyFallback,
                    fontWeight: FontWeight.w600,
                    height: 1.45,
                    color: widget.textPrimary,
                  ),
                ),
                if (detail.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: widget.isDark
                          ? Colors.black.withValues(alpha: 0.3)
                          : Colors.black.withValues(alpha: 0.04),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(color: borderC.withValues(alpha: 0.4), width: 0.7),
                    ),
                    child: SelectableText(
                      detail,
                      style: TextStyle(
                        fontSize: 11,
                        fontFamily: "JetBrainsMono",
                        height: 1.45,
                        color: widget.textSecondary,
                      ),
                    ),
                  ),
                ],
                if (widget.onRetry != null) ...[
                  const SizedBox(height: 10),
                  InkWell(
                    onTap: widget.onRetry,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.13),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.refreshCw, size: 11, color: Color(0xFF818CF8)),
                          SizedBox(width: 5),
                          Text(
                            "Retry Turn",
                            style: TextStyle(
                              fontSize: 11.5,
                              fontFamily: "Inter",
                              color: Color(0xFF818CF8),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
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
}
