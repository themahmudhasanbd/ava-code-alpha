import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/agent_core_service.dart';

/// A model row in the connector sheet — either discovered from the endpoint or
/// added by hand when the provider exposes no `/models` route.
class _ModelRow {
  _ModelRow({
    required this.modelKey,
    required this.name,
    this.contextLimit,
    this.outputLimit,
    this.selected = true,
    this.discovered = false,
  });

  String modelKey;
  String name;
  int? contextLimit;
  int? outputLimit;
  bool reasoning = false;
  bool selected;
  final bool discovered;

  Map<String, dynamic> toPayload() {
    int? ctx = contextLimit;
    final lower = modelKey.toLowerCase();
    if (ctx == 200000 && (lower.contains('nemotron') || lower.contains('gemini') || lower.contains('1m') || lower.contains('nex-n2.5') || lower.contains('laguna'))) {
      ctx = null;
    }
    if (ctx == null || ctx <= 0) {
      if (lower.contains('nemotron') || lower.contains('gemini') || lower.contains('1m')) {
        ctx = 1048576;
      } else if (lower.contains('nex-n2.5') || lower.contains('laguna') || lower.contains('256k')) {
        ctx = 262144;
      } else if (lower.contains('claude-3') || lower.contains('claude-3.5') || lower.contains('claude-3-7') || lower.contains('sonnet') || lower.contains('opus') || lower.contains('200k')) {
        ctx = 200000;
      } else if (lower.contains('gpt-4o') || lower.contains('gpt-4') || lower.contains('o1') || lower.contains('o3') || lower.contains('128k') || lower.contains('llama-3')) {
        ctx = 128000;
      } else if (lower.contains('deepseek') || lower.contains('64k')) {
        ctx = 64000;
      } else {
        ctx = 128000;
      }
    }
    return {
      'modelKey': modelKey.trim(),
      'name': name.trim().isEmpty ? modelKey.trim() : name.trim(),
      'reasoning': reasoning,
      'contextLimit': ctx,
      'outputLimit': outputLimit ?? (ctx >= 1000000 ? 65536 : 16384),
      'toolCall': true,
      'attachment': true,
    };
  }
}

/// Known OpenAI-compatible adapters. `npm` is the Vercel AI SDK package the
/// engine loads to talk to the endpoint.
const _adapters = <({String npm, String label, String hint})>[
  (
    npm: 'antigravity',
    label: 'Google Antigravity (Code Assist)',
    hint: 'Google Cloud Code Assist — Gemini & Claude models via OAuth or Access Token',
  ),
  (
    npm: '@ai-sdk/openai-compatible',
    label: 'OpenAI-compatible',
    hint: 'Any endpoint exposing /v1/chat/completions — vLLM, LM Studio, Ollama, OpenRouter, Together',
  ),
  (npm: '@ai-sdk/openai', label: 'OpenAI (native)', hint: 'api.openai.com or an Azure/proxy mirror of it'),
  (npm: '@ai-sdk/anthropic', label: 'Anthropic (native)', hint: 'api.anthropic.com Messages API'),
  (npm: '@ai-sdk/google', label: 'Google Generative AI', hint: 'generativelanguage.googleapis.com'),
  (npm: '@ai-sdk/mistral', label: 'Mistral', hint: 'api.mistral.ai'),
];

/// Opens the Custom API Connector sheet.
///
/// Returns true when a provider was saved, so the caller can refresh its
/// catalog. Returns null/false when dismissed.
Future<bool?> showApiConnectorModal({
  required BuildContext context,
  required bool isDark,
  required Color cardBg,
  required Color borderColor,
  required Color textPrimary,
  required Color textSecondary,
  required AvaAgentCoreService service,
  Map<String, dynamic>? existing,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (_) => _ApiConnectorSheet(
      isDark: isDark,
      cardBg: cardBg,
      borderColor: borderColor,
      textPrimary: textPrimary,
      textSecondary: textSecondary,
      service: service,
      existing: existing,
    ),
  );
}

