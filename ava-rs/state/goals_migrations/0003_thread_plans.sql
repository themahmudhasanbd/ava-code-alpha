CREATE TABLE IF NOT EXISTS thread_plans (
    thread_id TEXT PRIMARY KEY NOT NULL,
    plan_json TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
);
