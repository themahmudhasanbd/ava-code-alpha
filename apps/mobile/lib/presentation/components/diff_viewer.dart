import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

/// Clean line-by-line syntax-colored diff viewer (+ additions, - deletions)
class DiffViewer extends StatelessWidget {
  final String filePath;
  final String diffText;

  const DiffViewer({
    super.key,
    required this.filePath,
    required this.diffText,
  });

  @override
  Widget build(BuildContext context) {
    final lines = diffText.split('\n');

    return Container(
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.vertical(top: Radius.circular(9)),
              border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
            ),
            child: Row(
              children: [
                const Icon(Icons.code, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    filePath,
                    style: AppTypography.codeSmall.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          // Diff Lines
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: lines.map((line) {
                Color lineBg = Colors.transparent;
                Color lineFg = AppColors.textSecondary;

                if (line.startsWith('+') && !line.startsWith('+++')) {
                  lineBg = AppColors.diffAddBg;
                  lineFg = AppColors.diffAddText;
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  lineBg = AppColors.diffRemoveBg;
                  lineFg = AppColors.diffRemoveText;
                } else if (line.startsWith('@@')) {
                  lineFg = AppColors.accentCyan;
                }

                return Container(
                  color: lineBg,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 1.5),
                  child: Text(
                    line,
                    style: AppTypography.codeSmall.copyWith(
                      color: lineFg,
                      height: 1.35,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
