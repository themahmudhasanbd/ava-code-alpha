import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_card.dart';
import '../../state/app_state.dart';

/// Manage AI Model Providers, Antigravity OAuth tokens, and Model Catalog
class ProvidersScreen extends StatelessWidget {
  const ProvidersScreen({super.key});

  String _getProviderAsset(String id) {
    switch (id.toLowerCase()) {
      case 'antigravity':
        return AppConstants.providerAntigravity;
      case 'google':
      case 'gemini':
        return AppConstants.providerGemini;
      case 'anthropic':
      case 'claude':
        return AppConstants.providerAnthropic;
      case 'openai':
        return AppConstants.providerOpenai;
      case 'groq':
        return AppConstants.providerGroq;
      case 'deepseek':
        return AppConstants.providerDeepseek;
      case 'ollama':
        return AppConstants.providerOllama;
      case 'mistral':
        return AppConstants.providerMistral;
      default:
        return AppConstants.providerCustom;
    }
  }

  @override
  Widget build(BuildContext context) {
    final providerCtrl = AppStateScope.of(context).providerController;
    final isDark = AppColors.isDark(context);

    return ListenableBuilder(
      listenable: providerCtrl,
      builder: (context, _) {
        final providers = providerCtrl.providers;
        final activeProviderId = providerCtrl.activeProviderId;
        final activeModelId = providerCtrl.activeModelId;

        return Scaffold(
          backgroundColor: AppColors.bg(context),
          body: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            children: [
              // Screen Title Header
              Row(
                children: [
                  const Icon(LucideIcons.sparkles, size: 16, color: AppColors.accentPrimary),
                  const SizedBox(width: 8),
                  Text(
                    'AI Models & Engines',
                    style: AppTypography.titleLarge.copyWith(fontSize: 18, color: AppColors.text(context)),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              Text('CONFIGURED PROVIDERS', style: AppTypography.codeSmall.copyWith(color: AppColors.muted(context))),
              const SizedBox(height: 10),

              ...providers.map((provider) {
                final isSelected = activeProviderId == provider.id;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: ShadcnCard(
                    backgroundColor: isSelected
                        ? (isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated)
                        : AppColors.card(context),
                    border: Border.all(
                      color: isSelected
                          ? (isDark ? AppColors.borderFocus : AppColors.lightBorderFocus)
                          : AppColors.line(context),
                      width: isSelected ? 1.5 : 1.0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceSubtle : AppColors.lightSurfaceElevated,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.line(context)),
                              ),
                              child: Image.asset(_getProviderAsset(provider.id), fit: BoxFit.contain),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              provider.name,
                              style: AppTypography.titleMedium.copyWith(color: AppColors.text(context)),
                            ),
                            const Spacer(),
                            if (provider.isConnected)
                              const ShadcnBadge(label: 'Connected', variant: ShadcnBadgeVariant.success)
                            else
                              const ShadcnBadge(label: 'Configured', variant: ShadcnBadgeVariant.neutral),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          provider.description,
                          style: AppTypography.bodySmall.copyWith(color: AppColors.subtext(context)),
                        ),
                        const SizedBox(height: 12),

                        // Model Chips
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: provider.models.map((m) {
                            final isModelActive = isSelected && activeModelId == m;
                            return InkWell(
                              onTap: () => providerCtrl.setModel(m, provider.id),
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isModelActive
                                      ? (isDark ? AppColors.textPrimary : AppColors.lightTextPrimary)
                                      : (isDark ? AppColors.surfaceSubtle : AppColors.lightSurfaceElevated),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: isModelActive
                                        ? (isDark ? AppColors.textPrimary : AppColors.lightTextPrimary)
                                        : AppColors.line(context),
                                  ),
                                ),
                                child: Text(
                                  m,
                                  style: AppTypography.codeSmall.copyWith(
                                    color: isModelActive
                                        ? (isDark ? AppColors.textInverse : AppColors.lightTextInverse)
                                        : AppColors.text(context),
                                    fontWeight: isModelActive ? FontWeight.w600 : FontWeight.w400,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}
