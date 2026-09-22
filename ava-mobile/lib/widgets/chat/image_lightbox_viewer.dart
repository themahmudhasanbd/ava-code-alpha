import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../utils/app_toast.dart';

/// Resolves raw paths, file:// URIs, base64 data URIs, or remote URLs to reachable endpoints.
String resolveLightboxImageUrl(String src, String? baseUrl) {
  final trimmed = src.trim();
  if (trimmed.isEmpty) return '';

  // Base64 data URL
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Remote HTTP / HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // file:// URI
  String cleanPath = trimmed;
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.substring(7);
  }

  // If already an API path on server
  if (cleanPath.startsWith('/api/workspace/raw') || cleanPath.startsWith('api/workspace/raw')) {
    final prefix = baseUrl ?? '';
    final pathSuffix = cleanPath.startsWith('/') ? cleanPath : '/$cleanPath';
    return prefix.isNotEmpty ? '$prefix$pathSuffix' : pathSuffix;
  }

  // Format as /api/workspace/raw?path=...
  final effectiveBaseUrl = (baseUrl != null && baseUrl.isNotEmpty) ? baseUrl : '';
  return '$effectiveBaseUrl/api/workspace/raw?path=${Uri.encodeComponent(cleanPath)}';
}

/// Helper function to display the image lightbox modal in-place anywhere in the app
void showImageLightboxModal({
  required BuildContext context,
  required List<String> imageUrlsOrPaths,
  int initialIndex = 0,
  String? baseUrl,
  bool isDark = true,
  Function(String filePath)? onOpenFile,
}) {
  if (imageUrlsOrPaths.isEmpty) return;

  Navigator.of(context).push(
    PageRouteBuilder(
      opaque: false,
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.92),
      pageBuilder: (ctx, anim, secAnim) {
        return ImageLightboxViewer(
          imageUrlsOrPaths: imageUrlsOrPaths,
          initialIndex: initialIndex,
          baseUrl: baseUrl,
          isDark: isDark,
          onOpenFile: onOpenFile,
        );
      },
      transitionsBuilder: (ctx, anim, secAnim, child) {
        return FadeTransition(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOutCubic),
          child: child,
        );
      },
    ),
  );
}

/// Fullscreen Interactive Image Viewer Modal
class ImageLightboxViewer extends StatefulWidget {
  final List<String> imageUrlsOrPaths;
  final int initialIndex;
  final String? baseUrl;
  final bool isDark;
  final Function(String filePath)? onOpenFile;

  const ImageLightboxViewer({
    super.key,
    required this.imageUrlsOrPaths,
    this.initialIndex = 0,
    this.baseUrl,
    required this.isDark,
    this.onOpenFile,
  });

  @override
  State<ImageLightboxViewer> createState() => _ImageLightboxViewerState();
}

class _ImageLightboxViewerState extends State<ImageLightboxViewer> {
  late int _currentIndex;
  late PageController _pageController;
  final TransformationController _transformController = TransformationController();
  double _currentScale = 1.0;
  double _dragOffsetY = 0.0;

  @override
  void initState() {
    super.initState();
    _currentIndex = (widget.initialIndex >= 0 && widget.initialIndex < widget.imageUrlsOrPaths.length)
        ? widget.initialIndex
        : 0;
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _transformController.dispose();
    super.dispose();
  }

  void _handleDoubleTap() {
    setState(() {
      if (_currentScale > 1.2) {
        _currentScale = 1.0;
        _transformController.value = Matrix4.identity();
      } else {
        _currentScale = 2.5;
        _transformController.value = Matrix4.diagonal3Values(2.5, 2.5, 1.0);
      }
    });
  }

  String _getFileName(String pathOrUrl) {
    final clean = pathOrUrl.replaceAll(r'\', '/');
    if (clean.contains('?path=')) {
      final q = Uri.tryParse(clean)?.queryParameters['path'];
      if (q != null && q.isNotEmpty) return q.split('/').last;
    }
    final last = clean.split('/').last.split('?').first;
    return last.isNotEmpty ? last : 'Image';
  }

  @override
  Widget build(BuildContext context) {
    final totalCount = widget.imageUrlsOrPaths.length;
    final currentPath = widget.imageUrlsOrPaths[_currentIndex];
    final fileName = _getFileName(currentPath);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // Background Backdrop with blur
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(
                color: Colors.black.withValues(
                  alpha: (0.94 - (_dragOffsetY.abs() / 1000).clamp(0.0, 0.5)),
                ),
              ),
            ),
          ),

