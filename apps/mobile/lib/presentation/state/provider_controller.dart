import 'package:flutter/foundation.dart';
import '../../core/network/json_rpc_client.dart';
import '../../data/models/provider_model.dart';

/// Manages AI Model Providers, active model selection, and Antigravity OAuth status
class ProviderController extends ChangeNotifier {
  final JsonRpcClient? _rpcClient;
  final List<ProviderModel> _providers = List.from(ProviderModel.builtInPresets);
  String _activeProviderId = 'antigravity';
  String _activeModelId = 'gemini-3.7-flash-tiered';

  List<ProviderModel> get providers => List.unmodifiable(_providers);
  String get activeProviderId => _activeProviderId;
  String get activeModelId => _activeModelId;

  ProviderModel get activeProvider =>
      _providers.firstWhere((p) => p.id == _activeProviderId, orElse: () => _providers.first);

  ProviderController({JsonRpcClient? rpcClient}) : _rpcClient = rpcClient;

  Future<void> loadProvidersFromApi() async {
    final rpc = _rpcClient;
    if (rpc == null) return;
    try {
      final list = await rpc.getProviders();
      if (list != null && list.isNotEmpty) {
        _providers.clear();
        for (final item in list) {
          if (item is Map<String, dynamic>) {
            _providers.add(
              ProviderModel(
                id: item['id'] as String,
                name: item['name'] as String,
                description: item['description'] as String? ?? '',
                assetIcon: 'assets/providers/${item['id']}.png',
                isConnected: item['isConnected'] == true,
                models: (item['models'] as List<dynamic>? ?? []).cast<String>(),
              ),
            );
          }
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  void setModel(String modelId, [String? providerId]) {
    _activeModelId = modelId;
    if (providerId != null) {
      _activeProviderId = providerId;
    }
    notifyListeners();
  }

  void setProvider(String providerId) {
    _activeProviderId = providerId;
    final provider = activeProvider;
    if (provider.models.isNotEmpty) {
      _activeModelId = provider.models.first;
    }
    notifyListeners();
  }
}
