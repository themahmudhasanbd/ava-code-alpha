import 'package:flutter/material.dart';

/// Spinner row shown at the top of the message list while older messages
/// are being fetched (infinite-scroll / history pagination).
class ChatLoadingHistoryIndicator extends StatelessWidget {
  final Color textSecondary;

  const ChatLoadingHistoryIndicator({super.key, required this.textSecondary});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      alignment: Alignment.center,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 1.8, color: textSecondary),
          ),
          const SizedBox(width: 8),
          Text(
            'Loading older messages…',
            style: TextStyle(fontSize: 11.5, color: textSecondary, fontFamily: 'Inter'),
          ),
        ],
      ),
    );
  }
}
