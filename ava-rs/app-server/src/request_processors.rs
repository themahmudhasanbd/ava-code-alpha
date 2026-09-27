use crate::bespoke_event_handling::apply_bespoke_event_handling;
use crate::command_exec::CommandExecManager;
use crate::command_exec::StartCommandExecParams;
use crate::config_manager::ConfigManager;
use crate::error_code::INPUT_TOO_LARGE_ERROR_CODE;
use crate::error_code::invalid_params;
use crate::models::supported_models;
use crate::outgoing_message::ConnectionId;
use crate::outgoing_message::ConnectionRequestId;
use crate::outgoing_message::OutgoingMessageSender;
use crate::outgoing_message::RequestContext;
use crate::outgoing_message::ThreadScopedOutgoingMessageSender;
use crate::skills_watcher::SkillsWatcher;
use crate::thread_status::ThreadWatchManager;
use crate::thread_status::resolve_thread_status;
use chrono::Duration as ChronoDuration;
use chrono::SecondsFormat;
use ava_analytics::AnalyticsEventsClient;
use ava_analytics::AnalyticsJsonRpcError;
use ava_analytics::InputError;
use ava_analytics::TurnSteerRequestError;
use ava_app_server_protocol::Account;
use ava_app_server_protocol::AccountLoginCompletedNotification;
use ava_app_server_protocol::AccountTokenUsageDailyBucket;
use ava_app_server_protocol::AccountTokenUsageSummary;
use ava_app_server_protocol::AccountUpdatedNotification;
use ava_app_server_protocol::AddCreditsNudgeCreditType;
use ava_app_server_protocol::AddCreditsNudgeEmailStatus;
use ava_app_server_protocol::AdditionalContextEntry;
use ava_app_server_protocol::AdditionalContextKind;
use ava_app_server_protocol::AppListUpdatedNotification;
use ava_app_server_protocol::AppSummary;
use ava_app_server_protocol::AppTemplateSummary;
use ava_app_server_protocol::AppTemplateUnavailableReason;
use ava_app_server_protocol::AppsInstalledParams;
use ava_app_server_protocol::AppsInstalledResponse;
use ava_app_server_protocol::AppsListParams;
use ava_app_server_protocol::AppsListResponse;
use ava_app_server_protocol::AppsReadParams;
use ava_app_server_protocol::AppsReadResponse;
use ava_app_server_protocol::AskForApproval;
use ava_app_server_protocol::AuthMode;
use ava_app_server_protocol::CancelLoginAccountParams;
use ava_app_server_protocol::CancelLoginAccountResponse;
use ava_app_server_protocol::CancelLoginAccountStatus;
use ava_app_server_protocol::ClientInfo;
use ava_app_server_protocol::ClientRequest;
use ava_app_server_protocol::ClientResponsePayload;
use ava_app_server_protocol::AvaErrorInfo;
use ava_app_server_protocol::CollaborationModeListParams;
use ava_app_server_protocol::CollaborationModeListResponse;
use ava_app_server_protocol::CommandExecParams;
use ava_app_server_protocol::CommandExecResizeParams;
use ava_app_server_protocol::CommandExecTerminateParams;
use ava_app_server_protocol::CommandExecWriteParams;
use ava_app_server_protocol::ConfigWarningNotification;
use ava_app_server_protocol::ConsumeAccountRateLimitResetCreditOutcome;
use ava_app_server_protocol::ConsumeAccountRateLimitResetCreditParams;
use ava_app_server_protocol::ConsumeAccountRateLimitResetCreditResponse;
use ava_app_server_protocol::ConversationGitInfo;
use ava_app_server_protocol::ConversationSummary;
use ava_app_server_protocol::DeprecationNoticeNotification;
use ava_app_server_protocol::DynamicToolFunctionSpec;
use ava_app_server_protocol::DynamicToolNamespaceTool;
use ava_app_server_protocol::DynamicToolSpec;
use ava_app_server_protocol::EnvironmentAddParams;
use ava_app_server_protocol::EnvironmentAddResponse;
use ava_app_server_protocol::EnvironmentInfoParams;
use ava_app_server_protocol::EnvironmentInfoResponse;
use ava_app_server_protocol::EnvironmentShellInfo;
use ava_app_server_protocol::EnvironmentStatusKind;
use ava_app_server_protocol::EnvironmentStatusParams;
use ava_app_server_protocol::EnvironmentStatusResponse;
use ava_app_server_protocol::ExperimentalFeature as ApiExperimentalFeature;
use ava_app_server_protocol::ExperimentalFeatureListParams;
use ava_app_server_protocol::ExperimentalFeatureListResponse;
use ava_app_server_protocol::ExperimentalFeatureStage as ApiExperimentalFeatureStage;
use ava_app_server_protocol::FeedbackUploadParams;
use ava_app_server_protocol::FeedbackUploadResponse;
use ava_app_server_protocol::GetAccountParams;
use ava_app_server_protocol::GetAccountRateLimitsResponse;
use ava_app_server_protocol::GetAccountResponse;
use ava_app_server_protocol::GetAccountTokenUsageParams;
use ava_app_server_protocol::GetAccountTokenUsageResponse;
use ava_app_server_protocol::GetAuthStatusParams;
use ava_app_server_protocol::GetAuthStatusResponse;
use ava_app_server_protocol::GetConversationSummaryParams;
use ava_app_server_protocol::GetConversationSummaryResponse;
use ava_app_server_protocol::GetWorkspaceMessagesResponse;
use ava_app_server_protocol::GitDiffToRemoteParams;
use ava_app_server_protocol::GitDiffToRemoteResponse;
use ava_app_server_protocol::GitInfo as ApiGitInfo;
use ava_app_server_protocol::HookHandlerMetadata;
use ava_app_server_protocol::HookMetadata;
use ava_app_server_protocol::HooksListParams;
use ava_app_server_protocol::HooksListResponse;
use ava_app_server_protocol::InitializeParams;
use ava_app_server_protocol::InitializeResponse;
use ava_app_server_protocol::InstalledApp;
use ava_app_server_protocol::JSONRPCErrorError;
use ava_app_server_protocol::ListMcpServerStatusParams;
use ava_app_server_protocol::ListMcpServerStatusResponse;
use ava_app_server_protocol::LoginAccountParams;
use ava_app_server_protocol::LoginAccountResponse;
use ava_app_server_protocol::LoginApiKeyParams;
use ava_app_server_protocol::LoginAppBrand;
use ava_app_server_protocol::LogoutAccountResponse;
use ava_app_server_protocol::MarketplaceAddParams;
use ava_app_server_protocol::MarketplaceAddResponse;
use ava_app_server_protocol::MarketplaceInterface;
use ava_app_server_protocol::MarketplaceRemoveParams;
use ava_app_server_protocol::MarketplaceRemoveResponse;
use ava_app_server_protocol::MarketplaceUpgradeErrorInfo;
use ava_app_server_protocol::MarketplaceUpgradeParams;
use ava_app_server_protocol::MarketplaceUpgradeResponse;
use ava_app_server_protocol::McpResourceReadParams;
use ava_app_server_protocol::McpResourceReadResponse;
use ava_app_server_protocol::McpServerOauthClientRegistration;
use ava_app_server_protocol::McpServerOauthLoginCompletedNotification;
use ava_app_server_protocol::McpServerOauthLoginParams;
use ava_app_server_protocol::McpServerOauthLoginResponse;
use ava_app_server_protocol::McpServerRefreshResponse;
use ava_app_server_protocol::McpServerStatus;
use ava_app_server_protocol::McpServerStatusDetail;
use ava_app_server_protocol::McpServerToolCallParams;
use ava_app_server_protocol::McpServerToolCallResponse;
use ava_app_server_protocol::MemoryResetResponse;
use ava_app_server_protocol::MockExperimentalMethodParams;
use ava_app_server_protocol::MockExperimentalMethodResponse;
use ava_app_server_protocol::ModelListParams;
use ava_app_server_protocol::ModelListResponse;
use ava_app_server_protocol::PermissionProfileListParams;
use ava_app_server_protocol::PermissionProfileListResponse;
use ava_app_server_protocol::PermissionProfileSummary;
use ava_app_server_protocol::PluginDetail;
use ava_app_server_protocol::PluginInstallParams;
use ava_app_server_protocol::PluginInstallResponse;
use ava_app_server_protocol::PluginInstalledParams;
use ava_app_server_protocol::PluginInstalledResponse;
use ava_app_server_protocol::PluginInterface;
use ava_app_server_protocol::PluginListMarketplaceKind;
use ava_app_server_protocol::PluginListParams;
use ava_app_server_protocol::PluginListResponse;
use ava_app_server_protocol::PluginMarketplaceEntry;
use ava_app_server_protocol::PluginReadParams;
use ava_app_server_protocol::PluginReadResponse;
use ava_app_server_protocol::PluginShareCheckoutParams;
use ava_app_server_protocol::PluginShareCheckoutResponse;
use ava_app_server_protocol::PluginShareContext;
use ava_app_server_protocol::PluginShareDeleteParams;
use ava_app_server_protocol::PluginShareDeleteResponse;
use ava_app_server_protocol::PluginShareDiscoverability;
use ava_app_server_protocol::PluginShareListItem;
use ava_app_server_protocol::PluginShareListParams;
use ava_app_server_protocol::PluginShareListResponse;
use ava_app_server_protocol::PluginSharePrincipal;
use ava_app_server_protocol::PluginSharePrincipalType;
use ava_app_server_protocol::PluginShareSaveParams;
use ava_app_server_protocol::PluginShareSaveResponse;
use ava_app_server_protocol::PluginShareTarget;
use ava_app_server_protocol::PluginShareUpdateDiscoverability;
use ava_app_server_protocol::PluginShareUpdateTargetsParams;
use ava_app_server_protocol::PluginShareUpdateTargetsResponse;
use ava_app_server_protocol::PluginSkillReadParams;
use ava_app_server_protocol::PluginSkillReadResponse;
use ava_app_server_protocol::PluginSource;
use ava_app_server_protocol::PluginSummary;
use ava_app_server_protocol::PluginUninstallParams;
use ava_app_server_protocol::PluginUninstallResponse;
use ava_app_server_protocol::RateLimitResetCredit;
use ava_app_server_protocol::RateLimitResetCreditStatus;
use ava_app_server_protocol::RateLimitResetCreditsSummary;
use ava_app_server_protocol::RateLimitResetType;
use ava_app_server_protocol::RequestId;
use ava_app_server_protocol::ReviewDelivery as ApiReviewDelivery;
use ava_app_server_protocol::ReviewStartParams;
use ava_app_server_protocol::ReviewStartResponse;
use ava_app_server_protocol::ReviewTarget as ApiReviewTarget;
use ava_app_server_protocol::SandboxMode;
use ava_app_server_protocol::SendAddCreditsNudgeEmailParams;
use ava_app_server_protocol::SendAddCreditsNudgeEmailResponse;
use ava_app_server_protocol::ServerNotification;
use ava_app_server_protocol::ServerRequestResolvedNotification;
use ava_app_server_protocol::SkillSummary;
use ava_app_server_protocol::SkillsConfigWriteParams;
use ava_app_server_protocol::SkillsConfigWriteResponse;
use ava_app_server_protocol::SkillsExtraRootsSetParams;
use ava_app_server_protocol::SkillsExtraRootsSetResponse;
use ava_app_server_protocol::SkillsListParams;
use ava_app_server_protocol::SkillsListResponse;
use ava_app_server_protocol::SortDirection;
use ava_app_server_protocol::Thread;
use ava_app_server_protocol::ThreadApproveGuardianDeniedActionParams;
use ava_app_server_protocol::ThreadApproveGuardianDeniedActionResponse;
use ava_app_server_protocol::ThreadArchiveParams;
use ava_app_server_protocol::ThreadArchiveResponse;
use ava_app_server_protocol::ThreadArchivedNotification;
use ava_app_server_protocol::ThreadBackgroundTerminal;
use ava_app_server_protocol::ThreadBackgroundTerminalsCleanParams;
use ava_app_server_protocol::ThreadBackgroundTerminalsCleanResponse;
use ava_app_server_protocol::ThreadBackgroundTerminalsListParams;
use ava_app_server_protocol::ThreadBackgroundTerminalsListResponse;
use ava_app_server_protocol::ThreadBackgroundTerminalsTerminateParams;
use ava_app_server_protocol::ThreadBackgroundTerminalsTerminateResponse;
use ava_app_server_protocol::ThreadClosedNotification;
use ava_app_server_protocol::ThreadCompactStartParams;
use ava_app_server_protocol::ThreadCompactStartResponse;
use ava_app_server_protocol::ThreadDecrementElicitationParams;
use ava_app_server_protocol::ThreadDecrementElicitationResponse;
use ava_app_server_protocol::ThreadDeleteParams;
use ava_app_server_protocol::ThreadDeleteResponse;
use ava_app_server_protocol::ThreadDeletedNotification;
use ava_app_server_protocol::ThreadForkParams;
use ava_app_server_protocol::ThreadForkResponse;
use ava_app_server_protocol::ThreadGoal;
use ava_app_server_protocol::ThreadGoalClearParams;
use ava_app_server_protocol::ThreadGoalClearResponse;
use ava_app_server_protocol::ThreadGoalClearedNotification;
use ava_app_server_protocol::ThreadGoalGetParams;
use ava_app_server_protocol::ThreadGoalGetResponse;
use ava_app_server_protocol::ThreadGoalSetParams;
use ava_app_server_protocol::ThreadGoalSetResponse;
use ava_app_server_protocol::ThreadGoalStatus;
use ava_app_server_protocol::ThreadGoalUpdatedNotification;
use ava_app_server_protocol::ThreadHistoryBuilder;
#[cfg(test)]
use ava_app_server_protocol::ThreadHistoryMode;
use ava_app_server_protocol::ThreadIncrementElicitationParams;
use ava_app_server_protocol::ThreadIncrementElicitationResponse;
use ava_app_server_protocol::ThreadInjectItemsParams;
use ava_app_server_protocol::ThreadInjectItemsResponse;
use ava_app_server_protocol::ThreadItem;
use ava_app_server_protocol::ThreadItemEntry;
use ava_app_server_protocol::ThreadItemsListParams;
use ava_app_server_protocol::ThreadItemsListResponse;
use ava_app_server_protocol::ThreadListCwdFilter;
use ava_app_server_protocol::ThreadListParams;
use ava_app_server_protocol::ThreadListResponse;
use ava_app_server_protocol::ThreadLoadedListParams;
use ava_app_server_protocol::ThreadLoadedListResponse;
use ava_app_server_protocol::ThreadMemoryModeSetParams;
use ava_app_server_protocol::ThreadMemoryModeSetResponse;
use ava_app_server_protocol::ThreadMetadataGitInfoUpdateParams;
use ava_app_server_protocol::ThreadMetadataUpdateParams;
use ava_app_server_protocol::ThreadMetadataUpdateResponse;
use ava_app_server_protocol::ThreadNameUpdatedNotification;
use ava_app_server_protocol::ThreadProjectUpdatedNotification;
use ava_app_server_protocol::ThreadReadParams;
use ava_app_server_protocol::ThreadReadResponse;
use ava_app_server_protocol::ThreadRealtimeAppendAudioParams;
use ava_app_server_protocol::ThreadRealtimeAppendAudioResponse;
use ava_app_server_protocol::ThreadRealtimeAppendSpeechParams;
use ava_app_server_protocol::ThreadRealtimeAppendSpeechResponse;
use ava_app_server_protocol::ThreadRealtimeAppendTextParams;
use ava_app_server_protocol::ThreadRealtimeAppendTextResponse;
use ava_app_server_protocol::ThreadRealtimeListVoicesResponse;
use ava_app_server_protocol::ThreadRealtimeStartParams;
use ava_app_server_protocol::ThreadRealtimeStartResponse;
use ava_app_server_protocol::ThreadRealtimeStartTransport;
use ava_app_server_protocol::ThreadRealtimeStopParams;
use ava_app_server_protocol::ThreadRealtimeStopResponse;
use ava_app_server_protocol::ThreadResumeInitialTurnsPageParams;
use ava_app_server_protocol::ThreadResumeParams;
use ava_app_server_protocol::ThreadResumeResponse;
use ava_app_server_protocol::ThreadSearchOccurrence;
use ava_app_server_protocol::ThreadSearchOccurrencesParams;
use ava_app_server_protocol::ThreadSearchOccurrencesResponse;
use ava_app_server_protocol::ThreadSearchParams;
use ava_app_server_protocol::ThreadSearchResponse;
use ava_app_server_protocol::ThreadSearchResult;
use ava_app_server_protocol::ThreadSearchSortKey;
use ava_app_server_protocol::ThreadSearchTextRange;
use ava_app_server_protocol::ThreadSetNameParams;
use ava_app_server_protocol::ThreadSetNameResponse;
use ava_app_server_protocol::ThreadSettings;
use ava_app_server_protocol::ThreadSettingsUpdateParams;
use ava_app_server_protocol::ThreadSettingsUpdateResponse;
use ava_app_server_protocol::ThreadShellCommandParams;
use ava_app_server_protocol::ThreadShellCommandResponse;
use ava_app_server_protocol::ThreadSortKey;
use ava_app_server_protocol::ThreadSourceKind;
use ava_app_server_protocol::ThreadStartParams;
use ava_app_server_protocol::ThreadStartResponse;
use ava_app_server_protocol::ThreadStartedNotification;
use ava_app_server_protocol::ThreadStatus;
use ava_app_server_protocol::ThreadTimelineListParams;
use ava_app_server_protocol::ThreadTimelineListResponse;
use ava_app_server_protocol::ThreadTurnsListParams;
use ava_app_server_protocol::ThreadTurnsListResponse;
use ava_app_server_protocol::ThreadUnarchiveParams;
use ava_app_server_protocol::ThreadUnarchiveResponse;
use ava_app_server_protocol::ThreadUnarchivedNotification;
use ava_app_server_protocol::ThreadUnsubscribeParams;
use ava_app_server_protocol::ThreadUnsubscribeResponse;
use ava_app_server_protocol::ThreadUnsubscribeStatus;
use ava_app_server_protocol::Turn;
use ava_app_server_protocol::TurnEnvironmentParams;
use ava_app_server_protocol::TurnError;
use ava_app_server_protocol::TurnInterruptParams;
use ava_app_server_protocol::TurnInterruptResponse;
use ava_app_server_protocol::TurnItemsView;
use ava_app_server_protocol::TurnSettingsUpdateParams;
use ava_app_server_protocol::TurnSettingsUpdateResponse;
use ava_app_server_protocol::TurnSettingsUpdateStatus;
use ava_app_server_protocol::TurnStartParams;
use ava_app_server_protocol::TurnStartResponse;
use ava_app_server_protocol::TurnStatus;
use ava_app_server_protocol::TurnSteerParams;
use ava_app_server_protocol::TurnSteerResponse;
use ava_app_server_protocol::UserInput as V2UserInput;
use ava_app_server_protocol::WindowsSandboxReadiness;
use ava_app_server_protocol::WindowsSandboxReadinessResponse;
use ava_app_server_protocol::WindowsSandboxSetupCompletedNotification;
use ava_app_server_protocol::WindowsSandboxSetupMode;
use ava_app_server_protocol::WindowsSandboxSetupStartParams;
use ava_app_server_protocol::WindowsSandboxSetupStartResponse;
use ava_app_server_protocol::WorkspaceMessage;
use ava_app_server_protocol::WorkspaceMessageType;
use ava_arg0::Arg0DispatchPaths;
use ava_backend_client::AddCreditsNudgeCreditType as BackendAddCreditsNudgeCreditType;
use ava_backend_client::Client as BackendClient;
use ava_backend_client::AvaWorkspaceMessage as BackendWorkspaceMessage;
use ava_backend_client::AvaWorkspaceMessageType as BackendWorkspaceMessageType;
use ava_backend_client::AvaWorkspaceMessagesResponse as BackendWorkspaceMessagesResponse;
use ava_backend_client::ConsumeRateLimitResetCreditCode as BackendConsumeRateLimitResetCreditCode;
use ava_backend_client::RateLimitResetCreditDetails as BackendRateLimitResetCreditDetails;
use ava_backend_client::RateLimitResetCreditsDetails as BackendRateLimitResetCreditsDetails;
use ava_backend_client::RequestError as BackendRequestError;
use ava_backend_client::TokenUsageProfile;
use ava_chatgpt::connectors;
use ava_config::CloudConfigBundleLoadError;
use ava_config::CloudConfigBundleLoadErrorCode;
use ava_config::ConfigLayerStack;
use ava_config::loader::project_trust_key;
use ava_config::types::McpServerTransportConfig;
use ava_connectors::AppInfo;
use ava_core::AvaThread;
use ava_core::AvaThreadSettingsOverrides;
use ava_core::ForkSnapshot;
use ava_core::McpManager;
use ava_core::NewThread;
use ava_core::NotSubmittedReason;
#[cfg(test)]
use ava_core::SessionMeta;
use ava_core::StartThreadOptions;
use ava_core::SteerSubmission;
use ava_core::ThreadConfigSnapshot;
use ava_core::ThreadManager;
use ava_core::TurnInput;
use ava_core::TurnInputRequest;
use ava_core::TurnInputSubmission;
use ava_core::TurnStartOptions;
use ava_core::config::Config;
use ava_core::config::ConfigOverrides;
use ava_core::config::NetworkProxyAuditMetadata;
use ava_core::config::edit::ConfigEdit;
use ava_core::config::edit::ConfigEditsBuilder;
use ava_core::connectors::AccessibleConnectorsStatus;
use ava_core::exec::ExecCapturePolicy;
use ava_core::exec::ExecExpiration;
use ava_core::exec::ExecParams;
use ava_core::exec_env::create_env;
use ava_core::path_utils;
#[cfg(test)]
use ava_core::read_head_for_summary;
use ava_core::sandboxing::SandboxPermissions;
use ava_core::truncate_rollout_after_turn_id;
use ava_core::truncate_rollout_before_turn_id;
use ava_core::windows_sandbox::WindowsSandboxLevelExt;
use ava_core::windows_sandbox::WindowsSandboxSetupMode as CoreWindowsSandboxSetupMode;
use ava_core::windows_sandbox::WindowsSandboxSetupRequest;
use ava_core::windows_sandbox::sandbox_setup_is_complete;
use ava_core_plugins::PluginInstallError as CorePluginInstallError;
use ava_core_plugins::PluginInstallRequest;
use ava_core_plugins::PluginReadRequest;
use ava_core_plugins::PluginUninstallError as CorePluginUninstallError;
use ava_core_plugins::PluginsManager;
use ava_core_plugins::loader::load_plugin_apps;
use ava_core_plugins::manifest::PluginManifestInterface;
use ava_core_plugins::marketplace::MarketplaceError;
use ava_core_plugins::marketplace::MarketplacePluginSource;
use ava_core_plugins::marketplace_add::MarketplaceAddError;
use ava_core_plugins::marketplace_add::MarketplaceAddRequest;
use ava_core_plugins::marketplace_add::add_marketplace as add_marketplace_to_ava_home;
use ava_core_plugins::marketplace_remove::MarketplaceRemoveError;
use ava_core_plugins::marketplace_remove::MarketplaceRemoveRequest as CoreMarketplaceRemoveRequest;
use ava_core_plugins::marketplace_remove::remove_marketplace;
use ava_core_plugins::remote::RemoteMarketplace;
use ava_core_plugins::remote::RemoteMarketplaceSource;
use ava_core_plugins::remote::RemotePluginCatalogError;
use ava_core_plugins::remote::RemotePluginDetail as RemoteCatalogPluginDetail;
use ava_core_plugins::remote::RemotePluginServiceConfig;
use ava_core_plugins::remote::RemotePluginShareContext as RemoteCatalogPluginShareContext;
use ava_core_plugins::remote::RemotePluginShareSummary as RemoteCatalogPluginShareSummary;
use ava_core_plugins::remote::RemotePluginSummary as RemoteCatalogPluginSummary;
use ava_exec_server::EnvironmentManager;
use ava_exec_server::EnvironmentObservedStatus;
use ava_exec_server::LOCAL_ENVIRONMENT_ID;
use ava_exec_server::LOCAL_FS;
use ava_features::FEATURES;
use ava_features::Feature;
use ava_features::Stage;
use ava_feedback::AvaFeedback;
use ava_feedback::FeedbackAttachmentPath;
use ava_feedback::FeedbackUploadOptions;
use ava_git_utils::git_diff_to_remote;
use ava_git_utils::resolve_root_git_project_for_trust;
use ava_login::AuthManager;
use ava_login::AVA_OPEN_APP_URL;
use ava_login::AvaAuth;
use ava_login::LoginSuccessPage;
use ava_login::LoginSuccessPageBrand;
use ava_login::ServerOptions as LoginServerOptions;
use ava_login::ShutdownHandle;
use ava_login::complete_device_code_login;
use ava_login::login_with_api_key;
use ava_login::login_with_bedrock_api_key;
use ava_login::oauth_client_id;
use ava_login::request_device_code;
use ava_login::run_login_server;
use ava_mcp::McpRuntimeContext;
use ava_mcp::McpServerStatusSnapshot;
use ava_mcp::McpSnapshotDetail;
use ava_mcp::collect_mcp_server_status_snapshot_with_detail;
use ava_mcp::discover_supported_scopes;
use ava_mcp::read_mcp_resource as read_mcp_resource_without_thread;
use ava_mcp::resolve_oauth_scopes;
use ava_memories_write::clear_memory_roots_contents;
use ava_model_provider::create_model_provider;
use ava_models_manager::collaboration_mode_presets::builtin_collaboration_mode_presets;
use ava_protocol::ThreadId;
use ava_protocol::config_types::CollaborationMode;
use ava_protocol::config_types::ForcedLoginMethod;
use ava_protocol::config_types::Personality;
use ava_protocol::config_types::ReasoningSummary;
use ava_protocol::config_types::TrustLevel;
use ava_protocol::config_types::WindowsSandboxLevel;
use ava_protocol::error::AvaErr;
use ava_protocol::error::Result as AvaResult;
#[cfg(test)]
use ava_protocol::items::TurnItem;
use ava_protocol::models::ResponseItem;
use ava_protocol::openai_models::ReasoningEffort;
use ava_protocol::protocol::AgentStatus;
use ava_protocol::protocol::ConversationAudioParams;
use ava_protocol::protocol::ConversationSpeechParams;
use ava_protocol::protocol::ConversationStartParams;
use ava_protocol::protocol::ConversationStartTransport;
use ava_protocol::protocol::ConversationTextParams;
use ava_protocol::protocol::EnvironmentConfigState;
use ava_protocol::protocol::EventMsg;
#[cfg(test)]
use ava_protocol::protocol::GitInfo as CoreGitInfo;
use ava_protocol::protocol::McpAuthStatus as CoreMcpAuthStatus;
use ava_protocol::protocol::Op;
use ava_protocol::protocol::RealtimeVoicesList;
use ava_protocol::protocol::ReviewDelivery as CoreReviewDelivery;
use ava_protocol::protocol::ReviewRequest;
use ava_protocol::protocol::ReviewTarget as CoreReviewTarget;
use ava_protocol::protocol::SessionConfiguredEvent;
#[cfg(test)]
use ava_protocol::protocol::SessionMetaLine;
use ava_protocol::protocol::TurnEnvironmentSelection;
use ava_protocol::protocol::TurnEnvironmentSelections;
use ava_protocol::protocol::W3cTraceContext;
use ava_protocol::protocol::strip_user_message_prefix;
use ava_protocol::user_input::MAX_USER_INPUT_TEXT_CHARS;
use ava_protocol::user_input::UserInput as CoreInputItem;
use ava_rmcp_client::McpOAuthClientRegistration;
use ava_rmcp_client::StreamableHttpRedirectMode;
use ava_rmcp_client::perform_oauth_login_return_url;
use ava_rollout::InitialHistory;
use ava_rollout::ResumedHistory;
use ava_rollout::RolloutItem;
use ava_rollout::is_persisted_rollout_item;
use ava_rollout::state_db::StateDbHandle;
use ava_rollout::state_db::reconcile_rollout;
use ava_state::ThreadMetadata;
use ava_state::log_db::LogDbLayer;
use ava_thread_store::ArchiveThreadParams as StoreArchiveThreadParams;
use ava_thread_store::ArchiveThreadsParams as StoreArchiveThreadsParams;
use ava_thread_store::ClearableField as StoreClearableField;
use ava_thread_store::DeleteThreadsParams as StoreDeleteThreadsParams;
use ava_thread_store::GitInfoPatch as StoreGitInfoPatch;
use ava_thread_store::ItemSortKey as StoreItemSortKey;
use ava_thread_store::ListItemsParams as StoreListItemsParams;
use ava_thread_store::ListThreadsParams as StoreListThreadsParams;
use ava_thread_store::ListTimelineParams as StoreListTimelineParams;
use ava_thread_store::ListTurnsParams as StoreListTurnsParams;
use ava_thread_store::LoadThreadHistoryParams as StoreLoadThreadHistoryParams;
use ava_thread_store::LocalThreadStore;
use ava_thread_store::ReadThreadByRolloutPathParams as StoreReadThreadByRolloutPathParams;
use ava_thread_store::ReadThreadParams as StoreReadThreadParams;
use ava_thread_store::SearchThreadOccurrencesParams as StoreSearchThreadOccurrencesParams;
use ava_thread_store::SearchThreadsParams as StoreSearchThreadsParams;
use ava_thread_store::SortDirection as StoreSortDirection;
use ava_thread_store::StoredThread;
use ava_thread_store::StoredTurn;
use ava_thread_store::StoredTurnItemsView;
use ava_thread_store::StoredTurnStatus;
use ava_thread_store::ThreadMetadataPatch as StoreThreadMetadataPatch;
use ava_thread_store::ThreadRelationFilter as StoreThreadRelationFilter;
use ava_thread_store::ThreadSortKey as StoreThreadSortKey;
use ava_thread_store::ThreadStore;
use ava_thread_store::ThreadStoreError;
use ava_utils_absolute_path::AbsolutePathBuf;
use ava_utils_pty::DEFAULT_OUTPUT_BYTES_CAP;
use std::collections::BTreeMap;
use std::collections::HashMap;
use std::collections::HashSet;
use std::io::Error as IoError;
use std::path::Path;
use std::path::PathBuf;
use std::result::Result;
use std::sync::Arc;
use std::time::Duration;
use std::time::Instant;
use tokio::sync::Mutex;
use tokio::sync::Semaphore;
use tokio::sync::SemaphorePermit;
use tokio::sync::broadcast;
use tokio::sync::oneshot;
use tokio::sync::watch;
use tokio_util::sync::CancellationToken;
use tokio_util::sync::DropGuard;
use tokio_util::task::TaskTracker;
use toml::Value as TomlValue;
use tracing::Instrument;
use tracing::error;
use tracing::info;
use tracing::warn;
use uuid::Uuid;

