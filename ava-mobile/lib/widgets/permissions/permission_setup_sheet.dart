import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../services/native_agent_service.dart';
import '../../utils/app_toast.dart';

/// Modal bottom sheet or dialog to guide users through enabling
/// essential Android system permissions (Notifications, Microphone, Battery Optimization).
class PermissionSetupSheet extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;

  const PermissionSetupSheet({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
  });

  static Future<void> show(
    BuildContext context, {
    required bool isDark,
    required Color cardBg,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PermissionSetupSheet(
        isDark: isDark,
        cardBg: cardBg,
        borderColor: borderColor,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
      ),
    );
  }

  @override
  State<PermissionSetupSheet> createState() => _PermissionSetupSheetState();
}

class _PermissionSetupSheetState extends State<PermissionSetupSheet> {
  bool _isLoading = true;
  bool _notificationsGranted = false;
  bool _microphoneGranted = false;
  bool _batteryOptimizationIgnored = false;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    setState(() => _isLoading = true);
    final perms = await NativeAgentService.instance.checkPermissions();
    if (mounted) {
      setState(() {
        _notificationsGranted = perms['notifications'] == true;
        _microphoneGranted = perms['microphone'] == true;
        _batteryOptimizationIgnored = perms['batteryOptimizationIgnored'] == true;
        _isLoading = false;
      });
    }
  }

  Future<void> _requestRuntimePermissions() async {
    await NativeAgentService.instance.requestPermissions();
    await _checkPermissions();
  }

  Future<void> _requestBatteryOptimization() async {
    await NativeAgentService.instance.requestIgnoreBatteryOptimizations();
    await _checkPermissions();
  }

  Future<void> _grantAll() async {
    await NativeAgentService.instance.requestPermissions();
    if (!_batteryOptimizationIgnored) {
      await NativeAgentService.instance.requestIgnoreBatteryOptimizations();
    }
    await _checkPermissions();
    if (mounted) {
      AppToast.show(context, 'Permissions updated successfully');
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool allGranted =
        _notificationsGranted && _microphoneGranted && _batteryOptimizationIgnored;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: BoxDecoration(
        color: widget.isDark ? const Color(0xFF141419) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: widget.borderColor, width: 1),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: widget.textSecondary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    LucideIcons.shieldCheck,
                    size: 24,
                    color: Color(0xFF3B82F6),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Device Permissions & Engine Stability',
                        style: TextStyle(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w700,
                          color: widget.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Enable background tasks, voice input & live alerts',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: widget.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            if (_isLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                ),
              )
            else ...[
              // Permission Card 1: Notifications
              _buildPermissionTile(
                icon: LucideIcons.bell,
                title: 'Push & Foreground Notifications',
                subtitle: 'Live turn chronometer, task alerts & completion sounds',
                isGranted: _notificationsGranted,
                onTap: _requestRuntimePermissions,
              ),
              const SizedBox(height: 10),

              // Permission Card 2: Microphone
              _buildPermissionTile(
                icon: LucideIcons.mic,
                title: 'Microphone & Voice Prompts',
                subtitle: 'Hands-free voice transcription and audio recording',
                isGranted: _microphoneGranted,
                onTap: _requestRuntimePermissions,
              ),
              const SizedBox(height: 10),

              // Permission Card 3: Unrestricted Background / Battery
              _buildPermissionTile(
                icon: LucideIcons.zap,
                title: 'Unrestricted Background Execution',
                subtitle: 'Prevents Android OS from killing active agent jobs & VPS sync',
                isGranted: _batteryOptimizationIgnored,
                onTap: _requestBatteryOptimization,
              ),
              const SizedBox(height: 20),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => NativeAgentService.instance.openAppSettings(),
                      icon: const Icon(LucideIcons.settings, size: 16),
                      label: const Text('App Settings'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: widget.textSecondary,
                        side: BorderSide(color: widget.borderColor),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: allGranted ? () => Navigator.pop(context) : _grantAll,
                      icon: Icon(
                        allGranted ? LucideIcons.check : LucideIcons.shieldCheck,
                        size: 18,
                        color: Colors.white,
                      ),
                      label: Text(
                        allGranted ? 'Done' : 'Enable All Permissions',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isGranted,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: isGranted ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: widget.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isGranted
                ? const Color(0xFF10B981).withValues(alpha: 0.3)
                : widget.borderColor,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isGranted
                    ? const Color(0xFF10B981).withValues(alpha: 0.12)
                    : widget.textSecondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isGranted ? const Color(0xFF10B981) : widget.textSecondary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: widget.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: widget.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (isGranted)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.check, size: 13, color: Color(0xFF10B981)),
                    SizedBox(width: 4),
                    Text(
                      'Enabled',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF10B981),
                      ),
                    ),
                  ],
                ),
              )
            else
              TextButton(
                onPressed: onTap,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Allow',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF3B82F6),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
