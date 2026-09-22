import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/app_models.dart';
import '../services/agent_core_service.dart';
import '../widgets/api_connector_modal.dart';
import '../utils/app_toast.dart';

class ModelsScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final List<AvaModelItem> availableModels;
  final AvaModelItem? selectedModel;
  final ValueChanged<AvaModelItem> onSelectModel;
  final Future<void> Function() onRefreshModels;
  final String? serverUrl;
  final AvaAgentCoreService? agentCoreService;

  const ModelsScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.availableModels,
    required this.selectedModel,
    required this.onSelectModel,
    required this.onRefreshModels,
    this.serverUrl,
    this.agentCoreService,
  });

  @override
  State<ModelsScreen> createState() => _ModelsScreenState();
}

class _ModelsScreenState extends State<ModelsScreen> {
  String _searchQuery = '';
  List<Map<String, dynamic>> _providers = [];
  bool _loadingProviders = false;
  bool _isReloading = false;

  @override
  void initState() {
    super.initState();
    _loadProviders();
  }

  Future<void> _handleReloadModels() async {
    if (_isReloading) return;
    setState(() => _isReloading = true);
    try {
      await _loadProviders();
      await widget.onRefreshModels();
      if (!mounted) return;
      AppToast.success(context, 'Models and providers reloaded dynamically');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(context, 'Failed to reload models: $e');
    } finally {
      if (mounted) setState(() => _isReloading = false);
    }
  }

  Future<void> _loadProviders() async {
    final svc = widget.agentCoreService;
    if (svc == null) return;
    setState(() => _loadingProviders = true);
    try {
      final list = await svc.fetchProvidersList();
      if (!mounted) return;
      if (list.isNotEmpty) {
        setState(() {
          _providers = list;
          _loadingProviders = false;
        });
        return;
      }
    } catch (e) { print('Ignored error: $e'); }

    // Fallback to fetchCustomProviders if /api/providers is not yet populated
    final customList = await svc.fetchCustomProviders();
    if (!mounted) return;
    setState(() {
      _providers = customList.map((c) => {
        'id': c['providerKey'] ?? '',
        'name': c['name'] ?? c['providerKey'] ?? '',
        'type': 'custom',
        'authType': 'api',
        'connected': c['hasApiKey'] == true,
        'enabled': c['disabled'] != true,
        'baseURL': c['baseURL'] ?? '',
        'modelCount': (c['modelKeys'] as List?)?.length ?? 0,
      }).toList();
      _loadingProviders = false;
    });
  }

  Future<void> _openConnector({Map<String, dynamic>? existing}) async {
    final svc = widget.agentCoreService;
    if (svc == null) {
      AppToast.error(context, 'Not connected to the AvA Core engine.');
      return;
    }
    final saved = await showApiConnectorModal(
      context: context,
      isDark: widget.isDark,
      cardBg: widget.cardBg,
      borderColor: widget.borderColor,
      textPrimary: widget.textPrimary,
      textSecondary: widget.textSecondary,
      service: svc,
      existing: existing,
    );
    if (saved != true || !mounted) return;

    await _loadProviders();
    await widget.onRefreshModels();
    if (!mounted) return;
    AppToast.success(context, existing == null ? 'Connector saved' : 'Connector updated');
  }

  Future<void> _toggleProvider(Map<String, dynamic> provider, bool enabled) async {
    final svc = widget.agentCoreService;
    if (svc == null) return;
    final key = provider['id']?.toString() ?? provider['providerKey']?.toString() ?? '';
    if (key.isEmpty) return;

    final isConnected = provider['connected'] == true;
    final authType = provider['authType']?.toString() ?? 'api';
    final isOpencode = key == 'opencode';
    final requiresAuth = authType != 'none' && !isOpencode;

    if (enabled && !isConnected && requiresAuth) {
      AppToast.warning(context, 'Please configure credentials for ${provider['name'] ?? key} before enabling.');
      _openProviderSettings(provider);
      return;
    }

    final res = await svc.toggleCustomProvider(providerKey: key, enabled: enabled);
    if (!mounted) return;
    if (res['ok'] == true || res['success'] == true) {
      await _loadProviders();
      await widget.onRefreshModels();
    } else if (res['requiresAuth'] == true) {
      AppToast.error(context, res['error'] ?? 'Authentication required before enabling.');
      _openProviderSettings(provider);
    } else {
      AppToast.error(context, 'Failed to update status: ${res['error']}');
    }
  }

