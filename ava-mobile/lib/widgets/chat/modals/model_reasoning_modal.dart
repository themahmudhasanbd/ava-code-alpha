import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/app_models.dart';
import '../../../config/chat_constants.dart';
import '../../../utils/app_toast.dart';

/// Modal bottom sheet to select active model and reasoning effort preset
class ModelReasoningModal extends StatefulWidget {
  final AvaModelItem? currentModel;
  final List<AvaModelItem> availableModels;
  final String currentReasoningEffort;
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final ValueChanged<AvaModelItem>? onSelectModel;
  final ValueChanged<String>? onSelectReasoningEffort;

  const ModelReasoningModal({
    super.key,
    required this.currentModel,
    required this.availableModels,
    required this.currentReasoningEffort,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    this.onSelectModel,
    this.onSelectReasoningEffort,
  });

  static void show(
    BuildContext context, {
    required AvaModelItem? currentModel,
    required List<AvaModelItem> availableModels,
    required String currentReasoningEffort,
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
    ValueChanged<AvaModelItem>? onSelectModel,
    ValueChanged<String>? onSelectReasoningEffort,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => ModelReasoningModal(
        currentModel: currentModel,
        availableModels: availableModels,
        currentReasoningEffort: currentReasoningEffort,
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        onSelectModel: onSelectModel,
        onSelectReasoningEffort: onSelectReasoningEffort,
      ),
    );
  }

  @override
  State<ModelReasoningModal> createState() => _ModelReasoningModalState();
}

class _ModelReasoningModalState extends State<ModelReasoningModal>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late String _selectedEffort;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _selectedEffort = widget.currentReasoningEffort.toLowerCase().trim();
    if (_selectedEffort.isEmpty) _selectedEffort = 'medium';
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color accentColor = const Color(0xFF6366F1);

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: widget.borderColor),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(LucideIcons.cpu, size: 17, color: accentColor),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Model & Reasoning',
                    style: TextStyle(
                      fontSize: 16,
                      fontFamily: 'PlusJakartaSans',
                      fontWeight: FontWeight.bold,
                      color: widget.textPrimary,
                    ),
                  ),
                  Text(
                    'Configure LLM intelligence and thinking depth',
                    style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: widget.textSecondary),
                  ),
                ],
              ),
              const Spacer(),
              IconButton(
                icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Segmented Tabs: Model vs Reasoning
          Container(
            height: 38,
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF161622) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: widget.borderColor.withValues(alpha: 0.5)),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              indicator: BoxDecoration(
                color: accentColor,
                borderRadius: BorderRadius.circular(10),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: widget.textSecondary,
              labelStyle: const TextStyle(fontSize: 12, fontFamily: 'Inter', fontWeight: FontWeight.w700),
              unselectedLabelStyle: const TextStyle(fontSize: 12, fontFamily: 'Inter', fontWeight: FontWeight.w500),
              tabs: const [
                Tab(text: 'Active Model'),
                Tab(text: 'Reasoning Effort'),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildModelList(),
                _buildReasoningEffortList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModelList() {
    final models = widget.availableModels.isNotEmpty
        ? widget.availableModels
        : (widget.currentModel != null ? [widget.currentModel!] : []);

    if (models.isEmpty) {
      return Center(
        child: Text(
          'No models available in configuration',
          style: TextStyle(fontSize: 12, color: widget.textSecondary),
        ),
      );
    }

    return ListView.builder(
      itemCount: models.length,
      itemBuilder: (ctx, idx) {
        final m = models[idx];
        final isSelected = widget.currentModel?.id == m.id ||
            widget.currentModel?.effectiveModelKey == m.effectiveModelKey;
        final Color mColor = const Color(0xFF6366F1);

        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: () {
              widget.onSelectModel?.call(m);
              Navigator.pop(context);
              AppToast.info(context, 'Switched active model to ${m.name}');
            },
            borderRadius: BorderRadius.circular(12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? mColor.withValues(alpha: widget.isDark ? 0.15 : 0.08)
                    : (widget.isDark ? const Color(0xFF13131A) : const Color(0xFFF8FAFC)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? mColor : widget.borderColor.withValues(alpha: 0.6),
                  width: isSelected ? 1.2 : 0.8,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: mColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(LucideIcons.cpu, size: 16, color: mColor),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              m.name,
                              style: TextStyle(
                                fontSize: 13,
                                fontFamily: 'PlusJakartaSans',
                                fontWeight: FontWeight.w700,
                                color: widget.textPrimary,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: mColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                m.provider.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontFamily: 'JetBrainsMono',
                                  fontWeight: FontWeight.w800,
                                  color: mColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          m.id,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontFamily: 'JetBrainsMono',
                            color: widget.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (isSelected) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: mColor,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.check, size: 11, color: Colors.white),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildReasoningEffortList() {
    return ListView(
      children: kDefaultReasoningEfforts.map((effort) {
        final id = effort['id'] as String;
        final isSelected = _selectedEffort == id;
        final Color eColor = effort['color'] as Color;
        final IconData eIcon = effort['icon'] as IconData;

        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: () {
              setState(() => _selectedEffort = id);
              widget.onSelectReasoningEffort?.call(id);
              Navigator.pop(context);
              AppToast.info(context, 'Reasoning effort set to ${effort['name']}');
            },
            borderRadius: BorderRadius.circular(12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? eColor.withValues(alpha: widget.isDark ? 0.15 : 0.08)
                    : (widget.isDark ? const Color(0xFF13131A) : const Color(0xFFF8FAFC)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? eColor : widget.borderColor.withValues(alpha: 0.6),
                  width: isSelected ? 1.2 : 0.8,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: eColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(eIcon, size: 16, color: eColor),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              effort['name'] as String,
                              style: TextStyle(
                                fontSize: 13,
                                fontFamily: 'PlusJakartaSans',
                                fontWeight: FontWeight.w700,
                                color: widget.textPrimary,
                              ),
                            ),
                            if (effort['badge'] != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: eColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                  effort['badge'] as String,
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontFamily: 'Inter',
                                    fontWeight: FontWeight.w800,
                                    color: eColor,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          effort['desc'] as String,
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'Inter',
                            color: widget.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: eColor,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.check, size: 11, color: Colors.white),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
