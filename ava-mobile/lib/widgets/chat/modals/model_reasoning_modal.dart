import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../models/app_models.dart';
import '../../../config/chat_constants.dart';
import '../../../utils/app_toast.dart';

/// Ultra-Modern Modal bottom sheet to select active model and reasoning effort preset
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
      useSafeArea: true,
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
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _selectedEffort = widget.currentReasoningEffort.toLowerCase().trim();
    if (_selectedEffort.isEmpty) _selectedEffort = 'medium';
    _searchController.addListener(() {
      if (mounted) {
        setState(() => _searchQuery = _searchController.text.trim().toLowerCase());
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Color _getProviderColor(String provider) {
    final lower = provider.toLowerCase();
    if (lower.contains('omniroute')) return const Color(0xFF6366F1);
    if (lower.contains('anthropic') || lower.contains('claude')) return const Color(0xFFD97706);
    if (lower.contains('openai') || lower.contains('gpt') || lower.contains('o1') || lower.contains('o3')) return const Color(0xFF10B981);
    if (lower.contains('google') || lower.contains('gemini')) return const Color(0xFF3B82F6);
    if (lower.contains('deepseek')) return const Color(0xFF0EA5E9);
    if (lower.contains('groq')) return const Color(0xFFF97316);
    return const Color(0xFF8B5CF6);
  }

  @override
  Widget build(BuildContext context) {
    const Color accentColor = Color(0xFF6366F1);

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF0F0F14) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(
          color: widget.isDark
              ? Colors.white.withValues(alpha: 0.12)
              : Colors.black.withValues(alpha: 0.08),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: widget.isDark ? 0.40 : 0.12),
            blurRadius: 24,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle Pill
          Center(
            child: Container(
              width: 38,
              height: 4.5,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: widget.isDark ? Colors.white24 : Colors.black12,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // Header Row
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.cpu, size: 18, color: accentColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Model & Reasoning',
                      style: TextStyle(
                        fontSize: 16,
                        fontFamily: 'PlusJakartaSans',
                        fontWeight: FontWeight.w800,
                        color: widget.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      'Configure LLM intelligence and thinking depth',
                      style: TextStyle(fontSize: 11, fontFamily: 'Inter', color: widget.textSecondary),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(LucideIcons.x, size: 18, color: widget.textSecondary),
                onPressed: () => Navigator.pop(context),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Segmented Tabs: Model vs Reasoning
          Container(
            height: 40,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF181822) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: widget.isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.06),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              indicator: BoxDecoration(
                color: accentColor,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: accentColor.withValues(alpha: 0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              labelColor: Colors.white,
              unselectedLabelColor: widget.textSecondary,
              labelStyle: const TextStyle(fontSize: 12.5, fontFamily: 'PlusJakartaSans', fontWeight: FontWeight.w700),
              unselectedLabelStyle: const TextStyle(fontSize: 12.5, fontFamily: 'PlusJakartaSans', fontWeight: FontWeight.w500),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.sparkles, size: 13),
                      const SizedBox(width: 6),
                      Text('Active Model (${widget.availableModels.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.brain, size: 13),
                      const SizedBox(width: 6),
                      Text('Reasoning (${_selectedEffort.toUpperCase()})'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildModelTab(),
                _buildReasoningTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModelTab() {
    final allModels = widget.availableModels.isNotEmpty
        ? widget.availableModels
        : (widget.currentModel != null ? [widget.currentModel!] : []);

    final filtered = allModels.where((m) {
      if (_searchQuery.isEmpty) return true;
      return m.name.toLowerCase().contains(_searchQuery) ||
          m.id.toLowerCase().contains(_searchQuery) ||
          m.provider.toLowerCase().contains(_searchQuery);
    }).toList();

    return Column(
      children: [
        // Search Input Field
        if (allModels.isNotEmpty)
          Container(
            height: 38,
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: widget.isDark ? const Color(0xFF161622) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: widget.isDark
                    ? Colors.white.withValues(alpha: 0.10)
                    : Colors.black.withValues(alpha: 0.08),
              ),
            ),
            child: TextField(
              controller: _searchController,
              style: TextStyle(fontSize: 12.5, color: widget.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search models by name, ID, or provider…',
                hintStyle: TextStyle(fontSize: 12, color: widget.textSecondary.withValues(alpha: 0.7)),
                prefixIcon: Icon(LucideIcons.search, size: 14, color: widget.textSecondary),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 14),
                        onPressed: () => _searchController.clear(),
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 9),
              ),
            ),
          ),

        // Models List View
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.searchX, size: 28, color: widget.textSecondary.withValues(alpha: 0.5)),
                      const SizedBox(height: 8),
                      Text(
                        _searchQuery.isNotEmpty
                            ? 'No models match "$_searchQuery"'
                            : 'No models available in configuration',
                        style: TextStyle(fontSize: 12, color: widget.textSecondary),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (ctx, idx) {
                    final m = filtered[idx];
                    final isSelected = widget.currentModel?.id == m.id ||
                        widget.currentModel?.effectiveModelKey == m.effectiveModelKey;
                    final Color providerColor = _getProviderColor(m.provider);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 7),
                      child: InkWell(
                        onTap: () {
                          widget.onSelectModel?.call(m);
                          Navigator.pop(context);
                          AppToast.info(context, 'Switched active model to ${m.name}');
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.all(11),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? providerColor.withValues(alpha: widget.isDark ? 0.16 : 0.08)
                                : (widget.isDark ? const Color(0xFF13131A) : const Color(0xFFF8FAFC)),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? providerColor
                                  : (widget.isDark
                                      ? Colors.white.withValues(alpha: 0.08)
                                      : Colors.black.withValues(alpha: 0.06)),
                              width: isSelected ? 1.2 : 0.8,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: providerColor.withValues(alpha: 0.15),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: providerColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: providerColor.withValues(alpha: 0.3),
                                    width: 0.8,
                                  ),
                                ),
                                child: Icon(LucideIcons.cpu, size: 16, color: providerColor),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            m.name,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontFamily: 'PlusJakartaSans',
                                              fontWeight: FontWeight.w700,
                                              color: widget.textPrimary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: providerColor.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(5),
                                            border: Border.all(
                                              color: providerColor.withValues(alpha: 0.25),
                                              width: 0.6,
                                            ),
                                          ),
                                          child: Text(
                                            m.provider.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 8.5,
                                              fontFamily: 'JetBrainsMono',
                                              fontWeight: FontWeight.w800,
                                              color: providerColor,
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
                                    color: providerColor,
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
                ),
        ),
      ],
    );
  }

  Widget _buildReasoningTab() {
    return ListView(
      padding: const EdgeInsets.only(top: 2),
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
                    ? eColor.withValues(alpha: widget.isDark ? 0.16 : 0.08)
                    : (widget.isDark ? const Color(0xFF13131A) : const Color(0xFFF8FAFC)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? eColor
                      : (widget.isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.06)),
                  width: isSelected ? 1.2 : 0.8,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: eColor.withValues(alpha: 0.15),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: eColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: eColor.withValues(alpha: 0.3),
                        width: 0.8,
                      ),
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
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: eColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(5),
                                  border: Border.all(
                                    color: eColor.withValues(alpha: 0.25),
                                    width: 0.6,
                                  ),
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
