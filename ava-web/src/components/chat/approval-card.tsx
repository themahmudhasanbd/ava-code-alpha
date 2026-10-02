import { useState } from "react";
import { Check, ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ElicitationField, PendingApproval } from "@/core/types";
import { cn } from "@/lib/utils";

/** Friendly labels per approval method. */
function methodLabel(method: string): string {
  switch (method) {
    case "item/commandExecution/requestApproval":
      return "Command approval";
    case "item/fileChange/requestApproval":
      return "File change approval";
    case "item/permissions/requestApproval":
      return "Permission request";
    case "mcpServer/elicitation/request":
      return "MCP server request";
    default:
      return "Approval requested";
  }
}

interface ApprovalCardProps {
  approval: PendingApproval;
  onRespond: (id: string, approved: boolean, content?: Record<string, unknown> | null) => void;
}

/**
 * Fillable MCP elicitation form (mcpServer/elicitation/request, form mode).
 * Mirrors the desktop TUI: per-field inputs, required validation, submit
 * sends { action: "accept", content } and dismiss sends a decline.
 */
function ElicitationForm({
  approval,
  fields,
  onRespond,
}: {
  approval: PendingApproval;
  fields: ElicitationField[];
  onRespond: ApprovalCardProps["onRespond"];
}) {
  // Select values are stored as option indexes; text fields as strings.
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const init: Record<string, string | number> = {};
    for (const f of fields) {
      if (f.kind === "select" && f.options) {
        const idx = f.options.findIndex((o) => o.value === f.defaultValue);
        if (idx >= 0) init[f.id] = idx;
      } else if (typeof f.defaultValue === "string") {
        init[f.id] = f.defaultValue;
      }
    }
    return init;
  });
  const [error, setError] = useState<string | null>(null);

  const fieldValue = (f: ElicitationField): string | boolean | undefined => {
    const v = values[f.id];
    if (f.kind === "select") {
      return typeof v === "number" ? f.options?.[v]?.value : undefined;
    }
    const t = typeof v === "string" ? v.trim() : "";
    return t ? t : undefined;
  };

  const submit = () => {
    const missing = fields.find((f) => f.required && fieldValue(f) === undefined);
    if (missing) {
      setError(`Answer required fields before submitting.`);
      return;
    }
    setError(null);
    const content: Record<string, unknown> = {};
    for (const f of fields) {
      const v = fieldValue(f);
      if (v !== undefined) content[f.id] = v;
    }
    onRespond(approval.id, true, content);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onRespond(approval.id, false);
        }
      }}
      className="mt-2 space-y-3"
    >
      {fields.map((f) => {
        const inputId = `elicit-${approval.id}-${f.id}`;
        const invalid = !!error && f.required && fieldValue(f) === undefined;
        return (
          <div key={f.id} className="space-y-1">
            <Label htmlFor={inputId} className="text-[13px]">
              {f.label}
              {f.required && (
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
              )}
              <span className="sr-only">{f.required ? "(required)" : "(optional)"}</span>
            </Label>
            {f.description && f.description !== f.label && (
              <p className="text-xs text-muted-foreground">{f.description}</p>
            )}
            {f.kind === "select" && f.options ? (
              <Select
                value={typeof values[f.id] === "number" ? String(values[f.id]) : ""}
                onValueChange={(v) => {
                  setValues((prev) => ({ ...prev, [f.id]: Number(v) }));
                  setError(null);
                }}
              >
                <SelectTrigger
                  id={inputId}
                  aria-label={f.label}
                  aria-required={f.required}
                  aria-invalid={invalid}
                  className={cn("text-base md:text-sm", invalid && "border-destructive")}
                >
                  <SelectValue placeholder="Select\u2026" />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={inputId}
                type={f.secret ? "password" : "text"}
                value={typeof values[f.id] === "string" ? (values[f.id] as string) : ""}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [f.id]: e.target.value }));
                  setError(null);
                }}
                aria-required={f.required}
                aria-invalid={invalid}
                autoComplete="off"
                className={cn("text-base md:text-sm", invalid && "border-destructive")}
              />
            )}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => onRespond(approval.id, false)}
          className="h-10 flex-1 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-4" />
          Dismiss
        </Button>
        <Button type="submit" className="h-10 flex-1 rounded-xl bg-success text-white hover:bg-success/90">
          <Check className="size-4" />
          Submit
        </Button>
      </div>
    </form>
  );
}

/**
 * Sticky approval card shown above the composer while a server approval
 * is pending. Allow/Deny send the structured protocol response
 * (see answerApproval in core/api/chat). MCP elicitation requests in form
 * mode render a fillable form instead (submit sends the filled content).
 */
export function ApprovalCard({ approval, onRespond }: ApprovalCardProps) {
  const form = approval.method === "mcpServer/elicitation/request" ? approval.form : undefined;
  return (
    <div role="alert" className="glass mb-2 rounded-2xl border border-amber-500/25 p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10">
          <ShieldAlert className="size-3.5 text-amber-500" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
          {methodLabel(approval.method)}
        </p>
      </div>
      <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-foreground">{approval.title}</p>
      {approval.detail ? (
        <p className="mt-1 line-clamp-6 whitespace-pre-wrap font-mono text-xs leading-5 text-muted-foreground">
          {approval.detail}
        </p>
      ) : null}
      {form && form.length > 0 ? (
        <ElicitationForm approval={approval} fields={form} onRespond={onRespond} />
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onRespond(approval.id, false)}
            className="h-10 flex-1 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" />
            Deny
          </Button>
          <Button
            type="button"
            onClick={() => onRespond(approval.id, true)}
            className="h-10 flex-1 rounded-xl bg-success text-white hover:bg-success/90"
          >
            <Check className="size-4" />
            Allow
          </Button>
        </div>
      )}
    </div>
  );
}
