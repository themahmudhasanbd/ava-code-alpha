import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/agent_core_service.dart';

/// Opens the MCP server sheet.
///
/// Returns true when a server was saved so the caller can refresh its list.
Future<bool?> showMcpServerModal({
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
    builder: (_) => _McpServerSheet(
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

class _McpServerSheet extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService service;
  final Map<String, dynamic>? existing;

  const _McpServerSheet({
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.service,
    this.existing,
  });

  @override
  State<_McpServerSheet> createState() => _McpServerSheetState();
}

class _McpServerSheetState extends State<_McpServerSheet> {
  final _nameCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _commandCtrl = TextEditingController();
  final _argsCtrl = TextEditingController();

  final _headerRows = <({TextEditingController k, TextEditingController v})>[];
  final _envRows = <({TextEditingController k, TextEditingController v})>[];

  /// 'remote' (HTTP/SSE endpoint) or 'local' (stdio subprocess).
  String _type = 'remote';
  bool _enabled = true;
  bool _testing = false;
  bool _saving = false;
  Map<String, dynamic>? _testResult;
  String? _formError;

  static const _accent = Color(0xFF6366F1);
  static const _ok = Color(0xFF10B981);
  static const _bad = Color(0xFFEF4444);

  bool get _isEdit => widget.existing != null;
  bool get _isRemote => _type == 'remote';

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _nameCtrl.text = e['name']?.toString() ?? '';
      final t = e['type']?.toString();
      _type = (t == 'local' || t == 'stdio') ? 'local' : 'remote';
      _urlCtrl.text = e['url']?.toString() ?? '';
      _commandCtrl.text = e['command']?.toString() ?? '';
      final args = e['args'];
      if (args is List) _argsCtrl.text = args.join(' ');
      _enabled = e['enabled'] != false;

      final env = e['env'] ?? e['environment'];
      if (env is Map) {
        env.forEach((k, v) => _envRows.add((
              k: TextEditingController(text: k.toString()),
              v: TextEditingController(text: v?.toString() ?? ''),
            )));
      }
      final headers = e['headers'];
      if (headers is Map) {
        headers.forEach((k, v) => _headerRows.add((
              k: TextEditingController(text: k.toString()),
              v: TextEditingController(text: v?.toString() ?? ''),
            )));
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _urlCtrl.dispose();
    _commandCtrl.dispose();
    _argsCtrl.dispose();
    for (final r in [..._headerRows, ..._envRows]) {
      r.k.dispose();
      r.v.dispose();
    }
    super.dispose();
  }

  Map<String, String> _pairs(List<({TextEditingController k, TextEditingController v})> rows) {
    final out = <String, String>{};
    for (final r in rows) {
      final k = r.k.text.trim();
      if (k.isEmpty) continue;
      out[k] = r.v.text.trim();
    }
    return out;
  }

  String? _validate() {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return 'Server name is required.';
    if (!RegExp(r'^[A-Za-z0-9][A-Za-z0-9._-]*$').hasMatch(name)) {
      return 'Server name may only contain letters, digits, dot, dash or underscore.';
    }
    if (_isRemote) {
      final url = _urlCtrl.text.trim();
      if (url.isEmpty) return 'Endpoint URL is required for a remote server.';
      final uri = Uri.tryParse(url);
      if (uri == null || !uri.hasScheme || !(uri.isScheme('http') || uri.isScheme('https'))) {
        return 'Endpoint URL must be an absolute http(s) URL.';
      }
    } else if (_commandCtrl.text.trim().isEmpty) {
      return 'Command is required for a local server.';
    }
    return null;
  }

  Future<void> _runTest() async {
    if (!_isRemote) {
      setState(() => _formError = 'Only remote servers can be probed. A local server is validated when it starts.');
      return;
    }
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) {
      setState(() => _formError = 'Enter an endpoint URL first.');
      return;
    }
    setState(() {
      _formError = null;
      _testing = true;
      _testResult = null;
    });
    final res = await widget.service.testMcpServer(url: url, headers: _pairs(_headerRows));
    if (!mounted) return;
    setState(() {
      _testing = false;
      _testResult = res;
    });
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

    final res = await widget.service.saveMcpServer(
      name: _nameCtrl.text.trim(),
      type: _type,
      url: _isRemote ? _urlCtrl.text.trim() : null,
      command: _isRemote ? null : _commandCtrl.text.trim(),
      args: _isRemote
          ? null
          : _argsCtrl.text.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList(),
      env: _isRemote ? null : _pairs(_envRows),
      headers: _isRemote ? _pairs(_headerRows) : null,
      enabled: _enabled,
    );
    if (!mounted) return;

    if (res['ok'] == true) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _saving = false;
      _formError = res['error']?.toString() ?? 'Failed to save MCP server.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.90,
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
                  _sectionLabel('TRANSPORT'),
                  _typeSelector(),
                  const SizedBox(height: 20),
                  _sectionLabel('IDENTITY'),
                  _field(
                    controller: _nameCtrl,
                    label: 'Server name',
                    hint: 'github',
                    icon: LucideIcons.tag,
                    helper: 'Config key for this server. Tools appear namespaced under it.',
                    enabled: !_isEdit,
                  ),
                  const SizedBox(height: 20),
                  _sectionLabel(_isRemote ? 'ENDPOINT' : 'PROCESS'),
                  if (_isRemote) ...[
                    _field(
                      controller: _urlCtrl,
                      label: 'Endpoint URL',
                      hint: 'https://mcp.example.com/mcp',
                      icon: LucideIcons.link,
                      helper: 'HTTP or SSE MCP endpoint.',
                      keyboardType: TextInputType.url,
                    ),
                    const SizedBox(height: 16),
                    _pairsEditor(
                      title: 'Headers',
                      emptyHint: 'None. Add "Authorization: Bearer <token>" for authenticated servers.',
                      rows: _headerRows,
                      keyHint: 'Authorization',
                      valueHint: 'Bearer ...',
                    ),
                    const SizedBox(height: 16),
                    _testRow(),
                    if (_testResult != null) ...[
                      const SizedBox(height: 12),
                      _testResultCard(),
                    ],
                  ] else ...[
                    _field(
                      controller: _commandCtrl,
                      label: 'Command',
                      hint: 'npx',
                      icon: LucideIcons.terminal,
                      helper: 'Executable launched over stdio.',
                    ),
                    const SizedBox(height: 12),
                    _field(
                      controller: _argsCtrl,
                      label: 'Arguments',
                      hint: '-y @modelcontextprotocol/server-filesystem /var/www',
                      icon: LucideIcons.chevronRight,
                      helper: 'Space separated. Quotes are not parsed.',
                    ),
                    const SizedBox(height: 16),
                    _pairsEditor(
                      title: 'Environment',
                      emptyHint: 'None. Add secrets the subprocess needs, e.g. GITHUB_TOKEN.',
                      rows: _envRows,
                      keyHint: 'GITHUB_TOKEN',
                      valueHint: 'value',
                    ),
                  ],
                  const SizedBox(height: 20),
                  _sectionLabel('STATE'),
                  _enabledToggle(),
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
              child: const Icon(LucideIcons.server, size: 18, color: _accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isEdit ? 'Edit MCP Server' : 'Add MCP Server',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: widget.textPrimary,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Model Context Protocol integration',
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
        decoration: BoxDecoration(border: Border(top: BorderSide(color: widget.borderColor))),
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
                        _isEdit ? 'Update server' : 'Add server',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
              ),
            ),
          ],
        ),
      );

  // ── fields ────────────────────────────────────────────────────────────────

  InputDecoration _decoration({required String hint, IconData? icon, bool enabled = true}) => InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(fontSize: 13, color: widget.textSecondary.withValues(alpha: 0.7)),
        prefixIcon: icon == null ? null : Icon(icon, size: 15, color: widget.textSecondary),
        prefixIconConstraints: const BoxConstraints(minWidth: 38),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        filled: true,
        fillColor: enabled
            ? (widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC))
            : (widget.isDark ? const Color(0xFF0B0B0D) : const Color(0xFFE9EDF3)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11),
          borderSide: BorderSide(color: widget.borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11),
          borderSide: BorderSide(color: widget.borderColor),
        ),
        disabledBorder: OutlineInputBorder(
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
    bool enabled = true,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textPrimary)),
              if (!enabled) ...[
                const SizedBox(width: 6),
                Text('locked', style: TextStyle(fontSize: 10.5, color: widget.textSecondary)),
              ],
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            enabled: enabled,
            autocorrect: false,
            style: TextStyle(fontSize: 13, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
            decoration: _decoration(hint: hint, icon: icon, enabled: enabled),
          ),
          if (helper != null) ...[
            const SizedBox(height: 5),
            Text(
              enabled ? helper : 'Renaming would create a second server. Delete and re-add to change the name.',
              style: TextStyle(fontSize: 10.5, color: widget.textSecondary, height: 1.35),
            ),
          ],
        ],
      );

  Widget _typeSelector() => Row(
        children: [
          Expanded(
            child: _typeCard(
              value: 'remote',
              icon: LucideIcons.globe,
              title: 'Remote',
              subtitle: 'HTTP / SSE endpoint',
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _typeCard(
              value: 'local',
              icon: LucideIcons.terminal,
              title: 'Local',
              subtitle: 'stdio subprocess',
            ),
          ),
        ],
      );

  Widget _typeCard({
    required String value,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final active = _type == value;
    return InkWell(
      onTap: () => setState(() {
        _type = value;
        _testResult = null;
        _formError = null;
      }),
      borderRadius: BorderRadius.circular(13),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
        decoration: BoxDecoration(
          color: active
              ? _accent.withValues(alpha: 0.10)
              : (widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC)),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(
            color: active ? _accent.withValues(alpha: 0.5) : widget.borderColor,
            width: active ? 1.4 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 15, color: active ? _accent : widget.textSecondary),
                const Spacer(),
                if (active) const Icon(LucideIcons.circleCheck, size: 14, color: _accent),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: active ? _accent : widget.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(fontSize: 10.5, color: widget.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _pairsEditor({
    required String title,
    required String emptyHint,
    required List<({TextEditingController k, TextEditingController v})> rows,
    required String keyHint,
    required String valueHint,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: widget.textPrimary)),
              const Spacer(),
              TextButton.icon(
                onPressed: () =>
                    setState(() => rows.add((k: TextEditingController(), v: TextEditingController()))),
                icon: const Icon(LucideIcons.plus, size: 13, color: _accent),
                label: const Text('Add',
                    style: TextStyle(fontSize: 11.5, color: _accent, fontWeight: FontWeight.w700)),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          if (rows.isEmpty)
            Text(emptyHint, style: TextStyle(fontSize: 10.5, color: widget.textSecondary, height: 1.35))
          else
            ...List.generate(rows.length, (i) {
              final row = rows[i];
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
                        decoration: _decoration(hint: keyHint),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 5,
                      child: TextField(
                        controller: row.v,
                        autocorrect: false,
                        style: TextStyle(fontSize: 12, color: widget.textPrimary, fontFamily: 'JetBrainsMono'),
                        decoration: _decoration(hint: valueHint),
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() {
                        final r = rows.removeAt(i);
                        r.k.dispose();
                        r.v.dispose();
                      }),
                      icon: const Icon(LucideIcons.trash2, size: 15, color: _bad),
                      tooltip: 'Remove',
                    ),
                  ],
                ),
              );
            }),
        ],
      );

  Widget _enabledToggle() => Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
        decoration: BoxDecoration(
          color: widget.isDark ? const Color(0xFF111114) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: widget.borderColor),
        ),
        child: Row(
          children: [
            Icon(_enabled ? LucideIcons.power : LucideIcons.powerOff, size: 15,
                color: _enabled ? _ok : widget.textSecondary),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Enabled',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: widget.textPrimary)),
                  const SizedBox(height: 2),
                  Text(
                    _enabled
                        ? 'Server starts with the agent and its tools are offered to the model.'
                        : 'Saved but inactive. No tools are exposed.',
                    style: TextStyle(fontSize: 10.5, color: widget.textSecondary, height: 1.3),
                  ),
                ],
              ),
            ),
            Switch(
              value: _enabled,
              onChanged: (v) => setState(() => _enabled = v),
              activeTrackColor: _accent,
            ),
          ],
        ),
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
            _testing ? 'Probing handshake…' : 'Test MCP handshake',
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
    final color = ok ? _ok : _bad;
    final latency = (r['latencyMs'] as num?)?.toInt();
    final serverName = r['serverName']?.toString();
    final protocol = r['protocolVersion']?.toString();

    final facts = <String>[
      if (serverName != null && serverName.isNotEmpty) 'Server: $serverName',
      if (protocol != null && protocol.isNotEmpty) 'Protocol: $protocol',
    ];
    final detail = ok
        ? (facts.isEmpty ? 'Endpoint responded to initialize.' : facts.join('   '))
        : (r['error']?.toString() ?? 'Unknown error');

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
                ok ? 'Handshake succeeded' : 'Handshake failed',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: color),
              ),
              const Spacer(),
              if (latency != null)
                Text('${latency}ms', style: TextStyle(fontSize: 11, fontFamily: 'JetBrainsMono', color: color)),
            ],
          ),
          const SizedBox(height: 6),
          Text(detail, style: TextStyle(fontSize: 11, color: widget.textPrimary, height: 1.4)),
        ],
      ),
    );
  }
}
