import 'package:flutter_test/flutter_test.dart';
import 'package:ava_code_mobile/core/storage/secure_storage_service.dart';
import 'package:ava_code_mobile/data/repositories/auth_repository.dart';
import 'package:ava_code_mobile/presentation/state/auth_controller.dart';
import 'package:ava_code_mobile/presentation/state/provider_controller.dart';
import 'package:ava_code_mobile/presentation/state/thread_controller.dart';
import 'package:ava_code_mobile/main.dart';

void main() {
  testWidgets('AvaMobileApp smoke test', (WidgetTester tester) async {
    final storage = SecureStorageService();
    final authRepo = AuthRepository(storage: storage);
    final authController = AuthController(repository: authRepo);
    final threadController = ThreadController();
    final providerController = ProviderController();

    await tester.pumpWidget(
      AvaMobileApp(
        storage: storage,
        authController: authController,
        threadController: threadController,
        providerController: providerController,
      ),
    );
    expect(find.byType(AvaMobileApp), findsOneWidget);
  });
}