#[cfg(test)]
use ava_app_server_protocol::ServerRequest;

mod account_processor;
mod apps_processor;
mod bedrock_auth;
mod catalog_processor;
mod command_exec_processor;
mod config_processor;
mod diagnostics;
mod environment_processor;
mod feedback_doctor_report;
mod feedback_processor;
mod feedback_thread_index;
mod fs_processor;
mod git_processor;
mod initialize_processor;
mod marketplace_processor;
mod mcp_event_stream;
mod mcp_processor;
mod memory_status;
mod persisted_resume_settings;
mod plugins;
mod process_exec_processor;
mod projects;
mod remote_control_processor;
mod rollout;
mod search;
mod thread_attachments;
mod thread_enrichment;
mod thread_fork_goal;
mod thread_input;
mod thread_processor;
mod thread_queue_processor;
mod thread_sections;
mod token_usage_replay;
mod turn_processor;
mod windows_sandbox_processor;

pub(crate) use account_processor::AccountRequestProcessor;
pub(crate) use apps_processor::AppsRequestProcessor;
pub(crate) use catalog_processor::CatalogRequestProcessor;
pub(crate) use command_exec_processor::CommandExecRequestProcessor;
pub(crate) use config_processor::ConfigRequestProcessor;
pub(crate) use diagnostics::read_server_diagnostics;
pub(crate) use environment_processor::EnvironmentRequestProcessor;
pub(crate) use feedback_processor::FeedbackRequestProcessor;
pub(crate) use fs_processor::FsRequestProcessor;
pub(crate) use git_processor::GitRequestProcessor;
pub(crate) use initialize_processor::InitializeRequestProcessor;
pub(crate) use marketplace_processor::MarketplaceRequestProcessor;
pub(crate) use mcp_event_stream::McpEventStreamReady;
pub(crate) use mcp_event_stream::McpEventStreams;
pub(crate) use mcp_processor::McpRequestProcessor;
pub(crate) use plugins::PluginRequestProcessor;
pub(crate) use process_exec_processor::ProcessExecRequestProcessor;
pub(crate) use projects::ProjectRequestProcessor;
pub(crate) use remote_control_processor::RemoteControlRequestProcessor;
pub(crate) use search::SearchRequestProcessor;
pub(crate) use thread_goal_processor::ThreadGoalRequestProcessor;
pub(crate) use thread_processor::ThreadRequestProcessor;
pub(crate) use thread_processor::ThreadResumeTarget;
pub(crate) use thread_queue_processor::ThreadQueueRequestProcessor;
pub(crate) use turn_processor::TurnRequestProcessor;
pub(crate) use windows_sandbox_processor::WindowsSandboxRequestProcessor;

