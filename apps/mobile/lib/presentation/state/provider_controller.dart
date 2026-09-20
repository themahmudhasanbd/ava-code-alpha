import 'package:flutter/foundation.dart';
import '../../data/models/provider_model.dart';

/// Manages AI Model Providers, active model selection, and Antigravity OAuth status
class ProviderController extends ChangeNotifier {
  final List<ProviderModel> _providers = List.from(ProviderModel.builtInPresets);
  String _activeProviderId = 'antigravity';
  String _activeModelId = 'gemini-3.7-flash-tiered';

  List<ProviderModel> get providers => List.unmodifiable(_providers);
  String get activeProviderId => _activeProviderId;
  String get activeModelId => _activeModelId;

  ProviderModel get activeProvider =>
      _providers.firstWhere((p) => p.id == _activeProviderId, orElse: () => _providers.first);

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
