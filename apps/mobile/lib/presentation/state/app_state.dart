import 'package:flutter/material.dart';
import '../../core/network/json_rpc_client.dart';
import '../../core/storage/secure_storage_service.dart';
import 'auth_controller.dart';
import 'provider_controller.dart';
import 'theme_controller.dart';
import 'thread_controller.dart';

/// Central dependency container and state provider
class AppStateScope extends InheritedWidget {
  final AuthController authController;
  final ThreadController threadController;
  final ProviderController providerController;
  final ThemeController themeController;
  final SecureStorageService storageService;
  final JsonRpcClient rpcClient;

  const AppStateScope({
    super.key,
    required this.authController,
    required this.threadController,
    required this.providerController,
    required this.themeController,
    required this.storageService,
    required this.rpcClient,
    required super.child,
  });

  static AppStateScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppStateScope>();
    assert(scope != null, 'No AppStateScope found in context');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppStateScope oldWidget) => true;
}
