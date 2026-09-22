import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('AvaCodeApp mounts cleanly', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      'ava_vps_host': 'http://127.0.0.1:4096',
      'ava_vps_workspace': '/var/www/ava-code',
      'auth_token': 'test-token',
    });
    await tester.pumpWidget(const AvaCodeApp());
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(MaterialApp), findsOneWidget);
    await tester.pumpAndSettle(const Duration(milliseconds: 200)).catchError((_) => 0);
  });
}
