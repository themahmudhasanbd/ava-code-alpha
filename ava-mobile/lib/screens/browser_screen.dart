import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../widgets/browser/browser_iframe.dart';

class BrowserScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final String? initialUrl;
  final String? serverUrl;
  final VoidCallback? onBackToChat;

  const BrowserScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.initialUrl,
    this.serverUrl,
    this.onBackToChat,
  });

  @override
  State<BrowserScreen> createState() => _BrowserScreenState();
}

class _BrowserScreenState extends State<BrowserScreen> {
  late TextEditingController _urlController;
  late String _currentUrl;
  int _viewVersion = 0;

  String get _defaultBaseUrl {
    if (widget.serverUrl != null && widget.serverUrl!.trim().isNotEmpty) {
      try {
        final uri = Uri.parse(widget.serverUrl!.trim());
        if (uri.host.isNotEmpty && uri.host != 'localhost' && uri.host != '127.0.0.1') {
          final scheme = uri.scheme.isNotEmpty ? uri.scheme : 'http';
          return '$scheme://${uri.host}';
        }
      } catch (e) { print('Ignored error: $e'); }
    }
    return 'https://veliq.eu.cc';
  }

  String get _defaultHost {
    try {
      final host = Uri.parse(_defaultBaseUrl).host;
      if (host.isNotEmpty) return host;
    } catch (e) { print('Ignored error: $e'); }
    return 'veliq.eu.cc';
  }

  // Viewport mode: 0 = Responsive/Full, 1 = Mobile (390px), 2 = Tablet (768px)
  int _viewportMode = 0;

  // DevTools
  bool _showDevTools = false;
  int _devToolsTab = 0; // 0 = Console, 1 = Network, 2 = Info, 3 = Router
  final List<Map<String, dynamic>> _consoleLogs = [];
  final List<Map<String, dynamic>> _networkRequests = [];
  final TextEditingController _jsConsoleController = TextEditingController();

  // Navigation History
  final List<String> _history = [];
  int _historyIndex = -1;

  bool get _canGoBack => _historyIndex > 0;
  bool get _canGoForward => _historyIndex >= 0 && _historyIndex < _history.length - 1;

  void _goBack() {
    if (_canGoBack) {
      _historyIndex--;
      final url = _history[_historyIndex];
      _navigateTo(url, isHistoryNavigation: true);
    }
  }

  void _goForward() {
    if (_canGoForward) {
      _historyIndex++;
      final url = _history[_historyIndex];
      _navigateTo(url, isHistoryNavigation: true);
    }
  }

  // Preview Router status
  bool _isLoadingStatus = false;
  int? _activePort = 3000;
  List<int> _availablePorts = [];

  @override
  void initState() {
    super.initState();
    final startUrl = widget.initialUrl ?? _defaultBaseUrl;
    _currentUrl = startUrl;
    _urlController = TextEditingController(text: startUrl);
    _history.add(startUrl);
    _historyIndex = 0;

    _initDevToolsData();
    _fetchRouterStatus();
  }

  void _initDevToolsData() {
    _probeNetwork(_currentUrl);
  }

  Future<void> _probeNetwork(String targetUrl) async {
    final sw = Stopwatch()..start();
    try {
      final res = await http.get(Uri.parse(targetUrl)).timeout(const Duration(seconds: 5));
      sw.stop();
      if (!mounted) return;
      setState(() {
        _networkRequests.removeWhere((r) => r['url'] == targetUrl);
        _networkRequests.insert(0, {
          'method': 'GET',
          'url': targetUrl,
          'status': res.statusCode,
          'time': '${sw.elapsedMilliseconds}ms',
          'type': res.headers['content-type']?.split(';').first ?? 'document',
          'size': '${(res.bodyBytes.length / 1024).toStringAsFixed(1)} KB',
        });
        _consoleLogs.insert(0, {
          'type': res.statusCode < 400 ? 'info' : 'error',
          'text': '[HTTP ${res.statusCode}] Loaded $targetUrl in ${sw.elapsedMilliseconds}ms (${(res.bodyBytes.length / 1024).toStringAsFixed(1)} KB)',
          'time': 'just now',
        });
      });
    } catch (e) {
      sw.stop();
      if (!mounted) return;
      setState(() {
        _networkRequests.removeWhere((r) => r['url'] == targetUrl);
        _networkRequests.insert(0, {
          'method': 'GET',
          'url': targetUrl,
          'status': 0,
          'time': '${sw.elapsedMilliseconds}ms',
          'type': 'error',
          'size': '0 KB',
        });
        _consoleLogs.insert(0, {
          'type': 'error',
          'text': '[Network Error] Failed $targetUrl: $e',
          'time': 'just now',
        });
      });
    }
  }

