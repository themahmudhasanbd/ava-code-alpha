import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';
import '../utils/app_toast.dart';
import 'media/video_element.dart';

class MediaPreviewView extends StatefulWidget {
  final String fullPath;
  final String fileName;
  final String fileSize;
  final AvaAgentCoreService agentCoreService;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback? onUnarchiveSuccess;

  const MediaPreviewView({
    super.key,
    required this.fullPath,
    required this.fileName,
    this.fileSize = '',
    required this.agentCoreService,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onUnarchiveSuccess,
  });

  @override
  State<MediaPreviewView> createState() => _MediaPreviewViewState();
}

class _MediaPreviewViewState extends State<MediaPreviewView> {
  final TransformationController _transformController = TransformationController();
  double _zoomScale = 1.0;
  bool _isUnarchiving = false;

  String get _ext {
    final name = widget.fileName.toLowerCase();
    if (name.endsWith('.tar.gz')) return 'tar.gz';
    if (name.contains('.')) return name.split('.').last;
    return '';
  }

  bool get _isImage => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].contains(_ext);
  bool get _isVideo => ['mp4', 'webm', 'mov', 'mkv', 'avi'].contains(_ext);
  bool get _isAudio => ['mp3', 'wav', 'ogg', 'aac', 'flac'].contains(_ext);
  bool get _isArchive => ['zip', 'tar.gz', 'tgz', 'tar', 'gz'].contains(_ext);

  void _zoomIn() {
    setState(() {
      _zoomScale = (_zoomScale * 1.3).clamp(0.5, 5.0);
      _transformController.value = Matrix4.diagonal3Values(_zoomScale, _zoomScale, 1.0);
    });
  }

  void _zoomOut() {
    setState(() {
      _zoomScale = (_zoomScale / 1.3).clamp(0.5, 5.0);
      _transformController.value = Matrix4.diagonal3Values(_zoomScale, _zoomScale, 1.0);
    });
  }

  void _resetZoom() {
    setState(() {
      _zoomScale = 1.0;
      _transformController.value = Matrix4.identity();
    });
  }

  Future<void> _handleUnarchive() async {
    setState(() => _isUnarchiving = true);
    final res = await widget.agentCoreService.unarchiveFile(
      archivePath: widget.fullPath,
    );

    if (mounted) {
      setState(() => _isUnarchiving = false);
      if (res != null && res['status'] == 'ok') {
        AppToast.success(context, 'Extracted "${widget.fileName}" successfully!');
        widget.onUnarchiveSuccess?.call();
      } else {
        AppToast.error(context, 'Unarchive failed: ${res?['message'] ?? 'Unknown error'}');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final rawUrl = widget.agentCoreService.getRawFileUrl(widget.fullPath);

    return Container(
      color: widget.isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC),
      child: Column(
        children: [
          // Media Header / Info Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: widget.cardBg,
              border: Border(bottom: BorderSide(color: widget.borderColor, width: 0.8)),
            ),
            child: Row(
              children: [
                Icon(
                  _isImage
                      ? LucideIcons.image
                      : _isVideo
                          ? LucideIcons.video
                          : _isAudio
                              ? LucideIcons.music
                              : LucideIcons.archive,
                  size: 16,
                  color: const Color(0xFF6366F1),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.fileName,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: widget.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '${_ext.toUpperCase()} • ${widget.fileSize.isNotEmpty ? widget.fileSize : 'File'}',
                        style: TextStyle(fontSize: 10, color: widget.textSecondary, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ),

                // Image Zoom Controls
                if (_isImage) ...[
                  IconButton(
                    icon: const Icon(LucideIcons.zoomOut, size: 15),
                    tooltip: 'Zoom Out',
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                    padding: EdgeInsets.zero,
                    onPressed: _zoomOut,
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.rotateCcw, size: 14),
                    tooltip: 'Reset Zoom (100%)',
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                    padding: EdgeInsets.zero,
                    onPressed: _resetZoom,
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.zoomIn, size: 15),
                    tooltip: 'Zoom In',
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                    padding: EdgeInsets.zero,
                    onPressed: _zoomIn,
                  ),
                ],

                // Archive Extraction Action
                if (_isArchive) ...[
                  ElevatedButton.icon(
                    icon: _isUnarchiving
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(LucideIcons.archiveRestore, size: 13),
                    label: const Text('Extract Here', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      minimumSize: const Size(60, 28),
                    ),
                    onPressed: _isUnarchiving ? null : _handleUnarchive,
                  ),
                ],
              ],
            ),
          ),

          // Main Media Content Body
          Expanded(
            child: Center(
              child: _isImage
                  ? _buildImageViewer(rawUrl)
                  : _isVideo
                      ? _buildVideoPlayer(rawUrl)
                      : _isAudio
                          ? _buildAudioPlayer(rawUrl)
                          : _isArchive
                              ? _buildArchiveView()
                              : _buildGenericFileView(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageViewer(String rawUrl) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0D0D11) : const Color(0xFFF1F5F9),
      ),
      child: InteractiveViewer(
        transformationController: _transformController,
        minScale: 0.2,
        maxScale: 6.0,
        child: Center(
          child: Image.network(
            rawUrl,
            fit: BoxFit.contain,
            loadingBuilder: (ctx, child, progress) {
              if (progress == null) return child;
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2),
              );
            },
            errorBuilder: (ctx, err, stack) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(LucideIcons.imageOff, size: 40, color: Colors.redAccent),
                  const SizedBox(height: 8),
                  Text('Failed to render image', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildVideoPlayer(String rawUrl) {
    final safeId = widget.fullPath.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: Colors.black,
      child: buildPlatformVideoView(
        url: rawUrl,
        viewId: safeId,
        isDark: widget.isDark,
      ),
    );
  }

  Widget _buildAudioPlayer(String rawUrl) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6366F1), Color(0xFF818CF8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(LucideIcons.music, size: 36, color: Colors.white),
          ),
          const SizedBox(height: 16),
          Text(
            widget.fileName,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: widget.textPrimary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            widget.fileSize,
            style: TextStyle(fontSize: 12, color: widget.textSecondary, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: 320,
            height: 60,
            child: buildPlatformVideoView(
              url: rawUrl,
              viewId: 'audio_${widget.fullPath.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}',
              isDark: widget.isDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArchiveView() {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3), width: 1.5),
            ),
            child: const Icon(LucideIcons.archive, size: 40, color: Color(0xFF10B981)),
          ),
          const SizedBox(height: 16),
          Text(
            widget.fileName,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: widget.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(
            'Compressed Archive • ${widget.fileSize}',
            style: TextStyle(fontSize: 12, color: widget.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            widget.fullPath,
            style: TextStyle(fontSize: 10, color: widget.textSecondary, fontFamily: 'monospace'),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            icon: _isUnarchiving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(LucideIcons.archiveRestore, size: 16),
            label: const Text('Extract / Unarchive Files Here', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _isUnarchiving ? null : _handleUnarchive,
          ),
        ],
      ),
    );
  }

  Widget _buildGenericFileView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(LucideIcons.file, size: 48, color: widget.textSecondary.withValues(alpha: 0.4)),
        const SizedBox(height: 12),
        Text(widget.fileName, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: widget.textPrimary)),
        const SizedBox(height: 4),
        Text(widget.fileSize, style: TextStyle(fontSize: 11, color: widget.textSecondary)),
      ],
    );
  }
}
