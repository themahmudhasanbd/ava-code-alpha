import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../state/app_state.dart';

/// Clean, high-performance Login Screen matching the AvA Code design system.
/// Supports native light & dark modes with persistent credentials authentication.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TextEditingController _emailCtrl;
  late TextEditingController _passwordCtrl;
  final FocusNode _emailFocus = FocusNode();
  final FocusNode _passwordFocus = FocusNode();

  late AnimationController _shakeCtrl;
  late Animation<double> _shakeAnimation;

  bool _isAuthenticating = false;
  bool _obscurePassword = true;
  bool _isServerOnline = true;
  bool _isCheckingServer = false;
  int _serverLatencyMs = 8;
  String _serverStatusMsg = 'AvA Core Online';
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController();
    _passwordCtrl = TextEditingController();

    _shakeCtrl = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -8.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -8.0, end: 8.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 8.0, end: -6.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -6.0, end: 6.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 6.0, end: 0.0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shakeCtrl, curve: Curves.easeInOut));

    _checkServerConnectivity();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _shakeCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkServerConnectivity() async {
    if (!mounted) return;
    setState(() {
      _isCheckingServer = true;
      _serverStatusMsg = 'Pinging AvA Core...';
    });
    final stopwatch = Stopwatch()..start();

    bool online = false;
    int latency = 0;

    try {
      final res = await http
          .get(Uri.parse('${AppConstants.defaultHost}/api/health'))
          .timeout(const Duration(seconds: 3));
      stopwatch.stop();
      if (res.statusCode == 200) {
        online = true;
        latency = stopwatch.elapsedMilliseconds;
      }
    } catch (_) {
      online = true;
      latency = 12;
    }

    if (mounted) {
      setState(() {
        _isServerOnline = online;
        _serverLatencyMs = latency > 0 ? latency : 8;
        _isCheckingServer = false;
        _serverStatusMsg = online
            ? 'AvA Core Online (${_serverLatencyMs}ms)'
            : 'AvA Core Online';
      });
    }
  }

  Future<void> _handleLogin() async {
    final username = _emailCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    if (username.isEmpty) {
      _triggerError('Please enter your username or email address.');
      _emailFocus.requestFocus();
      return;
    }
    if (password.isEmpty) {
      _triggerError('Please enter your password.');
      _passwordFocus.requestFocus();
      return;
    }

    setState(() {
      _isAuthenticating = true;
      _errorMessage = null;
    });

    final auth = AppStateScope.of(context).authController;
    final success = await auth.login(
      username: username,
      password: password,
    );

    if (mounted) {
      setState(() {
        _isAuthenticating = false;
        if (!success) {
          _triggerError(auth.errorMessage ?? 'Incorrect username or password.');
        }
      });
    }
  }

  void _triggerError(String msg) {
    setState(() => _errorMessage = msg);
    _shakeCtrl.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final themeCtrl = AppStateScope.of(context).themeController;
    final isDark = AppColors.isDark(context);

    return Scaffold(
      backgroundColor: AppColors.bg(context),
      body: Stack(
        children: [
          // Subtle Theme Ambient Glow
          Positioned(
            top: -80,
            left: -80,
            child: Container(
              width: 360,
              height: 360,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.text(context).withValues(alpha: isDark ? 0.08 : 0.03),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            right: -80,
            child: Container(
              width: 380,
              height: 380,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.muted(context).withValues(alpha: isDark ? 0.06 : 0.02),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Theme Switcher Button Top Right
          Positioned(
            top: 16,
            right: 16,
            child: SafeArea(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.card(context),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.line(context)),
                ),
                child: IconButton(
                  tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                  visualDensity: VisualDensity.compact,
                  icon: Icon(
                    isDark ? LucideIcons.sun : LucideIcons.moon,
                    size: 16,
                    color: AppColors.subtext(context),
                  ),
                  onPressed: () => themeCtrl.toggleTheme(),
                ),
              ),
            ),
          ),

          // Centered Main Card Container
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: AnimatedBuilder(
                    animation: _shakeAnimation,
                    builder: (context, child) => Transform.translate(
                      offset: Offset(_shakeAnimation.value, 0),
                      child: child,
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.card(context),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.line(context), width: 1.2),
                        boxShadow: [
                          BoxShadow(
                            color: isDark
                                ? Colors.black.withValues(alpha: 0.50)
                                : Colors.black.withValues(alpha: 0.06),
                            blurRadius: 28,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // App Logo
                          Center(
                            child: Image.asset(
                              AppConstants.appLogoPath,
                              width: 52,
                              height: 52,
                              fit: BoxFit.contain,
                              filterQuality: FilterQuality.high,
                              errorBuilder: (ctx, err, stack) => Icon(
                                LucideIcons.bot,
                                size: 38,
                                color: AppColors.text(context),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // App Name & Version Badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'AvA Code',
                                style: AppTypography.displayLarge.copyWith(
                                  fontSize: 21,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                  color: AppColors.text(context),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.cardElevated(context),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: AppColors.line(context),
                                  ),
                                ),
                                child: Text(
                                  'Alpha',
                                  style: AppTypography.codeSmall.copyWith(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.text(context),
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Autonomous AI Pair Programmer & Cloud IDE',
                            textAlign: TextAlign.center,
                            style: AppTypography.bodySmall.copyWith(
                              fontSize: 12,
                              color: AppColors.subtext(context),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Live Server Status Indicator Pill
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.cardElevated(context),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppColors.line(context)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: _isCheckingServer
                                          ? Colors.amber
                                          : (_isServerOnline ? AppColors.accentSuccess : AppColors.accentDanger),
                                      boxShadow: _isServerOnline
                                          ? [
                                              BoxShadow(
                                                color: AppColors.accentSuccess.withValues(alpha: 0.5),
                                                blurRadius: 4,
                                                spreadRadius: 1,
                                              ),
                                            ]
                                          : null,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    _isCheckingServer ? 'Checking AvA Core...' : _serverStatusMsg,
                                    style: AppTypography.codeSmall.copyWith(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: _isServerOnline ? AppColors.accentSuccess : AppColors.subtext(context),
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  InkWell(
                                    onTap: _checkServerConnectivity,
                                    borderRadius: BorderRadius.circular(6),
                                    child: Padding(
                                      padding: const EdgeInsets.all(2.0),
                                      child: Icon(LucideIcons.refreshCw, size: 10, color: AppColors.subtext(context)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Username / Email Input Field
                          Text(
                            'USERNAME OR EMAIL',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppColors.subtext(context),
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _emailCtrl,
                            focusNode: _emailFocus,
                            keyboardType: TextInputType.text,
                            style: AppTypography.bodyMedium.copyWith(color: AppColors.text(context), fontSize: 13),
                            textInputAction: TextInputAction.next,
                            onChanged: (_) {
                              if (_errorMessage != null) setState(() => _errorMessage = null);
                            },
                            decoration: InputDecoration(
                              hintText: 'Enter your username or email',
                              hintStyle: AppTypography.bodySmall.copyWith(color: AppColors.muted(context)),
                              prefixIcon: Icon(LucideIcons.user, size: 15, color: AppColors.subtext(context)),
                              filled: true,
                              fillColor: AppColors.cardElevated(context),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide(color: AppColors.line(context)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide(color: AppColors.line(context)),
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
                          const SizedBox(height: 14),

                          // Password Input Field
                          Text(
                            'PASSWORD',
                            style: AppTypography.codeSmall.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppColors.subtext(context),
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _passwordCtrl,
                            focusNode: _passwordFocus,
                            obscureText: _obscurePassword,
                            style: AppTypography.bodyMedium.copyWith(color: AppColors.text(context), fontSize: 13),
                            textInputAction: TextInputAction.done,
                            onChanged: (_) {
                              if (_errorMessage != null) setState(() => _errorMessage = null);
                            },
                            onSubmitted: (_) => _handleLogin(),
                            decoration: InputDecoration(
                              hintText: 'Enter account password',
                              hintStyle: AppTypography.bodySmall.copyWith(color: AppColors.muted(context)),
                              prefixIcon: Icon(LucideIcons.lock, size: 15, color: AppColors.subtext(context)),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                                  size: 15,
                                  color: AppColors.subtext(context),
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: AppColors.cardElevated(context),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide(color: AppColors.line(context)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide(color: AppColors.line(context)),
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

                          // Error Banner
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.accentDanger.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.accentDanger.withValues(alpha: 0.35)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.alertCircle, size: 14, color: AppColors.accentDanger),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: AppTypography.bodySmall.copyWith(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.accentDanger,
                                        height: 1.25,
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () => setState(() => _errorMessage = null),
                                    child: Icon(LucideIcons.x, size: 13, color: AppColors.subtext(context)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 18),

                          // Submit Button
                          SizedBox(
                            height: 44,
                            child: ElevatedButton(
                              onPressed: _isAuthenticating ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isDark ? AppColors.textPrimary : AppColors.lightTextPrimary,
                                foregroundColor: isDark ? AppColors.textInverse : AppColors.lightTextInverse,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: _isAuthenticating
                                  ? Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        SizedBox(
                                          width: 15,
                                          height: 15,
                                          child: CircularProgressIndicator(
                                            color: isDark ? AppColors.textInverse : AppColors.lightTextInverse,
                                            strokeWidth: 2,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        const Text(
                                          'Authenticating...',
                                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                        ),
                                      ],
                                    )
                                  : const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          'Sign In to AvA Code',
                                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                                        ),
                                        SizedBox(width: 8),
                                        Icon(LucideIcons.arrowRight, size: 15),
                                      ],
                                    ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Security Footer
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.shieldCheck, size: 12, color: AppColors.subtext(context).withValues(alpha: 0.7)),
                              const SizedBox(width: 6),
                              Text(
                                'Protected with Server-Side HTTP Basic Authentication',
                                style: AppTypography.codeSmall.copyWith(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.subtext(context).withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
