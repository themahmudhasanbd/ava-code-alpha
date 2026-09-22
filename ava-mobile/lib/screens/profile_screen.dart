import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';
import '../services/agent_core_service.dart';
import '../theme/app_theme.dart';
import '../utils/app_toast.dart';

class ProfileScreen extends StatefulWidget {
  final bool isDark;
  final Color cardBg;
  final Color borderColor;
  final Color textPrimary;
  final Color textSecondary;
  final AvaAgentCoreService agentCoreService;
  final VoidCallback? onBack;

  const ProfileScreen({
    super.key,
    required this.isDark,
    required this.cardBg,
    required this.borderColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.agentCoreService,
    this.onBack,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameCtrl;
  late TextEditingController _usernameCtrl;
  late TextEditingController _passwordCtrl;
  late TextEditingController _avatarCtrl;
  late TextEditingController _aiNameCtrl;
  late TextEditingController _aiRoleCtrl;
  late TextEditingController _personalityCtrl;
  late TextEditingController _characteristicsCtrl;

  // Preserved internal backend defaults (removed from UI as requested)
  String _customInstructions = '';
  int _maxTokens = 4096;

  bool _isLoading = true;
  bool _isSaving = false;
  bool _obscurePassword = true;
  String _currentAvatar = '';

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _usernameCtrl = TextEditingController();
    _passwordCtrl = TextEditingController();
    _avatarCtrl = TextEditingController();
    _aiNameCtrl = TextEditingController();
    _aiRoleCtrl = TextEditingController();
    _personalityCtrl = TextEditingController();
    _characteristicsCtrl = TextEditingController();

    _nameCtrl.addListener(_onLiveFieldChange);
    _usernameCtrl.addListener(_onLiveFieldChange);

    _loadProfile();
  }

  void _onLiveFieldChange() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _nameCtrl.removeListener(_onLiveFieldChange);
    _usernameCtrl.removeListener(_onLiveFieldChange);

    _nameCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _avatarCtrl.dispose();
    _aiNameCtrl.dispose();
    _aiRoleCtrl.dispose();
    _personalityCtrl.dispose();
    _characteristicsCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    final profile = await widget.agentCoreService.fetchUserProfile();
    if (profile != null) {
      _nameCtrl.text = profile.name;
      _usernameCtrl.text = profile.username;
      _passwordCtrl.text = profile.password ?? '';
      _currentAvatar = profile.avatar;
      _avatarCtrl.text = profile.avatar;
      _aiNameCtrl.text = profile.aiName;
      _aiRoleCtrl.text = profile.aiRole;
      _personalityCtrl.text = profile.personality;
      _characteristicsCtrl.text = profile.characteristics;
      _customInstructions = profile.customInstructions;
      _maxTokens = profile.maxTokens;
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final avatarToSave = _currentAvatar.isNotEmpty ? _currentAvatar : _avatarCtrl.text.trim();

    final updated = AvaUserProfile(
      name: _nameCtrl.text.trim(),
      username: _usernameCtrl.text.trim(),
      password: _passwordCtrl.text.trim(),
      avatar: avatarToSave,
      aiName: _aiNameCtrl.text.trim(),
      aiRole: _aiRoleCtrl.text.trim(),
      personality: _personalityCtrl.text.trim(),
      characteristics: _characteristicsCtrl.text.trim(),
      customInstructions: _customInstructions,
      maxTokens: _maxTokens,
    );

    final result = await widget.agentCoreService.updateUserProfile(updated);

    if (mounted) {
      setState(() => _isSaving = false);
      if (result != null) {
        if (result.avatar.isNotEmpty && result.avatar != _currentAvatar) {
          setState(() {
            _currentAvatar = result.avatar;
            _avatarCtrl.text = result.avatar;
          });
        }
        AppToast.success(context, 'Profile & persona saved successfully!');
      } else {
        AppToast.error(context, 'Failed to save profile. Check connection.');
      }
    }
  }

  Future<void> _pickAndUploadAvatarImage() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      );
      if (files.isNotEmpty) {
        final file = files.first;
        final bytes = await file.readAsBytes();
        if (bytes.isNotEmpty) {
          if (bytes.length > 5 * 1024 * 1024) {
            if (mounted) {
              AppToast.error(context, 'Image too large. Please choose an image under 5MB.');
            }
            return;
          }

          final fileName = file.name;
          final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : 'png';
          final mime = (ext == 'jpg' || ext == 'jpeg') ? 'image/jpeg' : (ext == 'webp' ? 'image/webp' : 'image/png');
          final base64Str = base64Encode(bytes);
          final dataUrl = 'data:$mime;base64,$base64Str';

          setState(() {
            _currentAvatar = dataUrl;
            _avatarCtrl.text = dataUrl;
          });

          final uploadedUrl = await widget.agentCoreService.uploadUserAvatar(dataUrl);
          if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
            setState(() {
              _currentAvatar = uploadedUrl;
              _avatarCtrl.text = uploadedUrl;
            });
          }

          if (mounted) {
            AppToast.success(context, 'Avatar image "$fileName" uploaded successfully!');
          }
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to pick/upload image: $e');
      }
    }
  }

  void _showAvatarOptionsModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: widget.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: widget.borderColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Change Profile Avatar',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: widget.textPrimary,
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.accentTeal.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(LucideIcons.image, color: AppTheme.accentTeal, size: 20),
                  ),
                  title: Text('Upload Image File', style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.w600)),
                  subtitle: Text('Choose a JPG, PNG, or WEBP image from device', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickAndUploadAvatarImage();
                  },
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.link, color: Color(0xFF6366F1), size: 20),
                  ),
                  title: Text('Enter Image URL / Data URL', style: TextStyle(color: widget.textPrimary, fontWeight: FontWeight.w600)),
                  subtitle: Text('Paste a direct web image link or base64 data string', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showAvatarUrlDialog();
                  },
                ),
                if (_currentAvatar.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 20),
                    ),
                    title: const Text('Remove Avatar', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
                    subtitle: Text('Reset to default avatar initials', style: TextStyle(color: widget.textSecondary, fontSize: 12)),
                    onTap: () async {
                      Navigator.pop(ctx);
                      setState(() {
                        _currentAvatar = '';
                        _avatarCtrl.text = '';
                      });
                      await widget.agentCoreService.uploadUserAvatar('');
                    },
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAvatarUrlDialog() {
    final ctrl = TextEditingController(text: _currentAvatar);
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: widget.cardBg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: widget.borderColor),
          ),
          title: Text(
            'Profile Avatar Image URL',
            style: TextStyle(color: widget.textPrimary, fontSize: 17, fontWeight: FontWeight.w700),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Enter an HTTPS image link or base64 data URL for your user avatar:',
                style: TextStyle(color: widget.textSecondary, fontSize: 12.5),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                maxLines: 3,
                style: TextStyle(color: widget.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'https://example.com/avatar.png',
                  hintStyle: TextStyle(color: widget.textSecondary.withValues(alpha: 0.5)),
                  filled: true,
                  fillColor: widget.isDark ? const Color(0xFF111114) : Colors.grey.shade100,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: widget.borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: AppTheme.accentTeal, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: widget.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentTeal,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                final newAvatar = ctrl.text.trim();
                Navigator.pop(ctx);
                if (newAvatar.isNotEmpty) {
                  setState(() {
                    _currentAvatar = newAvatar;
                    _avatarCtrl.text = newAvatar;
                  });
                  final uploadedUrl = await widget.agentCoreService.uploadUserAvatar(newAvatar);
                  if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
                    setState(() {
                      _currentAvatar = uploadedUrl;
                      _avatarCtrl.text = uploadedUrl;
                    });
                  }
                }
              },
              child: const Text('Save Avatar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAvatarWidget() {
    final avatar = _currentAvatar.trim();
    Widget avatarChild;

    if (avatar.startsWith('data:') && avatar.contains(';base64,')) {
      try {
        final base64Str = avatar.split(',').last;
        final bytes = base64Decode(base64Str);
        avatarChild = Image.memory(
          bytes,
          key: ValueKey(avatar.hashCode),
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => _buildFallbackIcon(),
        );
      } catch (_) {
        avatarChild = _buildFallbackIcon();
      }
    } else if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      avatarChild = Image.network(
        avatar,
        key: ValueKey(avatar),
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildFallbackIcon(),
      );
    } else if (avatar.startsWith('/')) {
      final fullUrl = '${widget.agentCoreService.baseUrl}$avatar';
      avatarChild = Image.network(
        fullUrl,
        key: ValueKey(fullUrl),
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildFallbackIcon(),
      );
    } else {
      avatarChild = _buildFallbackIcon();
    }

    return GestureDetector(
      onTap: _showAvatarOptionsModal,
      child: Stack(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.cardBg,
              border: Border.all(color: AppTheme.accentTeal, width: 2.2),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.accentTeal.withValues(alpha: 0.22),
                  blurRadius: 14,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: ClipOval(child: avatarChild),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.accentTeal,
                boxShadow: const [
                  BoxShadow(color: Colors.black38, blurRadius: 4),
                ],
              ),
              child: const Icon(LucideIcons.camera, size: 12, color: Colors.black),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackIcon() {
    final initial = _nameCtrl.text.trim().isNotEmpty ? _nameCtrl.text.trim()[0].toUpperCase() : 'U';
    return Container(
      color: AppTheme.accentTeal.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: AppTheme.accentTeal,
            fontSize: 30,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryHeader(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: widget.textSecondary.withValues(alpha: 0.8),
        letterSpacing: 0.6,
      ),
    );
  }

  Widget _buildContainer(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.borderColor, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildInputFieldTile({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    bool obscureText = false,
    Widget? suffix,
    String? Function(String?)? validator,
    Color? iconColor,
  }) {
    final effectiveColor = iconColor ?? AppTheme.accentTeal;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(
        crossAxisAlignment: maxLines > 1 ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: effectiveColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: effectiveColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: widget.textSecondary.withValues(alpha: 0.8),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                TextFormField(
                  controller: controller,
                  maxLines: maxLines,
                  obscureText: obscureText,
                  validator: validator,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: widget.textPrimary,
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.only(top: 2, bottom: maxLines > 1 ? 4 : 2),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    focusedErrorBorder: InputBorder.none,
                    hintText: hint,
                    hintStyle: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.normal,
                      color: widget.textSecondary.withValues(alpha: 0.45),
                    ),
                    suffixIcon: suffix,
                    suffixIconConstraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Clean & Minimal Hero Profile Card ──────────────────────────────────────
  Widget _buildHeroProfileCard() {
    final name = _nameCtrl.text.trim().isNotEmpty ? _nameCtrl.text.trim() : 'User Profile';
    final username = _usernameCtrl.text.trim().isNotEmpty ? _usernameCtrl.text.trim() : 'ava';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: widget.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: widget.borderColor, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: widget.isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _buildAvatarWidget(),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: widget.textPrimary,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '@$username',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: widget.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.6)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickAndUploadAvatarImage,
                  icon: const Icon(LucideIcons.uploadCloud, size: 13),
                  label: const Text('Upload File', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: widget.textPrimary,
                    side: BorderSide(color: widget.borderColor),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showAvatarUrlDialog,
                  icon: const Icon(LucideIcons.link, size: 13),
                  label: const Text('Image URL', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: widget.textPrimary,
                    side: BorderSide(color: widget.borderColor),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              if (_currentAvatar.isNotEmpty) ...[
                const SizedBox(width: 8),
                InkWell(
                  onTap: () async {
                    setState(() {
                      _currentAvatar = '';
                      _avatarCtrl.text = '';
                    });
                    await widget.agentCoreService.uploadUserAvatar('');
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.redAccent.withValues(alpha: 0.2)),
                    ),
                    child: const Icon(LucideIcons.trash2, size: 14, color: Colors.redAccent),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      child: RefreshIndicator(
        onRefresh: _loadProfile,
        color: AppTheme.accentTeal,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row (Matching SettingsScreen & ModelsScreen)
                Row(
                  children: [
                    if (widget.onBack != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: IconButton(
                          icon: Icon(LucideIcons.arrowLeft, size: 18, color: widget.textPrimary),
                          onPressed: widget.onBack,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        ),
                      ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Profile & AI Persona',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: widget.textPrimary,
                              letterSpacing: -0.4,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'User credentials and autonomous assistant persona',
                            style: TextStyle(fontSize: 12, color: widget.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    if (_isLoading)
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentTeal),
                      )
                    else
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentTeal,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        onPressed: _isSaving ? null : _saveProfile,
                        icon: _isSaving
                            ? const SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                              )
                            : const Icon(LucideIcons.check, size: 13, color: Colors.black),
                        label: Text(
                          _isSaving ? 'Saving' : 'Save',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),

                // Clean Hero Profile Card
                _buildHeroProfileCard(),
                const SizedBox(height: 20),

                // ── Section 1: User Account & Credentials ─────────────────────
                _buildCategoryHeader('USER ACCOUNT & CREDENTIALS'),
                const SizedBox(height: 8),
                _buildContainer([
                  _buildInputFieldTile(
                    label: 'Full Name',
                    controller: _nameCtrl,
                    hint: 'Mahmud Hasan',
                    icon: LucideIcons.user,
                    iconColor: AppTheme.accentTeal,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Full name is required' : null,
                  ),
                  Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
                  _buildInputFieldTile(
                    label: 'Server Username',
                    controller: _usernameCtrl,
                    hint: 'ava',
                    icon: LucideIcons.atSign,
                    iconColor: const Color(0xFF6366F1),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Username is required' : null,
                  ),
                  Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
                  _buildInputFieldTile(
                    label: 'Server Auth Password',
                    controller: _passwordCtrl,
                    hint: 'Dynamic VPS Password',
                    icon: LucideIcons.keyRound,
                    iconColor: const Color(0xFFF59E0B),
                    obscureText: _obscurePassword,
                    suffix: IconButton(
                      icon: Icon(
                        _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                        size: 16,
                        color: widget.textSecondary,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Password is required' : null,
                  ),
                ]),
                const SizedBox(height: 20),

                // ── Section 2: AI Assistant Persona & Traits ──────────────────
                _buildCategoryHeader('AI ASSISTANT PERSONA & TRAITS'),
                const SizedBox(height: 8),
                _buildContainer([
                  _buildInputFieldTile(
                    label: 'AI Assistant Name',
                    controller: _aiNameCtrl,
                    hint: 'AvA',
                    icon: LucideIcons.sparkles,
                    iconColor: const Color(0xFFA855F7),
                  ),
                  Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
                  _buildInputFieldTile(
                    label: 'Specialization & Role',
                    controller: _aiRoleCtrl,
                    hint: 'Senior AI Software Engineer',
                    icon: LucideIcons.briefcase,
                    iconColor: const Color(0xFF3B82F6),
                  ),
                  Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
                  _buildInputFieldTile(
                    label: 'Core Personality & Tone',
                    controller: _personalityCtrl,
                    hint: 'Helpful, precise, proactive, and efficient',
                    icon: LucideIcons.smile,
                    iconColor: const Color(0xFF10B981),
                    maxLines: 2,
                  ),
                  Divider(height: 1, color: widget.borderColor.withValues(alpha: 0.5)),
                  _buildInputFieldTile(
                    label: 'Engineering Rules & Characteristics',
                    controller: _characteristicsCtrl,
                    hint: 'Clean modular code, zero UI emojis, end-to-end verification',
                    icon: LucideIcons.code,
                    iconColor: const Color(0xFFEC4899),
                    maxLines: 3,
                  ),
                ]),
                const SizedBox(height: 24),

                // Prominent Full-Width Bottom Save Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentTeal,
                      foregroundColor: Colors.black,
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _isSaving ? null : _saveProfile,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                          )
                        : const Icon(LucideIcons.checkCheck, size: 16, color: Colors.black),
                    label: Text(
                      _isSaving ? 'Saving Profile & Persona...' : 'Save Profile & Persona',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
