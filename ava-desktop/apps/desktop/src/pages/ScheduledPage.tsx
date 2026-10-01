import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScheduledTask } from "@pi-desktop/shared";
import { useAppStore } from "../stores/app-store";
import { api } from "../lib/api";
import { Badge, Button, Panel } from "../components/ui";
import { IconClock } from "../components/icons";
import { ScheduledEditor, type ScheduledDraft } from "../features/scheduled/ScheduledEditor";

export function ScheduledPage() {
  const { t, i18n } = useTranslation();
  const showToast = useAppStore((s) => s.showToast);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [editor, setEditor] = useState<ScheduledTask | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const taskResult = await api.listScheduled();
      if (!mounted.current || request !== revision.current) return;
      setTasks(taskResult.tasks);
      setError("");
      setLoaded(true);
    } catch (failure) {
      if (mounted.current && request === revision.current)
        setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => void refresh(), 10_000);
    return () => {
      mounted.current = false;
      revision.current++;
      clearInterval(timer);
    };
  }, [refresh]);
  const action = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      if (mounted.current) await refresh();
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : String(failure), { variant: "error" });
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const save = (draft: ScheduledDraft) =>
    action(async () => {
      if (editor && editor !== "new") await api.updateScheduled({ id: editor.id, ...draft });
      else await api.createScheduled(draft);
      if (mounted.current) setEditor(null);
    });
  const date = (value: string) =>
    new Date(value).toLocaleString(i18n.resolvedLanguage ?? i18n.language);
  const cadenceKey = {
    manual: "scheduled.cadenceManual",
    hourly: "scheduled.cadenceHourly",
    daily: "scheduled.cadenceDaily",
    weekly: "scheduled.cadenceWeekly",
  } as const;
  return (
    <div className="thread-scroll">
      <div className="page-frame">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t("scheduled.title")}</h1>
            <p className="dest-row-meta">{t("scheduled.description")}</p>
          </div>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => {
              setEditor("new");
            }}
          >
            {t("scheduled.create")}
          </Button>
        </div>
        {error && (
          <Panel>
            <p role="alert">{error}</p>
            <Button onClick={() => void refresh()}>{t("scheduled.retry")}</Button>
          </Panel>
        )}
        {!loaded && !error && <p role="status">{t("common.loading")}</p>}
        {editor && (
          <ScheduledEditor
            key={editor === "new" ? "new" : editor.id}
            task={editor === "new" ? undefined : editor}
            busy={busy}
            save={save}
            cancel={() => setEditor(null)}
          />
        )}
        {loaded && !tasks.length && !editor && (
          <Panel className="page-card page-empty">
            <div className="page-empty-icon">
              <IconClock size={20} />
            </div>
            <h2>{t("scheduled.emptyTitle")}</h2>
            <p className="dest-row-meta">{t("scheduled.description")}</p>
          </Panel>
        )}
        <div className="dest-list">
          {tasks.map((task) => {
            return (
              <div className="dest-row" key={task.id}>
                <div className="dest-row-icon">
                  <IconClock size={16} />
                </div>
                <div className="dest-row-body">
                  <div className="dest-row-title">
                    <span>{task.title}</span>
                    <Badge tone={task.enabled ? "success" : "neutral"}>
                      {t(task.enabled ? "scheduled.enabled" : "scheduled.disabled")}
                    </Badge>
                    <Badge tone="neutral">{t(cadenceKey[task.cadence])}</Badge>
                  </div>
                  <p className="dest-row-meta line-clamp-2">{task.prompt}</p>
                  <p className="dest-row-meta">
                    {task.schedule && task.enabled && task.nextRunAt
                      ? `${t("scheduled.nextRun")}: ${date(task.nextRunAt)}`
                      : t(
                          task.enabled && task.cadence !== "manual" && !task.schedule
                            ? "scheduled.legacyHint"
                            : "scheduled.noNextRun",
                        )}
                  </p>
                  {task.workspacePath && (
                    <p className="dest-row-meta truncate">{task.workspacePath}</p>
                  )}
                </div>
                <div className="dest-row-actions flex-wrap">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await api.executeScheduled(task.id);
                      })
                    }
                  >
                    {t("scheduled.runNow")}
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => setEditor(task)}>
                    {t("scheduled.edit")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await api.updateScheduled({ id: task.id, enabled: !task.enabled });
                      })
                    }
                  >
                    {t(task.enabled ? "scheduled.pause" : "scheduled.resume")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t("scheduled.deleteConfirm", { title: task.title })))
                        void action(async () => {
                          await api.deleteScheduled(task.id);
                        });
                    }}
                  >
                    {t("scheduled.delete")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
