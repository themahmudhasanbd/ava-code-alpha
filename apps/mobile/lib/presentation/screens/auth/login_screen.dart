import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../components/shadcn_button.dart';
import '../../components/shadcn_card.dart';
import '../../components/shadcn_input.dart';
import '../../state/app_state.dart';

/// Premier Authentication screen for AvA Code Alpha
/// Features prominent squircle logo, secure credentials validation, and tactile feedback
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordFocusNode = FocusNode();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() {
        _error = 'Please enter both username and password';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final auth = AppStateScope.of(context).authController;
    final success = await auth.login(
      username: username,
      password: password,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (!success) {
          _error = auth.errorMessage ?? 'Invalid credentials. Access denied.';
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
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Prominent Logo & Brand Presentation
                  Center(
                    child: Container(
                      width: 92,
                      height: 92,
                      decoration: BoxDecoration(
                        color: const Color(0xFF18181B), // Zinc 900
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: const Color(0x40FFFFFF), // 21st.dev subtle rim light
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.6),
                            blurRadius: 28,
                            offset: const Offset(0, 10),
                          ),
                          BoxShadow(
                            color: AppColors.accentPrimary.withValues(alpha: 0.22),
                            blurRadius: 36,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(23),
                        child: Image.asset(
                          AppConstants.appLogoPath,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),

                  const SizedBox(height: 24),

                  Center(
                    child: Text(
                      AppConstants.appName,
                      style: AppTypography.displayMedium.copyWith(
                        fontSize: 24,
                        letterSpacing: -0.6,
                      ),
                    ),
                  ).animate().fadeIn(delay: 80.ms),

                  const SizedBox(height: 6),

                  Center(
                    child: Text(
                      AppConstants.appTagline,
                      style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 140.ms),

                  const SizedBox(height: 32),

                  // Login Form Card
                  ShadcnCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Sign In to AvA Core', style: AppTypography.titleLarge),
                        const SizedBox(height: 4),
                        Text(
                          'Authenticate with authorized credentials to access autonomous agent workspaces.',
                          style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 20),

                        // Error Banner
                        if (_error != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.diffRemoveBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.accentDanger.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              children: [
                                const Icon(LucideIcons.alertCircle, size: 16, color: AppColors.accentDanger),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: AppTypography.bodySmall.copyWith(
                                      color: AppColors.diffRemoveText,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ).animate().shake(duration: 350.ms),
                          const SizedBox(height: 16),
                        ],

                        // Username Field
                        ShadcnInput(
                          controller: _usernameController,
                          label: 'Developer Username',
                          hintText: 'Enter authorized username',
                          prefixIcon: LucideIcons.user,
                          keyboardType: TextInputType.text,
                          onChanged: (_) {
                            if (_error != null) setState(() => _error = null);
                          },
                          onSubmitted: (_) => _passwordFocusNode.requestFocus(),
                        ),
                        const SizedBox(height: 16),

                        // Password Field
                        ShadcnInput(
                          controller: _passwordController,
                          focusNode: _passwordFocusNode,
                          label: 'Developer Password',
                          hintText: 'Enter developer password',
                          prefixIcon: LucideIcons.lock,
                          isPassword: true,
                          onChanged: (_) {
                            if (_error != null) setState(() => _error = null);
                          },
                          onSubmitted: (_) => _handleLogin(),
                        ),
                        const SizedBox(height: 24),

                        // Submit Button
                        ShadcnButton(
                          text: 'Authenticate Session',
                          icon: LucideIcons.logIn,
                          isFullWidth: true,
                          isLoading: _isLoading,
                          onPressed: _handleLogin,
                        ),
                      ],
                    ),
                  ).animate().slideY(begin: 0.08, duration: 350.ms, curve: Curves.easeOutCubic),

                  const SizedBox(height: 28),

                  // Antigravity Ready Pill
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: AppColors.accentSuccess,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Google Antigravity Provider: Active',
                            style: AppTypography.codeSmall.copyWith(
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).animate().fadeIn(delay: 250.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
