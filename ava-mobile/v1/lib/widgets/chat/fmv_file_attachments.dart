import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../services/agent_core_service.dart';
import '../../utils/file_download_helper.dart';

/// Interactive Agent File Attachment and Download Card for AvA Code
class AgentFileAttachmentsWidget extends StatelessWidget {
  final List<String> filePaths;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService? agentCoreService;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;

  const AgentFileAttachmentsWidget({
    super.key,
    required this.filePaths,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.agentCoreService,
    this.onOpenFile,
  });

  IconData _getFileIcon(String ext) {
    switch (ext) {
      case 'dart':
      case 'ts':
      case 'js':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'go':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'java':
      case 'kt':
      case 'php':
        return LucideIcons.fileCode;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
      case 'xml':
      case 'env':
        return LucideIcons.fileCog;
      case 'html':
      case 'css':
      case 'scss':
        return LucideIcons.fileSpreadsheet;
      case 'pdf':
        return LucideIcons.fileText;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
      case '7z':
        return LucideIcons.fileArchive;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
      case 'svg':
        return LucideIcons.fileImage;
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
      case 'flac':
        return LucideIcons.fileAudio;
      case 'mp4':
      case 'mov':
      case 'webm':
      case 'avi':
        return LucideIcons.fileVideo;
      case 'md':
      case 'txt':
      default:
        return LucideIcons.fileText;
    }
  }

  Color _getIconColor(String ext) {
    switch (ext) {
      case 'dart':
        return const Color(0xFF00B4AB);
      case 'ts':
      case 'tsx':
        return const Color(0xFF3178C6);
      case 'js':
      case 'jsx':
        return const Color(0xFFF7DF1E);
      case 'py':
        return const Color(0xFF3776AB);
      case 'json':
      case 'yaml':
      case 'yml':
        return const Color(0xFFF59E0B);
      case 'html':
        return const Color(0xFFE34F26);
      case 'css':
        return const Color(0xFF1572B6);
      case 'pdf':
        return const Color(0xFFEF4444);
      case 'zip':
      case 'tar':
      case 'gz':
        return const Color(0xFF8B5CF6);
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'svg':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6366F1);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (filePaths.isEmpty) return const SizedBox.shrink();

    final distinctFiles = filePaths.toSet().toList();

    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(LucideIcons.paperclip, size: 13, color: textSecondary),
              const SizedBox(width: 5),
              Text(
                'ATTACHED FILES (${distinctFiles.length})',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                  color: textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: distinctFiles.map((filePath) {
              final fileName = filePath.split('/').last;
              final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : '';
              final iconColor = _getIconColor(ext);
              final iconData = _getFileIcon(ext);

              return Container(
                constraints: const BoxConstraints(maxWidth: 340),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF181C26) : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? const Color(0xFF262C3D) : const Color(0xFFE5E7EB),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: iconColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Icon(iconData, size: 16, color: iconColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            fileName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: textPrimary,
                            ),
                          ),
                          if (filePath.contains('/') && filePath != fileName) ...[
                            const SizedBox(height: 1),
                            Text(
                              filePath,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 10,
                                color: textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // In-app Open Button
                    if (onOpenFile != null)
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () => onOpenFile?.call(filePath),
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.all(5),
                            child: Icon(
                              LucideIcons.fileCode2,
                              size: 15,
                              color: const Color(0xFF6366F1),
                            ),
                          ),
                        ),
                      ),
                    // In-app Download Button
                    if (agentCoreService != null)
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () => FileDownloadHelper.downloadSingleFile(
                            context: context,
                            agentCoreService: agentCoreService!,
                            fullPath: filePath,
                            fileName: fileName,
                          ),
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.all(5),
                            child: Icon(
                              LucideIcons.download,
                              size: 15,
                              color: const Color(0xFF10B981),
                            ),
                          ),
                        ),
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
}
