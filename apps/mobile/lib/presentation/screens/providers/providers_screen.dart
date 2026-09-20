import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_card.dart';
import '../../state/app_state.dart';

/// Manage AI Model Providers, Antigravity OAuth tokens, and Model Catalog
class ProvidersScreen extends StatelessWidget {
  const ProvidersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final providerCtrl = AppStateScope.of(context).providerController;

    return ListenableBuilder(
      listenable: providerCtrl,
      builder: (context, _) {
        final providers = providerCtrl.providers;
        final activeProviderId = providerCtrl.activeProviderId;
        final activeModelId = providerCtrl.activeModelId;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: Text('AI Model Providers', style: AppTypography.titleLarge),
          ),
          body: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            children: [
              // Highlight banner for Google Antigravity
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.accentPrimary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.accentPrimary.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.sparkles, size: 18, color: AppColors.accentPrimary),
                        const SizedBox(width: 8),
                        Text('Google Antigravity Provider', style: AppTypography.titleMedium),
                        const Spacer(),
                        const ShadcnBadge(label: 'Active Default', variant: ShadcnBadgeVariant.success),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Direct high-speed connection to Google Cloud Code PA. Supports Gemini 3.7 Flash Tiered, Gemini 3.8, Gemini 3.1 Pro, and Claude Opus/Sonnet.',
                      style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text('AVAILABLE PROVIDERS', style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted)),
              const SizedBox(height: 10),

              ...providers.map((provider) {
                final isSelected = activeProviderId == provider.id;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: ShadcnCard(
                    backgroundColor: isSelected ? AppColors.surfaceElevated : AppColors.surface,
                    border: Border.all(
                      color: isSelected ? AppColors.borderFocus : AppColors.border,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(provider.name, style: AppTypography.titleMedium),
                            const Spacer(),
                            if (provider.isConnected)
                              const ShadcnBadge(label: 'Connected', variant: ShadcnBadgeVariant.success)
                            else
                              const ShadcnBadge(label: 'Configured', variant: ShadcnBadgeVariant.neutral),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(provider.description, style: AppTypography.bodySmall),
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
                                  color: isModelActive ? AppColors.textPrimary : AppColors.surfaceSubtle,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: isModelActive ? AppColors.textPrimary : AppColors.border,
                                  ),
                                ),
                                child: Text(
                                  m,
                                  style: AppTypography.codeSmall.copyWith(
                                    color: isModelActive ? AppColors.textInverse : AppColors.textPrimary,
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