  Future<void> _openProviderSettings(Map<String, dynamic> provider) async {
    final svc = widget.agentCoreService;
    if (svc == null) return;

    final id = provider['id']?.toString() ?? provider['providerKey']?.toString() ?? '';
    final name = provider['name']?.toString() ?? id;
    final isAntigravity = id == 'antigravity';
    final isCustom = provider['type'] == 'custom';
    final isOpencode = id == 'opencode';
    final authType = provider['authType']?.toString() ?? 'api';
    bool isConnected = provider['connected'] == true;
    bool isEnabled = provider['enabled'] != false;
    final website = provider['website']?.toString();
    final requiresAuth = authType != 'none' && !isOpencode;

    final keyCtrl = TextEditingController(text: provider['maskedKey']?.toString() ?? '');
    final codeCtrl = TextEditingController();
    bool saving = false;
    bool refreshingModels = false;
    String? statusMessage;
    List<Map<String, dynamic>> credentials = List<Map<String, dynamic>>.from(
      (provider['credentials'] as List?) ?? const [],
    );
    bool fetchedCreds = false;

    final newCredNameCtrl = TextEditingController();
    final newCredValueCtrl = TextEditingController();
    bool newCredObscure = true;
    bool showAddForm = false;
    bool submittingCred = false;
    String? credError;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          if (!fetchedCreds && requiresAuth) {
            fetchedCreds = true;
            svc.fetchProviderCredentials(id).then((fresh) {
              if (fresh.isNotEmpty && ctx.mounted) {
                setModalState(() => credentials = fresh);
              }
            });
          }
          final isDark = widget.isDark;
          return Container(
            margin: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              top: 40,
            ),
            decoration: BoxDecoration(
              color: widget.cardBg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
              border: Border.all(color: widget.borderColor),
            ),
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: widget.borderColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Header with Original Logo
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: _providerColor(id).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: _buildProviderLogo(id, size: 22),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: widget.textPrimary,
                              ),
                            ),
                            Text(
                              provider['description']?.toString() ?? 'Provider configuration',
                              style: TextStyle(fontSize: 11, color: widget.textSecondary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Enable / Disable switch tile
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: widget.borderColor),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isEnabled && (isConnected || !requiresAuth)
                              ? LucideIcons.checkCircle
                              : LucideIcons.circleSlash,
                          size: 16,
                          color: isEnabled && (isConnected || !requiresAuth)
                              ? const Color(0xFF10B981)
                              : widget.textSecondary,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isEnabled && (isConnected || !requiresAuth)
                                    ? 'Provider is Enabled'
                                    : 'Provider is Disabled',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: widget.textPrimary,
                                ),
                              ),
                              if (!isConnected && requiresAuth)
                                const Text(
                                  'Requires authentication to enable',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    color: Color(0xFFF59E0B),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Switch.adaptive(
                          value: isEnabled && (isConnected || !requiresAuth),
                          activeTrackColor: const Color(0xFF10B981),
                          onChanged: (val) async {
                            if (val && !isConnected && requiresAuth) {
                              setModalState(() {
                                statusMessage = 'Please enter and save credentials below before enabling.';
                              });
                              return;
                            }
                            final res = await svc.toggleCustomProvider(providerKey: id, enabled: val);
                            if (res['ok'] == true || res['success'] == true) {
                              isEnabled = val;
                              await _loadProviders();
                              await widget.onRefreshModels();
                            } else {
                              setModalState(() {
                                statusMessage = 'Failed: ${res['error'] ?? "Unknown error"}';
                              });
                            }
                            setModalState(() {});
                            if (mounted) setState(() {});
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Dynamic Refresh Models Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: (refreshingModels || saving)
                          ? null
                          : () async {
                              setModalState(() {
                                refreshingModels = true;
                                statusMessage = null;
                              });
                              final res = await svc.refreshProviderModels(id);
                              setModalState(() => refreshingModels = false);
                              if (res['success'] == true) {
                                final count = res['count'] ?? 0;
                                setModalState(() {
                                  statusMessage = 'Refreshed models: $count available.';
                                });
                                await _loadProviders();
                                await widget.onRefreshModels();
                              } else {
                                setModalState(() {
                                  statusMessage = 'Failed to refresh models: ${res['error'] ?? "Unknown error"}';
                                });
                              }
                            },
                      icon: refreshingModels
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                            )
                          : const Icon(LucideIcons.rotateCw, size: 14, color: Color(0xFF6366F1)),
                      label: Text(
                        refreshingModels ? 'Refreshing Models...' : 'Refresh Models Dynamically',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF6366F1)),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF6366F1)),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Status message (if any)
                  if (statusMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        statusMessage!,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF818CF8)),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Custom Provider Details & Edit/Delete
                  if (isCustom) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: widget.borderColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Base URL: ${provider['baseURL'] ?? provider['api'] ?? "N/A"}',
                              style: TextStyle(fontSize: 11, color: widget.textSecondary, fontFamily: 'JetBrainsMono')),
                          const SizedBox(height: 4),
                          Text('Models configured: ${provider['modelCount'] ?? 0}',
                              style: TextStyle(fontSize: 11, color: widget.textSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.pop(ctx);
                              _openConnector(existing: provider);
                            },
                            icon: const Icon(LucideIcons.pencil, size: 14),
                            label: const Text('Edit Endpoint'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: widget.textPrimary,
                              side: BorderSide(color: widget.borderColor),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            await _deleteCustomConnector(provider);
                          },
                          icon: const Icon(LucideIcons.trash2, size: 14),
                          label: const Text('Delete'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEF4444),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  // OpenCode Zen info
                  if (isOpencode) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: widget.borderColor),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.sparkles, size: 18, color: Color(0xFF6366F1)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'OpenCode Zen provides built-in free models (MiMo, Nemotron, Big Pickle) that require no API key or external credentials.',
                              style: TextStyle(fontSize: 12, color: widget.textSecondary, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    // Unified 1st-Level Credential & Fallback Section
                    Row(
                      children: [
                        Icon(
                          isAntigravity ? LucideIcons.shieldCheck : LucideIcons.keyRound,
                          size: 15,
                          color: const Color(0xFF6366F1),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isAntigravity ? 'Google Accounts & Fallback Tokens' : 'API Keys & Fallback Tokens',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: widget.textPrimary),
                        ),
                        const Spacer(),
                        OutlinedButton.icon(
                          onPressed: saving || submittingCred
                              ? null
                              : () => setModalState(() {
                                  showAddForm = !showAddForm;
                                  credError = null;
                                  if (showAddForm) {
                                    newCredNameCtrl.text = isAntigravity
                                        ? 'Account ${credentials.length + 1}'
                                        : 'Key ${credentials.length + 1}';
                                    newCredValueCtrl.clear();
                                  }
                                }),
                          icon: Icon(showAddForm ? LucideIcons.x : LucideIcons.plus, size: 13),
                          label: Text(
                            showAddForm
                                ? 'Close'
                                : (isAntigravity ? '+ Add Account' : '+ Add Key'),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF6366F1),
                            side: const BorderSide(color: Color(0xFF6366F1)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            visualDensity: VisualDensity.compact,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isAntigravity
                          ? 'Multi-Account Fallback: Connect multiple Google accounts or OAuth Access Tokens. If one hits 429 quota limits, AvA instantly falls back to the next enabled account.'
                          : 'Auto-Fallback: If your active key hits rate limit (429) or quota errors, AvA automatically falls back to the next enabled key.',
                      style: TextStyle(fontSize: 11, color: widget.textSecondary, height: 1.35),
                    ),
                    const SizedBox(height: 10),

                    // Direct 1st-Level Inline Form
                    if (showAddForm || credentials.isEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF141418) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.35), width: 1.2),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  isAntigravity ? LucideIcons.userPlus : LucideIcons.keyRound,
                                  size: 15,
                                  color: const Color(0xFF6366F1),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isAntigravity ? 'Add Google Account / OAuth Token' : 'Add API Key',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: widget.textPrimary),
                                ),
                                const Spacer(),
                                if (credentials.isNotEmpty)
                                  IconButton(
                                    icon: const Icon(LucideIcons.x, size: 15),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                                    onPressed: () => setModalState(() => showAddForm = false),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            if (isAntigravity) ...[
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: (saving || submittingCred)
                                      ? null
                                      : () async {
                                          setModalState(() => submittingCred = true);
                                          try {
                                            final authRes = await svc.startAntigravityOAuth();
                                            final url = authRes['url']?.toString();
                                            if (url != null && url.isNotEmpty) {
                                              await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                                              setModalState(() {
                                                statusMessage = 'Browser opened. Sign in and paste the code/callback URL below:';
                                              });
                                            }
                                          } catch (e) {
                                            setModalState(() => credError = 'OAuth error: $e');
                                          } finally {
                                            setModalState(() => submittingCred = false);
                                          }
                                        },
                                  icon: const Icon(LucideIcons.globe, size: 14),
                                  label: const Text('Sign in with Google (OAuth)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF4F46E5),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: codeCtrl,
                                style: TextStyle(fontSize: 11.5, color: widget.textPrimary),
                                decoration: InputDecoration(
                                  hintText: 'Paste OAuth authorization code or redirect URL',
                                  hintStyle: TextStyle(fontSize: 11, color: widget.textSecondary),
                                  isDense: true,
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF18181B) : Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                                  suffixIcon: IconButton(
                                    icon: const Icon(LucideIcons.check, size: 15, color: Color(0xFF10B981)),
                                    tooltip: 'Submit Code',
                                    onPressed: submittingCred || codeCtrl.text.trim().isEmpty
                                        ? null
                                        : () async {
                                            setModalState(() => submittingCred = true);
                                            final res = await svc.completeAntigravityOAuth(codeCtrl.text.trim());
                                            setModalState(() => submittingCred = false);
                                            if (res['success'] == true) {
                                              codeCtrl.clear();
                                              final fresh = await svc.fetchProviderCredentials(id);
                                              setModalState(() {
                                                credentials = fresh;
                                                isConnected = true;
                                                isEnabled = true;
                                                showAddForm = false;
                                                statusMessage = 'Google account connected successfully!';
                                              });
                                              await _loadProviders();
                                              await widget.onRefreshModels();
                                            } else {
                                              setModalState(() => credError = 'OAuth failed: ${res['error']}');
                                            }
                                          },
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(child: Divider(color: widget.borderColor)),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8),
                                    child: Text('OR DIRECT ACCESS TOKEN', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: widget.textSecondary)),
                                  ),
                                  Expanded(child: Divider(color: widget.borderColor)),
                                ],
                              ),
                              const SizedBox(height: 10),
                            ],
                            Text(isAntigravity ? 'Account Identifier / Label' : 'Key Label',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: widget.textPrimary)),
                            const SizedBox(height: 5),
                            TextField(
                              controller: newCredNameCtrl,
                              style: TextStyle(fontSize: 12, color: widget.textPrimary),
                              decoration: InputDecoration(
                                hintText: isAntigravity ? 'e.g. Work Account, Personal Account' : 'e.g. Primary Key, Backup 2',
                                hintStyle: TextStyle(fontSize: 11, color: widget.textSecondary),
                                isDense: true,
                                filled: true,
                                fillColor: isDark ? const Color(0xFF18181B) : Colors.white,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(isAntigravity ? 'Google Access Token (ya29...)' : 'API Key',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: widget.textPrimary)),
                            const SizedBox(height: 5),
                            TextField(
                              controller: newCredValueCtrl,
                              obscureText: !isAntigravity && newCredObscure,
                              style: TextStyle(fontSize: 12, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                              decoration: InputDecoration(
                                hintText: isAntigravity ? 'ya29.a0A...' : 'sk-... or key string',
                                hintStyle: TextStyle(fontSize: 11, color: widget.textSecondary),
                                isDense: true,
                                filled: true,
                                fillColor: isDark ? const Color(0xFF18181B) : Colors.white,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.borderColor)),
                                suffixIcon: !isAntigravity
                                    ? IconButton(
                                        icon: Icon(newCredObscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 15, color: widget.textSecondary),
                                        onPressed: () => setModalState(() => newCredObscure = !newCredObscure),
                                      )
                                    : null,
                              ),
                            ),
                            if (credError != null) ...[
                              const SizedBox(height: 8),
                              Text(credError!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
                            ],
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (credentials.isNotEmpty)
                                  TextButton(
                                    onPressed: () => setModalState(() => showAddForm = false),
                                    child: Text('Cancel', style: TextStyle(color: widget.textSecondary, fontSize: 11.5)),
                                  ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: submittingCred || newCredValueCtrl.text.trim().isEmpty
                                      ? null
                                      : () async {
                                          setModalState(() {
                                            submittingCred = true;
                                            credError = null;
                                          });
                                          final val = newCredValueCtrl.text.trim();
                                          final label = newCredNameCtrl.text.trim().isEmpty
                                              ? (isAntigravity ? 'Account ${credentials.length + 1}' : 'Key ${credentials.length + 1}')
                                              : newCredNameCtrl.text.trim();
                                          final authKind = isAntigravity ? 'oauth' : 'api';
                                          final res = await svc.addProviderCredential(
                                            providerKey: id,
                                            name: label,
                                            key: isAntigravity ? null : val,
                                            access: isAntigravity ? val : null,
                                            type: authKind,
                                          );
                                          setModalState(() => submittingCred = false);
                                          if (res['ok'] == true) {
                                            newCredValueCtrl.clear();
                                            newCredNameCtrl.clear();
                                            final fresh = await svc.fetchProviderCredentials(id);
                                            setModalState(() {
                                              credentials = fresh;
                                              showAddForm = false;
                                              isConnected = true;
                                              isEnabled = true;
                                              statusMessage = isAntigravity
                                                  ? 'Google account token saved! Auto-fallback is enabled.'
                                                  : 'New API key added! Auto-fallback is enabled.';
                                            });
                                            await _loadProviders();
                                            await widget.onRefreshModels();
                                          } else {
                                            setModalState(() => credError = res['error']?.toString() ?? 'Failed to save credential');
                                          }
                                        },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF6366F1),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: submittingCred
                                      ? const SizedBox(width: 13, height: 13, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : Text(isAntigravity ? 'Save Account Token' : 'Save API Key', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Credentials List
                    if (credentials.isEmpty && !showAddForm) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: widget.borderColor),
                        ),
                        child: Center(
                          child: Text(
                            isAntigravity
                                ? 'No Google accounts connected yet. Tap "+ Add Account" above to sign in.'
                                : 'No API keys registered yet. Tap "+ Add Key" above to add your key.',
                            style: TextStyle(fontSize: 11.5, color: widget.textSecondary),
                          ),
                        ),
                      ),
                    ] else ...[
                      ...credentials.map((cred) {
                        final credId = cred['id']?.toString() ?? '';
                        final credName = cred['name']?.toString() ?? 'Key';
                        final credType = cred['type']?.toString() ?? (isAntigravity ? 'oauth' : 'api');
                        final isCredEnabled = cred['enabled'] != false;
                        final isActive = cred['active'] == true;
                        final masked = cred['maskedKey']?.toString() ?? '••••••••';
                        final failCount = (cred['failCount'] as num?)?.toInt() ?? 0;
                        final accountProject = cred['accountId']?.toString();

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isActive ? const Color(0xFF6366F1).withValues(alpha: 0.6) : widget.borderColor,
                              width: isActive ? 1.3 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              InkWell(
                                onTap: saving
                                    ? null
                                    : () async {
                                        setModalState(() => saving = true);
                                        final res = await svc.setActiveProviderCredential(providerKey: id, id: credId);
                                        setModalState(() => saving = false);
                                        if (res['ok'] == true) {
                                          final fresh = await svc.fetchProviderCredentials(id);
                                          setModalState(() => credentials = fresh);
                                          await _loadProviders();
                                        }
                                      },
                                child: Icon(
                                  isActive ? LucideIcons.checkCircle2 : LucideIcons.circle,
                                  size: 16,
                                  color: isActive ? const Color(0xFF6366F1) : widget.textSecondary.withValues(alpha: 0.4),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          credName,
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: widget.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: credType == 'oauth'
                                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                                : const Color(0xFF6366F1).withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            credType == 'oauth' ? 'OAuth Token' : 'API Key',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w700,
                                              color: credType == 'oauth' ? const Color(0xFF10B981) : const Color(0xFF818CF8),
                                            ),
                                          ),
                                        ),
                                        if (isActive) ...[
                                          const SizedBox(width: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Text(
                                              'Active',
                                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF818CF8)),
                                            ),
                                          ),
                                        ],
                                        if (failCount > 0) ...[
                                          const SizedBox(width: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              '$failCount fails',
                                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    if (accountProject != null && accountProject.isNotEmpty) ...[
                                      const SizedBox(height: 1),
                                      Text('Project: $accountProject', style: TextStyle(fontSize: 10, color: widget.textSecondary)),
                                    ],
                                    const SizedBox(height: 2),
                                    Text(
                                      masked,
                                      style: TextStyle(fontSize: 10.5, fontFamily: 'JetBrainsMono', color: widget.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                              Transform.scale(
                                scale: 0.8,
                                child: Switch.adaptive(
                                  value: isCredEnabled,
                                  activeTrackColor: const Color(0xFF10B981),
                                  onChanged: saving
                                      ? null
                                      : (val) async {
                                          setModalState(() => saving = true);
                                          final res = await svc.toggleProviderCredential(providerKey: id, id: credId, enabled: val);
                                          setModalState(() => saving = false);
                                          if (res['ok'] == true) {
                                            final fresh = await svc.fetchProviderCredentials(id);
                                            setModalState(() => credentials = fresh);
                                            await _loadProviders();
                                          }
                                        },
                                ),
                              ),
                              if (credentials.length > 1)
                                IconButton(
                                  icon: const Icon(LucideIcons.trash2, size: 14, color: Color(0xFFEF4444)),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                  onPressed: saving
                                      ? null
                                      : () async {
                                          setModalState(() => saving = true);
                                          final res = await svc.deleteProviderCredential(providerKey: id, id: credId);
                                          setModalState(() => saving = false);
                                          if (res['ok'] == true) {
                                            final fresh = await svc.fetchProviderCredentials(id);
                                            setModalState(() => credentials = fresh);
                                            await _loadProviders();
                                          }
                                        },
                                ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ],

                  // Disconnect / Clear button (for connected providers)
                  if (isConnected && !isCustom && !isOpencode) ...[
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: saving
                            ? null
                            : () async {
                                setModalState(() => saving = true);
                                final res = await svc.disconnectProvider(id);
                                setModalState(() => saving = false);
                                if (res['success'] == true) {
                                  isConnected = false;
                                  isEnabled = false;
                                  keyCtrl.clear();
                                  setModalState(() {
                                    statusMessage = 'Disconnected provider credentials.';
                                  });
                                  await _loadProviders();
                                  await widget.onRefreshModels();
                                }
                              },
                        icon: const Icon(LucideIcons.logOut, size: 14, color: Color(0xFFEF4444)),
                        label: const Text('Disconnect / Remove Credentials',
                            style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w700)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFEF4444)),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],

                  if (website != null && website.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton.icon(
                        onPressed: () => launchUrl(Uri.parse(website), mode: LaunchMode.externalApplication),
                        icon: const Icon(LucideIcons.externalLink, size: 12),
                        label: Text('Visit $name website', style: const TextStyle(fontSize: 11.5)),
                        style: TextButton.styleFrom(foregroundColor: widget.textSecondary),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _deleteCustomConnector(Map<String, dynamic> connector) async {
    final svc = widget.agentCoreService;
    if (svc == null) return;
    final key = connector['id']?.toString() ?? connector['providerKey']?.toString() ?? '';
    if (key.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: widget.borderColor),
        ),
        title: Text('Remove connector?',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: widget.textPrimary)),
        content: Text(
          'Deletes "$key" from the server configuration and removes stored credentials.',
          style: TextStyle(fontSize: 12.5, color: widget.textSecondary, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              elevation: 0,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final res = await svc.deleteCustomProvider(providerKey: key);
    if (!mounted) return;
    if (res['ok'] == true || res['success'] == true) {
      await _loadProviders();
      await widget.onRefreshModels();
      if (!mounted) return;
      AppToast.info(context, 'Removed connector "$key"');
    }
  }

  String _logoName(String id) {
    final lower = id.toLowerCase();
    if (lower.contains('antigravity')) return 'antigravity';
    if (lower.contains('gemini')) return 'gemini';
    if (lower.contains('google')) return 'google';
    if (lower.contains('openai')) return 'openai';
    if (lower.contains('anthropic') || lower.contains('claude')) return 'anthropic';
    if (lower.contains('deepseek')) return 'deepseek';
    if (lower.contains('groq')) return 'groq';
    if (lower.contains('ollama')) return 'ollama';
    if (lower.contains('opencode')) return 'opencode';
    if (lower.contains('openrouter')) return 'openrouter';
    if (lower.contains('mistral')) return 'mistral';
    if (lower.contains('omniroute')) return 'omniroute';
    return 'custom';
  }

  Widget _buildProviderLogo(String id, {double size = 20}) {
    final name = _logoName(id);
    return Image.asset(
      'assets/providers/$name.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) => Icon(
        _providerIcon(id),
        size: size,
        color: _providerColor(id),
      ),
    );
  }

  IconData _providerIcon(String id) {
    final lower = id.toLowerCase();
    if (lower.contains('antigravity') || lower.contains('google')) return LucideIcons.sparkles;
    if (lower.contains('opencode')) return LucideIcons.layers;
    if (lower.contains('openai')) return LucideIcons.bot;
    if (lower.contains('anthropic') || lower.contains('claude')) return LucideIcons.cpu;
    if (lower.contains('deepseek')) return LucideIcons.search;
    if (lower.contains('groq')) return LucideIcons.zap;
    if (lower.contains('omniroute')) return LucideIcons.network;
    if (lower.contains('ollama')) return LucideIcons.terminal;
    return LucideIcons.plug;
  }

  Color _providerColor(String id) {
    final lower = id.toLowerCase();
    if (lower.contains('antigravity')) return const Color(0xFF8B5CF6);
    if (lower.contains('opencode')) return const Color(0xFF6366F1);
    if (lower.contains('openai')) return const Color(0xFF10B981);
    if (lower.contains('anthropic')) return const Color(0xFFD97706);
    if (lower.contains('deepseek')) return const Color(0xFF0284C7);
    if (lower.contains('groq')) return const Color(0xFFF97316);
    if (lower.contains('omniroute')) return const Color(0xFF6366F1);
    return const Color(0xFF64748B);
  }

  @override
  Widget build(BuildContext context) {
    final Map<String, List<AvaModelItem>> grouped = {};
    final q = _searchQuery.trim().toLowerCase();

    for (final m in widget.availableModels) {
      if (q.isNotEmpty) {
        final matches = m.name.toLowerCase().contains(q) ||
            m.id.toLowerCase().contains(q) ||
            m.provider.toLowerCase().contains(q);
        if (!matches) continue;
      }
      grouped.putIfAbsent(m.provider, () => []).add(m);
    }

    final isSearching = q.isNotEmpty;

    return RefreshIndicator(
      onRefresh: () async {
        await _loadProviders();
        await widget.onRefreshModels();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Bar
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI Models & Providers',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: widget.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${widget.availableModels.length} models across ${grouped.length} active providers',
                        style: TextStyle(fontSize: 12, color: widget.textSecondary),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: _isReloading ? null : _handleReloadModels,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF6366F1),
                    side: const BorderSide(color: Color(0xFF6366F1)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: _isReloading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
                        )
                      : const Icon(LucideIcons.rotateCw, size: 14),
                  label: Text(
                    _isReloading ? 'Reloading...' : 'Reload Models',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _openConnector(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.plug, size: 14),
                  label: const Text('Connect API', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Providers Section with Settings Icons
            _providersSection(),
            const SizedBox(height: 16),

            // Search Box
            Container(
              decoration: BoxDecoration(
                color: widget.cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: widget.borderColor),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextField(
                style: TextStyle(fontSize: 13, color: widget.textPrimary),
                decoration: InputDecoration(
                  icon: Icon(LucideIcons.search, size: 16, color: widget.textSecondary),
                  hintText: 'Search models',
                  hintStyle: TextStyle(fontSize: 13, color: widget.textSecondary),
                  border: InputBorder.none,
                  suffixIcon: q.isNotEmpty
                      ? IconButton(
                          icon: Icon(LucideIcons.xCircle, size: 16, color: widget.textSecondary),
                          onPressed: () => setState(() => _searchQuery = ''),
                        )
                      : null,
                ),
                onChanged: (val) => setState(() => _searchQuery = val),
              ),
            ),
            const SizedBox(height: 16),

            // Model Catalog List grouped by Provider
            ...grouped.entries.map((entry) {
              final providerName = entry.key;
              final modelsList = entry.value;
              final hasSelectedModel = modelsList.any((m) => m.id == widget.selectedModel?.id);
              final isAntigravity = providerName.toLowerCase() == 'antigravity';
              final shouldExpand = isSearching || hasSelectedModel || isAntigravity || grouped.length <= 4;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: widget.cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isAntigravity
                        ? const Color(0xFF8B5CF6).withValues(alpha: 0.3)
                        : widget.borderColor,
                  ),
                ),
                child: Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    key: ValueKey<String>('models_scr_${providerName}_${shouldExpand}_$q'),
                    initiallyExpanded: shouldExpand,
                    title: Row(
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          margin: const EdgeInsets.only(right: 8),
                          child: Center(
                            child: _buildProviderLogo(providerName, size: 18),
                          ),
                        ),
                        Text(
                          providerName.toLowerCase() == 'omniroute' ? 'OmniRoute Gateway' : (isAntigravity ? 'Google Antigravity' : providerName),
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: widget.textPrimary),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: _providerColor(providerName).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${modelsList.length} models',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: _providerColor(providerName),
                            ),
                          ),
                        ),
                      ],
                    ),
                    children: modelsList.map((model) {
                      final isSelected = model.id == widget.selectedModel?.id &&
                          model.provider == widget.selectedModel?.provider;
                      return ListTile(
                        dense: true,
                        title: Row(
                          children: [
                            Text(
                              model.name,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                color: isSelected ? const Color(0xFF4F46E5) : widget.textPrimary,
                              ),
                            ),
                            if (model.reasoning) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'Thinking',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF8B5CF6)),
                                ),
                              ),
                            ],
                          ],
                        ),
                        subtitle: Text(model.id, style: TextStyle(fontSize: 11, color: widget.textSecondary)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isSelected)
                              const Padding(
                                padding: EdgeInsets.only(right: 8.0),
                                child: Icon(LucideIcons.check, size: 16, color: Color(0xFF4F46E5)),
                              ),
                            ElevatedButton(
                              onPressed: () {
                                widget.onSelectModel(model);
                                AppToast.info(context, 'Selected model: ${model.name}');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isSelected
                                    ? const Color(0xFF4F46E5)
                                    : (widget.isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9)),
                                foregroundColor: isSelected ? Colors.white : widget.textPrimary,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                                minimumSize: const Size(60, 30),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: Text(isSelected ? 'Active' : 'Select', style: const TextStyle(fontSize: 11)),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // ── Provider Management Section ────────────────────────────────────────────

  Widget _providersSection() {
    const accent = Color(0xFF6366F1);
    return Container(
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: widget.borderColor),
      ),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.cpu, size: 14, color: accent),
              const SizedBox(width: 8),
              Text(
                'AI PROVIDERS & CONNECTIONS',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: widget.textSecondary,
                  letterSpacing: 0.7,
                ),
              ),
              const Spacer(),
              if (_loadingProviders)
                const SizedBox(width: 13, height: 13, child: CircularProgressIndicator(strokeWidth: 1.8))
              else
                Text(
                  '${_providers.length}',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: widget.textSecondary),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (_providers.isEmpty && !_loadingProviders)
            Text(
              'No providers discovered yet.',
              style: TextStyle(fontSize: 11.5, color: widget.textSecondary, height: 1.4),
            )
          else
            ..._providers.map((p) {
              final id = p['id']?.toString() ?? p['providerKey']?.toString() ?? '';
              final name = p['name']?.toString() ?? id;
              final isConnected = p['connected'] == true;
              final isEnabled = p['enabled'] != false;
              final authType = p['authType']?.toString() ?? 'api';
              final isOpencode = id == 'opencode';
              final requiresAuth = authType != 'none' && !isOpencode;
              final modelCount = p['modelCount'] ?? (p['models'] as List?)?.length ?? 0;
              final isAntigravity = id == 'antigravity';
              final isCustom = p['type'] == 'custom' ||
                  (!const ['antigravity', 'opencode', 'google', 'openai', 'anthropic', 'deepseek', 'groq', 'kilo']
                      .contains(id.toLowerCase()));
              final color = _providerColor(id);

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
                decoration: BoxDecoration(
                  color: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isAntigravity
                        ? color.withValues(alpha: 0.35)
                        : widget.borderColor,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: _buildProviderLogo(id, size: 20),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: widget.textPrimary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              if (isConnected)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Connected',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF10B981),
                                    ),
                                  ),
                                )
                              else if (requiresAuth)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Setup Required',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFFF59E0B),
                                    ),
                                  ),
                                ),
                              if (modelCount > 0) ...[
                                const SizedBox(width: 5),
                                Text(
                                  '$modelCount m',
                                  style: TextStyle(fontSize: 10, color: widget.textSecondary),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            p['description']?.toString() ?? p['baseURL']?.toString() ?? id,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10,
                              color: widget.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Transform.scale(
                      scale: 0.7,
                      child: Switch.adaptive(
                        value: isEnabled && (isConnected || !requiresAuth),
                        activeTrackColor: const Color(0xFF10B981),
                        onChanged: (val) {
                          if (val && !isConnected && requiresAuth) {
                            AppToast.warning(context, 'Please configure credentials for $name before enabling.');
                            _openProviderSettings(p);
                            return;
                          }
                          _toggleProvider(p, val);
                        },
                      ),
                    ),
                    IconButton(
                      onPressed: () => _openProviderSettings(p),
                      icon: Icon(LucideIcons.settings, size: 15, color: widget.textSecondary),
                      tooltip: 'Settings & Credentials',
                      visualDensity: VisualDensity.compact,
                    ),
                    if (isCustom)
                      IconButton(
                        onPressed: () => _deleteCustomConnector(p),
                        icon: const Icon(LucideIcons.trash2, size: 14, color: Color(0xFFEF4444)),
                        tooltip: 'Delete Custom Provider',
                        visualDensity: VisualDensity.compact,
                      ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
