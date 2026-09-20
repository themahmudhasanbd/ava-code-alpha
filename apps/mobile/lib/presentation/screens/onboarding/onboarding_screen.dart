import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_badge.dart';
import '../../components/shadcn_button.dart';
import '../../state/app_state.dart';

/// Clean, dynamic Onboarding Screen.
/// Displays live providers and discovered models, allowing seamless setup
/// without hardcoded dummy catalogs.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  bool _isFinishing = false;
  String _selectedProvider = 'antigravity';
  String _selectedModel = 'gemini-3.7-flash';

  Future<void> _proceedWithModel({int targetTab = 0}) async {
    setState(() => _isFinishing = true);
    final scope = AppStateScope.of(context);
    final auth = scope.authController;
    final providerCtrl = scope.providerController;

    providerCtrl.setModel(_selectedModel, _selectedProvider);

    await auth.finishOnboarding(
      provider: _selectedProvider,
      model: _selectedModel,
      targetTab: targetTab,
    );

    if (mounted) {
      setState(() => _isFinishing = false);
    }
  }

  Future<void> _openDetailedProviderSetup() async {
    setState(() => _isFinishing = true);
    final scope = AppStateScope.of(context);
    final auth = scope.authController;
    final providerCtrl = scope.providerController;

    providerCtrl.setModel(_selectedModel, _selectedProvider);

    await auth.finishOnboarding(
      provider: _selectedProvider,
      model: _selectedModel,
      targetTab: 4,
    );

    if (mounted) {
      setState(() => _isFinishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scope = AppStateScope.of(context);
    final themeCtrl = scope.themeController;
    final providerCtrl = scope.providerController;
    final isDark = AppColors.isDark(context);
    final providers = providerCtrl.providers;

    // Collect all dynamic options from providers
    final List<Map<String, dynamic>> dynamicOptions = [];
    for (final p in providers) {
      if (p.models.isNotEmpty) {
        for (final m in p.models) {
          dynamicOptions.add({
            'provider': p.id,
            'model': m,
            'title': m,
            'providerName': p.name,
            'desc': '${p.name} configured model',
            'badge': p.id == 'antigravity' ? 'Antigravity' : p.name,
            'badgeVariant': p.id == 'antigravity' ? ShadcnBadgeVariant.antigravity : ShadcnBadgeVariant.outline,
            'icon': LucideIcons.cpu,
          });
        }
      } else {
        dynamicOptions.add({
          'provider': p.id,
          'model': 'default',
          'title': p.name,
          'providerName': p.name,
          'desc': p.description.isNotEmpty ? p.description : 'Connect ${p.name} endpoint',
          'badge': p.isConnected ? 'Connected' : 'Setup Required',
          'badgeVariant': p.isConnected ? ShadcnBadgeVariant.success : ShadcnBadgeVariant.warning,
          'icon': p.id == 'antigravity' ? LucideIcons.sparkles : LucideIcons.plug,
        });
      }
    }

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(AppConstants.appLogoPath, width: 22, height: 22),
            const SizedBox(width: 8),
            Text(
              AppConstants.appName,
              style: AppTypography.titleMedium.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.text(context),
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            icon: Icon(
              isDark ? LucideIcons.sun : LucideIcons.moon,
              size: 18,
              color: AppColors.text(context),
            ),
            onPressed: () => themeCtrl.toggleTheme(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.card(context),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppColors.line(context),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isDark
                                ? Colors.black.withValues(alpha: 0.35)
                                : Colors.black.withValues(alpha: 0.06),
                            blurRadius: 18,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Image.asset(AppConstants.appLogoPath, fit: BoxFit.contain),
                    ),
                  ).animate().scale(duration: 350.ms, curve: Curves.easeOutCubic),

                  const SizedBox(height: 18),

                  Center(
                    child: Text(
                      'Configure Model Provider',
                      style: AppTypography.displayMedium.copyWith(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text(context),
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 80.ms),

                  const SizedBox(height: 6),

                  Center(
                    child: Text(
                      'Choose a primary AI provider for autonomous coding. All models are discovered live from connected endpoints.',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.subtext(context),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w400,
                        height: 1.4,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 120.ms),

                  const SizedBox(height: 22),

                  // Dynamic Options
                  ...dynamicOptions.map((opt) {
                    final isSelected = _selectedProvider == opt['provider'];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _selectedProvider = opt['provider'] as String;
                            _selectedModel = opt['model'] as String;
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated)
                                : AppColors.card(context),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? (isDark ? AppColors.borderFocus : AppColors.lightBorderFocus)
                                  : AppColors.line(context),
                              width: isSelected ? 1.8 : 1.0,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? (isDark ? AppColors.surfaceHighlight : AppColors.lightSurfaceSubtle)
                                      : (isDark ? AppColors.surfaceSubtle : AppColors.lightSurfaceElevated),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  opt['icon'] as IconData,
                                  size: 18,
                                  color: AppColors.text(context),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            opt['title'] as String,
                                            style: AppTypography.titleMedium.copyWith(
                                              fontSize: 14,
                                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                              color: AppColors.text(context),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        ShadcnBadge(
                                          label: opt['badge'] as String,
                                          variant: opt['badgeVariant'] as ShadcnBadgeVariant,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      opt['desc'] as String,
                                      style: AppTypography.bodySmall.copyWith(
                                        color: AppColors.subtext(context),
                                        fontSize: 11.5,
                                        height: 1.3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                width: 20,
                                height: 20,
                                margin: const EdgeInsets.only(top: 2),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected ? (isDark ? Colors.white : Colors.black) : AppColors.line(context),
                                    width: isSelected ? 6 : 1.5,
                                  ),
                                  color: Colors.transparent,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 18),

                  ShadcnButton(
                    text: 'Activate & Launch Workspace',
                    icon: LucideIcons.arrowRight,
                    size: ShadcnButtonSize.lg,
                    isFullWidth: true,
                    isLoading: _isFinishing,
                    onPressed: () => _proceedWithModel(targetTab: 0),
                  ).animate().fadeIn(delay: 200.ms),

                  const SizedBox(height: 10),

                  ShadcnButton(
                    text: 'Manage & Connect Providers',
                    icon: LucideIcons.settings2,
                    variant: ShadcnButtonVariant.outline,
                    size: ShadcnButtonSize.md,
                    isFullWidth: true,
                    onPressed: _isFinishing ? null : _openDetailedProviderSetup,
                  ).animate().fadeIn(delay: 240.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