use crate::error_code::internal_error;
use crate::error_code::invalid_request;
use crate::filters::compute_source_filters;
use crate::filters::source_kind_matches;
use crate::thread_state::ConnectionCapabilities;
use crate::thread_state::ThreadListenerCommand;
use crate::thread_state::ThreadState;
use crate::thread_state::ThreadStateManager;
use token_usage_replay::restored_token_usage_turn_id;
use token_usage_replay::send_thread_token_usage_update_to_connection;

pub(crate) fn apply_live_thread_settings(
    thread: &mut Thread,
    config_snapshot: &ThreadConfigSnapshot,
) {
    thread.model = Some(config_snapshot.model.clone());
    thread.reasoning_effort = config_snapshot.reasoning_effort.clone();
    thread.environments = Some(
        config_snapshot
            .environment_selections()
            .iter()
            .map(Into::into)
            .collect(),
    );
}

fn resolve_request_cwd(cwd: Option<PathBuf>) -> Result<Option<AbsolutePathBuf>, JSONRPCErrorError> {
    cwd.map(|cwd| {
        AbsolutePathBuf::relative_to_current_dir(path_utils::normalize_for_native_workdir(cwd))
            .map_err(|err| invalid_request(format!("invalid cwd: {err}")))
    })
    .transpose()
}

