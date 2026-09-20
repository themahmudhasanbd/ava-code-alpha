import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_button.dart';
import '../../components/shadcn_card.dart';
import '../../state/app_state.dart';

/// Clean Onboarding Screen.
/// Informs the user to configure their AI models and routes directly to the Models screen.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  bool _isFinishing = false;

  Future<void> _proceedToModelConfiguration() async {
    setState(() => _isFinishing = true);
    final scope = AppStateScope.of(context);
    final auth = scope.authController;

    // Finish onboarding and navigate directly to Models & Providers tab (tab 4)
    await auth.finishOnboarding(
      targetTab: 4,
    );

    if (mounted) {
      setState(() => _isFinishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeCtrl = AppStateScope.of(context).themeController;
    final isDark = AppColors.isDark(context);

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
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo container
                  Center(
                    child: Container(
                      width: 76,
                      height: 76,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.card(context),
                        borderRadius: BorderRadius.circular(22),
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

                  const SizedBox(height: 22),

                  Center(
                    child: Text(
                      'Welcome to ${AppConstants.appName}',
                      style: AppTypography.displayMedium.copyWith(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text(context),
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 80.ms),

                  const SizedBox(height: 8),

                  Center(
                    child: Text(
                      'Autonomous Multi-Turn AI Agentic Engineering Platform',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.subtext(context),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 120.ms),

                  const SizedBox(height: 28),

                  // Prompt to configure model
                  ShadcnCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceElevated : AppColors.lightSurfaceElevated,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.line(context)),
                              ),
                              child: Icon(LucideIcons.cpu, size: 16, color: AppColors.text(context)),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'AI Model Setup Required',
                              style: AppTypography.titleMedium.copyWith(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(context),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Before launching your coding workspace, please connect an AI provider or select a model. You can configure Google Antigravity (OAuth), Claude, OpenAI, DeepSeek, Groq, or local Ollama endpoints.',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.subtext(context),
                            fontSize: 12.5,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 160.ms),

                  const SizedBox(height: 24),

                  // Primary Action: Navigate to Configure Models Screen
                  ShadcnButton(
                    text: 'Configure AI Models & Providers',
                    icon: LucideIcons.arrowRight,
                    size: ShadcnButtonSize.lg,
                    isFullWidth: true,
                    isLoading: _isFinishing,
                    onPressed: _proceedToModelConfiguration,
                  ).animate().fadeIn(delay: 200.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
