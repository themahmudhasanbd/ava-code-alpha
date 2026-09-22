import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Maps raw agent data from the AvA Core API to display-friendly map entries
/// used throughout the chat screen.
class ChatAgentMapper {
  static List<Map<String, dynamic>> mapServerAgents(List<Map<String, dynamic>> serverAgents) {
    final List<Map<String, dynamic>> mapped = [];

    for (final agent in serverAgents) {
      final id = (agent['name'] ?? agent['id'] ?? '').toString();
      if (id.isEmpty) continue;

      final rawDesc = (agent['description'] ?? agent['desc'] ?? '').toString();
      final mode = (agent['mode'] ?? 'primary').toString();

      final (name, icon, color) = _resolveAppearance(id, mode);

      mapped.add({
        'id': id,
        'name': name,
        'role': mode == 'primary' ? 'Primary Agent' : 'Specialized Subagent',
        'desc': rawDesc.isNotEmpty ? rawDesc : 'AvA Code native agent ($id)',
        'icon': icon,
        'color': color,
      });
    }

    return mapped;
  }

  static (String, IconData, Color) _resolveAppearance(String id, String mode) {
    switch (id.toLowerCase()) {
      case 'build':
      case 'builder':
        return ('Builder', LucideIcons.hammer, const Color(0xFF6366F1));
      case 'plan':
      case 'planner':
        return ('Planner', LucideIcons.compass, const Color(0xFF38BDF8));
      case 'explore':
      case 'explorer':
        return ('Explorer', LucideIcons.search, const Color(0xFF10B981));
      case 'chat':
        return ('Chat', LucideIcons.messageSquare, const Color(0xFFEC4899));
      case 'triage':
        return ('Triage', LucideIcons.circleAlert, const Color(0xFFF59E0B));
      default:
        final name = id.length > 1 ? '${id[0].toUpperCase()}${id.substring(1)}' : id.toUpperCase();
        final icon = mode == 'primary' ? LucideIcons.sparkles : LucideIcons.bot;
        final color = mode == 'primary' ? const Color(0xFFA855F7) : const Color(0xFF64748B);
        return (name, icon, color);
    }
  }
}