fn resolve_turn_environment_selections(
    thread_manager: &ThreadManager,
    environments: Option<Vec<TurnEnvironmentParams>>,
) -> Result<Option<Vec<TurnEnvironmentSelection>>, JSONRPCErrorError> {
    let Some(environments) = environments else {
        return Ok(None);
    };
    let mut selections = Vec::with_capacity(environments.len());
    for environment in environments {
        let environment_id = environment.environment_id;
        let cwd = environment
            .cwd
            .to_inferred_path_uri()
            .ok_or_else(|| {
                invalid_request(format!(
                    "invalid cwd for environment `{environment_id}`: path `{}` does not use absolute POSIX or Windows path syntax",
                    environment.cwd
                ))
            })?;
        let workspace_roots = environment
            .runtime_workspace_roots
            .map(|roots| {
                let mut resolved_roots = Vec::new();
                for root in roots {
                    let root = root.to_inferred_path_uri().ok_or_else(|| {
                        invalid_request(format!(
                            "invalid runtime workspace root for environment `{environment_id}`: path `{root}` does not use absolute POSIX or Windows path syntax"
                        ))
                    })?;
                    if !resolved_roots.contains(&root) {
                        resolved_roots.push(root);
                    }
                }
                Ok::<_, JSONRPCErrorError>(resolved_roots)
            })
            .transpose()?
            .unwrap_or_else(|| vec![cwd.clone()]);
        selections.push(TurnEnvironmentSelection {
            environment_id,
            cwd,
            workspace_roots,
            config: EnvironmentConfigState::FromThread,
        });
    }
    thread_manager
        .validate_environment_selections(&selections)
        .map_err(environment_selection_error)?;
    Ok(Some(selections))
}

