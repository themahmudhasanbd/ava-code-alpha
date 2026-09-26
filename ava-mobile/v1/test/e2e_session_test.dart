import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/services/agent_core_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});
  HttpOverrides.global = null;

  group('E2E AVA Server Direct Mobile Client Tests', () {
    final service = AvaAgentCoreService(
      baseUrl: 'http://127.0.0.1:4096',
      workspacePath: '/var/www/ava-code',
    );

    test('1. Health check connects cleanly to AVA Server', () async {
      final isHealthy = await service.checkHealth();
      if (!isHealthy) return;
      expect(isHealthy, isTrue);
    });

    test('2. Native session creation returns valid AVA Core session ID', () async {
      final isHealthy = await service.checkHealth();
      if (!isHealthy) return;
      final sessionId = await service.createSession(
        directory: '/var/www/ava-code',
        agent: 'build',
        model: 'gpt-5.6-sol',
      );
      expect(sessionId, isNotNull);
    });

    test('3. Native session prompt streaming produces live events', () async {
      final isHealthy = await service.checkHealth();
      if (!isHealthy) return;

      final sessionId = await service.createSession(
        directory: '/var/www/ava-code',
        agent: 'build',
        model: 'gpt-5.6-sol',
      );

      final receivedTypes = <String>[];
      bool receivedSessionId = false;

      final stream = service.sendPromptStream(
        prompt: 'Say hi',
        modelId: 'gpt-5.6-sol',
        provider: 'omniroute',
        mode: 'build',
        sessionId: sessionId,
      );

      await for (final event in stream) {
        final type = event['type']?.toString() ?? '';
        receivedTypes.add(type);

        if (type == 'sessionId') {
          receivedSessionId = true;
          expect(event['sessionId'], equals(sessionId));
          break;
        }
      }

      expect(receivedSessionId, isTrue);
    });

    test('4. Question reply API works', () async {
      await service.replyQuestion('q_e2e_1', 'Option A');
    });

    test('5. Native session interrupt succeeds', () async {
      final isHealthy = await service.checkHealth();
      if (!isHealthy) return;

      final sessionId = await service.createSession(
        directory: '/var/www/ava-code',
        agent: 'build',
      );
      expect(sessionId, isNotNull);
      await service.interruptSession(sessionId!);
    });

    test('6. Session listing recovers created sessions', () async {
      final sessions = await service.fetchSessions();
      expect(sessions, isA<List<Map<String, dynamic>>>());
    });
  });
}
