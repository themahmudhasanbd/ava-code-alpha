import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Modal bottom sheet to select file source (device upload vs server library)
class ChatAddFilesModal extends StatelessWidget {
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback onPickFromDevice;
  final VoidCallback onPickFromServer;

  const ChatAddFilesModal({
    super.key,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onPickFromDevice,
    required this.onPickFromServer,
  });

  static void show(
    BuildContext context, {
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    required VoidCallback onPickFromDevice,
    required VoidCallback onPickFromServer,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ChatAddFilesModal(
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        onPickFromDevice: onPickFromDevice,
        onPickFromServer: onPickFromServer,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: textSecondary.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              const Icon(LucideIcons.paperclip, size: 18, color: Color(0xFF6366F1)),
              const SizedBox(width: 8),
              Text(
                'Add files',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: textPrimary,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: Icon(LucideIcons.x, size: 16, color: textSecondary),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ListTile(
            dense: true,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.uploadCloud, size: 18, color: Color(0xFF6366F1)),
            ),
            title: Text(
              'Select from your device',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary),
            ),
            subtitle: Text(
              'Upload images or documents from this device to server media library',
              style: TextStyle(fontSize: 11, color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onPickFromDevice();
            },
          ),
          const SizedBox(height: 4),
          ListTile(
            dense: true,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.server, size: 18, color: Color(0xFF10B981)),
            ),
            title: Text(
              'Select from the server',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary),
            ),
            subtitle: Text(
              'Browse server files & media library (/root/shared-media)',
              style: TextStyle(fontSize: 11, color: textSecondary),
            ),
            onTap: () {
              Navigator.pop(context);
              onPickFromServer();
            },
          ),
        ],
      ),
    );
  }
}