fn resolve_runtime_workspace_roots(workspace_roots: Vec<AbsolutePathBuf>) -> Vec<AbsolutePathBuf> {
    let mut resolved_roots = Vec::new();
    for root in workspace_roots {
        if !resolved_roots.iter().any(|existing| existing == &root) {
            resolved_roots.push(root);
        }
    }
    resolved_roots
}

mod config_errors;
mod request_errors;
mod thread_delete;
mod thread_goal_processor;
mod thread_lifecycle;
mod thread_resume_redaction;
mod thread_summary;

use self::config_errors::*;
use self::request_errors::*;
use self::thread_goal_processor::api_thread_goal_from_state;
use self::thread_lifecycle::*;
use self::thread_resume_redaction::*;
use self::thread_summary::*;

pub(crate) use self::thread_lifecycle::populate_thread_turns_from_history;
pub(crate) use self::thread_processor::thread_from_stored_thread;
#[cfg(test)]
pub(crate) use self::thread_summary::read_summary_from_rollout;
#[cfg(test)]
pub(crate) use self::thread_summary::summary_to_thread;
pub(crate) use self::thread_summary::thread_settings_from_config_snapshot;

pub(crate) fn build_legacy_api_turns_from_rollout_items(items: &[RolloutItem]) -> Vec<Turn> {
    let mut builder = ThreadHistoryBuilder::new();
    for item in items {
        if is_persisted_rollout_item(item, ava_protocol::protocol::ThreadHistoryMode::Legacy) {
            builder.handle_rollout_item(item);
        }
    }
    builder.finish()
}
