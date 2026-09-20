import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/app_constants.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_typography.dart';
import 'data/repositories/auth_repository.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/main_navigation_shell.dart';
import 'presentation/state/app_state.dart';
import 'presentation/state/auth_controller.dart';
import 'presentation/state/provider_controller.dart';
import 'presentation/state/thread_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set immersive dark status bar
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final storage = SecureStorageService();
  await storage.init();

  final authRepo = AuthRepository(storage: storage);
  final authController = AuthController(repository: authRepo);
  final threadController = ThreadController();
  final providerController = ProviderController();

  // Initialize auth state
  await authController.init();

  runApp(
    AvaMobileApp(
      storage: storage,
      authController: authController,
      threadController: threadController,
      providerController: providerController,
    ),
  );
}

class AvaMobileApp extends StatelessWidget {
  final SecureStorageService storage;
  final AuthController authController;
  final ThreadController threadController;
  final ProviderController providerController;

  const AvaMobileApp({
    super.key,
    required this.storage,
    required this.authController,
    required this.threadController,
    required this.providerController,
  });

  @override
  Widget build(BuildContext context) {
    return AppStateScope(
      storageService: storage,
      authController: authController,
      threadController: threadController,
      providerController: providerController,
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AuthGate(),
      ),
    );
  }
}

/// Dynamic gate switching between Login and Main Dashboard based on auth status
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authController = AppStateScope.of(context).authController;

    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        switch (authController.status) {
          case AuthStatus.authenticated:
            return const MainNavigationShell();
          case AuthStatus.unauthenticated:
            return const LoginScreen();
          case AuthStatus.authenticating:
          case AuthStatus.uninitialized:
            return Scaffold(
              backgroundColor: AppColors.background,
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.textPrimary),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Connecting to AvA Core...',
                      style: AppTypography.codeSmall,
                    ),
                  ],
                ),
              ),
            );
        }
      },
    );
  }
}