  Future<void> _fetchRouterStatus() async {
    setState(() => _isLoadingStatus = true);
    try {
      final res = await http.get(Uri.parse('$_defaultBaseUrl/__status')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _activePort = data['currentTargetPort'] as int?;
            final ports = data['activePorts'] as List?;
            _availablePorts = ports != null ? ports.map((p) => int.parse(p.toString())).toList() : [];
            _isLoadingStatus = false;
          });
        }
        return;
      }
    } catch (e) { print('Ignored error: $e'); }
    if (mounted) setState(() => _isLoadingStatus = false);
  }

  Future<void> _switchRouterPort(int port) async {
    try {
      await http.post(
        Uri.parse('$_defaultBaseUrl/__target'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'port': port}),
      );
      _navigateTo(_defaultBaseUrl);
      await _fetchRouterStatus();
    } catch (e) { print('Ignored error: $e'); }
  }

  void _navigateTo(String inputUrl, {bool isHistoryNavigation = false}) {
    var target = inputUrl.trim();
    if (target.isEmpty) return;

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.startsWith('localhost:') || target.startsWith('127.0.0.1:')) {
        target = 'http://$target';
      } else if (target.contains('.') && !target.contains(' ')) {
        target = 'https://$target';
      } else {
        target = 'https://www.google.com/search?q=${Uri.encodeComponent(target)}';
      }
    }

    if (!isHistoryNavigation) {
      if (_historyIndex >= 0 && _historyIndex < _history.length - 1) {
        _history.removeRange(_historyIndex + 1, _history.length);
      }
      if (_history.isEmpty || _history.last != target) {
        _history.add(target);
      }
      _historyIndex = _history.length - 1;
    }

    setState(() {
      _currentUrl = target;
      _urlController.text = target;
      _viewVersion++;
    });
    _probeNetwork(target);
  }

  void _reload() {
    setState(() {
      _viewVersion++;
    });
    _probeNetwork(_currentUrl);
  }

  Future<void> _executeJs() async {
    final code = _jsConsoleController.text.trim();
    if (code.isEmpty) return;
    _jsConsoleController.clear();
    final viewId = 'v$_viewVersion';
    setState(() {
      _consoleLogs.insert(0, {
        'type': 'eval',
        'text': '> $code',
        'time': 'just now',
      });
    });

    try {
      final res = await evaluatePlatformBrowserJs(code, viewId: viewId);
      if (mounted) {
        setState(() {
          final isErr = res.startsWith('Error:');
          _consoleLogs.insert(0, {
            'type': isErr ? 'error' : 'log',
            'text': '< $res',
            'time': 'just now',
          });
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _consoleLogs.insert(0, {
            'type': 'error',
            'text': '< Exception: $e',
            'time': 'just now',
          });
        });
      }
    }
  }


  Future<void> _openExternal() async {
    final uri = Uri.parse(_currentUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void dispose() {
    _urlController.dispose();
    _jsConsoleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isHttps = _currentUrl.startsWith('https://');

    return Container(
      color: widget.isDark ? const Color(0xFF090A0F) : const Color(0xFFF8FAFC),
      child: Column(
        children: [
          // Top Nav & Omnibar
          _buildOmnibar(isHttps),
          // Quick Bookmarks & Port Jumpers
          _buildQuickPills(),
          // Main Viewport Area
          Expanded(
            child: Stack(
              children: [
                _buildViewport(),
                if (_showDevTools)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 280,
                    child: _buildDevToolsPanel(),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOmnibar(bool isHttps) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: widget.cardBg,
        border: Border(bottom: BorderSide(color: widget.borderColor, width: 0.8)),
      ),
      child: Row(
        children: [
          // Back to Chat button if callback provided
          if (widget.onBackToChat != null)
            IconButton(
              icon: Icon(LucideIcons.arrowLeft, size: 18, color: widget.textSecondary),
              onPressed: widget.onBackToChat,
              tooltip: 'Back to Chat',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          IconButton(
            icon: Icon(LucideIcons.home, size: 16, color: widget.textSecondary),
            onPressed: () => _navigateTo(_defaultBaseUrl),
            tooltip: 'Home ($_defaultHost)',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
          ),
          IconButton(
            icon: Icon(
              LucideIcons.chevronLeft,
              size: 18,
              color: _canGoBack ? widget.textPrimary : widget.textSecondary.withValues(alpha: 0.35),
            ),
            onPressed: _canGoBack ? _goBack : null,
            tooltip: 'Back',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 30),
          ),
          IconButton(
            icon: Icon(
              LucideIcons.chevronRight,
              size: 18,
              color: _canGoForward ? widget.textPrimary : widget.textSecondary.withValues(alpha: 0.35),
            ),
            onPressed: _canGoForward ? _goForward : null,
            tooltip: 'Forward',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 30),
          ),
          IconButton(
            icon: Icon(LucideIcons.refreshCw, size: 15, color: widget.textSecondary),
            onPressed: _reload,
            tooltip: 'Reload Page',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
          ),
          const SizedBox(width: 4),

          // URL Omnibar
          Expanded(
            child: Container(
              height: 36,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: widget.isDark ? const Color(0xFF13151F) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: widget.borderColor.withValues(alpha: 0.8)),
              ),
              child: Row(
                children: [
                  Icon(
                    isHttps ? LucideIcons.lock : LucideIcons.unlock,
                    size: 13,
                    color: isHttps ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _urlController,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: widget.textPrimary,
                      ),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                        hintText: 'Enter URL or search...',
                      ),
                      onSubmitted: _navigateTo,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.arrowRight, size: 14, color: Color(0xFF6366F1)),
                    onPressed: () => _navigateTo(_urlController.text),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),

          // Viewport switch (Full / 390px)
          IconButton(
            icon: Icon(
              _viewportMode == 1 ? LucideIcons.smartphone : LucideIcons.monitor,
              size: 16,
              color: _viewportMode == 1 ? const Color(0xFF6366F1) : widget.textSecondary,
            ),
            onPressed: () {
              setState(() => _viewportMode = (_viewportMode + 1) % 3);
            },
            tooltip: 'Toggle Viewport Device',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
          ),

          // Open in External Browser
          IconButton(
            icon: Icon(LucideIcons.externalLink, size: 15, color: widget.textSecondary),
            onPressed: _openExternal,
            tooltip: 'Open in Chrome/Browser',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
          ),

          // DevTools Drawer toggle
          IconButton(
            icon: Icon(
              LucideIcons.terminal,
              size: 16,
              color: _showDevTools ? const Color(0xFF6366F1) : widget.textSecondary,
            ),
            onPressed: () {
              setState(() => _showDevTools = !_showDevTools);
            },
            tooltip: 'DevTools Panel',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickPills() {
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0F111A) : const Color(0xFFF1F5F9),
        border: Border(bottom: BorderSide(color: widget.borderColor, width: 0.5)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        children: [
          _buildPill(_defaultHost, _defaultBaseUrl, isSpecial: true),
          _buildPill(':3000 (React)', 'http://127.0.0.1:3000'),
          _buildPill(':5173 (Vite)', 'http://127.0.0.1:5173'),
          _buildPill(':8000 (Backend)', 'http://127.0.0.1:8000'),
          _buildPill('Google', 'https://www.google.com'),
          _buildPill('GitHub', 'https://github.com'),
        ],
      ),
    );
  }

  Widget _buildPill(String label, String url, {bool isSpecial = false}) {
    final isCurrent = _currentUrl == url;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 3),
      child: InkWell(
        onTap: () => _navigateTo(url),
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSpecial
                ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                : (isCurrent ? widget.borderColor : Colors.transparent),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isSpecial ? const Color(0xFF6366F1) : widget.borderColor.withValues(alpha: 0.5),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: isSpecial ? const Color(0xFF818CF8) : (isCurrent ? widget.textPrimary : widget.textSecondary),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildViewport() {
    // Show beautiful home hub if on default home URL
    if (_currentUrl == _defaultBaseUrl && _availablePorts.isEmpty && !_isLoadingStatus) {
      return _buildHomeHub();
    }

    double? widthConstraint;
    if (_viewportMode == 1) {
      widthConstraint = 390; // Mobile
    } else if (_viewportMode == 2) {
      widthConstraint = 768; // Tablet
    }

    Widget iframeView = buildPlatformBrowserIFrame(
      url: _currentUrl,
      viewId: '$_viewVersion',
      isDark: widget.isDark,
    );

    if (widthConstraint != null) {
      return Center(
        child: Container(
          width: widthConstraint,
          margin: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: widget.borderColor, width: 2),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 10)),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: iframeView,
        ),
      );
    }

    return iframeView;
  }

  Widget _buildHomeHub() {
    final bookmarks = [
      {'icon': LucideIcons.globe, 'label': 'Google', 'url': 'https://www.google.com'},
      {'icon': LucideIcons.gitBranch, 'label': 'GitHub', 'url': 'https://github.com'},
      {'icon': LucideIcons.bookOpen, 'label': 'MDN Docs', 'url': 'https://developer.mozilla.org'},
      {'icon': LucideIcons.zap, 'label': 'StackOverflow', 'url': 'https://stackoverflow.com'},
    ];

    final devPorts = [
      {'port': 3000, 'label': 'React / Next.js'},
      {'port': 5173, 'label': 'Vite'},
      {'port': 8000, 'label': 'Laravel / Django'},
      {'port': 4000, 'label': 'Custom Server'},
    ];

    final bg = widget.isDark ? const Color(0xFF090b10) : const Color(0xFFF8FAFC);
    final cardColor = widget.isDark ? const Color(0xFF13151f) : Colors.white;
    final borderC = widget.isDark ? const Color(0xFF232738) : const Color(0xFFE2E8F0);

    return Container(
      color: bg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero welcome strip
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF6366f1), Color(0xFF4f46e5)],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.zap, size: 20, color: Colors.white),
                      const SizedBox(width: 8),
                      const Text('AvA In-App Browser',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Browse the web or preview live dev servers via $_defaultHost',
                    style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                  ),
                  const SizedBox(height: 12),
                  // Reload status
                  GestureDetector(
                    onTap: () async {
                      await _fetchRouterStatus();
                      if (_availablePorts.isNotEmpty) {
                        _navigateTo(_defaultBaseUrl);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.refreshCw, size: 13, color: Colors.white),
                          const SizedBox(width: 6),
                          const Text('Check for Active Dev Servers',
                              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Quick Dev Server Ports
            Text('Local Dev Servers', style: TextStyle(color: widget.textSecondary, fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 3.2,
              children: devPorts.map((p) {
                final port = p['port'] as int;
                final label = p['label'] as String;
                return GestureDetector(
                  onTap: () {
                    // Switch preview router to this port then open
                    _switchRouterPort(port);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: borderC),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.server, size: 14, color: Color(0xFF6366f1)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(':$port', style: TextStyle(color: widget.textPrimary, fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                              Text(label, style: TextStyle(color: widget.textSecondary, fontSize: 9.5), overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 16),

            // Bookmarks
            Text('Quick Links', style: TextStyle(color: widget.textSecondary, fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ...bookmarks.map((b) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: GestureDetector(
                onTap: () => _navigateTo(b['url'] as String),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: borderC),
                  ),
                  child: Row(
                    children: [
                      Icon(b['icon'] as IconData, size: 16, color: const Color(0xFF6366f1)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(b['label'] as String, style: TextStyle(color: widget.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                            Text(b['url'] as String, style: TextStyle(color: widget.textSecondary, fontSize: 10), overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                      Icon(LucideIcons.arrowRight, size: 14, color: widget.textSecondary),
                    ],
                  ),
                ),
              ),
            )),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // ─── Built-in DevTools Panel ───────────────────────────────────────────────
  Widget _buildDevToolsPanel() {
    return Container(
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0F111A) : Colors.white,
        border: Border(top: BorderSide(color: widget.borderColor, width: 1.5)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 16, offset: const Offset(0, -4)),
        ],
      ),
      child: Column(
        children: [
          // DevTools Tabs Bar
          Container(
            height: 36,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: widget.cardBg,
              border: Border(bottom: BorderSide(color: widget.borderColor, width: 0.8)),
            ),
            child: Row(
              children: [
                _buildDevTab(0, 'Console (${_consoleLogs.length})', LucideIcons.terminal),
                _buildDevTab(1, 'Network (${_networkRequests.length})', LucideIcons.radio),
                _buildDevTab(2, 'Page Info', LucideIcons.info),
                _buildDevTab(3, 'Router ($_defaultHost)', LucideIcons.server),
                const Spacer(),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 14),
                  onPressed: () => setState(() => _showDevTools = false),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                ),
              ],
            ),
          ),
          // Tab Content
          Expanded(
            child: _buildDevTabContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildDevTab(int index, String label, IconData icon) {
    final isSel = _devToolsTab == index;
    return InkWell(
      onTap: () => setState(() => _devToolsTab = index),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        margin: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: isSel ? const Color(0xFF6366F1).withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: isSel ? const Color(0xFF6366F1) : widget.textSecondary),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                color: isSel ? widget.textPrimary : widget.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDevTabContent() {
    switch (_devToolsTab) {
      case 0:
        return _buildConsoleTab();
      case 1:
        return _buildNetworkTab();
      case 2:
        return _buildPageInfoTab();
      case 3:
        return _buildRouterTab();
      default:
        return const SizedBox();
    }
  }

  Widget _buildConsoleTab() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: _consoleLogs.length,
            itemBuilder: (ctx, i) {
              final log = _consoleLogs[i];
              Color color = widget.textPrimary;
              if (log['type'] == 'error') color = const Color(0xFFEF4444);
              if (log['type'] == 'warn') color = const Color(0xFFF59E0B);
              if (log['type'] == 'info') color = const Color(0xFF38BDF8);

              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${log['time']}  ',
                      style: TextStyle(fontFamily: 'monospace', fontSize: 10, color: widget.textSecondary),
                    ),
                    Expanded(
                      child: Text(
                        log['text'].toString(),
                        style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: color),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        Container(
          height: 36,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: widget.cardBg,
            border: Border(top: BorderSide(color: widget.borderColor, width: 0.8)),
          ),
          child: Row(
            children: [
              const Text('>', style: TextStyle(fontFamily: 'monospace', fontSize: 13, color: Color(0xFF6366F1))),
              const SizedBox(width: 6),
              Expanded(
                child: TextField(
                  controller: _jsConsoleController,
                  style: TextStyle(fontFamily: 'monospace', fontSize: 11.5, color: widget.textPrimary),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    hintText: 'Evaluate JavaScript...',
                  ),
                  onSubmitted: (_) => _executeJs(),
                ),
              ),
              IconButton(
                icon: const Icon(LucideIcons.arrowRight, size: 14, color: Color(0xFF6366F1)),
                onPressed: _executeJs,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNetworkTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _networkRequests.length,
      itemBuilder: (ctx, i) {
        final req = _networkRequests[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: widget.cardBg,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: widget.borderColor.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  req['method'].toString(),
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  req['url'].toString(),
                  style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: widget.textPrimary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '${req['status']} • ${req['time']}',
                style: TextStyle(fontSize: 10, color: widget.textSecondary),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPageInfoTab() {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoRow('Document URL', _currentUrl),
          _buildInfoRow('Security Protocol', _currentUrl.startsWith('https://') ? 'TLS 1.3 / HTTPS Secure' : 'HTTP / Dev Mode'),
          _buildInfoRow('Device Mode', _viewportMode == 1 ? 'Mobile (390px)' : (_viewportMode == 2 ? 'Tablet (768px)' : 'Fluid / Responsive')),
          _buildInfoRow('AvA Agent Link', 'Agent Core Puppeteer session available'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: widget.textSecondary)),
          ),
          Expanded(
            child: Text(value, style: TextStyle(fontFamily: 'monospace', fontSize: 11.5, color: widget.textPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _buildRouterTab() {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '$_defaultHost Dev Router Status',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              if (_isLoadingStatus)
                const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5))
              else
                IconButton(
                  icon: const Icon(LucideIcons.refreshCw, size: 12),
                  onPressed: _fetchRouterStatus,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Active target port: ${_activePort != null ? ":$_activePort" : "Automatic discovery"}',
            style: TextStyle(fontSize: 11, color: widget.textSecondary),
          ),
          const SizedBox(height: 10),
          const Text('Switch Preview to Port:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            children: {
              ..._availablePorts,
              3000,
              5173,
              8000,
              8080,
              4173,
            }.toList().map((port) {
              final isCurrent = _activePort == port;
              final isDetected = _availablePorts.contains(port);
              return ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCurrent ? const Color(0xFF6366F1) : widget.cardBg,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => _switchRouterPort(port),
                child: Text(
                  ':$port${isDetected ? ' ●' : ''}',
                  style: TextStyle(
                    fontSize: 11,
                    color: isCurrent ? Colors.white : (isDetected ? const Color(0xFF10B981) : widget.textPrimary),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
