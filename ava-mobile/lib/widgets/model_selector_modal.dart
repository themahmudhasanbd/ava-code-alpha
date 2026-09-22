import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';

void showModelSelectorModal({
  required BuildContext context,
  required bool isDark,
  required Color cardBg,
  required Color borderColor,
  required Color textPrimary,
  required Color textSecondary,
  required List<AvaModelItem> availableModels,
  required AvaModelItem? selectedModel,
  required ValueChanged<AvaModelItem> onSelectModel,
  Future<void> Function()? onRefreshModels,
}) {
  String searchQuery = '';
  bool isRefreshing = false;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (context, setModalState) {
          final Map<String, List<AvaModelItem>> groupedModels = {};
          final q = searchQuery.trim().toLowerCase();

          for (final m in availableModels) {
            if (q.isNotEmpty) {
              final matches = m.name.toLowerCase().contains(q) ||
                  m.id.toLowerCase().contains(q) ||
                  m.provider.toLowerCase().contains(q);
              if (!matches) continue;
            }
            groupedModels.putIfAbsent(m.provider, () => []).add(m);
          }

          final isSearching = q.isNotEmpty;

          return Container(
            height: MediaQuery.of(context).size.height * 0.80,
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              children: [
                // Modal Handle
                const SizedBox(height: 12),
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 14),

                // Modal Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Row(
                    children: [
                      Text(
                        'Select AI Model',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      const Spacer(),
                      if (onRefreshModels != null)
                        IconButton(
                          icon: isRefreshing
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 1.8),
                                )
                              : Icon(LucideIcons.refreshCw, size: 16, color: textSecondary),
                          tooltip: 'Reload Models',
                          onPressed: isRefreshing
                              ? null
                              : () async {
                                  setModalState(() => isRefreshing = true);
                                  try {
                                    await onRefreshModels();
                                  } finally {
                                    setModalState(() => isRefreshing = false);
                                  }
                                },
                        ),
                      IconButton(
                        icon: Icon(LucideIcons.x, size: 18, color: textSecondary),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Live Search Input Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF09090B) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: TextField(
                      autofocus: false,
                      style: TextStyle(fontSize: 13, color: textPrimary),
                      decoration: InputDecoration(
                        icon: Icon(LucideIcons.search, size: 16, color: textSecondary),
                        hintText: 'Search models',
                        hintStyle: TextStyle(fontSize: 13, color: textSecondary),
                        border: InputBorder.none,
                        suffixIcon: q.isNotEmpty
                            ? IconButton(
                                icon: Icon(LucideIcons.xCircle, size: 16, color: textSecondary),
                                onPressed: () => setModalState(() => searchQuery = ''),
                              )
                            : null,
                      ),
                      onChanged: (val) => setModalState(() => searchQuery = val),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Live Filtered Models List
                Expanded(
                  child: groupedModels.isEmpty
                      ? Center(
                          child: Text(
                            'No matching models found for "$searchQuery"',
                            style: TextStyle(fontSize: 13, color: textSecondary),
                          ),
                        )
                      : ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          children: groupedModels.entries.map((entry) {
                            final providerName = entry.key;
                            final modelsList = entry.value;
                            final hasSelectedModel = modelsList.any((m) => m.id == selectedModel?.id);
                            final shouldExpand = isSearching || hasSelectedModel || groupedModels.length <= 4;
                            final displayProvider = providerName.toLowerCase() == 'omniroute'
                                ? 'OmniRoute Gateway'
                                : providerName;

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF09090B) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: borderColor),
                              ),
                              child: Theme(
                                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                                child: ExpansionTile(
                                  key: ValueKey<String>('sheet_${providerName}_${shouldExpand}_$q'),
                                  initiallyExpanded: shouldExpand,
                                  title: Row(
                                    children: [
                                      Text(
                                        displayProvider,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: textPrimary,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          '${modelsList.length}',
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: textSecondary,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  children: modelsList.map((model) {
                                    final isSelected = model.id == selectedModel?.id;
                                    return ListTile(
                                      dense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                                      title: Row(
                                        children: [
                                          Text(
                                            model.name,
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                              color: isSelected ? const Color(0xFF4F46E5) : textPrimary,
                                            ),
                                          ),
                                          if (model.reasoning) ...[
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: const Text(
                                                'Thinking',
                                                style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF8B5CF6)),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      subtitle: Text(
                                        model.id,
                                        style: TextStyle(fontSize: 10, color: textSecondary),
                                      ),
                                      trailing: isSelected
                                          ? const Icon(LucideIcons.check, size: 16, color: Color(0xFF4F46E5))
                                          : null,
                                      onTap: () {
                                        onSelectModel(model);
                                        Navigator.pop(context);
                                      },
                                    );
                                  }).toList(),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}
