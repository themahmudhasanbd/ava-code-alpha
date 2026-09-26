part of '../formatted_message_view.dart';

// ─── User Message Bubble ───────────────────────────────────────────────────────

// ignore_for_file: library_private_types_in_public_api, invalid_use_of_protected_member
extension FmvUserBubbleExt on _FormattedMessageViewState {
  Widget _buildUserBubble(String text, String timestamp, {List<String>? attachments}) {
    final hasAttachments = attachments != null && attachments.isNotEmpty;
    final String base = widget.baseUrl ?? '';
    final String avatar = widget.userAvatar ?? '';

    Widget avatarWidget;
    if (avatar.startsWith('data:') && avatar.contains(';base64,')) {
      try {
        final bytes = base64Decode(avatar.split(',').last);
        avatarWidget = Image.memory(bytes, fit: BoxFit.cover);
      } catch (_) {
        avatarWidget = Icon(LucideIcons.user, size: 14, color: AppTheme.accentTeal);
      }
    } else if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      avatarWidget = Image.network(
        avatar,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) =>
            Icon(LucideIcons.user, size: 14, color: AppTheme.accentTeal),
      );
    } else if (avatar.startsWith('/')) {
      final fullUrl = '$base$avatar';
      avatarWidget = Image.network(
        fullUrl,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) =>
            Icon(LucideIcons.user, size: 14, color: AppTheme.accentTeal),
      );
    } else {
      avatarWidget = Icon(LucideIcons.user, size: 14, color: AppTheme.accentTeal);
    }

    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final double maxBubbleWidth = isMobile ? screenWidth * 0.72 : 600.0;

    final msgId = widget.message.id;
    final String cleanDisplayText = sanitizeUserDisplayText(text);
    final isLongText = cleanDisplayText.length > 160 || cleanDisplayText.split('\n').length > 4;
    final isExpanded = _expandedState['user_prompt_$msgId'] ?? false;
    final formattedTime = TimeFormatter.formatTimeString(timestamp, context: context);

    return Align(
      alignment: Alignment.centerRight,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 4),
              constraints: BoxConstraints(maxWidth: maxBubbleWidth),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _cCardBg,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(18),
                  topRight: Radius.circular(4),
                  bottomLeft: Radius.circular(18),
                  bottomRight: Radius.circular(18),
                ),
                border: Border.all(color: _cBorder, width: 1.0),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: widget.isDark ? 0.25 : 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (cleanDisplayText.isNotEmpty) ...[
                    if (isLongText && !isExpanded)
                      Stack(
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 110),
                            child: ClipRect(
                              child: _buildMarkdown(cleanDisplayText, isUser: true),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: Container(
                              height: 36,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [_cCardBg.withValues(alpha: 0.0), _cCardBg],
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      _buildMarkdown(cleanDisplayText, isUser: true),

                    if (isLongText)
                      InkWell(
                        onTap: () {
                          setState(() {
                            _expandedState['user_prompt_$msgId'] = !isExpanded;
                          });
                        },
                        borderRadius: BorderRadius.circular(4),
                        child: Padding(
                          padding: const EdgeInsets.only(top: 4, bottom: 2),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                isExpanded ? "Show less" : "See more",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontFamily: "HindSiliguri",
                                  fontFamilyFallback: kFmvFontFamilyFallback,
                                  fontWeight: FontWeight.w700,
                                  color: _cSecondary,
                                ),
                              ),
                              const SizedBox(width: 2),
                              Icon(
                                isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                                size: 12,
                                color: _cSecondary,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                  if (hasAttachments) ...[
                    if (cleanDisplayText.isNotEmpty) const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.end,
                      children: attachments.map((filePath) {
                        final fileName = filePath.split('/').last;
                        final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : '';
                        final isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext);
                        final isAudio = ['webm', 'wav', 'mp3', 'm4a', 'ogg', 'aac', 'flac', 'opus'].contains(ext) ||
                            fileName.toLowerCase().contains('voice_note_');
                        final fileUrl = resolveImageUrl(filePath, widget.baseUrl);

                        if (isAudio) {
                          return VoiceNotePlayerWidget(
                            filePath: filePath,
                            baseUrl: widget.baseUrl,
                            isDark: widget.isDark,
                          );
                        }

                        if (isImg) {
                          return GestureDetector(
                            onTap: () {
                              final allImgAttachments = attachments.where((f) {
                                final n = f.split('/').last.toLowerCase();
                                final e = n.contains('.') ? n.split('.').last : '';
                                return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(e);
                              }).toList();
                              final initialIdx = allImgAttachments.indexOf(filePath);
                              showImageLightboxModal(
                                context: context,
                                imageUrlsOrPaths: allImgAttachments.isNotEmpty ? allImgAttachments : [filePath],
                                initialIndex: initialIdx >= 0 ? initialIdx : 0,
                                baseUrl: widget.baseUrl,
                                isDark: widget.isDark,
                                onOpenFile: widget.onOpenFile,
                              );
                            },
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: _cInset,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: _cBorder, width: 0.8),
                                ),
                                child: Stack(
                                  children: [
                                    Positioned.fill(
                                      child: Image.network(
                                        fileUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => Container(
                                          color: _cInset,
                                          child: Center(
                                            child: Icon(LucideIcons.image, size: 22, color: _cSecondary),
                                          ),
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 3,
                                      right: 3,
                                      child: Container(
                                        padding: const EdgeInsets.all(3),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withValues(alpha: 0.65),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Icon(LucideIcons.maximize2, size: 10, color: Colors.white),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }

                        return GestureDetector(
                          onTap: () => widget.onOpenFile?.call(filePath),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: _cInset,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: _cBorder, width: 0.8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(LucideIcons.fileText, size: 14, color: Color(0xFF6366F1)),
                                const SizedBox(width: 6),
                                ConstrainedBox(
                                  constraints: const BoxConstraints(maxWidth: 160),
                                  child: Text(
                                    fileName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontFamily: "HindSiliguri",
                                      fontFamilyFallback: kFmvFontFamilyFallback,
                                      fontWeight: FontWeight.w600,
                                      color: _cPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                 Builder(
                   builder: (context) {
                      String deliveryStatus = widget.message.deliveryStatus ?? (widget.message.isPending ? 'sending' : 'sent');
                      if (deliveryStatus == 'sending' && (widget.message.isHistory || !widget.message.isPending)) {
                        deliveryStatus = 'sent';
                      }
                     final isSending = deliveryStatus == 'sending';
                     final isFailed = deliveryStatus == 'failed' || widget.message.isError;
                     final errorMsg = widget.message.errorMessage ?? '';

                      if (isSending) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 5),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 10,
                                height: 10,
                                child: CircularProgressIndicator(
                                  strokeWidth: 1.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(_cAccentPurple),
                                ),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                'Sending...',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontFamily: "HindSiliguri",
                                  fontFamilyFallback: kFmvFontFamilyFallback,
                                  fontWeight: FontWeight.w600,
                                  color: _cAccentPurple,
                                ),
                              ),
                              if (formattedTime.isNotEmpty) ...[
                                Text(
                                  ' • $formattedTime',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontFamily: "HindSiliguri",
                                    fontFamilyFallback: kFmvFontFamilyFallback,
                                    fontWeight: FontWeight.w500,
                                    color: _cFaint,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      }

                      if (isFailed) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(LucideIcons.alertCircle, size: 12, color: Color(0xFFEF4444)),
                                  const SizedBox(width: 4),
                                  const Text(
                                    'Failed to send',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontFamily: "HindSiliguri",
                                      fontFamilyFallback: kFmvFontFamilyFallback,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFFEF4444),
                                    ),
                                  ),
                                  if (formattedTime.isNotEmpty) ...[
                                    Text(
                                      ' • $formattedTime',
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontFamily: "HindSiliguri",
                                        fontFamilyFallback: kFmvFontFamilyFallback,
                                        fontWeight: FontWeight.w500,
                                        color: _cFaint,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              if (errorMsg.isNotEmpty) ...[
                                const SizedBox(height: 3),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3), width: 0.8),
                                  ),
                                  child: Text(
                                    errorMsg,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontFamily: "HindSiliguri",
                                      fontFamilyFallback: kFmvFontFamilyFallback,
                                      color: Color(0xFFEF4444),
                                    ),
                                  ),
                                ),
                              ],
                              if (widget.onRetry != null) ...[
                                const SizedBox(height: 5),
                                InkWell(
                                  onTap: widget.onRetry,
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4), width: 1.0),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(LucideIcons.refreshCw, size: 11, color: Color(0xFFEF4444)),
                                        SizedBox(width: 4),
                                        Text(
                                          'Retry',
                                          style: TextStyle(
                                            fontSize: 10.5,
                                            fontFamily: "HindSiliguri",
                                            fontFamilyFallback: kFmvFontFamilyFallback,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFFEF4444),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      }

                      // Default sent status
                      return Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.checkCheck, size: 12, color: AppTheme.accentTeal.withValues(alpha: 0.8)),
                            const SizedBox(width: 3),
                            Text(
                              'Sent',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontFamily: "HindSiliguri",
                                fontFamilyFallback: kFmvFontFamilyFallback,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.accentTeal.withValues(alpha: 0.8),
                              ),
                            ),
                            if (formattedTime.isNotEmpty) ...[
                              Text(
                                ' • $formattedTime',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontFamily: "HindSiliguri",
                                  fontFamilyFallback: kFmvFontFamilyFallback,
                                  fontWeight: FontWeight.w500,
                                  color: _cFaint,
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 6),
          Container(
            margin: const EdgeInsets.only(top: 4),
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.accentTeal.withValues(alpha: 0.15),
              border: Border.all(color: AppTheme.accentTeal.withValues(alpha: 0.6), width: 1),
            ),
            child: ClipOval(child: avatarWidget),
          ),
        ],
      ),
    );
  }
}
