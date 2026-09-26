import 'package:flutter/material.dart';

/// Centralized utility for formatting session interaction times and general
/// timestamps to match the user device's local timezone and 12-hour/24-hour setting.
class TimeFormatter {
  static const List<String> _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /// Extracts the best available timestamp in epoch milliseconds from a session map.
  static int? extractEpochMs(Map<String, dynamic> s) {
    int? epochMs;
    if (s['time'] is Map) {
      epochMs = (s['time']['updated'] as num?)?.toInt() ??
          (s['time']['created'] as num?)?.toInt();
    }
    epochMs ??= (s['time_updated'] as num?)?.toInt() ??
        (s['time_created'] as num?)?.toInt();

    if (epochMs == null && s['updatedAt'] != null) {
      epochMs = DateTime.tryParse(s['updatedAt'].toString())?.toLocal().millisecondsSinceEpoch;
    }
    if (epochMs == null && s['createdAt'] != null) {
      epochMs = DateTime.tryParse(s['createdAt'].toString())?.toLocal().millisecondsSinceEpoch;
    }
    if (epochMs == null && s['updated_at'] != null) {
      epochMs = DateTime.tryParse(s['updated_at'].toString())?.toLocal().millisecondsSinceEpoch;
    }
    if (epochMs == null && s['created_at'] != null) {
      epochMs = DateTime.tryParse(s['created_at'].toString())?.toLocal().millisecondsSinceEpoch;
    }

    if (epochMs != null && epochMs > 0 && epochMs < 10000000000) {
      epochMs *= 1000;
    }
    return (epochMs != null && epochMs > 0) ? epochMs : null;
  }

  /// Formats time of day according to device 24h vs 12h preferences.
  static String formatTimeOfDay(DateTime dt, {bool is24Hour = false}) {
    final local = dt.toLocal();
    final minute = local.minute.toString().padLeft(2, '0');
    if (is24Hour) {
      final hour = local.hour.toString().padLeft(2, '0');
      return '$hour:$minute';
    } else {
      final h = local.hour % 12 == 0 ? 12 : local.hour % 12;
      final period = local.hour >= 12 ? 'PM' : 'AM';
      return '$h:$minute $period';
    }
  }

  /// Formats any timestamp string (ISO8601, Epoch MS, or already-formatted time) into local device time.
  static String formatTimeString(String raw, {BuildContext? context, bool is24Hour = false}) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return '';

    // Check if it's an ISO8601 string
    final dt = DateTime.tryParse(trimmed);
    if (dt != null) {
      final bool device24Hour = context != null
          ? MediaQuery.alwaysUse24HourFormatOf(context)
          : is24Hour;
      return formatTimeOfDay(dt.toLocal(), is24Hour: device24Hour);
    }

    // Check if it's numeric epoch milliseconds
    final numVal = int.tryParse(trimmed);
    if (numVal != null && numVal > 0) {
      final epochMs = numVal < 10000000000 ? numVal * 1000 : numVal;
      final localDt = DateTime.fromMillisecondsSinceEpoch(epochMs).toLocal();
      final bool device24Hour = context != null
          ? MediaQuery.alwaysUse24HourFormatOf(context)
          : is24Hour;
      return formatTimeOfDay(localDt, is24Hour: device24Hour);
    }

    // Already formatted time string (e.g., "10:30 AM")
    return trimmed;
  }

  /// Formats last interaction time of a session, matching device timezone and format.
  /// [compact] is ideal for side drawer tiles, while standard is best for session cards.
  static String formatInteractionTime(
    Map<String, dynamic> session, {
    BuildContext? context,
    bool compact = false,
  }) {
    final epochMs = extractEpochMs(session);
    if (epochMs == null) {
      return 'No activity';
    }

    final localDt = DateTime.fromMillisecondsSinceEpoch(epochMs).toLocal();
    final now = DateTime.now();
    final diff = now.difference(localDt);

    final bool is24Hour = context != null
        ? MediaQuery.alwaysUse24HourFormatOf(context)
        : false;

    final timeStr = formatTimeOfDay(localDt, is24Hour: is24Hour);

    // Just now (< 1 min)
    if (diff.inSeconds >= 0 && diff.inMinutes < 1) {
      return compact ? 'Just now' : 'Just now ($timeStr)';
    }

    // Minutes ago (< 60 min)
    if (diff.inMinutes < 60) {
      return compact
          ? '${diff.inMinutes}m ago'
          : '${diff.inMinutes}m ago • $timeStr';
    }

    // Today
    final isToday = localDt.year == now.year &&
        localDt.month == now.month &&
        localDt.day == now.day;
    if (isToday) {
      return compact ? 'Today, $timeStr' : 'Today at $timeStr';
    }

    // Yesterday
    final yesterday = now.subtract(const Duration(days: 1));
    final isYesterday = localDt.year == yesterday.year &&
        localDt.month == yesterday.month &&
        localDt.day == yesterday.day;
    if (isYesterday) {
      return compact ? 'Y\'day, $timeStr' : 'Yesterday at $timeStr';
    }

    final monthStr = _months[localDt.month - 1];

    // Same year
    if (localDt.year == now.year) {
      return compact
          ? '$monthStr ${localDt.day}, $timeStr'
          : '$monthStr ${localDt.day} at $timeStr';
    }

    // Different year
    return compact
        ? '$monthStr ${localDt.day} \'${localDt.year.toString().substring(2)}'
        : '$monthStr ${localDt.day}, ${localDt.year} at $timeStr';
  }
}
