import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../core/network/json_rpc_client.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../data/models/provider_model.dart';

/// Manages AI model providers, active model selection, persistent storage, and dynamic model discovery
class ProviderController extends ChangeNotifier {
  final JsonRpcClient? _rpcClient;
  final SecureStorageService? _storage;
  final List<ProviderModel> _providers = List.from(ProviderModel.builtInPresets);
  String _activeProviderId = 'antigravity';
  String _activeModelId = 'gemini-3.7-flash';
  bool _isLoadingModels = false;
  String? _loadError;

  List<ProviderModel> get providers => List.unmodifiable(_providers);
  String get activeProviderId => _activeProviderId;
  String get activeModelId => _activeModelId;
  bool get isLoadingModels => _isLoadingModels;
  String? get loadError => _loadError;

  ProviderModel get activeProvider =>
      _providers.firstWhere((p) => p.id == _activeProviderId, orElse: () => _providers.first);

  ProviderController({
    JsonRpcClient? rpcClient,
    SecureStorageService? storage,
  })  : _rpcClient = rpcClient,
        _storage = storage;

  Future<void> init() async {
    if (_storage != null) {
      final savedProvider = await _storage!.getActiveProvider();
      final savedModel = await _storage!.getActiveModel();

      if (savedProvider != null && savedProvider.isNotEmpty) {
        _activeProviderId = savedProvider;
      }
      if (savedModel != null && savedModel.isNotEmpty) {
        _activeModelId = savedModel;
      }
    }
    await loadProvidersFromApi();
    notifyListeners();
  }

  /// Add or update a custom provider dynamically
  void addCustomProvider(ProviderModel provider) {
    final idx = _providers.indexWhere((p) => p.id == provider.id);
    if (idx >= 0) {
      _providers[idx] = provider;
    } else {
      _providers.add(provider);
    }
    _activeProviderId = provider.id;
    if (provider.models.isNotEmpty) {
      _activeModelId = provider.models.first;
      _storage?.saveActiveModel(provider: _activeProviderId, model: _activeModelId);
    }
    notifyListeners();
  }

  /// Load providers from the AvA app server
  Future<void> loadProvidersFromApi() async {
    final rpc = _rpcClient;
    if (rpc == null) return;
    try {
      final list = await rpc.getProviders();
      if (list != null && list.isNotEmpty) {
        for (final item in list) {
          if (item is Map<String, dynamic>) {
            final idx = _providers.indexWhere((p) => p.id == item['id']);
            final updated = ProviderModel(
              id: item['id'] as String,
              name: item['name'] as String,
              description: item['description'] as String? ?? '',
              assetIcon: 'assets/providers/${item['id']}.png',
              isConnected: item['isConnected'] == true,
              models: (item['models'] as List<dynamic>? ?? []).cast<String>(),
            );
            if (idx >= 0) {
              _providers[idx] = updated;
            } else {
              _providers.add(updated);
            }
          }
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Connect a provider: set API key + base URL, then fetch its model list dynamically
  Future<bool> connectProvider({
    required String providerId,
    required String apiKey,
    String? customBaseUrl,
  }) async {
    _isLoadingModels = true;
    _loadError = null;
    notifyListeners();

    final idx = _providers.indexWhere((p) => p.id == providerId);
    if (idx < 0) {
      _isLoadingModels = false;
      _loadError = 'Provider "$providerId" not found.';
      notifyListeners();
      return false;
    }

    final provider = _providers[idx];
    final baseUrl = customBaseUrl?.isNotEmpty == true ? customBaseUrl! : provider.baseUrl;

    final models = await _fetchModels(baseUrl: baseUrl, apiKey: apiKey);
    _providers[idx] = provider.copyWith(
      isConnected: models != null && models.isNotEmpty,
      models: models ?? [],
      apiKey: apiKey,
      baseUrl: customBaseUrl,
    );

    if (models != null && models.isNotEmpty) {
      _activeProviderId = providerId;
      _activeModelId = models.first;
      await _storage?.saveActiveModel(provider: _activeProviderId, model: _activeModelId);
    } else {
      _loadError = 'Could not load models from $baseUrl. Check the API key or endpoint.';
    }

    _isLoadingModels = false;
    notifyListeners();
    return models != null && models.isNotEmpty;
  }

  /// Fetch model list from an OpenAI-compatible /models endpoint
  Future<List<String>?> _fetchModels({required String baseUrl, required String apiKey}) async {
    try {
      final cleanBase = baseUrl.replaceAll(RegExp(r'/+$'), '');
      final uri = Uri.parse(cleanBase.endsWith('/v1') ? '$cleanBase/models' : '$cleanBase/v1/models');
      final res = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $apiKey',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final data = json['data'] as List<dynamic>?;
        if (data != null) {
          return data
              .whereType<Map<String, dynamic>>()
              .map((m) => m['id'] as String? ?? '')
              .where((id) => id.isNotEmpty)
              .toList();
        }
      }
    } catch (_) {}
    return null;
  }

  void setModel(String modelId, [String? providerId]) {
    _activeModelId = modelId;
    if (providerId != null) _activeProviderId = providerId;
    _storage?.saveActiveModel(provider: _activeProviderId, model: _activeModelId);

    // Sync with App Server if available
    _rpcClient?.call('config/set', {
      'provider': _activeProviderId,
      'model': _activeModelId,
    });

    notifyListeners();
  }

  void setProvider(String providerId) {
    _activeProviderId = providerId;
    final provider = activeProvider;
    if (provider.models.isNotEmpty) {
      _activeModelId = provider.models.first;
    } else {
      _activeModelId = '';
    }
    _storage?.saveActiveModel(provider: _activeProviderId, model: _activeModelId);
    notifyListeners();
  }
}
