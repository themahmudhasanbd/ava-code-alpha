//! Request processor for the `schedule/*` RPC methods.
//!
//! Thin adapter over [`SchedulerService`]: validates nothing here, converts
//! service results into JSON-RPC response payloads.

use super::*;
use crate::scheduler::SchedulerService;
use ava_app_server_protocol::ScheduleCreateParams;
use ava_app_server_protocol::ScheduleCreateResponse;
use ava_app_server_protocol::ScheduleDeleteParams;
use ava_app_server_protocol::ScheduleDeleteResponse;
use ava_app_server_protocol::ScheduleListParams;
use ava_app_server_protocol::ScheduleListResponse;
use ava_app_server_protocol::ScheduleRunParams;
use ava_app_server_protocol::ScheduleRunResponse;
use ava_app_server_protocol::ScheduleUpdateParams;
use ava_app_server_protocol::ScheduleUpdateResponse;

pub(crate) struct ScheduleRequestProcessor {
    scheduler: SchedulerService,
}

impl ScheduleRequestProcessor {
    pub(crate) fn new(scheduler: SchedulerService) -> Self {
        Self { scheduler }
    }

    pub(crate) fn shutdown(&self) {
        self.scheduler.shutdown();
    }

    pub(crate) async fn schedule_create(
        &self,
        params: ScheduleCreateParams,
    ) -> Result<Option<ClientResponsePayload>, JSONRPCErrorError> {
        self.scheduler
            .create_schedule(params)
            .await
            .map(|schedule| Some(ScheduleCreateResponse { schedule }.into()))
    }

    pub(crate) async fn schedule_list(
        &self,
        params: ScheduleListParams,
    ) -> Result<Option<ClientResponsePayload>, JSONRPCErrorError> {
        self.scheduler
            .list_schedules(params.cursor, params.limit)
            .await
            .map(|(data, next_cursor)| {
                Some(
                    ScheduleListResponse {
                        data,
                        next_cursor,
                    }
                    .into(),
                )
            })
    }

    pub(crate) async fn schedule_update(
        &self,
        params: ScheduleUpdateParams,
    ) -> Result<Option<ClientResponsePayload>, JSONRPCErrorError> {
        self.scheduler
            .update_schedule(params)
            .await
            .map(|schedule| Some(ScheduleUpdateResponse { schedule }.into()))
    }

    pub(crate) async fn schedule_delete(
        &self,
        params: ScheduleDeleteParams,
    ) -> Result<Option<ClientResponsePayload>, JSONRPCErrorError> {
        self.scheduler
            .delete_schedule(&params.id)
            .await
            .map(|()| Some(ScheduleDeleteResponse {}.into()))
    }

    pub(crate) async fn schedule_run(
        &self,
        params: ScheduleRunParams,
    ) -> Result<Option<ClientResponsePayload>, JSONRPCErrorError> {
        self.scheduler
            .run_schedule_now(&params.id)
            .await
            .map(|thread_id| Some(ScheduleRunResponse { thread_id }.into()))
    }
}