          // Main Interactive Content with Vertical Drag to Dismiss
          Positioned.fill(
            child: GestureDetector(
              onVerticalDragUpdate: (details) {
                if (_currentScale <= 1.05) {
                  setState(() {
                    _dragOffsetY += details.delta.dy;
                  });
                }
              },
              onVerticalDragEnd: (details) {
                if (_dragOffsetY.abs() > 100 || (details.primaryVelocity?.abs() ?? 0) > 600) {
                  Navigator.of(context).pop();
                } else {
                  setState(() {
                    _dragOffsetY = 0.0;
                  });
                }
              },
              child: Transform.translate(
                offset: Offset(0, _dragOffsetY),
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: totalCount,
                  physics: _currentScale > 1.05
                      ? const NeverScrollableScrollPhysics()
                      : const BouncingScrollPhysics(),
                  onPageChanged: (idx) {
                    setState(() {
                      _currentIndex = idx;
                      _currentScale = 1.0;
                      _transformController.value = Matrix4.identity();
                    });
                  },
                  itemBuilder: (context, idx) {
                    final imgPath = widget.imageUrlsOrPaths[idx];
                    return GestureDetector(
                      onDoubleTap: _handleDoubleTap,
                      child: InteractiveViewer(
                        transformationController: _currentIndex == idx ? _transformController : null,
                        minScale: 0.8,
                        maxScale: 5.0,
                        onInteractionEnd: (details) {
                          if (_currentIndex == idx) {
                            final scale = _transformController.value.getMaxScaleOnAxis();
                            setState(() => _currentScale = scale);
                          }
                        },
                        child: Center(
                          child: _buildImageItem(imgPath),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),

          // Top Action & Title Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.85),
                      Colors.black.withValues(alpha: 0.0),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Row(
                  children: [
                    // Close button
                    InkWell(
                      onTap: () => Navigator.of(context).pop(),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: const Icon(LucideIcons.x, size: 18, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // File info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            fileName,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontFamily: 'JetBrainsMono',
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            totalCount > 1
                                ? '${_currentIndex + 1} of $totalCount • Pinch or double tap to zoom'
                                : 'Pinch or double tap to zoom • Drag down to close',
                            style: TextStyle(
                              fontSize: 11,
                              fontFamily: 'Inter',
                              color: Colors.white.withValues(alpha: 0.72),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Copy Path
                    IconButton(
                      icon: const Icon(LucideIcons.copy, size: 18, color: Colors.white),
                      tooltip: 'Copy path',
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: currentPath));
                        AppToast.copied(context, 'Image path copied');
                      },
                    ),

                    // Open file explorer
                    if (widget.onOpenFile != null &&
                        !currentPath.startsWith('http') &&
                        !currentPath.startsWith('data:')) ...[
                      IconButton(
                        icon: const Icon(LucideIcons.folderOpen, size: 18, color: Color(0xFF818CF8)),
                        tooltip: 'Open in Explorer',
                        onPressed: () {
                          Navigator.of(context).pop();
                          widget.onOpenFile!(currentPath);
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),

          // Bottom Indicator for Multi-Image Gallery
          if (totalCount > 1)
            Positioned(
              bottom: 24,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(totalCount, (i) {
                        final isSel = i == _currentIndex;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: isSel ? 16 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFF6366F1) : Colors.white.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildImageItem(String pathOrUrl) {
    final rawSrc = pathOrUrl.trim();

    // 1. Base64 Data URI
    if (rawSrc.startsWith('data:image/')) {
      try {
        final commaIdx = rawSrc.indexOf(',');
        final base64Str = commaIdx != -1 ? rawSrc.substring(commaIdx + 1) : rawSrc;
        final bytes = base64Decode(base64Str.replaceAll(RegExp(r'\s+'), ''));
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          errorBuilder: (ctx, err, stack) => _buildErrorState(pathOrUrl),
        );
      } catch (_) {
        return _buildErrorState(pathOrUrl);
      }
    }

    // 2. Resolved Endpoint URL
    final effectiveUrl = resolveLightboxImageUrl(rawSrc, widget.baseUrl);
    if (effectiveUrl.isEmpty) {
      return _buildErrorState(pathOrUrl);
    }

    return CachedNetworkImage(
      imageUrl: effectiveUrl,
      fit: BoxFit.contain,
      placeholder: (context, url) => const Center(
        child: SizedBox(
          width: 32,
          height: 32,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF6366F1)),
        ),
      ),
      errorWidget: (context, url, error) {
        return Image.network(
          effectiveUrl,
          fit: BoxFit.contain,
          errorBuilder: (ctx, err, stack) => _buildErrorState(pathOrUrl),
        );
      },
    );
  }

  Widget _buildErrorState(String path) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF181014),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.imageOff, size: 36, color: const Color(0xFFEF4444).withValues(alpha: 0.8)),
          const SizedBox(height: 12),
          Text(
            _getFileName(path),
            style: const TextStyle(
              fontSize: 13,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Unable to render preview image',
            style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}
