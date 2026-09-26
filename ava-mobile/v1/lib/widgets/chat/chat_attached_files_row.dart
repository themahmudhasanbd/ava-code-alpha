import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../services/agent_core_service.dart';
import 'image_lightbox_viewer.dart';

/// Horizontal scrollable row of attached file badges / image previews / audio chips
/// shown inside the prompt input box when one or more files have been attached.
class ChatAttachedFilesRow extends StatelessWidget {
  final List<String> attachedFiles;
  final AvaAgentCoreService agentCoreService;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final bool isDark;
  final void Function(String filePath) onRemove;

  const ChatAttachedFilesRow({
    super.key,
    required this.attachedFiles,
    required this.agentCoreService,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.isDark,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (attachedFiles.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: attachedFiles.map((filePath) => _buildBadge(context, filePath)).toList(),
        ),
      ),
    );
  }

  Widget _buildBadge(BuildContext context, String filePath) {
    final fileName = filePath.split('/').last;
    final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : '';
    final isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext);
    final isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'webm'].contains(ext);

    if (isImg) return _buildImagePreview(context, filePath);
    if (isAudio) return _buildAudioBadge(filePath, fileName);
    return _buildFileBadge(filePath, fileName);
  }

  Widget _buildAudioBadge(String filePath, String fileName) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF6366F1).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.4), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(LucideIcons.mic, size: 13, color: Color(0xFF818CF8)),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 140),
            child: Text(
              fileName.startsWith('voice_note_') ? 'Voice Note' : fileName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textPrimary),
            ),
          ),
          const SizedBox(width: 6),
          InkWell(
            onTap: () => onRemove(filePath),
            child: Icon(LucideIcons.x, size: 13, color: textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview(BuildContext context, String filePath) {
    final imgUrl = agentCoreService.getRawFileUrl(filePath);
    return Container(
      margin: const EdgeInsets.only(right: 10, top: 4, bottom: 2),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          GestureDetector(
            onTap: () {
              showImageLightboxModal(
                context: context,
                imageUrlsOrPaths: [filePath],
                baseUrl: agentCoreService.baseUrl,
                isDark: isDark,
              );
            },
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF18181B) : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor, width: 0.8),
                ),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: Image.network(
                        imgUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Center(child: Icon(LucideIcons.image, size: 20, color: Color(0xFF6366F1))),
                      ),
                    ),
                    Positioned(
                      bottom: 2,
                      right: 2,
                      child: Container(
                        padding: const EdgeInsets.all(2.5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Icon(LucideIcons.maximize2, size: 9, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: -5,
            right: -5,
            child: GestureDetector(
              onTap: () => onRemove(filePath),
              child: Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  shape: BoxShape.circle,
                  border: Border.all(color: cardBg, width: 1.5),
                ),
                child: const Center(child: Icon(LucideIcons.x, size: 10, color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFileBadge(String filePath, String fileName) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF6366F1).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(LucideIcons.fileText, size: 13, color: Color(0xFF6366F1)),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 130),
            child: Text(
              fileName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textPrimary),
            ),
          ),
          const SizedBox(width: 5),
          InkWell(
            onTap: () => onRemove(filePath),
            child: Icon(LucideIcons.x, size: 13, color: textSecondary),
          ),
        ],
      ),
    );
  }
}