class _ApiConnectorSheet extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService service;
  final Map<String, dynamic>? existing;

  const _ApiConnectorSheet({
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.service,
    this.existing,
  });

  @override
  State<_ApiConnectorSheet> createState() => _ApiConnectorSheetState();
}

class _ApiConnectorSheetState extends State<_ApiConnectorSheet> {
  final _titleCtrl = TextEditingController();
  final _keyCtrl = TextEditingController();
  final _baseUrlCtrl = TextEditingController();
  final _apiKeyCtrl = TextEditingController();

  final _headerRows = <({TextEditingController k, TextEditingController v})>[];
  final _models = <_ModelRow>[];

  String _npm = _adapters.first.npm;
  bool _obscureKey = true;
  bool _keyEditedManually = false;

  bool _testing = false;
  bool _saving = false;
  Map<String, dynamic>? _testResult;
  String? _formError;

  static const _accent = Color(0xFF6366F1);
  static const _ok = Color(0xFF10B981);
  static const _bad = Color(0xFFEF4444);

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _titleCtrl.text = e['name']?.toString() ?? '';
      _keyCtrl.text = e['providerKey']?.toString() ?? '';
      _baseUrlCtrl.text = e['baseURL']?.toString() ?? '';
      _keyEditedManually = true;
      final npm = e['npm']?.toString();
      if (npm != null && _adapters.any((a) => a.npm == npm)) _npm = npm;
      if (e['headers'] is Map) {
        (e['headers'] as Map).forEach((k, v) {
          _headerRows.add((
            k: TextEditingController(text: k.toString()),
            v: TextEditingController(text: v.toString()),
          ));
        });
      }

