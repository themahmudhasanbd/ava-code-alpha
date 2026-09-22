import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('AvaCodeApp mounts cleanly', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const AvaCodeApp());
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
