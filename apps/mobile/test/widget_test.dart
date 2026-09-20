import 'package:flutter_test/flutter_test.dart';
import 'package:ava_code_mobile/core/network/json_rpc_client.dart';
import 'package:ava_code_mobile/core/storage/secure_storage_service.dart';
import 'package:ava_code_mobile/data/repositories/auth_repository.dart';
import 'package:ava_code_mobile/presentation/state/auth_controller.dart';
import 'package:ava_code_mobile/presentation/state/provider_controller.dart';
import 'package:ava_code_mobile/presentation/state/theme_controller.dart';
import 'package:ava_code_mobile/presentation/state/thread_controller.dart';
import 'package:ava_code_mobile/main.dart';

void main() {
  testWidgets('AvaMobileApp smoke test', (WidgetTester tester) async {
    final storage = SecureStorageService();
    final rpcClient = JsonRpcClient();
    final authRepo = AuthRepository(storage: storage, rpcClient: rpcClient);
    final authController = AuthController(repository: authRepo);
    final threadController = ThreadController(rpcClient: rpcClient);
    final providerController = ProviderController(rpcClient: rpcClient);
    final themeController = ThemeController(storage: storage);

    await tester.pumpWidget(
      AvaMobileApp(
        storage: storage,
        authController: authController,
        threadController: threadController,
        providerController: providerController,
        themeController: themeController,
        rpcClient: rpcClient,
      ),
    );
    expect(find.byType(AvaMobileApp), findsOneWidget);
  });
}