      final rawModels = e['models'];
      if (rawModels is List && rawModels.isNotEmpty) {
        for (final m in rawModels) {
          if (m is Map) {
            final row = _ModelRow(
              modelKey: m['modelKey']?.toString() ?? '',
              name: m['name']?.toString() ?? '',
              contextLimit: (m['contextLimit'] as num?)?.toInt(),
              outputLimit: (m['outputLimit'] as num?)?.toInt(),
              selected: true,
            );
            row.reasoning = m['reasoning'] == true;
            _models.add(row);
          }
        }
      } else {
        for (final k in (e['modelKeys'] as List?) ?? const []) {
          _models.add(_ModelRow(modelKey: k.toString(), name: k.toString(), selected: true));
        }
      }
    }
    // Derive the config key from the title until the user overrides it.
    _titleCtrl.addListener(() {
      if (_keyEditedManually) return;
      final slug = _titleCtrl.text
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
          .replaceAll(RegExp(r'^-+|-+$'), '');
      if (_keyCtrl.text != slug) {
        _keyCtrl.value = TextEditingValue(text: slug, selection: TextSelection.collapsed(offset: slug.length));
      }
    });
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _keyCtrl.dispose();
    _baseUrlCtrl.dispose();
    _apiKeyCtrl.dispose();
    for (final r in _headerRows) {
      r.k.dispose();
      r.v.dispose();
    }
    super.dispose();
  }

  Map<String, String> _headers() {
    final out = <String, String>{};
    for (final r in _headerRows) {
      final k = r.k.text.trim();
      if (k.isEmpty) continue;
      out[k] = r.v.text.trim();
    }
    return out;
  }

  String? _validate({bool requireModels = true}) {
    if (_titleCtrl.text.trim().isEmpty) return 'Display title is required.';
    final key = _keyCtrl.text.trim();
    if (key.isEmpty) return 'Provider key is required.';
    if (!RegExp(r'^[a-z0-9][a-z0-9._-]*$').hasMatch(key)) {
      return 'Provider key must be lowercase letters, digits, dot, dash or underscore.';
    }
    final url = _baseUrlCtrl.text.trim();
    if (url.isEmpty) return 'Base URL is required.';
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || !(uri.isScheme('http') || uri.isScheme('https'))) {
      return 'Base URL must be an absolute http(s) URL.';
    }
    if (requireModels && !_models.any((m) => m.selected && m.modelKey.trim().isNotEmpty)) {
      return 'Select or add at least one model.';
    }
    return null;
  }

  Future<void> _runTest() async {
    final err = _validate(requireModels: false);
    if (err != null) {
      setState(() => _formError = err);
      return;
    }
    setState(() {
      _formError = null;
      _testing = true;
      _testResult = null;
    });

    final res = await widget.service.testProviderConnection(
      baseURL: _baseUrlCtrl.text.trim(),
      apiKey: _apiKeyCtrl.text.trim(),
      headers: _headers(),
    );
    if (!mounted) return;

    // Merge discovered models in without clobbering manual rows or selections.
    final discovered = (res['models'] as List?) ?? const [];
    for (final d in discovered) {
      final mk = d['modelKey']?.toString() ?? '';
      if (mk.isEmpty) continue;
      if (_models.any((m) => m.modelKey == mk)) continue;
      _models.add(_ModelRow(
        modelKey: mk,
        name: d['name']?.toString() ?? mk,
        contextLimit: (d['contextLimit'] as num?)?.toInt(),
        outputLimit: (d['outputLimit'] as num?)?.toInt(),
        // Discovered models start unselected so a 400-model list is not
        // registered wholesale by accident.
        selected: discovered.length <= 12,
        discovered: true,
      ));
    }

    setState(() {
      _testing = false;
      _testResult = res;
    });
  }

  Future<void> _handleAntigravityOAuth() async {
    setState(() => _testing = true);
    try {
      final startRes = await widget.service.startAntigravityOAuth();
      final url = startRes['url']?.toString();
      if (url == null || url.isEmpty) {
        setState(() {
          _testing = false;
          _formError = 'Failed to generate OAuth URL: ${startRes['error']}';
        });
        return;
      }

      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }

      setState(() => _testing = false);
      if (!mounted) return;

      final codeCtrl = TextEditingController();
      final submit = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: widget.cardBg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(color: widget.borderColor),
          ),
          title: Row(
            children: [
              const Icon(LucideIcons.bot, size: 18, color: _accent),
              const SizedBox(width: 8),
              Text('Antigravity OAuth', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: widget.textPrimary)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '1. Sign in with Google in the opened browser tab.\n'
                '2. Paste the authorization code or redirected URL below:',
                style: TextStyle(fontSize: 12.5, color: widget.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: codeCtrl,
                autocorrect: false,
                style: TextStyle(fontSize: 12.5, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                decoration: _decoration(hint: '4/0A... or http://localhost:51121/...', icon: LucideIcons.key),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: _accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Authenticate'),
            ),
          ],
        ),
      );

      if (submit != true || codeCtrl.text.trim().isEmpty || !mounted) return;

      setState(() => _testing = true);
      final callbackRes = await widget.service.completeAntigravityOAuth(codeCtrl.text.trim());
      if (callbackRes['success'] == true) {
        _titleCtrl.text = 'Google Antigravity';
        _keyCtrl.text = 'antigravity';
        _baseUrlCtrl.text = 'https://cloudcode-pa.googleapis.com';
        _npm = 'antigravity';
        await _runTest();
      } else {
        setState(() {
          _formError = 'OAuth verification failed: ${callbackRes['error']}';
          _testing = false;
        });
      }
    } catch (e) {
      setState(() {
        _testing = false;
        _formError = 'OAuth error: $e';
      });
    }
  }

  Future<void> _save() async {
    final err = _validate();
    if (err != null) {
      setState(() => _formError = err);
      return;
    }
    setState(() {
      _formError = null;
      _saving = true;
    });

    final res = await widget.service.saveCustomProvider(
      providerKey: _keyCtrl.text.trim(),
      name: _titleCtrl.text.trim(),
      baseURL: _baseUrlCtrl.text.trim(),
      apiKey: _apiKeyCtrl.text.trim(),
      npm: _npm,
      headers: _headers(),
      models: _models.where((m) => m.selected && m.modelKey.trim().isNotEmpty).map((m) => m.toPayload()).toList(),
    );
    if (!mounted) return;

    if (res['ok'] == true) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _saving = false;
      _formError = res['error']?.toString() ?? 'Failed to save provider.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.92,
        decoration: BoxDecoration(
          color: widget.cardBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: widget.borderColor),
        ),
        child: Column(
          children: [
            _handle(),
            _header(),
            Divider(height: 1, color: widget.borderColor),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                children: [
                  _sectionLabel('IDENTITY'),
                  _field(
                    controller: _titleCtrl,
                    label: 'Display title',
                    hint: 'TokenForge AI',
                    icon: LucideIcons.tag,
                    helper: 'Shown in the model picker and catalog.',
                  ),
                  const SizedBox(height: 12),
                  _field(
                    controller: _keyCtrl,
                    label: 'Provider key',
                    hint: 'tokenforge',
                    icon: LucideIcons.key,
                    helper: 'Config identifier. Model ids become "<key>/<model>".',
                    onChanged: (_) => _keyEditedManually = true,
                  ),
                  const SizedBox(height: 16),

                  _sectionLabel('ENDPOINT'),
                  _adapterPicker(),
                  const SizedBox(height: 12),
                  _field(
                    controller: _baseUrlCtrl,
                    label: 'Base URL',
                    hint: 'https://api.example.com/v1',
                    icon: LucideIcons.link,
                    helper: 'Include the version path. Model discovery calls <base>/models.',
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 12),
                  _apiKeyField(),
                  const SizedBox(height: 16),
                  _headersEditor(),
                  const SizedBox(height: 16),
                  _testRow(),
                  if (_testResult != null) ...[
                    const SizedBox(height: 12),
                    _testResultCard(),
                  ],
                  const SizedBox(height: 20),

                  _sectionLabel('MODELS'),
                  _modelsSection(),
                ],
              ),
            ),
            if (_formError != null) _errorBar(_formError!),
            _footer(),
          ],
        ),
      ),
    );
  }

  // ── chrome ────────────────────────────────────────────────────────────────

  Widget _handle() => Padding(
        padding: const EdgeInsets.only(top: 12, bottom: 12),
        child: Container(
          width: 36,
          height: 4,
          decoration: BoxDecoration(
            color: widget.isDark ? const Color(0xFF3F3F46) : const Color(0xFFCBD5E1),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      );

  Widget _header() => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 12, 14),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: _accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Icon(LucideIcons.plug, size: 18, color: _accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.existing == null ? 'Custom API Connector' : 'Edit Connector',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: widget.textPrimary,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Connect any OpenAI-compatible endpoint',
                    style: TextStyle(fontSize: 11.5, color: widget.textSecondary),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: _saving ? null : () => Navigator.of(context).pop(false),
              icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
              tooltip: 'Close',
            ),
          ],
        ),
      );

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w800,
            color: widget.textSecondary,
            letterSpacing: 0.8,
          ),
        ),
      );

  Widget _errorBar(String message) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        color: _bad.withValues(alpha: 0.12),
        child: Row(
          children: [
            const Icon(LucideIcons.circleAlert, size: 14, color: _bad),
            const SizedBox(width: 8),
            Expanded(
              child: Text(message, style: const TextStyle(fontSize: 11.5, color: _bad, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );

  Widget _footer() => Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: widget.borderColor)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextButton(
                onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Cancel', style: TextStyle(fontSize: 13, color: widget.textSecondary)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _accent,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        widget.existing == null ? 'Save connector' : 'Update connector',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
              ),
            ),
          ],
        ),
      );

  // ── fields ────────────────────────────────────────────────────────────────

  InputDecoration _decoration({
    required String hint,
    IconData? icon,
    Widget? suffix,
  }) =>
      InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(fontSize: 13, color: widget.textSecondary.withValues(alpha: 0.7)),
        prefixIcon: icon == null ? null : Icon(icon, size: 15, color: widget.textSecondary),
        prefixIconConstraints: const BoxConstraints(minWidth: 38),
        suffixIcon: suffix,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        filled: true,
        fillColor: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11),
          borderSide: BorderSide(color: widget.borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11),
          borderSide: BorderSide(color: widget.borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11),
          borderSide: const BorderSide(color: _accent, width: 1.4),
        ),
      );

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    IconData? icon,
    String? helper,
    TextInputType? keyboardType,
    ValueChanged<String>? onChanged,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textPrimary),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            onChanged: onChanged,
            autocorrect: false,
            style: TextStyle(fontSize: 13, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
            decoration: _decoration(hint: hint, icon: icon),
          ),
          if (helper != null) ...[
            const SizedBox(height: 5),
            Text(helper, style: TextStyle(fontSize: 10.5, color: widget.textSecondary, height: 1.35)),
          ],
        ],
      );

  Widget _apiKeyField() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('API key', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textPrimary)),
              const SizedBox(width: 6),
              Text('optional', style: TextStyle(fontSize: 10.5, color: widget.textSecondary)),
            ],
          ),
          const SizedBox(height: 6),
          if (_npm == 'antigravity' || _keyCtrl.text.toLowerCase().contains('antigravity')) ...[
            const SizedBox(height: 4),
            OutlinedButton.icon(
              onPressed: _testing || _saving ? null : _handleAntigravityOAuth,
              icon: const Icon(LucideIcons.bot, size: 16, color: _accent),
              label: const Text(
                'Sign In with Google (OAuth)',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: _accent),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 44),
                side: BorderSide(color: _accent.withValues(alpha: 0.5)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                backgroundColor: _accent.withValues(alpha: 0.08),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Or paste an OAuth Access Token (ya29...):',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: widget.textSecondary),
            ),
            const SizedBox(height: 6),
          ],
          TextField(
            controller: _apiKeyCtrl,
            obscureText: _obscureKey,
            autocorrect: false,
            enableSuggestions: false,
            style: TextStyle(fontSize: 13, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
            decoration: _decoration(
              hint: _npm == 'antigravity' ? 'ya29.a0A... (optional if OAuth connected)' : 'sk-...',
              icon: LucideIcons.lock,
              suffix: IconButton(
                icon: Icon(_obscureKey ? LucideIcons.eye : LucideIcons.eyeOff,
                    size: 15, color: widget.textSecondary),
                onPressed: () => setState(() => _obscureKey = !_obscureKey),
                tooltip: _obscureKey ? 'Show' : 'Hide',
              ),
            ),
          ),
          const SizedBox(height: 5),
          Text(
            _npm == 'antigravity'
                ? 'Google Cloud Code Assist OAuth token. Discovers Gemini & Claude models dynamically.'
                : 'Sent as "Authorization: Bearer". Stored in the server config, never in the app.',
            style: TextStyle(fontSize: 10.5, color: widget.textSecondary, height: 1.35),
          ),
        ],
      );

  Widget _adapterPicker() {
    final active = _adapters.firstWhere((a) => a.npm == _npm, orElse: () => _adapters.first);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Adapter', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textPrimary)),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: widget.borderColor),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _npm,
              isExpanded: true,
              dropdownColor: widget.cardBg,
              borderRadius: BorderRadius.circular(12),
              icon: Icon(LucideIcons.chevronDown, size: 15, color: widget.textSecondary),
              style: TextStyle(fontSize: 13, color: widget.textPrimary),
              items: _adapters
                  .map((a) => DropdownMenuItem(
                        value: a.npm,
                        child: Text(a.label, style: TextStyle(fontSize: 13, color: widget.textPrimary)),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _npm = v ?? _adapters.first.npm),
            ),
          ),
        ),
        const SizedBox(height: 5),
        Text(active.hint, style: TextStyle(fontSize: 10.5, color: widget.textSecondary, height: 1.35)),
      ],
    );
  }

  Widget _headersEditor() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Extra headers',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textPrimary)),
              const Spacer(),
              TextButton.icon(
                onPressed: () => setState(() => _headerRows
                    .add((k: TextEditingController(), v: TextEditingController()))),
                icon: const Icon(LucideIcons.plus, size: 13, color: _accent),
                label: const Text('Add', style: TextStyle(fontSize: 11.5, color: _accent, fontWeight: FontWeight.w700)),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          if (_headerRows.isEmpty)
            Text('None. Add one for gateways that need a custom auth or routing header.',
                style: TextStyle(fontSize: 10.5, color: widget.textSecondary))
          else
            ...List.generate(_headerRows.length, (i) {
              final row = _headerRows[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: TextField(
                        controller: row.k,
                        autocorrect: false,
                        style: TextStyle(fontSize: 12, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                        decoration: _decoration(hint: 'X-Header'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 5,
                      child: TextField(
                        controller: row.v,
                        autocorrect: false,
                        style: TextStyle(fontSize: 12, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                        decoration: _decoration(hint: 'value'),
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() {
                        final r = _headerRows.removeAt(i);
                        r.k.dispose();
                        r.v.dispose();
                      }),
                      icon: const Icon(LucideIcons.trash2, size: 15, color: _bad),
                      tooltip: 'Remove header',
                    ),
                  ],
                ),
              );
            }),
        ],
      );

  // ── connection test ───────────────────────────────────────────────────────

  Widget _testRow() => SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: _testing ? null : _runTest,
          icon: _testing
              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: _accent))
              : const Icon(LucideIcons.radio, size: 15, color: _accent),
          label: Text(
            _testing ? 'Testing endpoint…' : 'Test connection & load models',
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _accent),
          ),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 13),
            side: BorderSide(color: _accent.withValues(alpha: 0.45)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );

  Widget _testResultCard() {
    final r = _testResult!;
    final ok = r['ok'] == true;
    final count = (r['modelCount'] as num?)?.toInt() ?? 0;
    final latency = (r['latencyMs'] as num?)?.toInt();
    final color = ok ? _ok : _bad;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(ok ? LucideIcons.circleCheck : LucideIcons.circleAlert, size: 15, color: color),
              const SizedBox(width: 8),
              Text(
                ok ? 'Endpoint reachable' : 'Connection failed',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: color),
              ),
              const Spacer(),
              if (latency != null)
                Text('${latency}ms', style: TextStyle(fontSize: 11, fontFamily: 'JetBrainsMono', color: color)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            ok
                ? (count > 0
                    ? '$count model(s) discovered from ${r['endpoint']}.'
                    : 'Reachable, but no model list returned. Add models manually below.')
                : (r['error']?.toString() ?? 'Unknown error'),
            style: TextStyle(fontSize: 11, color: widget.textPrimary, height: 1.4),
          ),
        ],
      ),
    );
  }

  // ── models ────────────────────────────────────────────────────────────────

  Widget _modelsSection() {
    final selected = _models.where((m) => m.selected).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              _models.isEmpty ? 'No models yet' : '$selected of ${_models.length} selected',
              style: TextStyle(fontSize: 11.5, color: widget.textSecondary, fontWeight: FontWeight.w600),
            ),
            const Spacer(),
            if (_models.length > 1)
              TextButton(
                onPressed: () {
                  final all = _models.every((m) => m.selected);
                  setState(() {
                    for (final m in _models) {
                      m.selected = !all;
                    }
                  });
                },
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  _models.every((m) => m.selected) ? 'Clear all' : 'Select all',
                  style: const TextStyle(fontSize: 11.5, color: _accent, fontWeight: FontWeight.w700),
                ),
              ),
            TextButton.icon(
              onPressed: () => setState(() => _models.add(_ModelRow(modelKey: '', name: ''))),
              icon: const Icon(LucideIcons.plus, size: 13, color: _accent),
              label: const Text('Add manually',
                  style: TextStyle(fontSize: 11.5, color: _accent, fontWeight: FontWeight.w700)),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 30),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        if (_models.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: widget.borderColor),
            ),
            child: Column(
              children: [
                Icon(LucideIcons.boxes, size: 26, color: widget.textSecondary.withValues(alpha: 0.5)),
                const SizedBox(height: 8),
                Text(
                  'Run the connection test to discover models,\nor add them by hand.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11.5, color: widget.textSecondary, height: 1.45),
                ),
              ],
            ),
          )
        else
          ...List.generate(_models.length, (i) => _modelRow(i)),
      ],
    );
  }

  Widget _modelRow(int index) {
    final m = _models[index];
    final providerKey = _keyCtrl.text.trim();
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(10, 8, 6, 10),
      decoration: BoxDecoration(
        color: m.selected
            ? _accent.withValues(alpha: 0.06)
            : (widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC)),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: m.selected ? _accent.withValues(alpha: 0.35) : widget.borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 26,
                height: 26,
                child: Checkbox(
                  value: m.selected,
                  onChanged: (v) => setState(() => m.selected = v ?? false),
                  activeColor: _accent,
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: m.discovered
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            m.modelKey,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'JetBrainsMono',
                              color: widget.textPrimary,
                            ),
                          ),
                          if (providerKey.isNotEmpty)
                            Text(
                              '$providerKey/${m.modelKey}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 10, color: widget.textSecondary),
                            ),
                        ],
                      )
                    : TextField(
                        onChanged: (v) => setState(() => m.modelKey = v),
                        autocorrect: false,
                        style: TextStyle(fontSize: 12.5, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                        decoration: _decoration(hint: 'model-id (e.g. llama-3.1-70b)'),
                      ),
              ),
              IconButton(
                onPressed: () => setState(() => _models.removeAt(index)),
                icon: Icon(LucideIcons.x, size: 15, color: widget.textSecondary),
                tooltip: 'Remove',
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          if (m.selected) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(left: 32),
              child: Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  SizedBox(
                    width: 132,
                    child: TextField(
                      controller: TextEditingController(text: m.name)
                        ..selection = TextSelection.collapsed(offset: m.name.length),
                      onChanged: (v) => m.name = v,
                      autocorrect: false,
                      style: TextStyle(fontSize: 11.5, color: widget.textPrimary),
                      decoration: _decoration(hint: 'Display name'),
                    ),
                  ),
                  SizedBox(
                    width: 104,
                    child: TextField(
                      controller: TextEditingController(text: m.contextLimit?.toString() ?? '')
                        ..selection = TextSelection.collapsed(
                            offset: (m.contextLimit?.toString() ?? '').length),
                      onChanged: (v) => m.contextLimit = int.tryParse(v.trim()),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      style: TextStyle(fontSize: 11.5, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                      decoration: _decoration(hint: 'ctx 200000'),
                    ),
                  ),
                  InkWell(
                    onTap: () => setState(() => m.reasoning = !m.reasoning),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
                      decoration: BoxDecoration(
                        color: m.reasoning ? _accent.withValues(alpha: 0.16) : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: m.reasoning ? _accent.withValues(alpha: 0.45) : widget.borderColor,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.brain, size: 12, color: m.reasoning ? _accent : widget.textSecondary),
                          const SizedBox(width: 5),
                          Text(
                            'Reasoning',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: m.reasoning ? _accent : widget.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
