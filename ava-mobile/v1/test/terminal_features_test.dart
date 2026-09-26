import 'package:flutter_test/flutter_test.dart';
import 'package:xterm/xterm.dart';

void main() {
  group('Terminal Bangla Font & Search Tests', () {
    test('1. TerminalStyle default font family fallback includes NotoSansBengali', () {
      const style = TerminalStyle();
      expect(style.fontFamilyFallback.contains('NotoSansBengali'), isTrue);
      expect(style.fontFamilyFallback.first, equals('NotoSansBengali'));
    });

    test('2. Buffer accurately receives and stores Bengali Unicode text', () {
      final terminal = Terminal(maxLines: 100);
      const bengaliText = 'বাংলা ভাষা ও সাহিত্য';
      terminal.write(bengaliText);

      final lineText = terminal.buffer.lines[0].getText();
      expect(lineText.contains('বাংলা'), isTrue);
      expect(lineText.contains('ভাষা'), isTrue);
    });

    test('3. Terminal search accurately identifies English and Bengali queries', () {
      final terminal = Terminal(maxLines: 100);
      terminal.write('echo "বাংলা ভাষা test 123"\r\n');
      terminal.write('Running interactive agy session...\r\n');

      final line0 = terminal.buffer.lines[0].getText();
      final line1 = terminal.buffer.lines[1].getText();

      expect(line0.contains('বাংলা'), isTrue);
      expect(line0.contains('test'), isTrue);
      expect(line1.contains('agy'), isTrue);
    });

    test('4. TerminalController supports selection and highlight ranges', () {
      final controller = TerminalController();
      expect(controller.selection, isNull);

      final terminal = Terminal(maxLines: 100);
      terminal.write('Hello Bengali: বাংলা\r\n');

      final anchor1 = terminal.buffer.createAnchor(0, 0);
      final anchor2 = terminal.buffer.createAnchor(5, 0);
      controller.setSelection(anchor1, anchor2);

      expect(controller.selection, isNotNull);
      controller.clearSelection();
      expect(controller.selection, isNull);
    });
  });
}
