import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_button.dart';
import '../../components/shadcn_card.dart';
import '../../components/shadcn_input.dart';
import '../../state/app_state.dart';

/// Modern, sleek login screen enforcing AvA Core credentials
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _fillDefaultCredentials() {
    setState(() {
      _usernameController.text = AppConstants.authUsername;
      _passwordController.text = AppConstants.authPasswordHash;
      _error = null;
    });
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final auth = AppStateScope.of(context).authController;
    final success = await auth.login(
      username: _usernameController.text,
      password: _passwordController.text,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (!success) {
          _error = auth.errorMessage ?? 'Invalid credentials';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo & Header
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.borderStrong, width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.accentPrimary.withValues(alpha: 0.12),
                          blurRadius: 32,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(
                      LucideIcons.cpu,
                      size: 30,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
                const SizedBox(height: 20),
                Center(
                  child: Text(
                    AppConstants.appName,
                    style: AppTypography.displayMedium,
                  ),
                ).animate().fadeIn(delay: 100.ms),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    'Autonomous Agentic Coding System',
                    style: AppTypography.bodyMedium,
                  ),
                ).animate().fadeIn(delay: 150.ms),
                const SizedBox(height: 36),

                // Card Container
                ShadcnCard(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Sign In to AvA Core', style: AppTypography.titleLarge),
                      const SizedBox(height: 4),
                      Text(
                        'Enter your authorized developer credentials to access the agent workspace.',
                        style: AppTypography.bodyMedium,
                      ),
                      const SizedBox(height: 20),

                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.diffRemoveBg,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.accentDanger.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.alertCircle, size: 16, color: AppColors.accentDanger),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: AppTypography.bodySmall.copyWith(color: AppColors.diffRemoveText),
                                ),
                              ),
                            ],
                          ),
                        ).animate().shake(duration: 300.ms),
                        const SizedBox(height: 16),
                      ],

                      // Username
                      ShadcnInput(
                        controller: _usernameController,
                        label: 'Username',
                        hintText: 'e.g. mahmudhasan',
                        prefixIcon: LucideIcons.user,
                        keyboardType: TextInputType.text,
                        onSubmitted: (_) => _handleLogin(),
                      ),
                      const SizedBox(height: 16),

                      // Password
                      ShadcnInput(
                        controller: _passwordController,
                        label: 'Password',
                        hintText: 'Enter developer password',
                        prefixIcon: LucideIcons.lock,
                        isPassword: true,
                        onSubmitted: (_) => _handleLogin(),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      ShadcnButton(
                        text: 'Authenticate',
                        icon: LucideIcons.logIn,
                        isFullWidth: true,
                        isLoading: _isLoading,
                        onPressed: _handleLogin,
                      ),
                      const SizedBox(height: 12),

                      // Quick Fill helper
                      ShadcnButton(
                        text: 'Auto-fill Authorized Credentials',
                        variant: ShadcnButtonVariant.ghost,
                        size: ShadcnButtonSize.sm,
                        isFullWidth: true,
                        icon: LucideIcons.keyRound,
                        onPressed: _fillDefaultCredentials,
                      ),
                    ],
                  ),
                ).animate().slideY(begin: 0.1, duration: 350.ms, curve: Curves.easeOutCubic),

                const SizedBox(height: 28),
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.accentSuccess,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Google Antigravity Provider: Ready',
                        style: AppTypography.codeSmall.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 300.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
