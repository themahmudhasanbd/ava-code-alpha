import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../data/models/provider_model.dart';
import '../state/app_state.dart';

/// Slash command /connect — lets users configure and test any provider endpoint
/// dynamically. Loads the model list from the provider's /models endpoint.
class ConnectProviderSheet extends StatefulWidget {
  const ConnectProviderSheet({super.key});

  @override
  State<ConnectProviderSheet> createState() => _ConnectProviderSheetState();
}

class _ConnectProviderSheetState extends State<ConnectProviderSheet> {
  final _apiKeyCtrl = TextEditingController();
  final _baseUrlCtrl = TextEditingController();
  ProviderModel? _selected;
  bool _connecting = false;
  String? _error;
  List<String>? _discoveredModels;

  @override
  void dispose() {
    _apiKeyCtrl.dispose();
    _baseUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    final sel = _selected;
    if (sel == null) {
      setState(() => _error = 'Please select a provider.');
      return;
    }
    final key = _apiKeyCtrl.text.trim();
    if (key.isEmpty && sel.id != 'ollama' && sel.id != 'antigravity') {
      setState(() => _error = 'API key is required for ${sel.name}.');
      return;
    }

    setState(() {
      _connecting = true;
      _error = null;
      _discoveredModels = null;
    });

    final ctrl = AppStateScope.of(context).providerController;
    final ok = await ctrl.connectProvider(
      providerId: sel.id,
      apiKey: key,
      customBaseUrl: _baseUrlCtrl.text.trim().isNotEmpty ? _baseUrlCtrl.text.trim() : null,
    );

    if (!mounted) return;
    final updatedProvider =
        ctrl.providers.firstWhere((p) => p.id == sel.id, orElse: () => sel);

    setState(() {
      _connecting = false;
      if (ok) {
        _discoveredModels = updatedProvider.models;
        _error = null;
      } else {
        _error = ctrl.loadError ?? 'Failed to connect. Check your credentials.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    final providers = ProviderModel.builtInPresets;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF18181B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0x25FFFFFF) : const Color(0xFFE2E8F0),
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0x40FFFFFF) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Row(
                children: [
                  Icon(LucideIcons.plugZap, size: 18, color: AppColors.text(context)),
                  const SizedBox(width: 10),
                  Text(
                    '/connect — Provider Setup',
                    style: AppTypography.titleMedium.copyWith(
                      color: AppColors.text(context),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Connect any OpenAI-compatible endpoint and load models dynamically.',
                style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context)),
              ),
              const SizedBox(height: 20),

              // Provider selector
              Text(
                'Provider',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.subtext(context),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 56,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: providers.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    final p = providers[i];
                    final isActive = _selected?.id == p.id;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selected = p;
                          _baseUrlCtrl.text = p.baseUrl;
                          _discoveredModels = null;
                          _error = null;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isActive
                              ? AppColors.cardElevated(context)
                              : (isDark ? const Color(0xFF27272A) : const Color(0xFFF8FAFC)),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isActive
                                ? (isDark ? AppColors.borderFocus : AppColors.lightBorderFocus)
                                : (isDark ? const Color(0x25FFFFFF) : const Color(0xFFE2E8F0)),
                            width: isActive ? 1.5 : 1,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              p.name.split(' ').first,
                              style: AppTypography.codeSmall.copyWith(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isActive
                                    ? AppColors.text(context)
                                    : AppColors.subtext(context),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),

              // Base URL
              _labeledField(
                context,
                label: 'Base URL',
                controller: _baseUrlCtrl,
                hint: 'https://api.example.com/v1',
                isDark: isDark,
              ),
              const SizedBox(height: 12),

              // API Key
              _labeledField(
                context,
                label: 'API Key',
                controller: _apiKeyCtrl,
                hint: 'sk-... or bearer token',
                obscure: true,
                isDark: isDark,
              ),
              const SizedBox(height: 16),

              // Error
              if (_error != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.accentDanger.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.accentDanger.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.alertCircle, size: 14, color: AppColors.accentDanger),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: AppTypography.bodySmall.copyWith(color: AppColors.accentDanger),
                        ),
                      ),
                    ],
                  ),
                ),

              // Discovered models
              if (_discoveredModels != null && _discoveredModels!.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.accentSuccess.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.accentSuccess.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(LucideIcons.checkCircle2, size: 14, color: AppColors.accentSuccess),
                          const SizedBox(width: 8),
                          Text(
                            '${_discoveredModels!.length} models discovered',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.accentSuccess,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: _discoveredModels!.take(6).map((m) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              m,
                              style: AppTypography.codeSmall.copyWith(
                                fontSize: 11,
                                color: AppColors.text(context),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ],

              // Connect button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _connecting ? null : _connect,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDark ? AppColors.textPrimary : AppColors.lightTextPrimary,
                    foregroundColor: isDark ? AppColors.textInverse : AppColors.lightTextInverse,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _connecting
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: isDark ? AppColors.textInverse : AppColors.lightTextInverse,
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(LucideIcons.plugZap, size: 16),
                            const SizedBox(width: 8),
                            Text(
                              _discoveredModels != null ? 'Apply & Connect' : 'Test & Load Models',
                              style: AppTypography.bodyMedium.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                ),
              ),

              if (_discoveredModels != null && _discoveredModels!.isNotEmpty)
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Center(
                    child: Text(
                      'Done',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.subtext(context),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _labeledField(
    BuildContext context, {
    required String label,
    required TextEditingController controller,
    required String hint,
    required bool isDark,
    bool obscure = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.bodySmall.copyWith(
            color: AppColors.subtext(context),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: obscure,
          style: AppTypography.codeSmall.copyWith(
            fontSize: 13,
            color: AppColors.text(context),
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTypography.codeSmall.copyWith(
              fontSize: 13,
              color: AppColors.muted(context),
            ),
            filled: true,
            fillColor: isDark ? const Color(0xFF27272A) : const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? const Color(0x25FFFFFF) : const Color(0xFFE2E8F0),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? const Color(0x25FFFFFF) : const Color(0xFFE2E8F0),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderFocus : AppColors.lightBorderFocus,
                width: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
