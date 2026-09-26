import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/app_models.dart';
import '../../../utils/app_toast.dart';

/// Modal bottom sheet to export conversation history
class ChatExportModal extends StatelessWidget {
  final String sessionId;
  final List<ChatMessageModel> messages;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;

  const ChatExportModal({
    super.key,
    required this.sessionId,
    required this.messages,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
  });

  static void show(
    BuildContext context, {
    required String sessionId,
    required List<ChatMessageModel> messages,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => ChatExportModal(
        sessionId: sessionId,
        messages: messages,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final buffer = StringBuffer();
    buffer.writeln('# AvA Code Conversation Export');
    buffer.writeln('Session: $sessionId');
    buffer.writeln('Date: ${DateTime.now().toIso8601String()}\n');
    for (final m in messages) {
      buffer.writeln('### ${m.sender.toUpperCase()}:');
      buffer.writeln('${m.text}\n');
    }
    final content = buffer.toString();

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.download, size: 18, color: Color(0xFF6366F1)),
              const SizedBox(width: 8),
              Text('Export Conversation', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: textPrimary)),
              const Spacer(),
              IconButton(
                icon: const Icon(LucideIcons.copy, size: 16),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: content));
                  Navigator.pop(context);
                  AppToast.copied(context, 'Export copied to clipboard!');
                },
              ),
            ],
          ),
          const Divider(),
          Expanded(
            child: SingleChildScrollView(
              child: SelectableText(
                content,
                style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: textSecondary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
