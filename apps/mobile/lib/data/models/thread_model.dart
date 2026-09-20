/// Represents a persistent conversation thread
class ThreadModel {
  final String id;
  final String title;
  final String workingDirectory;
  final String model;
  final String provider;
  final DateTime updatedAt;
  final int turnCount;

  ThreadModel({
    required this.id,
    required this.title,
    required this.workingDirectory,
    required this.model,
    required this.provider,
    required this.updatedAt,
    this.turnCount = 0,
  });

  factory ThreadModel.fromJson(Map<String, dynamic> json) {
    return ThreadModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Session',
      workingDirectory: json['workingDirectory'] as String? ?? '/var/www',
      model: json['model'] as String? ?? 'gemini-3.7-flash-tiered',
      provider: json['provider'] as String? ?? 'antigravity',
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      turnCount: json['turnCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'workingDirectory': workingDirectory,
        'model': model,
        'provider': provider,
        'updatedAt': updatedAt.toIso8601String(),
        'turnCount': turnCount,
      };
}
