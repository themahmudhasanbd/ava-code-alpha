import { Check, ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PendingApproval } from "@/core/types";

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
  onRespond: (id: string, approved: boolean) => void;
}

/**
 * Sticky approval card shown above the composer while a server approval
 * is pending. Allow/Deny send the structured protocol response
 * (see answerApproval in core/api/chat).
 */
export function ApprovalCard({ approval, onRespond }: ApprovalCardProps) {
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
    </div>
  );
}
