// Modular AvaAgentCoreService composing specialized agent_core domain mixins.
import 'agent_core/agent_core_base.dart';
import 'agent_core/agent_core_auth.dart';
import 'agent_core/agent_core_workspace.dart';
import 'agent_core/agent_core_models.dart';
import 'agent_core/agent_core_sessions.dart';
import 'agent_core/agent_core_streaming.dart';
import 'agent_core/agent_core_system.dart';

export 'agent_core/agent_core_base.dart';
export 'agent_core/agent_core_auth.dart';
export 'agent_core/agent_core_workspace.dart';
export 'agent_core/agent_core_models.dart';
export 'agent_core/agent_core_sessions.dart';
export 'agent_core/agent_core_streaming.dart';
export 'agent_core/agent_core_system.dart';

/// Core client service communicating with AvA backend.
/// Composes clean, domain-specific mixins on top of [AgentCoreBase].
class AvaAgentCoreService extends AgentCoreBase
    with
        AgentCoreAuthMixin,
        AgentCoreWorkspaceMixin,
        AgentCoreModelsMixin,
        AgentCoreSessionsMixin,
        AgentCoreStreamingMixin,
        AgentCoreSystemMixin {
  AvaAgentCoreService({
    required super.baseUrl,
    required super.workspacePath,
    super.initialAuthToken,
  });

  static List<String> get debugLogs => AgentCoreBase.debugLogs;
  static void addDebugLog(String msg) => AgentCoreBase.addDebugLog(msg);
  static String normalizeProviderId(String? provider, String? modelId) =>
      AgentCoreBase.normalizeProviderId(provider, modelId);
  static String normalizeModelId(String? modelId, {String? provider}) =>
      AgentCoreBase.normalizeModelId(modelId, provider: provider);
  static String normalizeEventType(String rawType) =>
      AgentCoreBase.normalizeEventType(rawType);
  static final defaultModelList = AgentCoreModelsMixin.defaultModelList;
}
