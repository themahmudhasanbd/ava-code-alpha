part of '../formatted_message_view.dart';

// ─── FMV Image Preview & Multi-Image Carousel Gallery ─────────────────────────

/// Data container for images rendered in FMV markdown or tool calls.
class MessageImageData {
  final String urlOrPath;
  final String? alt;
  final String? prompt;
  final String? aspectRatio;
  final String? toolName;

  const MessageImageData({
    required this.urlOrPath,
    this.alt,
    this.prompt,
    this.aspectRatio,
    this.toolName,
  });

  String get fileName {
    final clean = urlOrPath.replaceAll(r'\', '/');
    if (clean.contains('?path=')) {
      final queryParam = Uri.tryParse(clean)?.queryParameters['path'];
      if (queryParam != null && queryParam.isNotEmpty) {
        return queryParam.split('/').last;
      }
    }
    final last = clean.split('/').last.split('?').first;
    return last.isNotEmpty ? last : 'Image';
  }

  String get fileExtension {
    final name = fileName.toLowerCase();
    if (name.contains('.')) return name.split('.').last;
    return 'png';
  }
}

/// Resolves raw paths, file:// URIs, base64 data URIs, or remote URLs to reachable endpoints.
String resolveImageUrl(String src, String? baseUrl) {
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

/// Main widget for rendering a single image or a horizontal scrollable gallery of images.
class MessageImageGallery extends StatefulWidget {
  final List<MessageImageData> images;
  final String? baseUrl;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;

  const MessageImageGallery({
    super.key,
    required this.images,
    this.baseUrl,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onOpenFile,
  });

  @override
  State<MessageImageGallery> createState() => _MessageImageGalleryState();
}

class _MessageImageGalleryState extends State<MessageImageGallery> {
  int _activeCarouselIndex = 0;
  final PageController _pageController = PageController(viewportFraction: 0.90);

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _openLightbox(int initialIndex) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black.withValues(alpha: 0.92),
        pageBuilder: (ctx, anim, secAnim) {
          return FullScreenImageViewerDialog(
            images: widget.images,
            initialIndex: initialIndex,
            baseUrl: widget.baseUrl,
            isDark: widget.isDark,
            onOpenFile: widget.onOpenFile,
          );
        },
        transitionsBuilder: (ctx, anim, secAnim, child) {
          return FadeTransition(opacity: anim, child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.images.isEmpty) return const SizedBox.shrink();

    // Single Image Presentation
    if (widget.images.length == 1) {
      final img = widget.images.first;
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: widget.isDark ? const Color(0xFF0D1117) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: widget.borderColor.withValues(alpha: 0.6), width: 0.8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image Content
            GestureDetector(
              onTap: () => _openLightbox(0),
              child: Stack(
                children: [
                  ConstrainedBox(
                    constraints: const BoxConstraints(
                      minHeight: 140,
                      maxHeight: 280,
                    ),
                    child: Center(
                      child: MessageImageItemView(
                        image: img,
                        baseUrl: widget.baseUrl,
                        isDark: widget.isDark,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  // Top overlay badge
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.72),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 0.6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.image, size: 11, color: Colors.white.withValues(alpha: 0.9)),
                          const SizedBox(width: 4),
                          Text(
                            img.fileExtension.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontFamily: 'JetBrainsMono',
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          if (img.aspectRatio != null && img.aspectRatio!.isNotEmpty) ...[
                            Text(
                              ' • ${img.aspectRatio}',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontFamily: 'JetBrainsMono',
                                color: Colors.white.withValues(alpha: 0.8),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  // Tap to zoom hint
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.72),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 0.6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.maximize2, size: 11, color: Colors.white.withValues(alpha: 0.9)),
                          const SizedBox(width: 4),
                          const Text(
                            'Zoom',
                            style: TextStyle(
                              fontSize: 10,
                              fontFamily: 'Inter',
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Caption / Action bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: widget.cardBg,
                border: Border(top: BorderSide(color: widget.borderColor.withValues(alpha: 0.5), width: 0.6)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      img.alt ?? img.fileName,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontFamily: 'JetBrainsMono',
                        fontWeight: FontWeight.w600,
                        color: widget.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: img.urlOrPath));
                      AppToast.copied(context, 'Image path copied');
                    },
                    borderRadius: BorderRadius.circular(4),
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: Icon(LucideIcons.copy, size: 12, color: widget.textSecondary),
                    ),
                  ),
                  if (widget.onOpenFile != null && !img.urlOrPath.startsWith('http') && !img.urlOrPath.startsWith('data:')) ...[
                    const SizedBox(width: 4),
                    InkWell(
                      onTap: () => widget.onOpenFile!(img.urlOrPath),
                      borderRadius: BorderRadius.circular(4),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.35), width: 0.6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Text(
                              'Media',
                              style: TextStyle(
                                fontSize: 10,
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF6366F1),
                              ),
                            ),
                            SizedBox(width: 3),
                            Icon(LucideIcons.externalLink, size: 9.5, color: Color(0xFF6366F1)),
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

    // Multiple Images Horizontal Carousel Gallery
    final totalCount = widget.images.length;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0B0F17) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.borderColor.withValues(alpha: 0.7), width: 0.9),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Gallery Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF141926) : Colors.white,
              border: Border(bottom: BorderSide(color: widget.borderColor.withValues(alpha: 0.5), width: 0.6)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.images, size: 13, color: Color(0xFF6366F1)),
                ),
                const SizedBox(width: 8),
                const Text(
                  'IMAGE GALLERY',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontFamily: 'JetBrainsMono',
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: Color(0xFF6366F1),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${_activeCarouselIndex + 1} / $totalCount',
                    style: const TextStyle(
                      fontSize: 10,
                      fontFamily: 'JetBrainsMono',
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF6366F1),
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  'Swipe to browse',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontFamily: 'Inter',
                    color: widget.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Horizontal Carousel Viewport
          SizedBox(
            height: 210,
            child: PageView.builder(
              controller: _pageController,
              itemCount: totalCount,
              physics: const BouncingScrollPhysics(),
              onPageChanged: (idx) => setState(() => _activeCarouselIndex = idx),
              itemBuilder: (context, idx) {
                final img = widget.images[idx];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 8),
                  child: GestureDetector(
                    onTap: () => _openLightbox(idx),
                    child: Container(
                      decoration: BoxDecoration(
                        color: widget.isDark ? const Color(0xFF090D14) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _activeCarouselIndex == idx
                              ? const Color(0xFF6366F1).withValues(alpha: 0.5)
                              : widget.borderColor.withValues(alpha: 0.4),
                          width: _activeCarouselIndex == idx ? 1.2 : 0.8,
                        ),
                        boxShadow: [
                          if (_activeCarouselIndex == idx)
                            BoxShadow(
                              color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: MessageImageItemView(
                              image: img,
                              baseUrl: widget.baseUrl,
                              isDark: widget.isDark,
                              fit: BoxFit.contain,
                            ),
                          ),
                          // Badge with index
                          Positioned(
                            top: 6,
                            left: 6,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.72),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                '${idx + 1}/$totalCount • ${img.fileExtension.toUpperCase()}',
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontFamily: 'JetBrainsMono',
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          // Zoom icon
                          Positioned(
                            bottom: 6,
                            right: 6,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.72),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: const Icon(LucideIcons.maximize2, size: 11, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom Indicator Dots & Caption Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF141926) : Colors.white,
              border: Border(top: BorderSide(color: widget.borderColor.withValues(alpha: 0.4), width: 0.6)),
            ),
            child: Row(
              children: [
                // Dots Indicator
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(totalCount, (i) {
                    final isSelected = i == _activeCarouselIndex;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                      width: isSelected ? 16 : 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF6366F1)
                            : widget.borderColor.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    );
                  }),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.images[_activeCarouselIndex].alt ??
                        widget.images[_activeCarouselIndex].fileName,
                    style: TextStyle(
                      fontSize: 11,
                      fontFamily: 'JetBrainsMono',
                      fontWeight: FontWeight.w600,
                      color: widget.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                InkWell(
                  onTap: () {
                    Clipboard.setData(
                      ClipboardData(text: widget.images[_activeCarouselIndex].urlOrPath),
                    );
                    AppToast.copied(context, 'Image path copied');
                  },
                  borderRadius: BorderRadius.circular(4),
                  child: Padding(
                    padding: const EdgeInsets.all(3),
                    child: Icon(LucideIcons.copy, size: 12, color: widget.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Renders a single image element with network caching, base64 decoding, loading shimmer, and fallback.
class MessageImageItemView extends StatelessWidget {
  final MessageImageData image;
  final String? baseUrl;
  final bool isDark;
  final BoxFit fit;

  const MessageImageItemView({
    super.key,
    required this.image,
    this.baseUrl,
    required this.isDark,
    this.fit = BoxFit.contain,
  });

  @override
  Widget build(BuildContext context) {
    final rawSrc = image.urlOrPath.trim();

    // 1. Base64 Data URI
    if (rawSrc.startsWith('data:image/')) {
      try {
        final commaIdx = rawSrc.indexOf(',');
        final base64Str = commaIdx != -1 ? rawSrc.substring(commaIdx + 1) : rawSrc;
        final bytes = base64Decode(base64Str.replaceAll(RegExp(r'\s+'), ''));
        return Image.memory(
          bytes,
          fit: fit,
          errorBuilder: (ctx, err, stack) => _buildErrorWidget(context),
        );
      } catch (_) {
        return _buildErrorWidget(context);
      }
    }

    // 2. Resolved Endpoint URL
    final effectiveUrl = resolveImageUrl(rawSrc, baseUrl);
    if (effectiveUrl.isEmpty) {
      return _buildErrorWidget(context);
    }

    return CachedNetworkImage(
      imageUrl: effectiveUrl,
      fit: fit,
      placeholder: (context, url) => _buildLoadingWidget(),
      errorWidget: (context, url, error) {
        // Fallback to standard Image.network if CachedNetworkImage has header issues
        return Image.network(
          effectiveUrl,
          fit: fit,
          loadingBuilder: (ctx, child, progress) {
            if (progress == null) return child;
            return _buildLoadingWidget();
          },
          errorBuilder: (ctx, err, stack) => _buildErrorWidget(context),
        );
      },
    );
  }

  Widget _buildLoadingWidget() {
    return Container(
      color: isDark ? const Color(0xFF0F141E) : const Color(0xFFF1F5F9),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.0,
                color: Color(0xFF6366F1),
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Rendering image...',
              style: TextStyle(
                fontSize: 10,
                fontFamily: 'Inter',
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorWidget(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: isDark ? const Color(0xFF181014) : const Color(0xFFFEF2F2),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              LucideIcons.imageOff,
              size: 26,
              color: const Color(0xFFEF4444).withValues(alpha: 0.8),
            ),
            const SizedBox(height: 6),
            Text(
              image.fileName,
              style: TextStyle(
                fontSize: 11,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            const Text(
              'Preview unavailable (saved on disk)',
              style: TextStyle(
                fontSize: 9.5,
                fontFamily: 'Inter',
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Interactive Fullscreen Lightbox Modal with Pinch-to-Zoom & Horizontal Gallery Navigation.
class FullScreenImageViewerDialog extends StatefulWidget {
  final List<MessageImageData> images;
  final int initialIndex;
  final String? baseUrl;
  final bool isDark;
  final Function(String filePath, {String? diffOrContent})? onOpenFile;

  const FullScreenImageViewerDialog({
    super.key,
    required this.images,
    this.initialIndex = 0,
    this.baseUrl,
    required this.isDark,
    this.onOpenFile,
  });

  @override
  State<FullScreenImageViewerDialog> createState() => _FullScreenImageViewerDialogState();
}

class _FullScreenImageViewerDialogState extends State<FullScreenImageViewerDialog> {
  late int _currentIndex;
  late PageController _pageController;
  final TransformationController _transformController = TransformationController();
  double _currentScale = 1.0;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
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

  @override
  Widget build(BuildContext context) {
    final currentImage = widget.images[_currentIndex];
    final totalCount = widget.images.length;

    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: 0.95),
      body: SafeArea(
        child: Stack(
          children: [
            // Interactive Page Viewer
            Positioned.fill(
              child: PageView.builder(
                controller: _pageController,
                itemCount: totalCount,
                physics: _currentScale > 1.1
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
                  final img = widget.images[idx];
                  return GestureDetector(
                    onDoubleTap: _handleDoubleTap,
                    child: InteractiveViewer(
                      transformationController: _currentIndex == idx ? _transformController : null,
                      minScale: 0.5,
                      maxScale: 6.0,
                      onInteractionEnd: (details) {
                        final scale = _transformController.value.getMaxScaleOnAxis();
                        if (scale <= 1.05) {
                          _transformController.value = Matrix4.identity();
                          setState(() => _currentScale = 1.0);
                        } else {
                          setState(() => _currentScale = scale);
                        }
                      },
                      child: Center(
                        child: MessageImageItemView(
                          image: img,
                          baseUrl: widget.baseUrl,
                          isDark: true,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Top Header Bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.85),
                      Colors.transparent,
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
                        ),
                        child: const Icon(LucideIcons.x, size: 18, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            currentImage.fileName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontFamily: 'JetBrainsMono',
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            '${_currentIndex + 1} of $totalCount • Pinch to zoom',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontFamily: 'Inter',
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Copy path
                    IconButton(
                      icon: const Icon(LucideIcons.copy, size: 17, color: Colors.white),
                      tooltip: 'Copy path',
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: currentImage.urlOrPath));
                        AppToast.copied(context, 'Image path copied');
                      },
                    ),
                    // Open in file explorer
                    if (widget.onOpenFile != null &&
                        !currentImage.urlOrPath.startsWith('http') &&
                        !currentImage.urlOrPath.startsWith('data:')) ...[
                      IconButton(
                        icon: const Icon(LucideIcons.folderOpen, size: 17, color: Color(0xFF6366F1)),
                        tooltip: 'Open in Media Explorer',
                        onPressed: () {
                          Navigator.of(context).pop();
                          widget.onOpenFile!(currentImage.urlOrPath);
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Bottom Prompt / Info Overlay
            if (currentImage.prompt != null && currentImage.prompt!.isNotEmpty)
              Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F141E).withValues(alpha: 0.90),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.5),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          const Icon(LucideIcons.sparkles, size: 12, color: Color(0xFF6366F1)),
                          const SizedBox(width: 6),
                          const Text(
                            'PROMPT',
                            style: TextStyle(
                              fontSize: 10,
                              fontFamily: 'JetBrainsMono',
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF6366F1),
                              letterSpacing: 0.5,
                            ),
                          ),
                          if (currentImage.aspectRatio != null) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                currentImage.aspectRatio!,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontFamily: 'JetBrainsMono',
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        currentImage.prompt!,
                        style: const TextStyle(
                          fontSize: 12,
                          fontFamily: 'Inter',
                          color: Colors.white,
                          height: 1.4,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
