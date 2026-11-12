import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as Xa } from "../_libs/streamdown+[...].mjs";
import { c as useAva, i as cn, o as formatCoreError, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { i as Input, r as GlassIconButton, t as Button } from "./input-B9nJfjjd.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useQueryClient } from "../_libs/tanstack__react-query.mjs";
import { $ as FileQuestionMark, A as Mic, At as ArrowDown, B as KeyRound, C as Play, Ct as Check, Et as Brain, F as LoaderCircle, G as HardDrive, H as Image, I as ListChecks, J as Folder, K as Globe, L as LayoutList, Ot as ArrowUp, P as Lock, Q as FileText, R as LayoutGrid, S as Plug, St as ChevronDown, U as Images, V as Info, W as Hourglass, X as FolderGit2, Y as FolderOpen, _ as Server, _t as Circle, b as RefreshCw, bt as ChevronRight, d as SquarePen, dt as Download, et as FilePlay, f as Sparkles, ft as Cpu, g as Settings2, gt as Clock, ht as CloudUpload, i as Wrench, it as FileCode, k as MonitorSmartphone, l as Square, lt as Eraser, m as ShieldAlert, mt as Copy, n as ZoomIn, nt as FileImage, o as UserCog, ot as Eye, p as ShieldCheck, pt as CornerDownLeft, q as Gauge, r as X, rt as FileHeadphone, s as TriangleAlert, st as EyeOff, t as ZoomOut, tt as FilePen, u as SquareTerminal, v as Search, vt as CircleDot, x as Plus, yt as ChevronUp } from "../_libs/lucide-react.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion+[...].mjs";
import { t as motion } from "../_libs/motion.mjs";
import { D as useMediaUrl, F as useSessionHistory, I as useSessions, O as useModels, _ as toPlanSteps, c as SheetHeader, d as keys, f as mediaKind, g as startSession, h as readMediaUrl, i as SANDBOX_MODES, l as SheetTitle, m as readDirectory, o as Sheet, r as REASONING_EFFORTS, s as SheetContent, t as AppShell, u as itemToPart } from "./app-shell-Bm7y22VV.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as CodeBlock } from "./code-block-DPM5_VAm.mjs";
import { t as Label } from "./label-D9_nswTA.mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "../_libs/@radix-ui/react-select+[...].mjs";
import { i as TooltipTrigger, n as TooltipContent, r as TooltipProvider, t as Tooltip } from "./tooltip-BcG1dJoF.mjs";
import { n as useStickToBottomContext, t as StickToBottom } from "../_libs/use-stick-to-bottom.mjs";
import { t as A } from "../_libs/@streamdown/cjk+[...].mjs";
import { t as G } from "../_libs/shiki+streamdown__code.mjs";
import { t as h } from "../_libs/@streamdown/math+[...].mjs";
import { t as f } from "../_libs/@streamdown/mermaid+[...].mjs";
import { a as YAxis, c as Line, d as Pie, f as Cell, h as Legend, i as LineChart, l as CartesianGrid, m as Tooltip$1, n as PieChart, o as XAxis, p as ResponsiveContainer, r as BarChart, s as Area, t as AreaChart, u as Bar } from "../_libs/recharts+[...].mjs";
import { n as CollapsibleTrigger$1, r as Root, t as CollapsibleContent$1 } from "../_libs/radix-ui__react-collapsible.mjs";
import { t as nanoid } from "../_libs/nanoid.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chat-screen-QK88rmAj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
var Conversation = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickToBottom, {
	className: cn("relative flex-1 overflow-y-hidden", className),
	initial: "smooth",
	resize: "smooth",
	role: "log",
	...props
});
var ConversationContent = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickToBottom.Content, {
	className: cn("flex flex-col gap-8 p-4", className),
	...props
});
var ConversationScrollButton = ({ className, ...props }) => {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();
	const handleScrollToBottom = (0, import_react.useCallback)(() => {
		scrollToBottom();
	}, [scrollToBottom]);
	return !isAtBottom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		className: cn("absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full dark:bg-background dark:hover:bg-muted", className),
		"aria-label": "Scroll to bottom",
		onClick: handleScrollToBottom,
		size: "icon",
		type: "button",
		variant: "outline",
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "size-4" })
	});
};
var motionComponentCache = /* @__PURE__ */ new Map();
var getMotionComponent = (element) => {
	let component = motionComponentCache.get(element);
	if (!component) {
		component = motion.create(element);
		motionComponentCache.set(element, component);
	}
	return component;
};
var ShimmerComponent = ({ children, as: Component = "p", className, duration = 2, spread = 2 }) => {
	const MotionComponent = getMotionComponent(Component);
	const dynamicSpread = (0, import_react.useMemo)(() => (children?.length ?? 0) * spread, [children, spread]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MotionComponent, {
		animate: { backgroundPosition: "0% center" },
		className: cn("relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent", "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]", className),
		initial: { backgroundPosition: "100% center" },
		style: {
			"--spread": `${dynamicSpread}px`,
			backgroundImage: "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))"
		},
		transition: {
			duration,
			ease: "linear",
			repeat: Number.POSITIVE_INFINITY
		},
		children
	});
};
var Shimmer = (0, import_react.memo)(ShimmerComponent);
var stateLabel = {
	idle: "AvA is ready",
	thinking: "AvA is thinking",
	working: "AvA is working",
	complete: "AvA finished",
	error: "AvA needs attention"
};
function AvaMascot({ state = "idle", size = "md", interactive = true, className }) {
	const [gaze, setGaze] = (0, import_react.useState)("center");
	const followPointer = (event) => {
		if (!interactive) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const dx = event.clientX - (rect.left + rect.width / 2);
		const dy = event.clientY - (rect.top + rect.height / 2);
		if (Math.abs(dx) > Math.abs(dy)) setGaze(dx > 0 ? "right" : "left");
		else setGaze(dy > 0 ? "down" : "up");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		role: "img",
		"aria-label": stateLabel[state],
		"data-state": state,
		"data-gaze": gaze,
		onPointerMove: followPointer,
		onPointerLeave: () => setGaze("center"),
		className: cn("ava-mascot", `ava-mascot-${size}`, className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "ava-mascot-face",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ava-mascot-eye" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ava-mascot-eye" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ava-mascot-ring",
			"aria-hidden": "true"
		})]
	});
}
var str$1 = (v, d = "") => v == null ? d : String(v);
/**
* Server-initiated request methods that are approval/elicitation prompts,
* not genuine user-input questions. These get the sticky approval card UI
* and a structured response (see answerApproval), instead of the free-text
* question flow.
*/
var APPROVAL_METHODS = /* @__PURE__ */ new Set([
	"item/commandExecution/requestApproval",
	"item/fileChange/requestApproval",
	"item/permissions/requestApproval",
	"mcpServer/elicitation/request"
]);
function isApprovalMethod(method) {
	return APPROVAL_METHODS.has(method);
}
/** Builds a human-readable detail line for an approval card from server params. */
function approvalDetail(method, params) {
	if (!params || typeof params !== "object") return void 0;
	const parts = [];
	if (typeof params.command === "string" && params.command.trim()) parts.push(params.command.trim().slice(0, 300));
	if (typeof params.reason === "string" && params.reason.trim()) parts.push(params.reason.trim().slice(0, 300));
	if (typeof params.url === "string" && params.url.trim()) parts.push(params.url.trim().slice(0, 300));
	if (typeof params.description === "string" && params.description.trim()) parts.push(params.description.trim().slice(0, 500));
	const serverName = params.serverName ?? params.server_name;
	if (typeof serverName === "string" && serverName.trim()) parts.push(`MCP server: ${serverName.trim()}`);
	const grantRoot = params.grantRoot ?? params.grant_root;
	if (typeof grantRoot === "string" && grantRoot.trim()) parts.push(`Grant root: ${grantRoot.trim()}`);
	if (typeof params.cwd === "string" && params.cwd.trim()) parts.push(`cwd: ${params.cwd.trim()}`);
	return parts.length ? parts.join("\n") : void 0;
}
/**
* Parses an MCP elicitation form (mcpServer/elicitation/request, form mode)
* into renderable fields. Mirrors the desktop TUI's form-mode parsing
* (ava-rs/tui mcp_server_elicitation.rs): object schemas with string fields
* become text inputs, enums/single-selects and booleans become selects, and
* anything the TUI cannot render (numbers, multi-selects, unknown shapes)
* returns null so the caller falls back to the plain Allow/Deny card.
*/
function parseElicitationForm(params) {
	if (!params || typeof params !== "object") return null;
	if (params.mode !== "form") return null;
	const schema = params.requestedSchema;
	if (!schema || typeof schema !== "object") return null;
	if (schema.type !== "object") return null;
	const props = schema.properties;
	if (!props || typeof props !== "object") return null;
	const ids = Object.keys(props);
	if (ids.length === 0) return null;
	const required = new Set(Array.isArray(schema.required) ? schema.required.filter((r) => typeof r === "string") : []);
	const fields = [];
	for (const id of ids) {
		const prop = props[id];
		if (!prop || typeof prop !== "object") return null;
		const field = {
			id,
			label: typeof prop.title === "string" && prop.title ? prop.title : id,
			description: typeof prop.description === "string" ? prop.description : void 0,
			required: required.has(id),
			kind: "text"
		};
		const enumVals = Array.isArray(prop.enum) ? prop.enum : null;
		const oneOf = Array.isArray(prop.oneOf) ? prop.oneOf : null;
		if (enumVals && enumVals.length > 0) {
			const names = Array.isArray(prop.enumNames) ? prop.enumNames : [];
			const options = [];
			for (let i = 0; i < enumVals.length; i++) {
				const v = enumVals[i];
				if (typeof v !== "string" && typeof v !== "boolean") return null;
				options.push({
					label: typeof names[i] === "string" ? names[i] : String(v),
					value: v
				});
			}
			field.kind = "select";
			field.options = options;
			if (prop.default !== void 0 && options.some((o) => o.value === prop.default)) field.defaultValue = prop.default;
		} else if (oneOf && oneOf.length > 0) {
			const options = [];
			for (const entry of oneOf) {
				if (!entry || typeof entry !== "object" || entry.const === void 0) return null;
				if (typeof entry.const !== "string" && typeof entry.const !== "boolean") return null;
				options.push({
					label: typeof entry.title === "string" ? entry.title : String(entry.const),
					value: entry.const
				});
			}
			field.kind = "select";
			field.options = options;
			if (prop.default !== void 0 && options.some((o) => o.value === prop.default)) field.defaultValue = prop.default;
		} else if (prop.type === "string") {
			field.kind = "text";
			field.secret = prop.format === "password";
			if (typeof prop.default === "string") field.defaultValue = prop.default;
		} else if (prop.type === "boolean") {
			field.kind = "select";
			field.options = [{
				label: "True",
				value: true
			}, {
				label: "False",
				value: false
			}];
			if (typeof prop.default === "boolean") field.defaultValue = prop.default;
		} else return null;
		fields.push(field);
	}
	return fields;
}
/** Dedupes the "output truncated" notice per process. */
var cappedProcessNotices = /* @__PURE__ */ new Set();
function decodeBase64ToText(b64) {
	try {
		const bin = atob(b64);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new TextDecoder().decode(bytes);
	} catch {
		return "";
	}
}
/**
* Routes a server-initiated request (approval / elicitation / user-input) into the
* existing onQuestion UI flow. The answer path (rpc.respond + steer fallback) lives
* in answerQuestion — unchanged.
*/
function handleServerRequest(h, method, params, reqId) {
	const q = {
		id: String(reqId ?? params?.id ?? Date.now()),
		title: String(params?.title ?? params?.question ?? params?.message ?? params?.prompt ?? params?.text ?? params?.reason ?? {
			"mcpServer/elicitation/request": "Server request",
			"item/tool/requestUserInput": "Agent question",
			"item/commandExecution/requestApproval": "Approval requested",
			"item/fileChange/requestApproval": "Approval requested",
			"item/permissions/requestApproval": "Permission requested"
		}[method] ?? "Agent question"),
		options: Array.isArray(params?.options) ? params.options.map((o) => String(o)) : void 0,
		requestId: reqId,
		method,
		params
	};
	if (h.onQuestion) h.onQuestion(q, reqId);
}
/** Shared event dispatch for runTurn and attachToRunningTurn. */
function dispatchEvent(h, threadId, method, params, reqId, off) {
	const eventThreadId = params?.threadId ?? params?.thread_id;
	if (eventThreadId && eventThreadId !== threadId) return;
	const item = params?.item;
	switch (method) {
		case "turn/started": {
			const turnId = params?.turn?.id ?? params?.turnId;
			if (turnId && h.onTurnStarted) h.onTurnStarted(String(turnId));
			return;
		}
		case "thread/queue/changed":
			if (h.onQueueChanged) h.onQueueChanged();
			return;
		case "item/started":
		case "item/completed": {
			const p = item && itemToPart(item, method === "item/started" ? "running" : "done");
			if (p) {
				h.onPart(p);
				if (p.meta?.questions && p.meta.questions.length > 0 && h.onQuestion) h.onQuestion(p.meta.questions[0], reqId);
			}
			break;
		}
		case "item/agentMessage/delta":
			h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.delta ?? params?.textDelta ?? params?.text ?? ""), "text");
			break;
		case "item/reasoning/summaryTextDelta":
		case "item/reasoning/textDelta":
			h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.delta ?? params?.textDelta ?? params?.text ?? ""), "reasoning");
			break;
		case "item/reasoning/summaryPartAdded":
			h.onDelta(String(params?.itemId ?? params?.id ?? ""), "\n\n", "reasoning");
			break;
		case "item/commandExecution/outputDelta":
		case "item/fileChange/outputDelta":
			h.onDelta(String(params?.itemId ?? params?.processId ?? params?.id ?? ""), String(params?.delta ?? params?.chunk ?? params?.output ?? ""), "output");
			break;
		case "command/exec/outputDelta": {
			const processId = String(params?.processId ?? "");
			const text = params?.deltaBase64 ? decodeBase64ToText(String(params.deltaBase64)) : "";
			if (processId && text) h.onDelta(processId, text, "output");
			if (params?.capReached && processId && !cappedProcessNotices.has(processId)) {
				cappedProcessNotices.add(processId);
				h.onNotice("Command output truncated (server cap reached)", "warning");
			}
			break;
		}
		case "item/mcpToolCall/progress":
			h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.message ?? ""), "output");
			break;
		case "item/fileChange/patchUpdated": {
			const patchItemId = String(params?.itemId ?? params?.id ?? "");
			const changes = Array.isArray(params?.changes) ? params.changes : [];
			if (patchItemId && changes.length > 0) {
				const lines = changes.map((c) => {
					const header = `${str$1(c?.kind?.type ?? c?.kind ?? "update")}: ${str$1(c?.path ?? "")}`.trim();
					const diff = str$1(c?.diff ?? "");
					return diff ? `${header}\n${diff}` : header;
				});
				h.onDelta(patchItemId, lines.join("\n\n"), "output");
			}
			break;
		}
		case "item/commandExecution/terminalInteraction": {
			const stdinText = str$1(params?.stdin ?? "");
			if (stdinText) h.onDelta(String(params?.itemId ?? params?.id ?? ""), stdinText, "output");
			break;
		}
		case "turn/plan/updated":
			h.onPlan(toPlanSteps(params?.plan ?? []), params?.explanation ? String(params.explanation) : void 0);
			break;
		case "thread/goal/updated": {
			const g = params?.goal ?? params;
			const objective = String(g?.objective ?? g?.text ?? g?.title ?? "");
			if (objective) h.onPlan([{
				text: objective,
				status: g?.status === "completed" || g?.completed ? "done" : "active"
			}], "Goal");
			break;
		}
		case "thread/tokenUsage/updated": {
			const t = (params?.tokenUsage)?.total;
			if (t) h.onStats({
				totalTokens: t.totalTokens,
				outputTokens: t.outputTokens
			});
			break;
		}
		case "mcpServer/elicitation/request":
		case "item/tool/requestUserInput":
		case "item/commandExecution/requestApproval":
		case "item/fileChange/requestApproval":
		case "item/permissions/requestApproval":
			handleServerRequest(h, method, params, reqId);
			break;
		case "warning": {
			const msg = formatCoreError(params, "Warning");
			if (!/^Model metadata for .* not found/.test(msg)) h.onNotice(msg, "warning");
			break;
		}
		case "thread/environment/connected":
			h.onNotice("Environment connected", "info");
			break;
		case "thread/environment/disconnected":
			h.onNotice("Environment disconnected", "warning");
			break;
		case "mcpServer/startupStatus/updated": {
			const mcpName = str$1(params?.name ?? params?.server ?? "MCP server");
			const mcpStatus = str$1(params?.status ?? "");
			if (mcpStatus === "ready") h.onNotice(`${mcpName} connected`, "info");
			else if (mcpStatus === "failed") h.onNotice(`${mcpName} failed to start`, "warning");
			break;
		}
		case "error": {
			const msg = formatCoreError(params?.error ?? params);
			if (params?.willRetry) {
				h.onNotice(`${msg}\nRetrying…`, "warning");
				break;
			}
			off();
			h.onDone(msg);
			break;
		}
		case "turn/completed": {
			off();
			const turn = params?.turn;
			if (typeof turn?.durationMs === "number") h.onStats({ durationMs: turn.durationMs });
			if (turn?.status === "failed") h.onDone(formatCoreError(turn?.error, "Turn failed"));
			else if (turn?.status === "interrupted") h.onDone(void 0, "Stopped");
			else h.onDone();
			break;
		}
	}
}
/** Sends a prompt and streams every live event for that thread until the turn completes. */
async function runTurn(rpc, threadId, text, opts, h) {
	const off = rpc.on(({ method, params, id: reqId }) => dispatchEvent(h, threadId, method, params, reqId, off));
	const clientUserMessageId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const turnStartPayload = {
		threadId,
		input: [{
			type: "text",
			text,
			text_elements: []
		}],
		clientUserMessageId,
		...opts.model ? { model: opts.model } : {},
		...opts.effort ? { effort: opts.effort } : {}
	};
	const fireTurnStarted = (res) => {
		if (res?.turn?.id && h.onTurnStarted) h.onTurnStarted(String(res.turn.id));
	};
	try {
		try {
			await rpc.call("thread/resume", { threadId });
		} catch {}
		fireTurnStarted(await rpc.call("turn/start", turnStartPayload));
	} catch (e) {
		const errText = formatCoreError(e);
		if (/thread not found/i.test(errText)) try {
			await rpc.call("thread/resume", { threadId });
			fireTurnStarted(await rpc.call("turn/start", turnStartPayload));
			h.onNotice("Session was revived on the server — continuing here.", "info");
			return off;
		} catch (retryErr) {
			off();
			h.onDone(formatCoreError(retryErr));
			return off;
		}
		off();
		h.onDone(errText);
	}
	return off;
}
/** Attaches listeners to an already running turn on the server without issuing turn/start. */
function attachToRunningTurn(rpc, threadId, h) {
	rpc.call("thread/resume", { threadId }).catch(() => {});
	const off = rpc.on(({ method, params, id: reqId }) => dispatchEvent(h, threadId, method, params, reqId, off));
	return off;
}
var interruptTurn = (rpc, threadId) => rpc.call("turn/interrupt", { threadId });
/** Adds a prompt to the server-side queue for the thread so it executes even if the app closes. */
async function addPromptToQueue(rpc, threadId, text) {
	const clientUserMessageId = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	try {
		await rpc.call("thread/resume", { threadId }).catch(() => {});
		const res = await rpc.call("thread/queue/add", {
			threadId,
			input: [{
				type: "text",
				text,
				text_elements: []
			}],
			clientUserMessageId
		});
		const sub = res?.queuedSubmission ?? res?.queued_submission ?? res;
		return {
			id: String(sub?.id ?? clientUserMessageId),
			text,
			createdAt: Date.now()
		};
	} catch (e) {
		console.warn("[addPromptToQueue] server queue add failed:", e);
		return null;
	}
}
/** Lists all queued prompts on the server for the thread. */
async function listQueuedPrompts(rpc, threadId) {
	try {
		const res = await rpc.call("thread/queue/list", { threadId });
		return (res?.data ?? res?.items ?? res?.queuedSubmissions ?? []).map((item) => {
			let promptText = "";
			if (Array.isArray(item.input)) promptText = item.input.map((i) => String(i?.text ?? "")).filter(Boolean).join("\n");
			else if (typeof item.input === "string") promptText = item.input;
			return {
				id: String(item.id ?? item.clientUserMessageId ?? ""),
				text: promptText || "Queued prompt",
				createdAt: typeof item.createdAt === "number" ? item.createdAt : void 0
			};
		}).filter((q) => q.id);
	} catch {
		return [];
	}
}
/** Deletes a queued prompt from the server queue. */
async function deleteQueuedPrompt(rpc, threadId, queuedSubmissionId) {
	try {
		await rpc.call("thread/queue/delete", {
			threadId,
			queuedSubmissionId
		});
		return true;
	} catch (e) {
		console.warn("[deleteQueuedPrompt] failed:", e);
		return false;
	}
}
/** Explicitly starts the next item in the server queue for a thread. */
async function startQueuedPrompt(rpc, threadId, queuedSubmissionId) {
	try {
		const res = await rpc.call("thread/queue/start", {
			threadId,
			...queuedSubmissionId ? { queuedSubmissionId } : {}
		});
		return res?.turn?.id ? String(res.turn.id) : null;
	} catch (e) {
		console.warn("[startQueuedPrompt] failed:", e);
		return null;
	}
}
/**
* Responds to a server approval/elicitation request with the structured
* response the protocol expects. Unlike answerQuestion, this does NOT
* steer or start a new turn — the server resumes the paused turn itself.
*/
function answerApproval(rpc, requestId, method, approved, params, content) {
	if (requestId == null) return;
	let response = null;
	switch (method) {
		case "item/commandExecution/requestApproval":
		case "item/fileChange/requestApproval":
			response = { decision: approved ? "accept" : "decline" };
			break;
		case "item/permissions/requestApproval":
			response = approved ? {
				permissions: params?.permissions ?? {},
				scope: "turn"
			} : {
				permissions: {},
				scope: "turn"
			};
			break;
		case "mcpServer/elicitation/request":
			response = {
				action: approved ? "accept" : "decline",
				content: approved ? content ?? null : null
			};
			break;
		default: return;
	}
	rpc.respond(requestId, response);
}
/** Steers or responds to an active turn with an answer to a question. */
async function answerQuestion(rpc, threadId, answer, requestId, turnId) {
	if (requestId != null) rpc.respond(requestId, { answer });
	try {
		await rpc.call("turn/steer", {
			threadId,
			...turnId ? { expectedTurnId: turnId } : {},
			input: [{
				type: "text",
				text: answer,
				text_elements: []
			}]
		});
	} catch {
		await rpc.call("turn/start", {
			threadId,
			input: [{
				type: "text",
				text: answer,
				text_elements: []
			}]
		}).catch(() => {});
	}
}
var makeId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
function isOptimisticId(id) {
	return id.startsWith("u_") || id.startsWith("live_");
}
function userText(m) {
	return (m.parts ?? []).map((p) => p.text ?? "").join("\n").trim();
}
function getPendingLocalUserMessages(localMsgs, serverMsgs, _isTurnRunning = false) {
	const optimistic = (localMsgs ?? []).filter((m) => m.role === "user" && isOptimisticId(m.id));
	if (optimistic.length === 0) return [];
	const serverTail = (serverMsgs ?? []).filter((m) => m.role === "user").slice(-Math.max(optimistic.length * 2, 6)).map(userText);
	const pending = [];
	for (const m of optimistic) {
		const i = serverTail.indexOf(userText(m));
		if (i === -1) pending.push(m);
		else serverTail.splice(i, 1);
	}
	return pending;
}
var isPreservableWorkflowPart = (p) => p.kind === "tool" || p.kind === "reasoning" || p.kind === "plan";
var hasWorkflowSteps = (m) => m.role === "assistant" && (m.parts ?? []).some(isPreservableWorkflowPart);
function mergeWithLocalMessages(localMsgs, serverMsgs, isTurnRunning = false, visibleLimit, activeAid) {
	if (!serverMsgs || serverMsgs.length === 0) {
		if (!localMsgs) return [];
		return visibleLimit ? localMsgs.slice(-visibleLimit) : localMsgs;
	}
	if (!localMsgs || localMsgs.length === 0) return visibleLimit ? serverMsgs.slice(-visibleLimit) : serverMsgs;
	const pendingLocalUserMsgs = getPendingLocalUserMessages(localMsgs, serverMsgs, isTurnRunning);
	const isLiveAssistant = (m) => m.role === "assistant" && (activeAid && m.id === activeAid || m.parts?.some((p) => p.status === "running") || isTurnRunning && (m.id.startsWith("live_") || activeAid != null && m.id === activeAid));
	const liveAssistantMsgs = localMsgs.filter(isLiveAssistant);
	const finishedWorkflowMsgs = localMsgs.filter((m) => hasWorkflowSteps(m) && !isLiveAssistant(m) && !m.id.startsWith("live_"));
	const serverFiltered = serverMsgs.filter((sm) => !liveAssistantMsgs.some((lm) => lm.id === sm.id));
	const serverById = /* @__PURE__ */ new Map();
	for (const sm of serverFiltered) serverById.set(sm.id, sm);
	const grafted = /* @__PURE__ */ new Map();
	const keptLocal = [];
	for (const lm of finishedWorkflowMsgs) {
		if (lm.id.startsWith("live_")) {
			keptLocal.push(lm);
			continue;
		}
		const target = serverById.get(lm.id);
		if (!target) {
			keptLocal.push(lm);
			continue;
		}
		const existingPartIds = new Set((target.parts ?? []).map((p) => p.id));
		const missing = (lm.parts ?? []).filter((p) => isPreservableWorkflowPart(p) && !existingPartIds.has(p.id));
		if (missing.length > 0) {
			const mergedMsg = {
				...target,
				parts: [...target.parts ?? [], ...missing]
			};
			grafted.set(target.id, mergedMsg);
			serverById.set(target.id, mergedMsg);
		}
	}
	const combined = [
		...serverFiltered.map((sm) => grafted.get(sm.id) ?? sm),
		...pendingLocalUserMsgs,
		...keptLocal,
		...liveAssistantMsgs
	];
	const seenIds = /* @__PURE__ */ new Set();
	const deduplicated = [];
	for (const msg of combined) if (!seenIds.has(msg.id)) {
		seenIds.add(msg.id);
		deduplicated.push(msg);
	}
	return visibleLimit ? deduplicated.slice(-visibleLimit) : deduplicated;
}
/** Owns the transcript for the active session: history + live streaming turn. */
function useChat() {
	const { rpc, activeSessionId, setActiveSessionId, workingSessionId, setWorkingSessionId, modelId, effort, sandbox } = useAva();
	const qc = useQueryClient();
	const history = useSessionHistory(activeSessionId);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [status, setStatus] = (0, import_react.useState)("ready");
	const [error, setError] = (0, import_react.useState)(null);
	const [pendingApprovals, setPendingApprovals] = (0, import_react.useState)([]);
	const [queuedPrompts, setQueuedPrompts] = (0, import_react.useState)([]);
	const [visibleCount, setVisibleCount] = (0, import_react.useState)(30);
	const allHistoryRef = (0, import_react.useRef)([]);
	const messagesRef = (0, import_react.useRef)([]);
	const offRef = (0, import_react.useRef)(null);
	const turnIdRef = (0, import_react.useRef)(null);
	const aidRef = (0, import_react.useRef)(null);
	const streamingRef = (0, import_react.useRef)(false);
	const currentSessionRef = (0, import_react.useRef)(null);
	const runningThreadIdRef = (0, import_react.useRef)(null);
	const turnStartedAtRef = (0, import_react.useRef)(0);
	const drainTimerRef = (0, import_react.useRef)(null);
	const createHandlersRef = (0, import_react.useRef)(() => {
		throw new Error("createHandlers not ready");
	});
	const drainQueueRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => () => {
		if (drainTimerRef.current) clearTimeout(drainTimerRef.current);
	}, []);
	const loadOlder = (0, import_react.useCallback)(() => {
		setVisibleCount((current) => {
			const next = Math.min(allHistoryRef.current.length, current + 30);
			setMessages(allHistoryRef.current.slice(-next));
			return next;
		});
	}, []);
	const patchAssistant = (0, import_react.useCallback)((id, fn) => {
		setMessages((m) => {
			messagesRef.current = m;
			if (!m.some((msg) => msg.id === id)) {
				const newMsg = {
					id,
					role: "assistant",
					parts: fn([]),
					stats: { startedAt: Date.now() }
				};
				return [...m, newMsg];
			}
			return m.map((msg) => msg.id === id ? {
				...msg,
				parts: fn(msg.parts)
			} : msg);
		});
	}, []);
	const renameAssistant = (0, import_react.useCallback)((from, to) => {
		setMessages((m) => {
			if (!m.some((msg) => msg.id === from)) return m;
			const existingTo = m.find((msg) => msg.id === to);
			if (existingTo) {
				const fromMsg = m.find((msg) => msg.id === from);
				const existingPartIds = new Set((existingTo.parts ?? []).map((p) => p.id));
				const extraParts = (fromMsg?.parts ?? []).filter((p) => !existingPartIds.has(p.id));
				return m.filter((msg) => msg.id !== from).map((msg) => msg.id === to ? {
					...msg,
					parts: [...msg.parts ?? [], ...extraParts]
				} : msg);
			}
			return m.map((msg) => msg.id === from ? {
				...msg,
				id: to
			} : msg);
		});
	}, []);
	const refreshQueue = (0, import_react.useCallback)(async (threadId) => {
		if (!rpc || !threadId) return [];
		try {
			const items = await listQueuedPrompts(rpc, threadId);
			setQueuedPrompts(items);
			return items;
		} catch {
			return [];
		}
	}, [rpc]);
	(0, import_react.useEffect)(() => {
		if (activeSessionId) refreshQueue(activeSessionId);
		else setQueuedPrompts([]);
	}, [activeSessionId, refreshQueue]);
	/** Builds the per-turn event handlers for a live assistant message. */
	const createHandlers = (0, import_react.useCallback)((aid, threadId) => {
		let currentAid = aid;
		const scheduleDrain = () => {
			if (drainTimerRef.current) clearTimeout(drainTimerRef.current);
			drainTimerRef.current = setTimeout(() => {
				drainTimerRef.current = null;
				drainQueueRef.current?.(threadId);
			}, 800);
		};
		return {
			onPart: (p) => {
				setStatus("streaming");
				patchAssistant(currentAid, (parts) => {
					const i = parts.findIndex((x) => x.id === p.id);
					if (i === -1) return [...parts, p];
					const next = [...parts];
					next[i] = {
						...p,
						text: p.text || parts[i].text
					};
					return next;
				});
			},
			onDelta: (itemId, delta, kind) => {
				setStatus("streaming");
				patchAssistant(currentAid, (parts) => {
					const i = parts.findIndex((x) => x.id === itemId);
					if (kind === "output") {
						if (i === -1) return parts;
						const next = [...parts];
						next[i] = {
							...next[i],
							output: (next[i].output ?? "") + delta
						};
						return next;
					}
					if (i === -1) return [...parts, {
						id: itemId,
						kind,
						text: delta,
						status: "running"
					}];
					const next = [...parts];
					next[i] = {
						...next[i],
						text: next[i].text + delta
					};
					return next;
				});
			},
			onPlan: (steps, title) => {
				const pid = title === "Goal" ? "goal" : "plan";
				patchAssistant(currentAid, (parts) => {
					const part = {
						id: pid,
						kind: "plan",
						text: title ?? "Plan",
						status: "running",
						meta: { steps }
					};
					const i = parts.findIndex((x) => x.id === pid);
					if (i === -1) return [...parts, part];
					const next = [...parts];
					next[i] = part;
					return next;
				});
			},
			onNotice: (text, tone) => {
				patchAssistant(currentAid, (parts) => parts.some((p) => p.kind === "notice" && p.text === text) ? parts : [...parts, {
					id: makeId("n"),
					kind: "notice",
					text,
					status: "done",
					meta: { tone }
				}]);
			},
			onStats: (stats) => {
				setMessages((m) => m.map((msg) => msg.id === currentAid ? {
					...msg,
					stats: {
						...msg.stats,
						...stats
					}
				} : msg));
			},
			onTurnStarted: (turnId) => {
				turnIdRef.current = turnId;
				const canonicalAid = `a_${turnId}`;
				if (currentAid !== canonicalAid) {
					renameAssistant(currentAid, canonicalAid);
					aidRef.current = canonicalAid;
					currentAid = canonicalAid;
				}
			},
			onQueueChanged: () => {
				refreshQueue(threadId);
			},
			onQuestion: (question, requestId) => {
				const qId = question.id || makeId("q");
				if (question.method && isApprovalMethod(question.method)) {
					const detail = approvalDetail(question.method, question.params);
					const form = question.method === "mcpServer/elicitation/request" ? parseElicitationForm(question.params) ?? void 0 : void 0;
					setPendingApprovals((prev) => prev.some((a) => a.id === qId) ? prev : [...prev, {
						id: qId,
						method: question.method,
						title: question.title,
						detail,
						params: question.params,
						requestId,
						form
					}]);
				}
				patchAssistant(currentAid, (parts) => {
					if (parts.some((p) => p.kind === "question" && p.text === question.title)) return parts;
					return [...parts, {
						id: qId,
						kind: "question",
						text: question.title,
						status: "done",
						meta: { questions: [{
							...question,
							id: qId,
							requestId
						}] }
					}];
				});
			},
			onDone: (err, info) => {
				patchAssistant(currentAid, (parts) => {
					const next = parts.map((p) => p.status === "running" ? {
						...p,
						status: err ? "error" : "done"
					} : p);
					const note = err ?? info;
					if (!note) return next;
					return [...next, {
						id: makeId("end"),
						kind: "notice",
						text: note,
						status: "done",
						meta: { tone: err ? "error" : "info" }
					}];
				});
				setMessages((m) => m.map((msg) => msg.id === currentAid && msg.stats?.startedAt && !msg.stats.durationMs ? {
					...msg,
					stats: {
						...msg.stats,
						durationMs: Date.now() - msg.stats.startedAt
					}
				} : msg));
				setStatus(err ? "error" : "ready");
				setWorkingSessionId(null);
				streamingRef.current = false;
				aidRef.current = null;
				turnIdRef.current = null;
				runningThreadIdRef.current = null;
				qc.invalidateQueries({ queryKey: keys.sessions });
				if (threadId) qc.invalidateQueries({ queryKey: keys.session(threadId) });
				if (!err && info !== "Stopped") scheduleDrain();
				setPendingApprovals([]);
			}
		};
	}, [
		refreshQueue,
		patchAssistant,
		setWorkingSessionId,
		qc
	]);
	createHandlersRef.current = createHandlers;
	(0, import_react.useEffect)(() => {
		const sessionChanged = currentSessionRef.current !== activeSessionId;
		const historyData = history.data;
		const historyMessages = historyData?.messages ?? [];
		const isTurnRunning = !!historyData?.isTurnRunning;
		const serverActiveTurnId = historyData?.activeTurnId;
		if (sessionChanged) {
			currentSessionRef.current = activeSessionId;
			if (!Boolean(activeSessionId && runningThreadIdRef.current === activeSessionId && streamingRef.current)) {
				if (offRef.current) {
					try {
						offRef.current();
					} catch {}
					offRef.current = null;
				}
				runningThreadIdRef.current = null;
				setPendingApprovals([]);
				setError(null);
				setVisibleCount(30);
				allHistoryRef.current = historyMessages;
				if (isTurnRunning && rpc && activeSessionId) {
					streamingRef.current = true;
					setStatus("streaming");
					runningThreadIdRef.current = activeSessionId;
					setWorkingSessionId(activeSessionId);
					const aid = serverActiveTurnId ? `a_${serverActiveTurnId}` : makeId("live");
					aidRef.current = aid;
					turnIdRef.current = serverActiveTurnId || null;
					setMessages(mergeWithLocalMessages([], historyMessages, true, 30, aid));
					try {
						offRef.current?.();
					} catch {}
					offRef.current = attachToRunningTurn(rpc, activeSessionId, createHandlersRef.current(aid, activeSessionId));
				} else {
					streamingRef.current = false;
					setStatus("ready");
					aidRef.current = null;
					turnIdRef.current = null;
					setWorkingSessionId(null);
					setMessages(historyMessages.slice(-30));
				}
			}
			return;
		}
		if (activeSessionId) {
			const isRecentlySubmitted = Date.now() - turnStartedAtRef.current < 5e3;
			if (!isTurnRunning && streamingRef.current && !isRecentlySubmitted && (offRef.current == null || Date.now() - turnStartedAtRef.current > 8e3)) {
				try {
					offRef.current?.();
				} catch {}
				offRef.current = null;
				streamingRef.current = false;
				setStatus("ready");
				aidRef.current = null;
				turnIdRef.current = null;
				runningThreadIdRef.current = null;
				setWorkingSessionId(null);
				allHistoryRef.current = historyMessages;
				setMessages((prev) => mergeWithLocalMessages(prev, historyMessages, false, visibleCount, null));
				return;
			}
			if (isTurnRunning && serverActiveTurnId) {
				const canonicalId = `a_${serverActiveTurnId}`;
				const liveAid = aidRef.current;
				const liveBubble = streamingRef.current ? messagesRef.current.find((m) => m.id === liveAid) ?? allHistoryRef.current.find((m) => m.id === liveAid) : void 0;
				const canonical = historyMessages.find((m) => m.id === canonicalId) ?? {
					id: canonicalId,
					role: "assistant",
					parts: []
				};
				let parts = canonical.parts ?? [];
				if (liveBubble) {
					const existingIds = new Set(parts.map((pt) => pt.id));
					const missingLocal = (liveBubble.parts ?? []).filter((pt) => !existingIds.has(pt.id));
					if (missingLocal.length) parts = [...parts, ...missingLocal];
				}
				const pendingUserMsgs = getPendingLocalUserMessages(messagesRef.current, historyMessages, true);
				const mergedMsg = {
					...canonical,
					parts,
					stats: liveBubble?.stats ?? canonical.stats
				};
				allHistoryRef.current = [
					...historyMessages.filter((m) => m.id !== canonicalId),
					...pendingUserMsgs,
					mergedMsg
				];
				setMessages(allHistoryRef.current.slice(-Math.max(visibleCount, 30)));
				if (!streamingRef.current && rpc) {
					streamingRef.current = true;
					setStatus("streaming");
					runningThreadIdRef.current = activeSessionId;
					setWorkingSessionId(activeSessionId);
					aidRef.current = canonicalId;
					turnIdRef.current = serverActiveTurnId;
					try {
						offRef.current?.();
					} catch {}
					offRef.current = attachToRunningTurn(rpc, activeSessionId, createHandlersRef.current(canonicalId, activeSessionId));
				}
				return;
			}
			if (isTurnRunning && !streamingRef.current && rpc) {
				const aid = makeId("live");
				aidRef.current = aid;
				turnIdRef.current = null;
				allHistoryRef.current = historyMessages;
				setMessages((prev) => mergeWithLocalMessages(prev, historyMessages, true, visibleCount, aid));
				try {
					offRef.current?.();
				} catch {}
				offRef.current = attachToRunningTurn(rpc, activeSessionId, createHandlersRef.current(aid, activeSessionId));
				return;
			}
			if (!streamingRef.current && status === "ready" && historyMessages.length > 0) {
				allHistoryRef.current = historyMessages;
				setMessages((prev) => mergeWithLocalMessages(prev, historyMessages, false, visibleCount, null));
			}
		}
	}, [
		history.data,
		activeSessionId,
		visibleCount,
		rpc,
		setWorkingSessionId,
		status
	]);
	(0, import_react.useEffect)(() => {
		const onVisible = () => {
			if (document.visibilityState === "visible" && activeSessionId) {
				history.refetch();
				if (activeSessionId) refreshQueue(activeSessionId);
			}
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [
		activeSessionId,
		history,
		refreshQueue
	]);
	(0, import_react.useEffect)(() => {
		if (!activeSessionId || status !== "streaming" && status !== "submitted") return;
		const interval = setInterval(() => {
			if (streamingRef.current) {
				history.refetch();
				refreshQueue(activeSessionId);
			}
		}, 2e3);
		return () => clearInterval(interval);
	}, [
		activeSessionId,
		status,
		history,
		refreshQueue
	]);
	drainQueueRef.current = (0, import_react.useCallback)(async (threadId) => {
		if (!rpc || streamingRef.current) return;
		if ((await refreshQueue(threadId)).length === 0 || streamingRef.current) return;
		try {
			const nextTurnId = await startQueuedPrompt(rpc, threadId);
			if (!nextTurnId) return;
			const nextAid = `a_${nextTurnId}`;
			aidRef.current = nextAid;
			turnIdRef.current = nextTurnId;
			turnStartedAtRef.current = Date.now();
			runningThreadIdRef.current = threadId;
			streamingRef.current = true;
			setStatus("streaming");
			setWorkingSessionId(threadId);
			setMessages((m) => [...m, {
				id: nextAid,
				role: "assistant",
				parts: [],
				stats: { startedAt: Date.now() }
			}]);
			offRef.current = attachToRunningTurn(rpc, threadId, createHandlersRef.current(nextAid, threadId));
		} catch (e) {
			console.warn("[useChat.drainQueue] failed:", e);
		}
	}, [
		rpc,
		refreshQueue,
		setWorkingSessionId
	]);
	const send = (0, import_react.useCallback)(async (text, cwd = "/") => {
		if (!rpc || !text.trim()) return;
		setError(null);
		setStatus("submitted");
		let threadId = activeSessionId;
		if (!threadId) try {
			threadId = await startSession(rpc, {
				cwd,
				sandbox,
				...modelId ? { model: modelId } : {}
			});
			setActiveSessionId(threadId);
			qc.invalidateQueries({ queryKey: keys.sessions });
		} catch (e) {
			setStatus("error");
			setError(formatCoreError(e));
			return;
		}
		if (streamingRef.current && threadId) {
			try {
				if (await addPromptToQueue(rpc, threadId, text.trim())) {
					await refreshQueue(threadId);
					setStatus("streaming");
				} else setError("Failed to queue prompt.");
			} catch (e) {
				setError(formatCoreError(e, "Failed to queue prompt"));
			}
			return threadId;
		}
		turnStartedAtRef.current = Date.now();
		runningThreadIdRef.current = threadId;
		setWorkingSessionId(threadId);
		const aid = `live_${Date.now()}`;
		aidRef.current = aid;
		turnIdRef.current = null;
		streamingRef.current = true;
		try {
			offRef.current?.();
		} catch {}
		setMessages((m) => [
			...m,
			{
				id: `u_${Date.now()}`,
				role: "user",
				parts: [{
					id: "u",
					kind: "text",
					text,
					status: "done"
				}]
			},
			{
				id: aid,
				role: "assistant",
				parts: [],
				stats: { startedAt: Date.now() }
			}
		]);
		try {
			offRef.current = await runTurn(rpc, threadId, text, {
				...modelId ? { model: modelId } : {},
				effort
			}, createHandlers(aid, threadId));
		} catch (e) {
			streamingRef.current = false;
			runningThreadIdRef.current = null;
			aidRef.current = null;
			turnIdRef.current = null;
			setWorkingSessionId(null);
			setStatus("error");
			setError(formatCoreError(e, "Failed to start turn"));
			setMessages((m) => m.filter((msg) => msg.id !== aid));
		}
		return threadId;
	}, [
		rpc,
		activeSessionId,
		modelId,
		effort,
		sandbox,
		setActiveSessionId,
		setWorkingSessionId,
		qc,
		refreshQueue,
		createHandlers
	]);
	/** Re-attaches to a stopped/interrupted turn (or starts the next queued prompt). */
	const resume = (0, import_react.useCallback)(async () => {
		if (!rpc || !activeSessionId) return;
		const threadId = activeSessionId;
		setError(null);
		setStatus("streaming");
		streamingRef.current = true;
		turnStartedAtRef.current = Date.now();
		runningThreadIdRef.current = threadId;
		setWorkingSessionId(threadId);
		try {
			await rpc.call("thread/resume", { threadId });
			const aid = aidRef.current ?? `live_${Date.now()}`;
			aidRef.current = aid;
			setMessages((m) => {
				if (m.some((msg) => msg.id === aid)) return m;
				return [...m, {
					id: aid,
					role: "assistant",
					parts: [],
					stats: { startedAt: Date.now() }
				}];
			});
			try {
				offRef.current?.();
			} catch {}
			offRef.current = attachToRunningTurn(rpc, threadId, createHandlersRef.current(aid, threadId));
		} catch (e) {
			const errStr = formatCoreError(e, "Failed to resume turn");
			console.warn("[useChat.resume] resume failed:", e);
			streamingRef.current = false;
			runningThreadIdRef.current = null;
			setStatus("error");
			setError(errStr);
			setWorkingSessionId(null);
		}
	}, [
		rpc,
		activeSessionId,
		setWorkingSessionId
	]);
	const removeQueued = (0, import_react.useCallback)(async (id) => {
		if (!rpc || !activeSessionId) return;
		try {
			await deleteQueuedPrompt(rpc, activeSessionId, id);
			await refreshQueue(activeSessionId);
		} catch (e) {
			console.warn("[useChat.removeQueued] failed:", e);
		}
	}, [
		rpc,
		activeSessionId,
		refreshQueue
	]);
	/**
	* Responds to a pending approval from the sticky card above the composer.
	*/
	const answerPendingApproval = (0, import_react.useCallback)((id, approved, content) => {
		const approval = pendingApprovals.find((a) => a.id === id);
		if (!approval) return;
		try {
			if (rpc) answerApproval(rpc, approval.requestId, approval.method, approved, approval.params, content);
		} catch (e) {
			console.warn("[useChat.answerPendingApproval] failed:", e);
		}
		setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
		setMessages((m) => m.map((msg) => msg.role === "assistant" ? {
			...msg,
			parts: msg.parts.map((p) => p.id === id || p.meta?.questions?.some((q) => q.id === id) ? {
				...p,
				meta: {
					...p.meta,
					questions: (p.meta?.questions ?? []).map((q) => q.id === id ? {
						...q,
						answered: true
					} : q)
				}
			} : p)
		} : msg));
	}, [pendingApprovals, rpc]);
	/** Answers an inline agent question (option pill) from the transcript. */
	const answerQuestionPart = (0, import_react.useCallback)(async (questionId, option) => {
		if (!rpc || !activeSessionId) return;
		let found;
		for (const msg of messages) {
			for (const p of msg.parts) {
				const q = p.meta?.questions?.find((qq) => qq.id === questionId);
				if (q) {
					found = q;
					break;
				}
			}
			if (found) break;
		}
		if (!found || found.answered) return;
		setMessages((m) => m.map((msg) => msg.role === "assistant" ? {
			...msg,
			parts: msg.parts.map((p) => p.meta?.questions?.some((q) => q.id === questionId) ? {
				...p,
				meta: {
					...p.meta,
					questions: (p.meta.questions ?? []).map((q) => q.id === questionId ? {
						...q,
						answered: true
					} : q)
				}
			} : p)
		} : msg));
		try {
			await answerQuestion(rpc, activeSessionId, option, found.requestId, turnIdRef.current);
		} catch (e) {
			console.warn("[useChat.answerQuestionPart] failed:", e);
		}
	}, [
		rpc,
		activeSessionId,
		messages
	]);
	return {
		messages,
		status,
		error,
		send,
		stop: (0, import_react.useCallback)(() => {
			if (rpc && activeSessionId) interruptTurn(rpc, activeSessionId).catch(() => {});
			const aid = aidRef.current;
			if (aid) {
				patchAssistant(aid, (parts) => {
					const done = parts.map((pt) => pt.status === "running" ? {
						...pt,
						status: "done"
					} : pt);
					if (done.some((pt) => pt.kind === "notice" && pt.text === "Stopped")) return done;
					return [...done, {
						id: makeId("stop"),
						kind: "notice",
						text: "Stopped",
						status: "done",
						meta: { tone: "info" }
					}];
				});
				setMessages((m) => m.map((msg) => msg.id === aid && msg.stats?.startedAt && !msg.stats.durationMs ? {
					...msg,
					stats: {
						...msg.stats,
						durationMs: Date.now() - msg.stats.startedAt
					}
				} : msg));
			}
			offRef.current?.();
			streamingRef.current = false;
			aidRef.current = null;
			turnIdRef.current = null;
			runningThreadIdRef.current = null;
			setStatus("ready");
			setWorkingSessionId(null);
			setPendingApprovals([]);
		}, [
			rpc,
			activeSessionId,
			setWorkingSessionId,
			patchAssistant
		]),
		clear: (0, import_react.useCallback)(() => setMessages([]), []),
		loadingHistory: history.isLoading,
		hasOlder: allHistoryRef.current.length > visibleCount,
		loadOlder,
		pendingApprovals,
		queuedPrompts,
		answerPendingApproval,
		answerQuestionPart,
		removeQueued,
		resume
	};
}
/** Friendly labels per approval method. */
function methodLabel(method) {
	switch (method) {
		case "item/commandExecution/requestApproval": return "Command approval";
		case "item/fileChange/requestApproval": return "File change approval";
		case "item/permissions/requestApproval": return "Permission request";
		case "mcpServer/elicitation/request": return "MCP server request";
		default: return "Approval requested";
	}
}
/**
* Fillable MCP elicitation form (mcpServer/elicitation/request, form mode).
* Mirrors the desktop TUI: per-field inputs, required validation, submit
* sends { action: "accept", content } and dismiss sends a decline.
*/
function ElicitationForm({ approval, fields, onRespond }) {
	const [values, setValues] = (0, import_react.useState)(() => {
		const init = {};
		for (const f of fields) if (f.kind === "select" && f.options) {
			const idx = f.options.findIndex((o) => o.value === f.defaultValue);
			if (idx >= 0) init[f.id] = idx;
		} else if (typeof f.defaultValue === "string") init[f.id] = f.defaultValue;
		return init;
	});
	const [error, setError] = (0, import_react.useState)(null);
	const fieldValue = (f) => {
		const v = values[f.id];
		if (f.kind === "select") return typeof v === "number" ? f.options?.[v]?.value : void 0;
		const t = typeof v === "string" ? v.trim() : "";
		return t ? t : void 0;
	};
	const submit = () => {
		if (fields.find((f) => f.required && fieldValue(f) === void 0)) {
			setError(`Answer required fields before submitting.`);
			return;
		}
		setError(null);
		const content = {};
		for (const f of fields) {
			const v = fieldValue(f);
			if (v !== void 0) content[f.id] = v;
		}
		onRespond(approval.id, true, content);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault();
			submit();
		},
		onKeyDown: (e) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onRespond(approval.id, false);
			}
		},
		className: "mt-2 space-y-3",
		children: [
			fields.map((f) => {
				const inputId = `elicit-${approval.id}-${f.id}`;
				const invalid = !!error && f.required && fieldValue(f) === void 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
							htmlFor: inputId,
							className: "text-[13px]",
							children: [
								f.label,
								f.required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									className: "ml-0.5 text-destructive",
									children: "*"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: f.required ? "(required)" : "(optional)"
								})
							]
						}),
						f.description && f.description !== f.label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: f.description
						}),
						f.kind === "select" && f.options ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: typeof values[f.id] === "number" ? String(values[f.id]) : "",
							onValueChange: (v) => {
								setValues((prev) => ({
									...prev,
									[f.id]: Number(v)
								}));
								setError(null);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								id: inputId,
								"aria-label": f.label,
								"aria-required": f.required,
								"aria-invalid": invalid,
								className: cn("text-base md:text-sm", invalid && "border-destructive"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select\\u2026" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: f.options.map((o, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: String(i),
								children: o.label
							}, i)) })]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: inputId,
							type: f.secret ? "password" : "text",
							value: typeof values[f.id] === "string" ? values[f.id] : "",
							onChange: (e) => {
								setValues((prev) => ({
									...prev,
									[f.id]: e.target.value
								}));
								setError(null);
							},
							"aria-required": f.required,
							"aria-invalid": invalid,
							autoComplete: "off",
							className: cn("text-base md:text-sm", invalid && "border-destructive")
						})
					]
				}, f.id);
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "alert",
				className: "text-xs font-medium text-destructive",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 pt-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => onRespond(approval.id, false),
					className: "h-10 flex-1 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), "Dismiss"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					className: "h-10 flex-1 rounded-xl bg-success text-white hover:bg-success/90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), "Submit"]
				})]
			})
		]
	});
}
/**
* Sticky approval card shown above the composer while a server approval
* is pending. Allow/Deny send the structured protocol response
* (see answerApproval in core/api/chat). MCP elicitation requests in form
* mode render a fillable form instead (submit sends the filled content).
*/
function ApprovalCard({ approval, onRespond }) {
	const form = approval.method === "mcpServer/elicitation/request" ? approval.form : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "alert",
		className: "glass mb-2 rounded-2xl border border-amber-500/25 p-3.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "grid size-7 shrink-0 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "size-3.5 text-amber-500" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] font-semibold uppercase tracking-wider text-amber-500",
					children: methodLabel(approval.method)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 line-clamp-3 text-sm font-medium leading-6 text-foreground",
				children: approval.title
			}),
			approval.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 line-clamp-6 whitespace-pre-wrap font-mono text-xs leading-5 text-muted-foreground",
				children: approval.detail
			}) : null,
			form && form.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ElicitationForm, {
				approval,
				fields: form,
				onRespond
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => onRespond(approval.id, false),
					className: "h-10 flex-1 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), "Deny"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					onClick: () => onRespond(approval.id, true),
					className: "h-10 flex-1 rounded-xl bg-success text-white hover:bg-success/90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), "Allow"]
				})]
			})
		]
	});
}
var Message = ({ className, from, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("group flex w-full max-w-[95%] flex-col gap-2", from === "user" ? "is-user ml-auto justify-end" : "is-assistant", className),
	...props
});
var MessageContent = ({ children, className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 text-sm", "group-[.is-user]:ml-auto group-[.is-user]:overflow-hidden group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground", "group-[.is-assistant]:text-foreground", className),
	...props,
	children
});
var MessageActions = ({ className, children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex items-center gap-1", className),
	...props,
	children
});
var MessageAction = ({ tooltip, children, label, variant = "ghost", size = "icon-sm", ...props }) => {
	const button = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		size,
		type: "button",
		variant,
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: label || tooltip
		})]
	});
	if (tooltip) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: button
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: tooltip }) })] }) });
	return button;
};
(0, import_react.createContext)(null);
var streamdownPlugins = {
	cjk: A,
	code: G,
	math: h,
	mermaid: f
};
var MessageResponse = (0, import_react.memo)(({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Xa, {
	className: cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className),
	plugins: streamdownPlugins,
	...props
}), (prevProps, nextProps) => prevProps.children === nextProps.children && nextProps.isAnimating === prevProps.isAnimating);
MessageResponse.displayName = "MessageResponse";
var baseName = (p) => p.split("/").pop() || p;
/**
* Matches `[Attachment: name (/path/to/file)]` lines (composer format) and
* markdown images with local (non-http) sources: `![alt](/path/to/file)`.
* Remote http(s)/data:/blob: images are left for the markdown renderer.
*/
var REF_RE = /\[Attachment:\s*([\s\S]+?)\s*\((\/[\s\S]+?)\)\]|!\[([^\]\n]*)\]\(\s*(?!https?:\/\/|data:|blob:)([^)]+?)\s*\)/g;
function splitAttachmentSegments(text) {
	const out = [];
	let last = 0;
	for (const m of text.matchAll(REF_RE)) {
		const idx = m.index ?? 0;
		if (idx > last) out.push({
			kind: "text",
			text: text.slice(last, idx)
		});
		if (m[1] !== void 0) {
			const path = m[2].trim();
			out.push({
				kind: "attachment",
				name: m[1].trim() || baseName(path),
				path
			});
		} else {
			const path = (m[4] ?? "").trim();
			out.push({
				kind: "attachment",
				name: (m[3] ?? "").trim() || baseName(path),
				path
			});
		}
		last = idx + m[0].length;
	}
	if (last < text.length) out.push({
		kind: "text",
		text: text.slice(last)
	});
	return out;
}
var kindIcon = {
	image: Image,
	video: FilePlay,
	audio: FileHeadphone,
	other: FileQuestionMark
};
function Lightbox({ src, name, onClose }) {
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [onClose]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm",
		onClick: onClose,
		role: "dialog",
		"aria-modal": "true",
		"aria-label": name,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onClose,
				"aria-label": "Close preview",
				className: "absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src,
				alt: name,
				className: "max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl",
				onClick: (e) => e.stopPropagation()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 truncate text-xs text-white/70",
				children: name
			})
		]
	});
}
/** Renders one `[Attachment: name (path)]` reference as an image / video / audio / file card. */
function AttachmentCard({ name, path }) {
	const { data, isLoading, isError } = useMediaUrl(path);
	const [zoom, setZoom] = (0, import_react.useState)(false);
	const kind = mediaKind(name);
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("my-2 w-64 max-w-full overflow-hidden rounded-xl ring-1 ring-foreground/10", kind === "audio" ? "h-16" : "h-44"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-full animate-pulse bg-foreground/10" })
	});
	if (isError || !data) {
		const Icon = kindIcon[kind];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "my-2 flex max-w-full items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-foreground/10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5 shrink-0 opacity-60" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 flex-1 truncate text-sm",
					children: name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 text-xs opacity-50",
					children: "preview unavailable"
				})
			]
		});
	}
	if (kind === "image") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: () => setZoom(true),
		title: `${name} — click to enlarge`,
		className: "group my-2 block max-w-full cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-foreground/10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: data,
			alt: name,
			loading: "lazy",
			className: "max-h-80 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
		})
	}), zoom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbox, {
		src: data,
		name,
		onClose: () => setZoom(false)
	})] });
	if (kind === "video") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		src: data,
		controls: true,
		preload: "metadata",
		className: "my-2 max-h-80 w-full max-w-lg rounded-xl bg-black ring-1 ring-foreground/10"
	});
	if (kind === "audio") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "my-2 flex w-full max-w-md items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-foreground/10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileHeadphone, { className: "size-5 shrink-0 opacity-60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate text-xs font-medium",
				children: name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
				src: data,
				controls: true,
				preload: "metadata",
				className: "mt-1 h-8 w-full"
			})]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href: data,
		download: name,
		className: "group my-2 flex max-w-full items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-foreground/10 transition-colors hover:bg-foreground/5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileQuestionMark, { className: "size-5 shrink-0 opacity-60" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "min-w-0 flex-1 truncate text-sm",
				children: name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" })
		]
	});
}
function SaveCredentialWidget({ spec }) {
	const domain = spec.domain || extractDomain(spec.site_url);
	const initialSecret = spec.secret || spec.password || "";
	const authType = spec.auth_type || "password";
	const [username, setUsername] = (0, import_react.useState)(spec.username || "");
	const [secret, setSecret] = (0, import_react.useState)(initialSecret);
	const [showSecret, setShowSecret] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [dismissed, setDismissed] = (0, import_react.useState)(false);
	if (dismissed) return null;
	async function handleSave() {
		setStatus("saving");
		try {
			const res = await fetch("/api/browser/credentials", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					site_url: spec.site_url,
					domain,
					auth_type: authType,
					username,
					secret,
					notes: spec.notes || "Saved from AvA browser agent chat"
				})
			});
			const data = await res.json();
			if (res.ok && data.success) {
				setStatus("saved");
				toast.success(`Saved credentials for ${domain} to encrypted vault`);
			} else {
				setStatus("error");
				toast.error(data.error || "Failed to save credential");
			}
		} catch (err) {
			setStatus("error");
			toast.error(err.message || "Network error saving credentials");
		}
	}
	function handleCopySecret() {
		if (secret) {
			navigator.clipboard.writeText(secret);
			toast.info("Password copied to clipboard");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "my-3 overflow-hidden rounded-2xl border border-primary/20 bg-card/85 backdrop-blur-md shadow-lg transition-all duration-200",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-between border-b border-border/40 bg-primary/10 px-4 py-2.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs font-semibold text-foreground flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Save Authentication Credentials" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-medium text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3 w-3" }), " AES-256 Vault"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-muted-foreground",
					children: "AvA Browser Agent can automatically sign into this website in the future"
				})] })]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-4 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 text-xs text-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "h-3.5 w-3.5 text-muted-foreground shrink-0" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: domain
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground truncate text-[11px]",
							children: [
								"(",
								spec.site_url,
								")"
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 gap-2.5 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-[10px] uppercase font-semibold tracking-wider text-muted-foreground",
						children: "Username / Email"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 flex items-center rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs text-foreground focus-within:border-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: username,
							onChange: (e) => setUsername(e.target.value),
							placeholder: "Username or Email",
							className: "w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 text-xs"
						})
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-[10px] uppercase font-semibold tracking-wider text-muted-foreground",
						children: "Password / Secret"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs text-foreground focus-within:border-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: showSecret ? "text" : "password",
							value: secret,
							onChange: (e) => setSecret(e.target.value),
							placeholder: "Password",
							className: "w-full bg-transparent outline-none text-foreground text-xs"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 shrink-0 ml-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowSecret(!showSecret),
								className: "text-muted-foreground hover:text-foreground transition-colors p-0.5",
								title: showSecret ? "Hide password" : "Show password",
								children: showSecret ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3.5 w-3.5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: handleCopySecret,
								className: "text-muted-foreground hover:text-foreground transition-colors p-0.5",
								title: "Copy password",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" })
							})]
						})]
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-end gap-2 pt-1 border-t border-border/30",
					children: status === "saved" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 text-emerald-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Saved Securely to Vault" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setDismissed(true),
						className: "rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors",
						children: "Not Now"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: status === "saving" || !username || !secret,
						onClick: handleSave,
						className: "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status === "saving" ? "Saving..." : "Save to Vault" })]
					})] })
				})
			]
		})]
	});
}
function extractDomain(url) {
	if (!url) return "";
	try {
		const clean = url.startsWith("http") ? url : `https://${url}`;
		return new URL(clean).hostname;
	} catch {
		return url.replace(/^https?:\/\//, "").split("/")[0] || "";
	}
}
var COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)"
];
var CHART_RE = /```(?:chart|graph|recharts)\s*\n([\s\S]*?)```/g;
var CRED_RE = /```(?:save-credential|save_credential|credential-widget|save-credentials)\s*\n([\s\S]*?)```/g;
function split(text) {
	const credSplit = [];
	let last = 0;
	for (const m of text.matchAll(CRED_RE)) {
		const idx = m.index ?? 0;
		try {
			const spec = JSON.parse(m[1]);
			if (spec.site_url || spec.username) {
				if (idx > last) credSplit.push({
					kind: "md",
					text: text.slice(last, idx)
				});
				credSplit.push({
					kind: "credential",
					spec
				});
				last = idx + m[0].length;
			}
		} catch {}
	}
	if (last < text.length) credSplit.push({
		kind: "md",
		text: text.slice(last)
	});
	const chartSplit = [];
	for (const s of credSplit) {
		if (s.kind !== "md") {
			chartSplit.push(s);
			continue;
		}
		let chartLast = 0;
		for (const m of s.text.matchAll(CHART_RE)) {
			const idx = m.index ?? 0;
			try {
				const spec = JSON.parse(m[1]);
				if (!Array.isArray(spec.data) || !spec.data.length) continue;
				if (idx > chartLast) chartSplit.push({
					kind: "md",
					text: s.text.slice(chartLast, idx)
				});
				chartSplit.push({
					kind: "chart",
					spec
				});
				chartLast = idx + m[0].length;
			} catch {}
		}
		if (chartLast < s.text.length) chartSplit.push({
			kind: "md",
			text: s.text.slice(chartLast)
		});
	}
	const out = [];
	for (const s of chartSplit) {
		if (s.kind !== "md") {
			out.push(s);
			continue;
		}
		for (const t of splitAttachmentSegments(s.text)) if (t.kind === "attachment") out.push({
			kind: "attachment",
			name: t.name,
			path: t.path
		});
		else if (t.text.trim()) out.push({
			kind: "md",
			text: t.text
		});
	}
	return out;
}
function ChartBlock({ spec }) {
	const first = spec.data[0] ?? {};
	const xKey = spec.xKey ?? Object.keys(first).find((k) => typeof first[k] === "string") ?? "name";
	const yKeys = spec.yKeys ?? Object.keys(first).filter((k) => k !== xKey && typeof first[k] === "number");
	const axis = {
		stroke: "var(--muted-foreground)",
		fontSize: 11,
		tickLine: false,
		axisLine: false
	};
	const tip = { contentStyle: {
		background: "var(--popover)",
		border: "1px solid var(--border)",
		borderRadius: 12,
		fontSize: 12
	} };
	const chart = spec.type === "pie" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
			data: spec.data,
			dataKey: yKeys[0] ?? "value",
			nameKey: xKey,
			innerRadius: "45%",
			outerRadius: "80%",
			paddingAngle: 2,
			children: spec.data.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: COLORS[i % COLORS.length] }, i))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip$1, { ...tip }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { wrapperStyle: { fontSize: 12 } })
	] }) : spec.type === "line" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
		data: spec.data,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
				strokeDasharray: "3 3",
				stroke: "var(--border)",
				vertical: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
				dataKey: xKey,
				...axis
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
				...axis,
				width: 36
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip$1, { ...tip }),
			yKeys.map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
				dataKey: k,
				stroke: COLORS[i % 5],
				strokeWidth: 2,
				dot: false
			}, k))
		]
	}) : spec.type === "area" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
		data: spec.data,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
				strokeDasharray: "3 3",
				stroke: "var(--border)",
				vertical: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
				dataKey: xKey,
				...axis
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
				...axis,
				width: 36
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip$1, { ...tip }),
			yKeys.map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
				dataKey: k,
				stroke: COLORS[i % 5],
				fill: COLORS[i % 5],
				fillOpacity: .2
			}, k))
		]
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
		data: spec.data,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
				strokeDasharray: "3 3",
				stroke: "var(--border)",
				vertical: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
				dataKey: xKey,
				...axis
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
				...axis,
				width: 36
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip$1, {
				...tip,
				cursor: { fill: "var(--muted)" }
			}),
			yKeys.map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
				dataKey: k,
				fill: COLORS[i % 5],
				radius: [
					6,
					6,
					0,
					0
				]
			}, k))
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "glass my-3 rounded-2xl p-3",
		children: [spec.title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
			className: "mb-2 text-sm font-medium",
			children: spec.title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-56 w-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
				width: "100%",
				height: "100%",
				children: chart
			})
		})]
	});
}
var RichResponse = (0, import_react.memo)(({ text }) => {
	const segments = (0, import_react.useMemo)(() => split(text), [text]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: segments.map((s, i) => s.kind === "chart" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartBlock, { spec: s.spec }, i) : s.kind === "credential" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveCredentialWidget, { spec: s.spec }, i) : s.kind === "attachment" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachmentCard, {
		name: s.name,
		path: s.path
	}, i) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageResponse, { children: s.text }, i)) });
});
RichResponse.displayName = "RichResponse";
var Collapsible = Root;
var CollapsibleTrigger = CollapsibleTrigger$1;
var CollapsibleContent = CollapsibleContent$1;
var Tool = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Collapsible, {
	className: cn("group not-prose mb-4 w-full rounded-md border", className),
	...props
});
var ToolContent = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CollapsibleContent, {
	className: cn("data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in", className),
	...props
});
var ToolInput = ({ className, input, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: cn("space-y-2 overflow-hidden", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
		className: "font-medium text-muted-foreground text-xs uppercase tracking-wide",
		children: "Parameters"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-md bg-muted/50",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
			code: JSON.stringify(input, null, 2),
			language: "json"
		})
	})]
});
function AIMascot({ awake = false, gaze, size = "default", brand = false, className }) {
	const eyeShift = !awake ? "translate-x-px -translate-y-px" : gaze === "down" ? "translate-x-px translate-y-1" : gaze === "left" ? "-translate-x-1 -translate-y-px" : gaze === "right" ? "translate-x-1 -translate-y-px" : "translate-x-px -translate-y-1";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		"data-awake": awake,
		className: cn("relative inline-flex shrink-0 items-center justify-center bg-mascot text-mascot-foreground animate-[ai-mascot-blob_9s_ease-in-out_infinite] transition-transform duration-[440ms] ease-[cubic-bezier(.22,1.5,.5,1)]", brand ? "h-[22px] w-[22px] shadow-none" : size === "compact" ? "h-7 w-7 shadow-none" : "h-10 w-10 -rotate-[7deg] shadow-sm data-[awake=true]:rotate-6 data-[awake=true]:scale-[1.05]", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: cn("flex transition-transform duration-300", brand ? "gap-1" : size === "compact" ? "gap-[5px]" : cn("gap-2", eyeShift)),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("block animate-[ai-mascot-blink_6.5s_infinite] rounded-[5px] bg-current", brand ? "h-[5px] w-[2.5px]" : size === "compact" ? "h-[7px] w-[3px]" : "h-2.5 w-1") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("block animate-[ai-mascot-blink_6.5s_infinite] rounded-[5px] bg-current", brand ? "h-[5px] w-[2.5px]" : size === "compact" ? "h-[7px] w-[3px]" : "h-2.5 w-1") })]
		})
	});
}
var str = (v, d = "") => v == null ? d : String(v);
function formatDuration(ms) {
	if (ms == null) return "";
	if (ms < 1e3) return `${ms}ms`;
	const s = Math.round(ms / 1e3);
	if (s < 60) return `${s} sec`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m} min ${s % 60} sec`;
	return `${Math.floor(m / 60)} hr ${m % 60} min`;
}
var formatTokens = (n) => n == null ? "" : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k tokens` : `${n} tokens`;
function toolIcon(part) {
	if (part.toolName === "Terminal") return SquareTerminal;
	if (part.toolName === "File change") return FilePen;
	if (part.toolName === "Web search") return Globe;
	if (part.toolName === "Browser") return Globe;
	if (part.toolName === "Generate image") return Sparkles;
	if (part.toolName === "View image") return FileImage;
	if (part.toolName === "Sleep") return Hourglass;
	if (part.toolName === "Collab agent") return UserCog;
	if (part.toolName === "Sub-agent") return Server;
	if (part.toolName === "Memory") return Brain;
	if (part.meta?.server) return Plug;
	return Wrench;
}
function StatusIcon({ status, exitCode }) {
	if (status === "running") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin text-primary" });
	if (status === "error" || exitCode != null && exitCode !== 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3.5 text-destructive" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-success" });
}
function useElapsed(startedAt, running) {
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	(0, import_react.useEffect)(() => {
		if (!running) return;
		const id = setInterval(() => setNow(Date.now()), 1e3);
		return () => clearInterval(id);
	}, [running]);
	return startedAt ? now - startedAt : void 0;
}
function useCopy(timeout = 1500) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const timer = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => () => {
		if (timer.current != null) window.clearTimeout(timer.current);
	}, []);
	return {
		copied,
		copy: (0, import_react.useCallback)(async (text) => {
			if (typeof window === "undefined" || !navigator?.clipboard?.writeText) return false;
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				return false;
			}
			setCopied(true);
			if (timer.current != null) window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => setCopied(false), timeout);
			return true;
		}, [timeout])
	};
}
function StepShell({ part, title, subtitle, children }) {
	const Icon = toolIcon(part);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tool, {
		defaultOpen: false,
		className: "glass mb-0 overflow-hidden rounded-xl border-0 [--glass-shadow:0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-6px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.5)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CollapsibleTrigger, {
			className: "group flex w-full items-center gap-2.5 px-4 py-2.5 text-left",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("block truncate text-sm", part.toolName === "Terminal" && "font-mono text-xs"),
						children: title
					}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-[11px] text-muted-foreground",
						children: subtitle
					})]
				}),
				!!part.meta?.durationMs && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] text-muted-foreground",
					children: formatDuration(part.meta.durationMs)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIcon, {
					status: part.status,
					exitCode: part.meta?.exitCode
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolContent, {
			className: "border-t border-border/60",
			children
		})]
	});
}
function TerminalOutput({ text, running }) {
	if (!text && !running) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-3 py-2 text-xs text-muted-foreground",
		children: "No output"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "max-h-72 overflow-auto bg-foreground/[0.04]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("pre", {
			className: "w-max min-w-full px-3 py-2 font-mono text-[11px] leading-5 whitespace-pre",
			children: [text, running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/60 align-middle" })]
		})
	});
}
var DIFF_ADD_BG = "bg-success/[0.16]";
var DIFF_DEL_BG = "bg-destructive/[0.16]";
var DIFF_CHUNK_BG = "bg-primary/[0.14]";
function DiffView({ diff }) {
	if (!diff?.trim()) return null;
	const lines = diff.replace(/\\\\no newline at end of file/g, "").split("\n");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "max-h-96 overflow-auto bg-foreground/[0.03]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "w-max min-w-full py-1",
			children: lines.map((line, idx) => {
				const isAdd = line.startsWith("+");
				const isDel = line.startsWith("-");
				const isChunk = line.startsWith("@@");
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("px-3 py-[1px] font-mono text-[11px] leading-5 whitespace-pre", isAdd && DIFF_ADD_BG, isDel && DIFF_DEL_BG, isChunk && DIFF_CHUNK_BG),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("mr-2 select-none", isAdd && "font-bold text-success", isDel && "font-bold text-destructive", isChunk && "font-bold text-primary"),
						children: isAdd ? "+" : isDel ? "-" : isChunk ? "@" : " "
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn(isAdd && "text-success", isDel && "text-destructive", isChunk && "text-primary"),
						children: line
					})]
				}, idx);
			})
		})
	});
}
function ImageViewPreview({ path }) {
	const { rpc } = useAva();
	const [uri, setUri] = (0, import_react.useState)(null);
	const [err, setErr] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let alive = true;
		if (!path || !rpc) return;
		rpc.call("fs/readFile", { path }).then((res) => {
			if (!alive || !res.dataBase64) return;
			const ext = path.split(".").pop()?.toLowerCase() ?? "";
			const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
			setUri(`data:${mime};base64,${res.dataBase64}`);
		}).catch(() => {
			if (alive) setErr(true);
		});
		return () => {
			alive = false;
		};
	}, [path, rpc]);
	if (!path) return null;
	if (err) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-3 py-2 text-xs text-muted-foreground",
		children: "Could not load image preview."
	});
	if (!uri) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin" }), " Loading image…"]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "px-3 pb-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: uri,
			alt: path.split("/").pop() ?? "preview",
			className: "max-h-72 max-w-full rounded-lg border border-border/40 object-contain"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1.5 truncate font-mono text-[11px] text-muted-foreground",
			children: path
		})]
	});
}
function ToolStep({ part }) {
	const m = part.meta ?? {};
	const genericContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolInput, { input: part.input }), part.output ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1 px-4 pb-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
			children: part.status === "error" ? "Error" : "Result"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalOutput, { text: part.output })]
	}) : null] });
	const simpleCard = (title, subtitle, displayName) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
		part,
		title: title || displayName,
		subtitle: title === displayName ? m.server ? `via ${m.server}` : void 0 : subtitle,
		children: genericContent
	});
	if (part.toolName === "Terminal") {
		const sub = [m.cwd, m.exitCode != null ? `exit ${m.exitCode}` : part.status === "running" ? "running…" : ""].filter(Boolean).join(" · ");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
			part,
			title: m.command || "Command",
			subtitle: sub,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalOutput, {
				text: part.output,
				running: part.status === "running"
			})
		});
	}
	if (part.toolName === "Web search") return simpleCard(m.command ?? "", "Searching the web", "Web search");
	if (part.toolName === "Browser") return simpleCard(m.command ?? "", "Browser automation", "Browser");
	if (part.toolName === "Generate image") return simpleCard(m.command ?? "", "Image generation", "Generate image");
	if (part.toolName === "View image") {
		const raw = part.input;
		const imgPath = typeof raw === "string" ? raw : str(raw?.path ?? raw?.filePath);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
			part,
			title: `Viewed ${imgPath.split("/").pop() || "image"}`,
			subtitle: imgPath,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageViewPreview, { path: imgPath })
		});
	}
	if (part.toolName === "Sleep") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
		part,
		title: m.command || "Sleep",
		subtitle: "Waiting",
		children: null
	});
	if (part.toolName === "Collab agent") return simpleCard(m.command ?? "", "Multi-agent coordination", "Collab agent");
	if (part.toolName === "Sub-agent") return simpleCard(m.command ?? "", "Sub-agent activity", "Sub-agent");
	if (part.toolName === "Memory") return simpleCard(m.command ?? "", "Memory operations", "Memory");
	if (part.toolName === "File change") {
		const files = m.files ?? [];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepShell, {
			part,
			title: files.length === 1 ? `Edited ${files[0].path.split("/").pop()}` : `Edited ${files.length} files`,
			subtitle: files[0]?.path,
			children: files.length === 1 && files[0].diff ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffView, { diff: files[0].diff }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "space-y-1 px-3 py-2",
				children: [files.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2 font-mono text-[11px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase",
						children: f.kind
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: f.path
					})]
				}, f.path)), files.filter((f) => f.diff).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "mt-2 -mx-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-1 px-1 font-mono text-[10px] uppercase text-muted-foreground",
						children: f.path.split("/").pop()
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffView, { diff: f.diff })]
				}, `${f.path}_diff`))]
			})
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StepShell, {
		part,
		title: part.toolName ?? "Tool",
		subtitle: m.server ? `via ${m.server}` : m.command,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolInput, { input: part.input }), part.output ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1 px-4 pb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
				children: part.status === "error" ? "Error" : "Result"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalOutput, { text: part.output })]
		}) : null]
	});
}
/** Animated breadcrumb cursor shown at the end of a live streaming response. */
function StreamingCursor() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-1.5 pl-1",
		"aria-label": "Agent is responding",
		children: [
			0,
			1,
			2
		].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ava-streaming-dot size-1.5 rounded-full bg-primary",
			style: { animationDelay: `${i * .18}s` }
		}, i))
	});
}
function ReasoningStep({ part }) {
	const running = part.status === "running";
	if (!part.text && !running) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
		className: "group text-sm text-muted-foreground",
		open: running || void 0,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
			className: "flex cursor-pointer list-none items-center gap-2 py-0.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "size-4" }),
				running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shimmer, { children: "Thinking…" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Thought process" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5 transition-transform group-open:rotate-90" })
			]
		}), part.text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 border-l-2 border-border pl-3 text-[13px] leading-6 [&_ol]:my-1.5 [&_ol]:pl-4 [&_p]:my-1 [&_pre]:my-2 [&_ul]:my-1.5 [&_ul]:pl-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichResponse, { text: part.text.trim() })
		})]
	});
}
function PlanCard({ part }) {
	const steps = part.meta?.steps ?? [];
	if (!steps.length) return null;
	const done = steps.filter((s) => s.status === "done").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass rounded-xl px-3 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-1.5 flex items-center gap-2 text-sm font-medium",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, { className: "size-4 text-primary" }),
				part.text || "Plan",
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "ml-auto text-[11px] font-normal text-muted-foreground",
					children: [
						done,
						"/",
						steps.length
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-1",
			children: steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-start gap-2 text-sm",
				children: [s.status === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "mt-0.5 size-3.5 shrink-0 text-success" }) : s.status === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDot, { className: "mt-0.5 size-3.5 shrink-0 text-primary" }) : s.status === "cancelled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "mt-0.5 size-3.5 shrink-0 text-muted-foreground" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "mt-0.5 size-3.5 shrink-0 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn((s.status === "done" || s.status === "cancelled") && "text-muted-foreground line-through"),
					children: s.text
				})]
			}, i))
		})]
	});
}
function NoticeStep({ part }) {
	const tone = part.meta?.tone ?? "info";
	const Icon = tone === "info" ? Info : TriangleAlert;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: cn("flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs", tone === "error" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "mt-0.5 size-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "whitespace-pre-wrap break-words",
			children: part.text
		})]
	});
}
function QuestionCard({ part, onAnswer }) {
	const questions = part.meta?.questions ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass rounded-xl border border-primary/20 px-3 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium leading-6",
			children: part.text
		}), questions.map((q, qi) => {
			const answered = !!q.answered;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1.5 space-y-1.5",
				children: [
					qi > 0 && q.title !== part.text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: q.title
					}),
					q.options?.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: answered || !onAnswer,
						onClick: () => q.id && onAnswer?.(q.id, opt),
						className: cn("flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition", answered ? "border-success/40 bg-success/10 text-muted-foreground" : "border-border/60 hover:border-primary/50 hover:bg-accent"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: opt }), answered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 shrink-0 text-success" })]
					}, opt)),
					!q.options?.length && !answered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: q.method && isApprovalMethod(q.method) ? "Respond with the approval card above the composer" : "Type your answer in the composer below"
					})
				]
			}, q.id ?? qi);
		})]
	});
}
function AssistantTurn({ message, live, onAnswerQuestion }) {
	const elapsed = useElapsed(message.stats?.startedAt, live);
	const steps = message.parts.filter((p) => p.kind === "tool").length;
	const text = [...message.parts].reverse().find((p) => p.kind === "text" && p.text.trim())?.text.trim() ?? "";
	const { copied, copy } = useCopy();
	const duration = message.stats?.durationMs ?? (live ? elapsed : void 0);
	const hasError = message.parts.some((part) => part.status === "error" || part.meta?.tone === "error");
	const activityLabel = hasError ? "Needs attention" : live ? steps > 0 ? `Working${elapsed ? ` · ${formatDuration(elapsed)}` : ""}` : `Thinking${elapsed ? ` · ${formatDuration(elapsed)}` : ""}` : "AvA";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Message, {
		from: "assistant",
		className: "group/assistant",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MessageContent, {
			className: "w-full bg-transparent p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center gap-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("relative flex size-10 items-center justify-center", live && "after:absolute after:inset-0 after:animate-ping after:rounded-full after:border after:border-mascot-ring"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AIMascot, {
						awake: live,
						gaze: hasError ? "down" : live && steps > 0 ? "right" : "up"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-sm font-medium text-foreground",
						children: [live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shimmer, { children: activityLabel }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: activityLabel }), live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ava-stream-pulse",
							"aria-hidden": "true"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-[11px] text-muted-foreground",
						children: hasError ? "Core reported an error" : live ? `${steps ? `${steps} live step${steps === 1 ? "" : "s"}` : "Preparing the first step"} · streaming now` : duration ? `Completed in ${formatDuration(duration)}` : "Response complete"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-6",
				children: [message.parts.map((p) => p.kind === "tool" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolStep, { part: p }, p.id) : p.kind === "reasoning" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReasoningStep, { part: p }, p.id) : p.kind === "plan" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanCard, { part: p }, p.id) : p.kind === "notice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoticeStep, { part: p }, p.id) : p.kind === "question" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionCard, {
					part: p,
					onAnswer: onAnswerQuestion
				}, p.id) : p.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RichResponse, { text: p.text }, p.id) : null), live && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamingCursor, {})]
			})]
		}), !live && (text || duration) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MessageActions, {
			className: "mt-1 items-center gap-1 text-[11px] text-muted-foreground",
			children: [text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageAction, {
				tooltip: "Copy final output",
				label: "Copy final output",
				onClick: () => {
					copy(text);
				},
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "px-1",
				children: [
					duration ? `Worked for ${formatDuration(duration)}` : "",
					steps ? `${steps} step${steps > 1 ? "s" : ""}` : "",
					formatTokens(message.stats?.totalTokens)
				].filter(Boolean).join(" · ")
			})]
		})]
	});
}
function UserTurn({ message }) {
	const { copied, copy } = useCopy();
	const text = message.parts.map((p) => p.text.trim()).filter(Boolean).join("\n\n");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Message, {
		from: "user",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageContent, {
			className: "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground",
			children: message.parts.map((p) => {
				const segs = splitAttachmentSegments(p.text);
				if (segs.length === 1 && segs[0].kind === "text") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "whitespace-pre-wrap",
					children: p.text
				}, p.id);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: segs.map((s, i) => s.kind === "attachment" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachmentCard, {
					name: s.name,
					path: s.path
				}, i) : s.text.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "whitespace-pre-wrap",
					children: s.text
				}, i) : null) }, p.id);
			})
		}), text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageActions, {
			className: "items-center justify-end gap-1 text-[11px] text-muted-foreground",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageAction, {
				tooltip: "Copy message",
				label: "Copy message",
				onClick: () => {
					copy(text);
				},
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" })
			})
		})]
	});
}
function ChatMessageView({ message, live = false, onAnswerQuestion }) {
	if (message.role === "assistant") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssistantTurn, {
		message,
		live,
		onAnswerQuestion
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserTurn, { message });
}
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
function InputGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-slot": "input-group",
		role: "group",
		className: cn("group/input-group border-input dark:bg-input/30 shadow-xs relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow]", "h-9 has-[>textarea]:h-auto", "has-[>[data-align=inline-start]]:[&>input]:pl-2", "has-[>[data-align=inline-end]]:[&>input]:pr-2", "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3", "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3", "has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1", "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40", className),
		...props
	});
}
var inputGroupAddonVariants = cva("text-muted-foreground flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4", {
	variants: { align: {
		"inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
		"inline-end": "order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]",
		"block-start": "[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5",
		"block-end": "[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5"
	} },
	defaultVariants: { align: "inline-start" }
});
function InputGroupAddon({ className, align = "inline-start", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "group",
		"data-slot": "input-group-addon",
		"data-align": align,
		className: cn(inputGroupAddonVariants({ align }), className),
		onClick: (e) => {
			if (e.target.closest("button")) return;
			e.currentTarget.parentElement?.querySelector("input")?.focus();
		},
		...props
	});
}
var inputGroupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none", {
	variants: { size: {
		xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
		sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
		"icon-xs": "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
		"icon-sm": "size-8 p-0 has-[>svg]:p-0"
	} },
	defaultVariants: { size: "xs" }
});
function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		type,
		"data-size": size,
		variant,
		className: cn(inputGroupButtonVariants({ size }), className),
		...props
	});
}
function InputGroupTextarea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
		"data-slot": "input-group-control",
		className: cn("flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent", className),
		...props
	});
}
function Spinner({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
		role: "status",
		"aria-label": "Loading",
		className: cn("size-4 animate-spin", className),
		...props
	});
}
var convertBlobUrlToDataUrl = async (url) => {
	try {
		const blob = await (await fetch(url)).blob();
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
};
var PromptInputController = (0, import_react.createContext)(null);
var ProviderAttachmentsContext = (0, import_react.createContext)(null);
var useOptionalPromptInputController = () => (0, import_react.useContext)(PromptInputController);
var useOptionalProviderAttachments = () => (0, import_react.useContext)(ProviderAttachmentsContext);
var LocalAttachmentsContext = (0, import_react.createContext)(null);
var usePromptInputAttachments = () => {
	const provider = useOptionalProviderAttachments();
	const context = (0, import_react.useContext)(LocalAttachmentsContext) ?? provider;
	if (!context) throw new Error("usePromptInputAttachments must be used within a PromptInput or PromptInputProvider");
	return context;
};
var LocalReferencedSourcesContext = (0, import_react.createContext)(null);
var PromptInput = ({ className, accept, multiple, globalDrop, syncHiddenInput, maxFiles, maxFileSize, onError, onSubmit, children, ...props }) => {
	const controller = useOptionalPromptInputController();
	const usingProvider = !!controller;
	const inputRef = (0, import_react.useRef)(null);
	const formRef = (0, import_react.useRef)(null);
	const [items, setItems] = (0, import_react.useState)([]);
	const files = usingProvider ? controller.attachments.files : items;
	const [referencedSources, setReferencedSources] = (0, import_react.useState)([]);
	const filesRef = (0, import_react.useRef)(files);
	(0, import_react.useEffect)(() => {
		filesRef.current = files;
	}, [files]);
	const openFileDialogLocal = (0, import_react.useCallback)(() => {
		inputRef.current?.click();
	}, []);
	const matchesAccept = (0, import_react.useCallback)((f) => {
		if (!accept || accept.trim() === "") return true;
		return accept.split(",").map((s) => s.trim()).filter(Boolean).some((pattern) => {
			if (pattern.endsWith("/*")) {
				const prefix = pattern.slice(0, -1);
				return f.type.startsWith(prefix);
			}
			return f.type === pattern;
		});
	}, [accept]);
	const addLocal = (0, import_react.useCallback)((fileList) => {
		const incoming = [...fileList];
		const accepted = incoming.filter((f) => matchesAccept(f));
		if (incoming.length && accepted.length === 0) {
			onError?.({
				code: "accept",
				message: "No files match the accepted types."
			});
			return;
		}
		const withinSize = (f) => maxFileSize ? f.size <= maxFileSize : true;
		const sized = accepted.filter(withinSize);
		if (accepted.length > 0 && sized.length === 0) {
			onError?.({
				code: "max_file_size",
				message: "All files exceed the maximum size."
			});
			return;
		}
		setItems((prev) => {
			const capacity = typeof maxFiles === "number" ? Math.max(0, maxFiles - prev.length) : void 0;
			const capped = typeof capacity === "number" ? sized.slice(0, capacity) : sized;
			if (typeof capacity === "number" && sized.length > capacity) onError?.({
				code: "max_files",
				message: "Too many files. Some were not added."
			});
			const next = [];
			for (const file of capped) next.push({
				filename: file.name,
				id: nanoid(),
				mediaType: file.type,
				type: "file",
				url: URL.createObjectURL(file)
			});
			return [...prev, ...next];
		});
	}, [
		matchesAccept,
		maxFiles,
		maxFileSize,
		onError
	]);
	const removeLocal = (0, import_react.useCallback)((id) => setItems((prev) => {
		const found = prev.find((file) => file.id === id);
		if (found?.url) URL.revokeObjectURL(found.url);
		return prev.filter((file) => file.id !== id);
	}), []);
	const addWithProviderValidation = (0, import_react.useCallback)((fileList) => {
		const incoming = [...fileList];
		const accepted = incoming.filter((f) => matchesAccept(f));
		if (incoming.length && accepted.length === 0) {
			onError?.({
				code: "accept",
				message: "No files match the accepted types."
			});
			return;
		}
		const withinSize = (f) => maxFileSize ? f.size <= maxFileSize : true;
		const sized = accepted.filter(withinSize);
		if (accepted.length > 0 && sized.length === 0) {
			onError?.({
				code: "max_file_size",
				message: "All files exceed the maximum size."
			});
			return;
		}
		const currentCount = files.length;
		const capacity = typeof maxFiles === "number" ? Math.max(0, maxFiles - currentCount) : void 0;
		const capped = typeof capacity === "number" ? sized.slice(0, capacity) : sized;
		if (typeof capacity === "number" && sized.length > capacity) onError?.({
			code: "max_files",
			message: "Too many files. Some were not added."
		});
		if (capped.length > 0) controller?.attachments.add(capped);
	}, [
		matchesAccept,
		maxFileSize,
		maxFiles,
		onError,
		files.length,
		controller
	]);
	const clearAttachments = (0, import_react.useCallback)(() => usingProvider ? controller?.attachments.clear() : setItems((prev) => {
		for (const file of prev) if (file.url) URL.revokeObjectURL(file.url);
		return [];
	}), [usingProvider, controller]);
	const clearReferencedSources = (0, import_react.useCallback)(() => setReferencedSources([]), []);
	const add = usingProvider ? addWithProviderValidation : addLocal;
	const remove = usingProvider ? controller.attachments.remove : removeLocal;
	const openFileDialog = usingProvider ? controller.attachments.openFileDialog : openFileDialogLocal;
	const clear = (0, import_react.useCallback)(() => {
		clearAttachments();
		clearReferencedSources();
	}, [clearAttachments, clearReferencedSources]);
	(0, import_react.useEffect)(() => {
		if (!usingProvider) return;
		controller.__registerFileInput(inputRef, () => inputRef.current?.click());
	}, [usingProvider, controller]);
	(0, import_react.useEffect)(() => {
		if (syncHiddenInput && inputRef.current && files.length === 0) inputRef.current.value = "";
	}, [files, syncHiddenInput]);
	(0, import_react.useEffect)(() => {
		const form = formRef.current;
		if (!form) return;
		if (globalDrop) return;
		const onDragOver = (e) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
		};
		const onDrop = (e) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
			if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) add(e.dataTransfer.files);
		};
		form.addEventListener("dragover", onDragOver);
		form.addEventListener("drop", onDrop);
		return () => {
			form.removeEventListener("dragover", onDragOver);
			form.removeEventListener("drop", onDrop);
		};
	}, [add, globalDrop]);
	(0, import_react.useEffect)(() => {
		if (!globalDrop) return;
		const onDragOver = (e) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
		};
		const onDrop = (e) => {
			if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
			if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) add(e.dataTransfer.files);
		};
		document.addEventListener("dragover", onDragOver);
		document.addEventListener("drop", onDrop);
		return () => {
			document.removeEventListener("dragover", onDragOver);
			document.removeEventListener("drop", onDrop);
		};
	}, [add, globalDrop]);
	(0, import_react.useEffect)(() => () => {
		if (!usingProvider) {
			for (const f of filesRef.current) if (f.url) URL.revokeObjectURL(f.url);
		}
	}, [usingProvider]);
	const handleChange = (0, import_react.useCallback)((event) => {
		if (event.currentTarget.files) add(event.currentTarget.files);
		event.currentTarget.value = "";
	}, [add]);
	const attachmentsCtx = (0, import_react.useMemo)(() => ({
		add,
		clear: clearAttachments,
		fileInputRef: inputRef,
		files: files.map((item) => ({
			...item,
			id: item.id
		})),
		openFileDialog,
		remove
	}), [
		files,
		add,
		remove,
		clearAttachments,
		openFileDialog
	]);
	const refsCtx = (0, import_react.useMemo)(() => ({
		add: (incoming) => {
			const array = Array.isArray(incoming) ? incoming : [incoming];
			setReferencedSources((prev) => [...prev, ...array.map((s) => ({
				...s,
				id: nanoid()
			}))]);
		},
		clear: clearReferencedSources,
		remove: (id) => {
			setReferencedSources((prev) => prev.filter((s) => s.id !== id));
		},
		sources: referencedSources
	}), [referencedSources, clearReferencedSources]);
	const handleSubmit = (0, import_react.useCallback)(async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const text = usingProvider ? controller.textInput.value : (() => {
			return new FormData(form).get("message") || "";
		})();
		if (!usingProvider) form.reset();
		try {
			const result = onSubmit({
				files: await Promise.all(files.map(async ({ id: _id, ...item }) => {
					if (item.url?.startsWith("blob:")) {
						const dataUrl = await convertBlobUrlToDataUrl(item.url);
						return {
							...item,
							url: dataUrl ?? item.url
						};
					}
					return item;
				})),
				text
			}, event);
			if (result instanceof Promise) try {
				await result;
				clear();
				if (usingProvider) controller.textInput.clear();
			} catch {}
			else {
				clear();
				if (usingProvider) controller.textInput.clear();
			}
		} catch {}
	}, [
		usingProvider,
		controller,
		files,
		onSubmit,
		clear
	]);
	const inner = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		accept,
		"aria-label": "Upload files",
		className: "hidden",
		multiple,
		onChange: handleChange,
		ref: inputRef,
		title: "Upload files",
		type: "file"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
		className: cn("w-full", className),
		onSubmit: handleSubmit,
		ref: formRef,
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputGroup, {
			className: "overflow-hidden",
			children
		})
	})] });
	const withReferencedSources = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalReferencedSourcesContext.Provider, {
		value: refsCtx,
		children: inner
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalAttachmentsContext.Provider, {
		value: attachmentsCtx,
		children: withReferencedSources
	});
};
var PromptInputTextarea = ({ onChange, onKeyDown, className, placeholder = "What would you like to know?", ...props }) => {
	const controller = useOptionalPromptInputController();
	const attachments = usePromptInputAttachments();
	const [isComposing, setIsComposing] = (0, import_react.useState)(false);
	const handleKeyDown = (0, import_react.useCallback)((e) => {
		onKeyDown?.(e);
		if (e.defaultPrevented) return;
		if (e.key === "Enter") {
			if (isComposing || e.nativeEvent.isComposing) return;
			if (e.shiftKey) return;
			e.preventDefault();
			const { form } = e.currentTarget;
			if ((form?.querySelector("button[type=\"submit\"]"))?.disabled) return;
			form?.requestSubmit();
		}
		if (e.key === "Backspace" && e.currentTarget.value === "" && attachments.files.length > 0) {
			e.preventDefault();
			const lastAttachment = attachments.files.at(-1);
			if (lastAttachment) attachments.remove(lastAttachment.id);
		}
	}, [
		onKeyDown,
		isComposing,
		attachments
	]);
	const handlePaste = (0, import_react.useCallback)((event) => {
		const items = event.clipboardData?.items;
		if (!items) return;
		const files = [];
		for (const item of items) if (item.kind === "file") {
			const file = item.getAsFile();
			if (file) files.push(file);
		}
		if (files.length > 0) {
			event.preventDefault();
			attachments.add(files);
		}
	}, [attachments]);
	const handleCompositionEnd = (0, import_react.useCallback)(() => setIsComposing(false), []);
	const handleCompositionStart = (0, import_react.useCallback)(() => setIsComposing(true), []);
	const controlledProps = controller ? {
		onChange: (e) => {
			controller.textInput.setInput(e.currentTarget.value);
			onChange?.(e);
		},
		value: controller.textInput.value
	} : { onChange };
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputGroupTextarea, {
		className: cn("field-sizing-content max-h-48 min-h-16", className),
		name: "message",
		onCompositionEnd: handleCompositionEnd,
		onCompositionStart: handleCompositionStart,
		onKeyDown: handleKeyDown,
		onPaste: handlePaste,
		placeholder,
		...props,
		...controlledProps
	});
};
var PromptInputFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputGroupAddon, {
	align: "block-end",
	className: cn("justify-between gap-1", className),
	...props
});
var PromptInputTools = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex min-w-0 items-center gap-1", className),
	...props
});
var PromptInputButton = ({ variant = "ghost", className, size, tooltip, ...props }) => {
	const newSize = size ?? (import_react.Children.count(props.children) > 1 ? "sm" : "icon-sm");
	const button = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputGroupButton, {
		className: cn(className),
		size: newSize,
		type: "button",
		variant,
		...props
	});
	if (!tooltip) return button;
	const tooltipContent = typeof tooltip === "string" ? tooltip : tooltip.content;
	const shortcut = typeof tooltip === "string" ? void 0 : tooltip.shortcut;
	const side = typeof tooltip === "string" ? "top" : tooltip.side ?? "top";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: button
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
		side,
		children: [tooltipContent, shortcut && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ml-2 text-muted-foreground",
			children: shortcut
		})]
	})] });
};
var PromptInputSubmit = ({ className, variant = "default", size = "icon-sm", status, onStop, onClick, children, ...props }) => {
	const isGenerating = status === "submitted" || status === "streaming";
	let Icon = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CornerDownLeft, { className: "size-4" });
	if (status === "submitted") Icon = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spinner, {});
	else if (status === "streaming") Icon = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-4" });
	else if (status === "error") Icon = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" });
	const handleClick = (0, import_react.useCallback)((e) => {
		if (isGenerating && onStop) {
			e.preventDefault();
			onStop();
			return;
		}
		onClick?.(e);
	}, [
		isGenerating,
		onStop,
		onClick
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputGroupButton, {
		"aria-label": isGenerating ? "Stop" : "Submit",
		className: cn(className),
		onClick: handleClick,
		size,
		type: isGenerating && onStop ? "button" : "submit",
		variant,
		...props,
		children: children ?? Icon
	});
};
var EXT_TO_KIND = {
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
	bmp: "image",
	ico: "image",
	mp4: "video",
	mov: "video",
	webm: "video",
	mkv: "video",
	avi: "video",
	mp3: "audio",
	wav: "audio",
	ogg: "audio",
	m4a: "audio",
	flac: "audio",
	aac: "audio",
	ts: "code",
	tsx: "code",
	js: "code",
	jsx: "code",
	py: "code",
	rs: "code",
	json: "code",
	html: "code",
	css: "code",
	sh: "code",
	bash: "code",
	yaml: "code",
	yml: "code",
	sql: "code",
	php: "code",
	dart: "code",
	toml: "code",
	pdf: "document",
	txt: "document",
	md: "document",
	doc: "document",
	docx: "document",
	csv: "document",
	xlsx: "document",
	zip: "file",
	tar: "file",
	gz: "file",
	rar: "file",
	"7z": "file"
};
var IMAGE_EXTS = [
	"png",
	"jpg",
	"jpeg",
	"webp",
	"gif",
	"bmp",
	"ico"
];
var TEXT_EXTS = [
	"txt",
	"md",
	"json",
	"ts",
	"tsx",
	"js",
	"jsx",
	"py",
	"rs",
	"html",
	"css",
	"sh",
	"yaml",
	"yml",
	"log",
	"sql",
	"env",
	"toml",
	"bash",
	"php",
	"dart"
];
var PREVIEW_MAX_BYTES = 10485760;
var fileExt = (name) => name.split(".").pop()?.toLowerCase() ?? "";
var fileKind = (name) => EXT_TO_KIND[fileExt(name)] ?? "file";
var KIND_ICON = {
	image: Image,
	video: FilePlay,
	audio: FileHeadphone,
	document: FileText,
	code: FileCode,
	file: FileQuestionMark
};
var KIND_COLOR = {
	image: "text-primary",
	video: "text-chart-2",
	audio: "text-chart-4",
	document: "text-destructive",
	code: "text-chart-3",
	file: "text-muted-foreground"
};
function formatSize(bytes) {
	if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "Unknown size";
	if (bytes < 1024) return `${bytes} B`;
	const units = [
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}
var SHORTCUTS = [
	{
		label: "Shared Media",
		path: APP.mediaDir,
		icon: Images
	},
	{
		label: "Workspace",
		path: APP.defaultCwd,
		icon: FolderGit2
	},
	{
		label: "Root /",
		path: "/",
		icon: HardDrive
	},
	{
		label: "Temp",
		path: "/tmp",
		icon: Folder
	}
];
var CATEGORIES = [
	{
		id: "all",
		label: "All"
	},
	{
		id: "images",
		label: "Images"
	},
	{
		id: "media",
		label: "Media"
	},
	{
		id: "docs",
		label: "Docs"
	},
	{
		id: "code",
		label: "Code"
	}
];
var thumbCache = /* @__PURE__ */ new Map();
var THUMB_MAX = 60;
function Thumb({ path, name, rpc }) {
	const ext = fileExt(name);
	const cacheable = IMAGE_EXTS.includes(ext);
	const [uri, setUri] = (0, import_react.useState)(() => thumbCache.get(path) ?? null);
	(0, import_react.useEffect)(() => {
		let alive = true;
		if (uri || !cacheable) return;
		readMediaUrl(rpc, path).then((url) => {
			if (!alive) return;
			thumbCache.delete(path);
			thumbCache.set(path, url);
			while (thumbCache.size > THUMB_MAX) thumbCache.delete(thumbCache.keys().next().value);
			setUri(url);
		}).catch(() => {});
		return () => {
			alive = false;
		};
	}, [
		path,
		uri,
		cacheable,
		rpc
	]);
	if (uri) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: uri,
		alt: name,
		className: "size-full rounded-lg object-cover",
		loading: "lazy"
	});
	const Icon = KIND_ICON[fileKind(name)];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: cn("size-1/2", KIND_COLOR[fileKind(name)]) });
}
function PreviewOverlay({ item, rpc, onAttach, onClose }) {
	const ext = fileExt(item.name);
	const isImg = IMAGE_EXTS.includes(ext);
	const ext2 = fileExt(item.name);
	const isText = TEXT_EXTS.includes(ext2);
	const [imageUrl, setImageUrl] = (0, import_react.useState)(null);
	const [text, setText] = (0, import_react.useState)(null);
	const [binary, setBinary] = (0, import_react.useState)(false);
	const [size, setSize] = (0, import_react.useState)(null);
	const [tooLarge, setTooLarge] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [zoom, setZoom] = (0, import_react.useState)(1);
	const [copied, setCopied] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let alive = true;
		setLoading(true);
		setImageUrl(null);
		setText(null);
		setBinary(false);
		setTooLarge(false);
		(async () => {
			try {
				const meta = await rpc.call("fs/getMetadata", { path: item.path });
				if (!alive) return;
				if (typeof meta.size === "number") {
					setSize(meta.size);
					if (meta.size > PREVIEW_MAX_BYTES && (isImg || isText)) {
						setTooLarge(true);
						setLoading(false);
						return;
					}
				}
			} catch {}
			if (!isImg && !isText) {
				setLoading(false);
				return;
			}
			try {
				const res = await rpc.call("fs/readFile", { path: item.path });
				if (!alive || !res.dataBase64) return;
				if (isImg) {
					const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
					setImageUrl(`data:${mime};base64,${res.dataBase64}`);
				} else {
					const raw = atob(res.dataBase64);
					const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
					if (bytes.subarray(0, 8192).includes(0)) setBinary(true);
					else {
						const decoded = new TextDecoder().decode(bytes);
						let bad = 0;
						const check = decoded.slice(0, 4096);
						for (const ch of check) if (ch === "�") bad++;
						if (check.length > 0 && bad / check.length > .05) setBinary(true);
						else setText(decoded);
					}
				}
			} catch {} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [
		item.path,
		isImg,
		isText,
		ext,
		rpc
	]);
	const KindIcon = KIND_ICON[item.kind];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-[60] flex flex-col rounded-2xl bg-background/95 backdrop-blur-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between border-b border-border px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-sm font-semibold",
					children: item.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "truncate text-xs text-muted-foreground",
					children: [item.path, size != null ? ` · ${formatSize(size)}` : ""]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-3 flex shrink-0 items-center gap-1.5",
				children: [
					isImg && imageUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Zoom out",
						onClick: () => setZoom((z) => Math.max(.5, z - .25)),
						className: "grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomOut, { className: "size-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Zoom in",
						onClick: () => setZoom((z) => Math.min(3, z + .25)),
						className: "grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomIn, { className: "size-4" })
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"aria-label": "Attach file",
						onClick: () => onAttach(item),
						className: "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }), " Attach"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Close preview",
						onClick: onClose,
						className: "grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-auto p-4",
			children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-full place-items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-7 animate-spin text-primary" })
			}) : tooLarge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-full place-items-center text-center text-sm text-muted-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KindIcon, { className: cn("mx-auto size-10", KIND_COLOR[item.kind]) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2",
					children: [
						"File is too large for inline preview (",
						formatSize(size),
						")."
					]
				})] })
			}) : isImg && imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-full place-items-center overflow-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: imageUrl,
					alt: item.name,
					style: { transform: `scale(${zoom})` },
					className: "max-h-full max-w-full rounded-lg object-contain transition-transform"
				})
			}) : isText && text != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "h-full overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed",
				children: text
			}) : isText && binary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-full place-items-center text-sm text-muted-foreground",
				children: "Binary file — preview not available."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-full place-items-center text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KindIcon, { className: cn("mx-auto size-12", KIND_COLOR[item.kind]) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm font-medium",
						children: item.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground",
						children: [
							item.kind,
							" · ",
							formatSize(size)
						]
					})
				] })
			})
		})]
	});
}
function ServerMediaPicker({ open, onClose, onSelect, initialDirectory = APP.mediaDir }) {
	const { rpc } = useAva();
	const [dir, setDir] = (0, import_react.useState)(initialDirectory);
	const [entries, setEntries] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [search, setSearch] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("all");
	const [viewMode, setViewMode] = (0, import_react.useState)("grid");
	const [refreshKey, setRefreshKey] = (0, import_react.useState)(0);
	const [preview, setPreview] = (0, import_react.useState)(null);
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const uploadRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (open) {
			setDir(initialDirectory);
			setPreview(null);
		}
	}, [open, initialDirectory]);
	(0, import_react.useEffect)(() => {
		if (!open || !rpc) return;
		let alive = true;
		setLoading(true);
		setError(null);
		readDirectory(rpc, dir).then((res) => {
			if (alive) setEntries(res.map((e) => ({
				name: e.name,
				path: e.path,
				isDirectory: e.isDirectory
			})));
		}).catch(() => alive && setError("Could not read this directory.")).finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [
		open,
		rpc,
		dir,
		refreshKey
	]);
	const filtered = (0, import_react.useMemo)(() => {
		let out = entries;
		const q = search.toLowerCase().trim();
		if (q) out = out.filter((e) => e.name.toLowerCase().includes(q));
		if (category !== "all") out = out.filter((e) => {
			if (e.isDirectory) return true;
			const k = fileKind(e.name);
			if (category === "images") return k === "image";
			if (category === "media") return k === "image" || k === "video" || k === "audio";
			if (category === "docs") return k === "document";
			if (category === "code") return k === "code";
			return true;
		});
		return out;
	}, [
		entries,
		search,
		category
	]);
	const folders = filtered.filter((e) => e.isDirectory);
	const files = filtered.filter((e) => !e.isDirectory);
	const canGoUp = dir !== "/" && dir.length > 1;
	const goUp = () => setDir(dir.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/");
	const crumbs = dir.split("/").filter(Boolean);
	const attach = (item) => {
		onSelect({
			name: item.name,
			remotePath: item.path,
			kind: item.kind
		});
		onClose();
	};
	const openPreview = (e) => setPreview({
		name: e.name,
		path: e.path,
		kind: fileKind(e.name)
	});
	const handleUpload = async (fl) => {
		if (!fl?.length || !rpc) return;
		setUploading(true);
		try {
			for (const file of Array.from(fl)) {
				const b64 = await new Promise((res, rej) => {
					const r = new FileReader();
					r.onload = () => {
						const s = String(r.result ?? "");
						res(s.includes(",") ? s.split(",")[1] ?? "" : s);
					};
					r.onerror = () => rej(r.error);
					r.readAsDataURL(file);
				});
				const clean = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 120) || "file";
				await rpc.call("fs/writeFile", {
					path: `${dir.replace(/\/+$/, "")}/${clean}`,
					dataBase64: b64
				});
			}
			setRefreshKey((k) => k + 1);
		} catch {} finally {
			setUploading(false);
			if (uploadRef.current) uploadRef.current.value = "";
		}
	};
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onClick: (e) => e.stopPropagation(),
			className: "relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
			children: [
				preview && rpc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewOverlay, {
					item: preview,
					rpc,
					onAttach: attach,
					onClose: () => setPreview(null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 border-b border-border px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Images, { className: "size-4.5 text-primary" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm font-semibold",
								children: "Select from Server"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "truncate text-xs text-muted-foreground",
								children: [
									dir,
									" · ",
									filtered.length,
									" items"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted p-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "List view",
								onClick: () => setViewMode("list"),
								className: cn("grid size-7 place-items-center rounded-md", viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutList, { className: "size-3.5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Grid view",
								onClick: () => setViewMode("grid"),
								className: cn("grid size-7 place-items-center rounded-md", viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { className: "size-3.5" })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: uploadRef,
							type: "file",
							multiple: true,
							className: "hidden",
							onChange: (e) => void handleUpload(e.target.files)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Upload here",
							disabled: uploading,
							onClick: () => uploadRef.current?.click(),
							className: "grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50",
							children: uploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudUpload, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Refresh",
							onClick: () => setRefreshKey((k) => k + 1),
							disabled: loading,
							className: "grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", loading && "animate-spin") })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close",
							onClick: onClose,
							className: "grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2",
					children: SHORTCUTS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setDir(s.path),
						className: cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition", dir === s.path ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:text-foreground"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "size-3" }), s.label]
					}, s.path))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 border-b border-border px-4 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative min-w-40 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "Search files…",
							className: "h-8 w-full rounded-lg border border-border bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1",
						children: CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setCategory(c.id),
							className: cn("h-7 rounded-full px-2.5 text-xs font-medium transition", category === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"),
							children: c.label
						}, c.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
					children: [canGoUp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: goUp,
						className: "mb-2 inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-3" }), " .. up one level"]
					}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid place-items-center py-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-6 animate-spin text-primary" })
					}) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-8 text-center text-sm text-destructive",
						children: error
					}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-8 text-center text-sm text-muted-foreground",
						children: "No files match."
					}) : viewMode === "grid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2",
						children: [...folders, ...files].map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => e.isDirectory ? setDir(e.path) : openPreview(e),
							className: "group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/40 p-2 text-center transition hover:border-primary/40 hover:bg-muted",
							children: [
								e.isDirectory ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-8 text-primary" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid size-10 place-items-center overflow-hidden rounded-lg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, {
										path: e.path,
										name: e.name,
										rpc
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "line-clamp-2 w-full break-all text-[11px] leading-tight text-muted-foreground group-hover:text-foreground",
									children: e.name
								}),
								!e.isDirectory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-3 shrink-0 text-muted-foreground/60" })
							]
						}, e.path))
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-1",
						children: [...folders, ...files].map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => e.isDirectory ? setDir(e.path) : openPreview(e),
							className: "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-accent",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted",
									children: e.isDirectory ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-4 text-primary" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, {
										path: e.path,
										name: e.name,
										rpc
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-sm font-medium",
										children: e.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-xs text-muted-foreground",
										children: e.isDirectory ? "Folder" : fileKind(e.name)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-3.5 shrink-0 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5 shrink-0 text-muted-foreground" })
							]
						}, e.path))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-t border-border px-4 py-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setDir("/"),
							className: "hover:text-foreground",
							children: "/"
						}), crumbs.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setDir("/" + crumbs.slice(0, i + 1).join("/")),
								className: "hover:text-foreground",
								children: c
							}), i < crumbs.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "/" })]
						}, i))]
					})
				})
			]
		})
	});
}
function Pill({ icon: Icon, children, onClick, chevron }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "inline-flex h-8 max-w-40 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-[13px] font-medium text-foreground transition hover:bg-accent",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5 shrink-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate",
				children
			}),
			chevron && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3 shrink-0 text-muted-foreground" })
		]
	});
}
function OptionRow({ icon: Icon, title, subtitle, active, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-accent", active && "bg-primary/10"),
		children: [
			Icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid size-9 shrink-0 place-items-center rounded-xl bg-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4 text-primary" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block truncate text-sm font-medium",
					children: title
				}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block truncate text-xs text-muted-foreground",
					children: subtitle
				})]
			}),
			active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 shrink-0 text-primary" })
		]
	});
}
function Panel({ open, title, onClose, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			side: "bottom",
			className: "glass mx-auto max-h-[80vh] max-w-3xl overflow-y-auto rounded-t-3xl border-0 px-3 pb-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetHeader, {
				className: "px-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: title })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-1",
				children
			})]
		})
	});
}
function useVoice(onText) {
	const [on, setOn] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const rec = (0, import_react.useRef)(null);
	const [supported, setSupported] = (0, import_react.useState)(false);
	const cbRef = (0, import_react.useRef)(onText);
	cbRef.current = onText;
	(0, import_react.useEffect)(() => {
		const w = window;
		setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
		return () => {
			try {
				rec.current?.abort?.();
			} catch {}
		};
	}, []);
	const toggle = () => {
		if (on) {
			try {
				rec.current?.stop();
			} catch {
				setOn(false);
			}
			return;
		}
		const w = window;
		const R = w.SpeechRecognition || w.webkitSpeechRecognition;
		if (!R) return;
		const r = new R();
		r.continuous = true;
		r.interimResults = false;
		r.onresult = (e) => {
			let text = "";
			for (let i = e.resultIndex; i < e.results.length; i += 1) {
				const res = e.results[i];
				if (res.isFinal) text += (text ? " " : "") + String(res[0].transcript);
			}
			if (text) cbRef.current(text);
		};
		r.onend = () => setOn(false);
		r.onerror = (e) => {
			setOn(false);
			const kind = String(e?.error ?? "");
			if (kind === "aborted") return;
			setError(kind === "not-allowed" || kind === "service-not-allowed" ? "Microphone blocked — allow mic access in the browser to dictate." : "Dictation stopped unexpectedly. Try again.");
			window.setTimeout(() => setError(null), 5e3);
		};
		rec.current = r;
		try {
			r.start();
			setError(null);
			setOn(true);
		} catch {
			rec.current = null;
			setOn(false);
		}
	};
	return {
		on,
		supported,
		toggle,
		error
	};
}
var fileToBase64 = (file) => new Promise((resolve, reject) => {
	const r = new FileReader();
	r.onload = () => {
		const s = String(r.result ?? "");
		resolve(s.includes(",") ? s.split(",")[1] ?? "" : s);
	};
	r.onerror = () => reject(r.error);
	r.readAsDataURL(file);
});
var Composer = (0, import_react.forwardRef)(({ value, onChange, onSubmit, onStop, onClear, status }, ref) => {
	const busy = status === "submitted" || status === "streaming";
	const navigate = useNavigate();
	const { modelId, setModelId, effort, setEffort, sandbox, setSandbox, setActiveSessionId, rpc } = useAva();
	const { data: models } = useModels();
	const [panel, setPanel] = (0, import_react.useState)(null);
	const voice = useVoice((t) => onChange(value ? `${value} ${t}` : t));
	const [attachments, setAttachments] = (0, import_react.useState)([]);
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const fileInputRef = (0, import_react.useRef)(null);
	const [attachMenuOpen, setAttachMenuOpen] = (0, import_react.useState)(false);
	const [serverPickerOpen, setServerPickerOpen] = (0, import_react.useState)(false);
	const handleFiles = async (files) => {
		if (!files || files.length === 0) return;
		if (!rpc) return;
		setUploading(true);
		try {
			for (const file of Array.from(files)) {
				const dataBase64 = await fileToBase64(file);
				const safeName = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 120) || "file";
				const remotePath = `/root/shared-media/${Date.now()}_${safeName}`;
				await rpc.call("fs/writeFile", {
					path: remotePath,
					dataBase64
				});
				const isImage = file.type.startsWith("image/");
				setAttachments((prev) => [...prev, {
					id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
					name: file.name,
					remotePath,
					kind: isImage ? "image" : "file",
					size: file.size,
					previewUrl: isImage ? URL.createObjectURL(file) : void 0
				}]);
			}
		} catch (e) {
			console.warn("[composer] attachment upload failed:", e);
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};
	const removeAttachment = (id) => {
		setAttachments((prev) => {
			const a = prev.find((x) => x.id === id);
			if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
			return prev.filter((x) => x.id !== id);
		});
	};
	const addServerFile = (media) => {
		const isImage = media.kind === "image";
		setAttachments((prev) => [...prev, {
			id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
			name: media.name,
			remotePath: media.remotePath,
			kind: isImage ? "image" : "file"
		}]);
	};
	const submitWithAttachments = (text) => {
		let full = text.trim();
		if (attachments.length > 0) {
			const attText = attachments.map((a) => `[Attachment: ${a.name} (${a.remotePath})]`).join("\n");
			full = full ? `${full}\n\n${attText}` : attText;
		}
		if (!full) return;
		attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
		setAttachments([]);
		onSubmit(full);
	};
	const model = models?.find((m) => m.id === modelId) ?? models?.find((m) => m.isDefault);
	const sandboxOpt = SANDBOX_MODES.find((s) => s.id === sandbox) ?? SANDBOX_MODES[2];
	const close = () => setPanel(null);
	const go = (to) => {
		close();
		navigate({ to });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setPanel("model"),
				className: "glass absolute -top-3 right-5 z-10 inline-flex h-6 max-w-[60%] items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "truncate",
					children: [
						model?.name ?? "Model",
						" · ",
						effort
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3 shrink-0" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PromptInput, {
				onSubmit: (m) => {
					if (!m.text.trim() && attachments.length === 0) {
						if (busy) return onStop();
						return;
					}
					submitWithAttachments(m.text);
				},
				className: "glass rounded-[1.75rem] [&>[data-slot=input-group]]:rounded-[1.75rem] [&>[data-slot=input-group]]:border-0 [&>[data-slot=input-group]]:bg-transparent [&>[data-slot=input-group]]:shadow-none [&>[data-slot=input-group]]:ring-0 [&>[data-slot=input-group]]:focus-within:ring-0 [&>[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-0",
				children: [
					(attachments.length > 0 || uploading) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-1.5 px-4 pt-3",
						children: [attachments.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex max-w-44 items-center gap-1.5 rounded-xl bg-muted py-1 pl-1 pr-1.5 text-xs",
							children: [
								a.previewUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: a.previewUrl,
									alt: a.name,
									className: "size-7 shrink-0 rounded-lg object-cover"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "ml-1 size-3.5 shrink-0 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate",
									title: a.name,
									children: a.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Remove attachment",
									onClick: () => removeAttachment(a.id),
									className: "grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3" })
								})
							]
						}, a.id)), uploading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1.5 text-xs text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin" }), "Uploading…"]
						})]
					}),
					voice.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						role: "status",
						className: "px-4 pt-2 text-xs text-destructive",
						children: voice.error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptInputTextarea, {
						ref,
						value,
						onChange: (e) => onChange(e.target.value),
						placeholder: "Message AvA (e.g. check status, run tasks, edit code)…",
						className: "min-h-16 px-4 pt-5 text-base leading-6 md:text-[15px]"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PromptInputFooter, {
						className: "gap-2 px-2.5 pb-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PromptInputTools, {
							className: "min-w-0 gap-1.5 overflow-x-auto",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptInputButton, {
									"aria-label": "Add",
									onClick: () => setAttachMenuOpen((v) => !v),
									className: "size-8 shrink-0 rounded-full bg-muted",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: fileInputRef,
									type: "file",
									multiple: true,
									className: "hidden",
									"aria-hidden": "true",
									tabIndex: -1,
									onChange: (e) => void handleFiles(e.target.files)
								}),
								attachMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Close attach menu",
									onClick: () => setAttachMenuOpen(false),
									className: "fixed inset-0 z-[90] cursor-default",
									tabIndex: -1
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "fixed bottom-24 left-4 z-[95] w-72 rounded-2xl border border-border bg-card p-1.5 shadow-2xl",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
										icon: MonitorSmartphone,
										title: "Upload from your device",
										subtitle: "Upload images or documents to the server media library",
										onClick: () => {
											setAttachMenuOpen(false);
											fileInputRef.current?.click();
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
										icon: Server,
										title: "Select from server",
										subtitle: "Browse the server media library (/root/shared-media)",
										onClick: () => {
											setAttachMenuOpen(false);
											setServerPickerOpen(true);
										}
									})]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									icon: Settings2,
									onClick: () => setPanel("actions"),
									children: "Tools"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									icon: ShieldCheck,
									onClick: () => setPanel("sandbox"),
									chevron: true,
									children: sandboxOpt.label
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-1.5",
							children: [voice.supported && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptInputButton, {
								"aria-label": voice.on ? "Stop dictation" : "Dictate",
								"aria-pressed": voice.on,
								tooltip: voice.on ? "Listening — tap to stop" : "Dictate with your voice",
								onClick: voice.toggle,
								className: cn("size-8 rounded-full", voice.on && "bg-destructive/15 text-destructive"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: cn(voice.on && "animate-pulse") })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptInputSubmit, {
								status: busy && !value.trim() ? status : "ready",
								disabled: !busy && !value.trim() && attachments.length === 0,
								className: cn("size-9 rounded-full shadow-md", busy && !value.trim() && "bg-destructive text-destructive-foreground")
							})]
						})]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			open: panel === "actions",
			title: "Prompt actions & tools",
			onClose: close,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
					icon: SquarePen,
					title: "New session",
					subtitle: "Start a fresh conversation",
					onClick: () => {
						setActiveSessionId(null);
						close();
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
					icon: FolderOpen,
					title: "Workspace files",
					subtitle: "Browse project files",
					onClick: () => go("/files")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
					icon: SquareTerminal,
					title: "Terminal",
					subtitle: "Run shell commands",
					onClick: () => go("/terminal")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
					icon: Plug,
					title: "MCP tools",
					subtitle: "Servers, tools and status",
					onClick: () => go("/mcp")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
					icon: Eraser,
					title: "Clear chat view",
					subtitle: "Hide messages on this screen",
					onClick: () => {
						onClear();
						close();
					}
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			open: panel === "model",
			title: "Model & reasoning",
			onClose: close,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelEffortTabs, {
				models: models ?? [],
				selectedModelId: model?.id,
				effort,
				onSelectModel: (id) => {
					setModelId(id);
					close();
				},
				onSelectEffort: setEffort
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			open: panel === "sandbox",
			title: "Sandbox permission",
			onClose: close,
			children: [SANDBOX_MODES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
				title: s.label,
				subtitle: s.description,
				active: sandbox === s.id,
				onClick: () => {
					setSandbox(s.id);
					close();
				}
			}, s.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-3 pt-2 text-xs text-muted-foreground",
				children: "Applies to new sessions."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServerMediaPicker, {
			open: serverPickerOpen && !!rpc,
			onClose: () => setServerPickerOpen(false),
			onSelect: addServerFile,
			initialDirectory: "/root/shared-media"
		})
	] });
});
Composer.displayName = "Composer";
var EFFORT_HINTS = {
	low: "Fast replies, minimal thinking",
	medium: "Balanced speed and depth",
	max: "Deep multi-step reasoning",
	ultra: "Hardest problems, longest deliberation"
};
/** Tabbed model + effort selector with an animated segmented switcher. */
function ModelEffortTabs({ models, selectedModelId, effort, onSelectModel, onSelectEffort }) {
	const [tab, setTab] = (0, import_react.useState)("model");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pb-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative mx-1 mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1",
			children: [{
				id: "model",
				label: "Model",
				icon: Cpu
			}, {
				id: "effort",
				label: "Effort",
				icon: Gauge
			}].map(({ id, label, icon: Icon }) => {
				const active = tab === id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setTab(id),
					className: cn("relative z-10 flex h-9 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"),
					children: [
						active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
							layoutId: "model-effort-tab-pill",
							className: "absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm",
							transition: {
								type: "spring",
								stiffness: 400,
								damping: 34
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
						label
					]
				}, id);
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
			mode: "wait",
			initial: false,
			children: tab === "model" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					opacity: 0,
					x: -14
				},
				animate: {
					opacity: 1,
					x: 0
				},
				exit: {
					opacity: 0,
					x: -14
				},
				transition: {
					duration: .18,
					ease: "easeOut"
				},
				className: "space-y-1",
				children: (models ?? []).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptionRow, {
					title: m.name + (m.isDefault ? " (server default)" : ""),
					subtitle: m.description ?? m.id,
					active: selectedModelId === m.id,
					onClick: () => onSelectModel(m.id)
				}, m.id))
			}, "model") : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					opacity: 0,
					x: 14
				},
				animate: {
					opacity: 1,
					x: 0
				},
				exit: {
					opacity: 0,
					x: 14
				},
				transition: {
					duration: .18,
					ease: "easeOut"
				},
				className: "space-y-1.5 px-1",
				children: REASONING_EFFORTS.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onSelectEffort(e),
					className: cn("flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition", effort === e ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]" : "border-border/60 hover:bg-accent"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-medium capitalize",
						children: e
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted-foreground",
						children: EFFORT_HINTS[e] ?? ""
					})] }), effort === e && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 shrink-0 text-primary" })]
				}, e))
			}, "effort")
		})]
	});
}
var SUGGESTIONS = [
	"Create a new feature",
	"Fix an error",
	"Explain this project"
];
function EmptyChat({ onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-1 items-center justify-center px-6 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvaMascot, {
					size: "lg",
					className: "mx-auto"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-5 text-2xl font-semibold sm:text-3xl",
					children: "What do you want to build?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground",
					children: "Describe a feature, paste an error, or ask AvA to explore your code."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: SUGGESTIONS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => onPick(s),
						className: "glass rounded-full",
						children: s
					}, s))
				})
			]
		})
	});
}
function ChatScreen() {
	const { activeSessionId, setActiveSessionId } = useAva();
	const { data: sessions } = useSessions();
	const { messages, status, error, send, stop, clear, loadingHistory, hasOlder, loadOlder, pendingApprovals, queuedPrompts, answerPendingApproval, answerQuestionPart, removeQueued, resume } = useChat();
	const [draft, setDraft] = (0, import_react.useState)("");
	const [scrollSignal, setScrollSignal] = (0, import_react.useState)(0);
	const inputRef = (0, import_react.useRef)(null);
	const navigate = useNavigate();
	const title = sessions?.find((s) => s.id === activeSessionId)?.title ?? "New session";
	const submit = async (text) => {
		setDraft("");
		setScrollSignal((n) => n + 1);
		const threadId = await send(text);
		if (!threadId) setDraft(text);
		if (threadId && !activeSessionId) navigate({
			to: "/session/$sessionId",
			params: { sessionId: threadId }
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title,
		swipeDrawer: true,
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
			label: "New session",
			onClick: () => setActiveSessionId(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquarePen, {})
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 flex-col",
			children: [messages.length === 0 && !loadingHistory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyChat, { onPick: (s) => {
					setDraft(s);
					inputRef.current?.focus();
				} }), error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mb-3 w-full max-w-3xl px-3 py-2 text-sm text-destructive rounded-xl bg-destructive/10",
					children: error
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Conversation, {
				className: "min-h-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ConversationContent, {
						className: "mx-auto w-full max-w-3xl gap-6 px-4 py-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryLoader, {
								loading: loadingHistory,
								hasOlder,
								onLoadOlder: loadOlder
							}),
							messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatMessageView, {
								message: m,
								live: (status === "submitted" || status === "streaming") && i === messages.length - 1 && m.role === "assistant",
								onAnswerQuestion: (questionId, option) => void answerQuestionPart(questionId, option)
							}, m.id)),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive",
								children: error
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollToBottomTrigger, {
						signal: scrollSignal,
						sessionId: activeSessionId,
						hasMessages: messages.length > 0,
						loadingHistory
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConversationScrollButton, {})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-3xl",
					children: [
						pendingApprovals.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ApprovalCard, {
							approval: a,
							onRespond: (id, approved, content) => answerPendingApproval(id, approved, content)
						}, a.id)),
						queuedPrompts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "glass mb-2 rounded-2xl border p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm font-medium",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-3.5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										queuedPrompts.length,
										" queued prompt",
										queuedPrompts.length === 1 ? "" : "s"
									] })]
								}), status === "ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									size: "sm",
									className: "h-7 rounded-full px-3 text-xs",
									onClick: () => void resume(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3" }), "Start next"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-2 space-y-1.5",
								children: queuedPrompts.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center gap-2 rounded-xl border border-border/60 px-2.5 py-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-0 flex-1 truncate text-xs text-muted-foreground",
										children: q.text
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Remove queued prompt",
										onClick: () => void removeQueued(q.id),
										className: "grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3.5" })
									})]
								}, q.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, {
							ref: inputRef,
							value: draft,
							onChange: setDraft,
							onSubmit: submit,
							onStop: stop,
							status,
							onClear: clear
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-center text-[11px] text-muted-foreground",
							children: [APP.name, " can make mistakes. Review generated code before using it."]
						})
					]
				})
			})]
		})
	});
}
/**
* StickToBottom only auto-scrolls while the user is already at the bottom,
* which is right for streaming, but two moments must always land on the
* latest message: sending your own message (even when scrolled up reading
* history) and opening a session (even if the previous session was left
* scrolled up). This bridge lives inside <Conversation> so it can call
* scrollToBottom() for those moments. Every other append keeps the
* library's stick / escape behaviour, and loading older history is
* untouched because the session id does not change then.
*/
function ScrollToBottomTrigger({ signal, sessionId, hasMessages, loadingHistory }) {
	const { scrollToBottom } = useStickToBottomContext();
	const lastSignalRef = (0, import_react.useRef)(signal);
	const scrolledSessionRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (signal === lastSignalRef.current) return;
		lastSignalRef.current = signal;
		scrollToBottom();
	}, [signal, scrollToBottom]);
	(0, import_react.useEffect)(() => {
		if (!hasMessages || loadingHistory) return;
		if (scrolledSessionRef.current === sessionId) return;
		scrolledSessionRef.current = sessionId;
		scrollToBottom({ animation: "instant" });
	}, [
		sessionId,
		hasMessages,
		loadingHistory,
		scrollToBottom
	]);
	return null;
}
function HistoryLoader({ loading, hasOlder, onLoadOlder }) {
	const { scrollRef } = useStickToBottomContext();
	const restoring = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = scrollRef.current;
		const before = restoring.current;
		if (!el || !before) return;
		el.scrollTop = before.top + (el.scrollHeight - before.height);
		restoring.current = null;
	});
	const load = () => {
		const el = scrollRef.current;
		if (el) restoring.current = {
			height: el.scrollHeight,
			top: el.scrollTop
		};
		onLoadOlder();
	};
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shimmer, {
		className: "mx-auto",
		children: "Loading session…"
	});
	if (!hasOlder) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		type: "button",
		variant: "ghost",
		size: "sm",
		className: "mx-auto rounded-full text-muted-foreground",
		onClick: load,
		children: "Load earlier messages"
	});
}
//#endregion
export { ChatScreen as t };
