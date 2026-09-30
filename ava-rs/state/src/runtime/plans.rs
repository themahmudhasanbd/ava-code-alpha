use super::*;

/// Durable per-thread plan store.
///
/// Mirrors `GoalStore`: the active plan (`update_plan`/`todowrite` state) is
/// persisted as JSON so it survives server restarts and thread reloads.
/// A missing or fully-resolved plan simply has no row.
#[derive(Clone)]
pub struct PlanStore {
    pool: Arc<SqlitePool>,
}

impl PlanStore {
    pub(crate) fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub(crate) async fn close(&self) {
        self.pool.close().await;
    }
}

impl PlanStore {
    pub async fn get_thread_plan(
        &self,
        thread_id: ThreadId,
    ) -> anyhow::Result<Option<ava_protocol::plan_tool::UpdatePlanArgs>> {
        let row = sqlx::query(
            r#"
SELECT plan_json
FROM thread_plans
WHERE thread_id = ?
            "#,
        )
        .bind(thread_id.to_string())
        .fetch_optional(self.pool.as_ref())
        .await?;

        row.map(|row| {
            let plan_json: String = row.try_get("plan_json")?;
            let plan: ava_protocol::plan_tool::UpdatePlanArgs =
                serde_json::from_str(&plan_json)?;
            Ok(plan)
        })
        .transpose()
    }

    pub async fn replace_thread_plan(
        &self,
        thread_id: ThreadId,
        plan: &ava_protocol::plan_tool::UpdatePlanArgs,
    ) -> anyhow::Result<()> {
        let plan_json = serde_json::to_string(plan)?;
        sqlx::query(
            r#"
INSERT INTO thread_plans (thread_id, plan_json, updated_at_ms)
VALUES (?, ?, ?)
ON CONFLICT(thread_id) DO UPDATE SET
    plan_json = excluded.plan_json,
    updated_at_ms = excluded.updated_at_ms
            "#,
        )
        .bind(thread_id.to_string())
        .bind(plan_json)
        .bind(chrono::Utc::now().timestamp_millis())
        .execute(self.pool.as_ref())
        .await?;
        Ok(())
    }

    pub async fn clear_thread_plan(&self, thread_id: ThreadId) -> anyhow::Result<()> {
        sqlx::query("DELETE FROM thread_plans WHERE thread_id = ?")
            .bind(thread_id.to_string())
            .execute(self.pool.as_ref())
            .await?;
        Ok(())
    }
}
