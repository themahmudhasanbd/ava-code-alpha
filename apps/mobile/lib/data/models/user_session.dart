/// Represents an authenticated user session in AvA Code Alpha
class UserSession {
  final String username;
  final String token;
  final DateTime authenticatedAt;
  final bool isBiometricEnabled;

  UserSession({
    required this.username,
    required this.token,
    required this.authenticatedAt,
    this.isBiometricEnabled = false,
  });

  Map<String, dynamic> toJson() => {
        'username': username,
        'token': token,
        'authenticatedAt': authenticatedAt.toIso8601String(),
        'isBiometricEnabled': isBiometricEnabled,
      };

  factory UserSession.fromJson(Map<String, dynamic> json) => UserSession(
        username: json['username'] as String,
        token: json['token'] as String,
        authenticatedAt: DateTime.parse(json['authenticatedAt'] as String),
        isBiometricEnabled: json['isBiometricEnabled'] as bool? ?? false,
      );
}
