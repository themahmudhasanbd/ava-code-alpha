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

/// Clean, high-performance Authentication screen for AvA Code Alpha
/// Supports dynamic Light and Dark modes with clean brand presentation
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
    final themeCtrl = AppStateScope.of(context).themeController;
    final isDark = AppColors.isDark(context);

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
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
          const SizedBox(width: 12),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Clean Logo Presentation inside Container
                  Center(
                    child: Container(
                      width: 80,
                      height: 80,
                      alignment: Alignment.center,
                      child: Image.asset(
                        AppConstants.appLogoPath,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ).animate().scale(duration: 350.ms, curve: Curves.easeOutCubic),

                  const SizedBox(height: 20),

                  Center(
                    child: Text(
                      AppConstants.appName,
                      style: AppTypography.displayMedium.copyWith(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                        color: AppColors.text(context),
                      ),
                    ),
                  ).animate().fadeIn(delay: 60.ms),

                  const SizedBox(height: 4),

                  Center(
                    child: Text(
                      'Autonomous Agentic Development Platform',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.subtext(context),
                        fontSize: 13,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ).animate().fadeIn(delay: 100.ms),

                  const SizedBox(height: 28),

                  // Login Form Card
                  ShadcnCard(
                    padding: const EdgeInsets.all(22),
                    backgroundColor: AppColors.card(context),
                    border: Border.all(color: AppColors.line(context)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Sign In',
                          style: AppTypography.titleLarge.copyWith(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text(context),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Enter your credentials to connect to AvA Core.',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.subtext(context),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Error Banner
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
                                const Icon(LucideIcons.alertCircle, size: 15, color: AppColors.accentDanger),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: AppTypography.bodySmall.copyWith(
                                      color: AppColors.diffRemoveText,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ).animate().shake(duration: 300.ms),
                          const SizedBox(height: 16),
                        ],

                        // Username Field
                        ShadcnInput(
                          controller: _usernameController,
                          label: 'Username',
                          hintText: 'Enter username',
                          prefixIcon: LucideIcons.user,
                          keyboardType: TextInputType.text,
                          onChanged: (_) {
                            if (_error != null) setState(() => _error = null);
                          },
                          onSubmitted: (_) => _passwordFocusNode.requestFocus(),
                        ),
                        const SizedBox(height: 14),

                        // Password Field
                        ShadcnInput(
                          controller: _passwordController,
                          focusNode: _passwordFocusNode,
                          label: 'Password',
                          hintText: 'Enter password',
                          prefixIcon: LucideIcons.lock,
                          isPassword: true,
                          onChanged: (_) {
                            if (_error != null) setState(() => _error = null);
                          },
                          onSubmitted: (_) => _handleLogin(),
                        ),
                        const SizedBox(height: 20),

                        // Submit Button
                        ShadcnButton(
                          text: 'Sign In',
                          icon: LucideIcons.arrowRight,
                          isFullWidth: true,
                          isLoading: _isLoading,
                          onPressed: _handleLogin,
                        ),
                      ],
                    ),
                  ).animate().slideY(begin: 0.05, duration: 300.ms, curve: Curves.easeOutCubic),

                  const SizedBox(height: 24),

                  // Minimal Footer Version Tag
                  Center(
                    child: Text(
                      '${AppConstants.appShortName} ${AppConstants.appVersion}',
                      style: AppTypography.codeSmall.copyWith(
                        color: AppColors.muted(context),
                        fontSize: 11,
                      ),
                    ),
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
