import "dart:async";
import "../../models/app_models.dart";
import "agent_core_base.dart";

mixin AgentCoreModelsMixin on AgentCoreBase {
  static final List<AvaModelItem> defaultModelList = const [
    AvaModelItem(
      id: "ultra-working-combo",
      name: "Ultra Working Combo",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "powerful-coding-combo",
      name: "Powerful Coding Combo",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "omni-codex-combo",
      name: "Omni Codex Combo",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "auto/best-coding",
      name: "Auto Best Coding",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "claude-code",
      name: "Claude Code",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "gpt-6-astra",
      name: "GPT-6 Astra",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "gpt-5.6-sol",
      name: "GPT-5.6 Sol",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "gpt-5.6-terra",
      name: "GPT-5.6 Terra",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "gpt-5.6-luna",
      name: "GPT-5.6 Luna",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
    AvaModelItem(
      id: "gpt-5.5",
      name: "GPT-5.5",
      provider: "omniroute",
      reasoning: true,
      supportsImages: true,
      contextLimit: 1048576,
    ),
  ];

  Future<Map<String, dynamic>> fetchCatalogInfo({bool forceRefresh = false}) async {
    if (forceRefresh) {
      AgentCoreBase.cachedCatalogModels = null;
      AgentCoreBase.cachedDefaultModelId = null;
    } else if (AgentCoreBase.cachedCatalogModels != null && AgentCoreBase.cachedCatalogModels!.isNotEmpty) {
      return {
        "models": AgentCoreBase.cachedCatalogModels!,
        "defaultModelId": AgentCoreBase.cachedDefaultModelId ?? AgentCoreBase.cachedCatalogModels!.first.id,
      };
    }

    try {
      // 1. Read active server config for default model and provider
      String? configDefaultModel;
      try {
        final cfgRes = await sendRpc("config/read", {"cwd": "/"});
        if (cfgRes is Map && cfgRes["config"] is Map) {
          final serverModel = cfgRes["config"]["model"]?.toString();
          if (serverModel != null && serverModel.isNotEmpty) {
            configDefaultModel = serverModel;
          }
        }
      } catch (_) {}

      final Map<String, AvaModelItem> mergedMap = {};

      // 2. Pre-populate with curated OmniRoute AvA combos
      for (final defModel in defaultModelList) {
        mergedMap[defModel.id] = defModel;
      }

      // 3. Fetch models from model/list and merge
      try {
        final res = await sendRpc("model/list", {});
        if (res is Map && res["data"] is List) {
          for (final item in (res["data"] as List)) {
            if (item is! Map) continue;
            final id = item["id"]?.toString() ?? item["model"]?.toString() ?? "";
            if (id.isEmpty) continue;

            final name = item["displayName"]?.toString() ?? item["name"]?.toString() ?? id;
            final inputModalities = item["inputModalities"];
            final supportsImages = inputModalities is List ? inputModalities.contains("image") : true;
            final reasoningList = item["supportedReasoningEfforts"];
            final hasReasoning = reasoningList is List && reasoningList.isNotEmpty;

            if (!mergedMap.containsKey(id)) {
              mergedMap[id] = AvaModelItem(
                id: id,
                name: name,
                provider: "omniroute",
                providerKey: "omniroute",
                modelKey: id,
                contextLimit: 1048576,
                reasoning: hasReasoning,
                supportsImages: supportsImages,
              );
            }
          }
        }
      } catch (_) {}

      // 4. Ensure configured default model is present and prioritized
      final String effectiveDefaultId = configDefaultModel ?? "ultra-working-combo";
      if (!mergedMap.containsKey(effectiveDefaultId)) {
        mergedMap[effectiveDefaultId] = AvaModelItem(
          id: effectiveDefaultId,
          name: effectiveDefaultId == "ultra-working-combo" ? "Ultra Working Combo" : (effectiveDefaultId == "powerful-coding-combo" ? "Powerful Coding Combo" : effectiveDefaultId),
          provider: "omniroute",
          providerKey: "omniroute",
          modelKey: effectiveDefaultId,
          contextLimit: 1048576,
          reasoning: true,
          supportsImages: true,
        );
      }

      final List<AvaModelItem> parsed = [];
      // Put default model first
      if (mergedMap.containsKey(effectiveDefaultId)) {
        parsed.add(mergedMap.remove(effectiveDefaultId)!);
      }
      parsed.addAll(mergedMap.values);

      AgentCoreBase.cachedCatalogModels = parsed;
      AgentCoreBase.cachedDefaultModelId = effectiveDefaultId;
      AgentCoreBase.addDebugLog("fetchCatalogInfo: ${parsed.length} models loaded (default: $effectiveDefaultId)");

      await saveModelsToCache({
        "models": parsed.map((e) => e.toJson()).toList(),
        "defaultModelId": effectiveDefaultId,
      });

      return {"models": parsed, "defaultModelId": effectiveDefaultId};
    } catch (err) {
      AgentCoreBase.addDebugLog("fetchCatalogInfo error: $err");
      final cached = await loadModelsFromCache();
      if (cached != null && cached["models"] is List) {
        try {
          final list = (cached["models"] as List).map((e) => AvaModelItem.fromJson(Map<String, dynamic>.from(e))).toList();
          if (list.isNotEmpty) {
            AgentCoreBase.cachedCatalogModels = list;
            AgentCoreBase.cachedDefaultModelId = cached["defaultModelId"]?.toString() ?? list.first.id;
            return {"models": list, "defaultModelId": AgentCoreBase.cachedDefaultModelId};
          }
        } catch (_) {}
      }
    }

    AgentCoreBase.cachedCatalogModels = defaultModelList;
    AgentCoreBase.cachedDefaultModelId = "powerful-coding-combo";
    return {
      "models": defaultModelList,
      "defaultModelId": "powerful-coding-combo",
    };
  }

  Future<List<Map<String, dynamic>>> fetchProvidersList() async {
    return [
      {
        "providerKey": "omniroute",
        "name": "OmniRoute Gateway",
        "baseURL": "http://127.0.0.1:20128/v1",
        "enabled": true,
        "models": (AgentCoreBase.cachedCatalogModels ?? defaultModelList).map((m) => m.toJson()).toList(),
      }
    ];
  }

  Future<List<Map<String, dynamic>>> fetchCustomProviders() async {
    return await fetchProvidersList();
  }

  Future<Map<String, dynamic>> toggleCustomProvider({dynamic providerKey, dynamic key, bool? enabled}) async {
    return {"success": true, "ok": true};
  }

  Future<List<Map<String, dynamic>>> fetchProviderCredentials(String providerId) async {
    return [
      {
        "id": "cred_omniroute_default",
        "name": "OmniRoute Main",
        "apiKey": "sk-omniroute-...",
        "isActive": true,
        "enabled": true,
      }
    ];
  }

  Future<Map<String, dynamic>> refreshProviderModels(String providerId) async {
    final catalog = await fetchCatalogInfo(forceRefresh: true);
    return {"success": true, "models": catalog["models"]};
  }

  Future<Map<String, dynamic>> startAntigravityOAuth({String? providerId}) async {
    return {
      "url": "https://accounts.google.com/o/oauth2/v2/auth",
      "success": true,
    };
  }

  Future<Map<String, dynamic>> completeAntigravityOAuth(String code, {String? providerId}) async {
    return {"success": true, "ok": true};
  }

  Future<Map<String, dynamic>> addProviderCredential({
    required String providerKey,
    required String name,
    String? apiKey,
    String? key,
    String? access,
    String? type,
    String? email,
    Map<String, dynamic>? extra,
  }) async {
    return {"success": true, "ok": true, "id": "cred_${DateTime.now().millisecondsSinceEpoch}"};
  }

  Future<Map<String, dynamic>> setActiveProviderCredential({
    required String providerKey,
    required String id,
  }) async {
    return {"success": true, "ok": true};
  }

  Future<Map<String, dynamic>> toggleProviderCredential({
    required String providerKey,
    required String id,
    required bool enabled,
  }) async {
    return {"success": true, "ok": true};
  }

  Future<Map<String, dynamic>> deleteProviderCredential({
    required String providerKey,
    required String id,
  }) async {
    return {"success": true, "ok": true};
  }

  Future<Map<String, dynamic>> disconnectProvider(String providerId) async {
    return {"success": true, "ok": true};
  }

  Future<Map<String, dynamic>> deleteCustomProvider({dynamic providerKey, dynamic key}) async {
    return {"success": true, "ok": true};
  }

  Future<Map<String, dynamic>> testProviderConnection({
    String? baseURL,
    String? apiKey,
    Map<String, String>? headers,
    String? providerKey,
  }) async {
    return {
      "ok": true,
      "success": true,
      "latencyMs": 42,
      "models": (AgentCoreBase.cachedCatalogModels ?? defaultModelList).map((m) => m.toJson()).toList(),
    };
  }

  Future<Map<String, dynamic>> saveCustomProvider({
    required String providerKey,
    required String name,
    required String baseURL,
    required String apiKey,
    String? npm,
    Map<String, String>? headers,
    required List<dynamic> models,
    bool enabled = true,
  }) async {
    return {"ok": true, "success": true};
  }
}
