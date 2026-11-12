import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime, a as Overlay2, c as Title2, d as DialogContent, f as DialogDescription, g as DialogTrigger, h as DialogTitle, i as Description2, l as Dialog, m as DialogPortal, n as Cancel, o as Portal2, p as DialogOverlay, r as Content2, s as Root2, t as Action, u as DialogClose } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { c as useAva, i as cn, s as storage, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { c as StatusDot, i as Input, n as EmptyState, r as GlassIconButton, s as SkeletonRows, t as Button, u as buttonVariants } from "./input-B9nJfjjd.mjs";
import { g as useNavigate, h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { Ct as Check, Dt as Bot, E as Pencil, H as Image, J as Folder, K as Globe, M as Menu, N as LogOut, O as Monitor, S as Plug, St as ChevronDown, T as PinOff, Tt as CalendarClock, _t as Circle, a as UserRound, bt as ChevronRight, c as Trash2, h as Settings, j as MessageSquare, jt as Activity, r as X, u as SquareTerminal, ut as Ellipsis, v as Search, w as Pin, x as Plus } from "../_libs/lucide-react.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { a as Label2, c as Root2$1, d as SubTrigger2, f as Trigger, i as ItemIndicator2, l as Separator2, n as Content2$1, o as Portal2$1, r as Item2, s as RadioItem2, t as CheckboxItem2, u as SubContent2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { i as Trigger$1, n as List, r as Root2$2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
import { URL } from "url";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-Bm7y22VV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
	variants: { variant: {
		default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
		secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
		destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
		outline: "text-foreground"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
var Tabs = Root2$2;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger$1, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = Trigger$1.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = Content.displayName;
/** Every screen from the AvA mobile app. Items without `to` are planned next. */
var NAV_SECTIONS = [
	{
		title: "Workspace",
		items: [
			{
				label: "Agent chat",
				icon: MessageSquare,
				to: "/"
			},
			{
				label: "Files",
				icon: Folder,
				to: "/files"
			},
			{
				label: "Terminal",
				icon: SquareTerminal,
				to: "/terminal"
			},
			{
				label: "Browser",
				icon: Globe,
				to: "/browser"
			},
			{
				label: "Media",
				icon: Image,
				to: "/media"
			}
		]
	},
	{
		title: "Agent",
		items: [
			{
				label: "Models",
				icon: Bot,
				to: "/models"
			},
			{
				label: "MCP servers",
				icon: Plug,
				to: "/mcp"
			},
			{
				label: "Scheduled tasks",
				icon: CalendarClock,
				to: "/tasks"
			},
			{
				label: "Remote desktop",
				icon: Monitor,
				to: "/desktop"
			}
		]
	},
	{
		title: "Account",
		items: [
			{
				label: "Profile",
				icon: UserRound,
				to: "/profile"
			},
			{
				label: "System health",
				icon: Activity,
				to: "/system"
			},
			{
				label: "Settings",
				icon: Settings,
				to: "/settings"
			}
		]
	}
];
var DropdownMenu = Root2$1;
var DropdownMenuTrigger = Trigger;
var DropdownMenuSubTrigger = import_react.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SubTrigger2, {
	ref,
	className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-auto" })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
var DropdownMenuSubContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
	ref,
	className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2$1, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
	ref,
	sideOffset,
	className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2$1.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuCheckboxItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CheckboxItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var DropdownMenuRadioItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-2 w-2 fill-current" }) })
	}), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
var DropdownMenuLabel = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
	...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var DropdownMenuShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest opacity-60", className),
		...props
	});
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
/** Primary reasoning tiers (parity with ava-rs 4-tier ladder: ultra -> max -> medium -> low). */
var REASONING_EFFORTS = [
	"low",
	"medium",
	"max",
	"ultra"
];
/** Sandbox modes the agent server understands. */
var SANDBOX_MODES = [
	{
		id: "read-only",
		label: "Read only",
		description: "Can read files, cannot change anything"
	},
	{
		id: "workspace-write",
		label: "Workspace",
		description: "Can edit files inside the project"
	},
	{
		id: "danger-full-access",
		label: "Full access",
		description: "No limits on files or commands"
	}
];
var combo = (id, name, description) => ({
	id,
	name,
	description,
	provider: "omniroute",
	supportsImages: true,
	reasoningEfforts: [...REASONING_EFFORTS]
});
/** Curated OmniRoute combos — same list the mobile app ships with. */
var CURATED_MODELS = [
	combo("ultra-working-combo", "Ultra Working Combo", "Best overall working combo"),
	combo("powerful-coding-combo", "Powerful Coding Combo", "Strong coding combo"),
	combo("omni-ava-combo", "Omni Ava Combo", "Ava-style coding combo"),
	combo("auto/best-coding", "Auto Best Coding", "Automatically picks the best coder")
];
/**
* The server's `model/list` returns a built-in stock catalog that is not
* actually configured. The real models are the OmniRoute combos plus the
* model set in the server config, which is marked as default.
*/
async function listModels(rpc) {
	let configured = "";
	try {
		const res = await rpc.call("config/read", { cwd: "/" });
		configured = String(res?.config?.model ?? "");
	} catch {}
	const list = CURATED_MODELS.map((m) => ({ ...m }));
	if (configured && !list.some((m) => m.id === configured)) list.unshift({
		id: configured,
		name: configured,
		provider: "omniroute",
		supportsImages: true,
		reasoningEfforts: [...REASONING_EFFORTS]
	});
	const def = configured || list[0].id;
	return list.map((m) => ({
		...m,
		isDefault: m.id === def
	})).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
async function listMcpServers(rpc) {
	return ((await rpc.call("mcpServerStatus/list", {}))?.data ?? []).map((s) => {
		const tools = s.tools && typeof s.tools === "object" ? s.tools : {};
		return {
			name: String(s.name ?? ""),
			status: String(s.authStatus ?? s.status ?? "connected"),
			tools: Object.entries(tools).map(([name, t]) => ({
				name,
				description: String(t?.description ?? "")
			}))
		};
	}).filter((s) => s.name);
}
var reloadMcpServers = (rpc) => rpc.call("config/mcpServer/reload", {});
/** Joins a directory and a name into a POSIX path. */
function joinPath(dir, name) {
	return `${dir.replace(/\/+$/, "")}/${name}`;
}
/** Parent directory of a POSIX path ("/" stays "/"). */
function parentPath(path) {
	const trimmed = path.replace(/\/+$/, "");
	const idx = trimmed.lastIndexOf("/");
	return idx <= 0 ? "/" : trimmed.slice(0, idx);
}
async function readDirectory(rpc, path) {
	return ((await rpc.call("fs/readDirectory", { path })).entries ?? []).map((e) => ({
		name: e.fileName ?? "",
		path: joinPath(path, e.fileName ?? ""),
		isDirectory: !!e.isDirectory
	})).filter((e) => e.name).sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));
}
function decodeBase64(data) {
	const binary = atob(data);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}
async function readTextFile(rpc, path) {
	const res = await rpc.call("fs/readFile", { path });
	return res.dataBase64 ? decodeBase64(res.dataBase64) : "";
}
async function getMetadata(rpc, path) {
	const res = await rpc.call("fs/getMetadata", { path });
	return {
		isDirectory: !!res.isDirectory,
		isFile: !!res.isFile,
		modifiedAt: res.modifiedAtMs
	};
}
var str$1 = (v, d = "") => v == null ? d : String(v);
var num = (v) => typeof v === "number" ? v : void 0;
/** "/bin/bash -lc 'ls -la'" → "ls -la" */
function prettyCommand(cmd) {
	const c = Array.isArray(cmd) ? cmd.join(" ") : str$1(cmd);
	const m = c.match(/^\S*(?:bash|sh|zsh)\s+-l?c\s+(['"])([\s\S]*)\1$/);
	return m ? m[2] : c;
}
function itemStatus(item, fallback) {
	const s = str$1(item.status);
	if (s === "failed" || s === "declined" || s === "error") return "error";
	if (s === "inProgress" || s === "in_progress") return "running";
	if (s === "completed") return "done";
	return fallback;
}
function mcpResultText(result) {
	if (result == null) return "";
	if (typeof result === "string") return result;
	const content = result.content ?? result.Ok?.content;
	if (Array.isArray(content)) return content.map((c) => str$1(c.text ?? "")).filter(Boolean).join("\n");
	return JSON.stringify(result, null, 2);
}
/** Parses a JSON object embedded at the start of a tool output string. */
function leadingJsonObject(text) {
	const trimmed = text.trimStart();
	if (!trimmed.startsWith("{")) return void 0;
	try {
		const parsed = JSON.parse(trimmed);
		return parsed && typeof parsed === "object" ? parsed : void 0;
	} catch {
		return;
	}
}
function parseDomain(url) {
	try {
		return new URL(url).hostname;
	} catch {
		return url.split("/")[0] ?? url;
	}
}
/** Extracts a human-readable summary from any structured tool input object. */
function summaryFromObject(obj) {
	if (!obj || typeof obj !== "object") return "";
	if (obj.path) return str$1(obj.path).split("/").pop() || str$1(obj.path);
	if (obj.file) return str$1(obj.file).split("/").pop() || str$1(obj.file);
	if (obj.query) return `"${str$1(obj.query).slice(0, 40)}"`;
	if (obj.pattern) return `"${str$1(obj.pattern).slice(0, 40)}"`;
	if (obj.domain) return str$1(obj.domain);
	if (obj.url) return parseDomain(str$1(obj.url));
	if (obj.command) return (str$1(obj.command).split("\n")[0] ?? "").slice(0, 60);
	if (obj.name) return str$1(obj.name);
	return "";
}
function toPlanSteps(list) {
	return (list ?? []).map((s) => {
		const st = str$1(s.status).toLowerCase();
		const status = s.completed || st === "completed" || st === "done" ? "done" : st === "inprogress" || st === "in_progress" || st === "active" ? "active" : st === "cancelled" || st === "canceled" || st === "abandoned" ? "cancelled" : "pending";
		return {
			text: str$1(s.step ?? s.content ?? s.text ?? s.title),
			status
		};
	}).filter((s) => s.text);
}
/** Converts one server "item" into a UI part. Shared by history and live streaming. */
function extractQuestions(item) {
	if (Array.isArray(item?.questions) && item.questions.length > 0) return item.questions.map((q, idx) => ({
		id: str$1(q.id || `q_${idx}`),
		title: str$1(q.title || q.question || q.text || ""),
		options: Array.isArray(q.options) ? q.options.map((o) => str$1(o)) : void 0
	})).filter((q) => q.title);
}
function itemToPart(item, fallback = "done") {
	const id = str$1(item.id, crypto.randomUUID());
	const type = str$1(item.type);
	const status = itemStatus(item, fallback);
	const questions = extractQuestions(item);
	switch (type) {
		case "userMessage": return null;
		case "agentMessage": return {
			id,
			kind: questions ? "question" : "text",
			text: str$1(item.text),
			status,
			meta: questions ? { questions } : void 0
		};
		case "question":
		case "elicitation":
		case "elicitationRequest": {
			const qs = questions ?? [{
				id,
				title: str$1(item.title ?? item.question ?? item.message, "Agent question"),
				options: Array.isArray(item.options) ? item.options.map((o) => str$1(o)) : void 0
			}];
			return {
				id,
				kind: "question",
				text: qs[0]?.title ?? "Question",
				status,
				meta: { questions: qs }
			};
		}
		case "reasoning": {
			const partText = (v) => Array.isArray(v) ? v.map((e) => typeof e === "string" ? e : str$1(e?.text)).filter(Boolean).join("\n\n") : "";
			return {
				id,
				kind: "reasoning",
				text: partText(item.summary) || partText(item.content) || str$1(item.text),
				status
			};
		}
		case "commandExecution": {
			const command = prettyCommand(item.command);
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Terminal",
				input: command,
				status,
				output: str$1(item.aggregatedOutput ?? ""),
				meta: {
					command,
					cwd: str$1(item.cwd) || void 0,
					exitCode: num(item.exitCode),
					durationMs: num(item.durationMs)
				}
			};
		}
		case "fileChange": {
			const files = (Array.isArray(item.changes) ? item.changes : []).map((c) => ({
				path: str$1(c.path ?? c.file ?? ""),
				kind: str$1(c.kind?.type ?? c.kind ?? "update"),
				diff: str$1(c.diff ?? c.unified_diff ?? "")
			}));
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "File change",
				input: item.changes,
				status,
				meta: { files }
			};
		}
		case "functionCallOutput": {
			const outputBody = item.output;
			const outText = typeof outputBody === "string" ? outputBody : Array.isArray(outputBody?.contentItems ?? outputBody) ? (outputBody.contentItems ?? outputBody).map((c) => str$1(c?.text ?? "")).filter(Boolean).join("\n") : str$1(outputBody?.body ?? outputBody?.text ?? "");
			const ok = outputBody?.success !== false;
			const toolRaw = str$1(item.name, "Tool");
			const toolLower = toolRaw.toLowerCase();
			const args = item.arguments ?? {};
			const outputObj = leadingJsonObject(outText);
			let toolName = toolRaw.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
			let metaCommand = void 0;
			let input = args;
			if (toolLower === "browser" || toolLower === "browser_subagent") {
				toolName = "Browser";
				const action = str$1(args?.action ?? outputObj?.action, "open");
				const url = str$1(args?.url ?? outputObj?.url);
				metaCommand = [action, url ? parseDomain(url) : str$1(outputObj?.title, "").slice(0, 50)].filter(Boolean).join(" ");
				input = url || outputObj?.url || args;
			} else if (toolLower === "view_image") {
				toolName = "View image";
				const path = str$1(args?.path ?? args?.filePath);
				metaCommand = path.split("/").pop() || path;
				input = path || args;
			} else if (toolLower === "tool_search" || toolLower === "tool_search_tool") {
				toolName = "Tool search";
				metaCommand = str$1(args?.query ?? args?.pattern) || void 0;
			} else if (toolLower === "attach_media") {
				toolName = "Attach media";
				const p = str$1(args?.path);
				metaCommand = p.split("/").pop() || p;
			}
			return {
				id,
				kind: "tool",
				text: "",
				toolName,
				input,
				status: ok ? status : "error",
				output: outText,
				meta: {
					server: str$1(item.namespace) || void 0,
					command: metaCommand,
					durationMs: num(item.durationMs)
				}
			};
		}
		case "mcpToolCall": {
			const mcpToolRaw = str$1(item.tool, "MCP tool");
			const server = str$1(item.server) || void 0;
			const toolLower = mcpToolRaw.toLowerCase();
			const serverLower = (server ?? "").toLowerCase();
			let toolName = mcpToolRaw;
			let toolMetaCommand = void 0;
			if (toolLower.includes("browser") || toolLower.includes("navigate") || serverLower.includes("puppeteer")) {
				toolName = "Browser";
				const args = item.arguments ?? {};
				const url = str$1(args?.url ?? args?.href ?? "");
				if (url) toolMetaCommand = `navigate ${parseDomain(url)}`.trim();
			}
			return {
				id,
				kind: "tool",
				text: "",
				toolName,
				input: item.arguments,
				status,
				output: item.error ? str$1(item.error?.message ?? item.error) : mcpResultText(item.result),
				meta: {
					server,
					durationMs: num(item.durationMs),
					command: toolMetaCommand
				}
			};
		}
		case "webSearch": {
			const action = item.action ?? {};
			const q = str$1(item.query) || str$1(action.query) || (Array.isArray(action.queries) ? action.queries.join(", ") : "");
			const url = str$1(action.url);
			const pattern = str$1(action.pattern);
			const actionLabel = str$1(action.type);
			let sub = q ? `"${q.slice(0, 50)}"` : url ? parseDomain(url) : pattern ? `find "${pattern.slice(0, 40)}"` : "";
			if (actionLabel === "openPage" && url) sub = url.slice(0, 60);
			if (actionLabel === "findInPage" && url) sub = `${parseDomain(url)} · "${pattern.slice(0, 30)}"`;
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Web search",
				input: q || url,
				status,
				output: str$1(item.output ?? ""),
				meta: { command: sub || "web search" }
			};
		}
		case "webView":
		case "webViewToolCall":
		case "browserUse": {
			const url = str$1(item.url ?? item.arguments?.url ?? "");
			const domain = parseDomain(url) || str$1(item.domain);
			const action = str$1(item.action ?? item.tool ?? "navigate");
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Browser",
				input: url || domain,
				status,
				output: str$1(item.output ?? item.result ?? ""),
				meta: { command: `${action} ${domain}`.trim() }
			};
		}
		case "imageGeneration": {
			const revised = str$1(item.revised_prompt ?? item.revisedPrompt);
			const savedPath = str$1(item.saved_path ?? item.savedPath);
			const failure = item.failure ? str$1(item.failure?.message ?? item.failure) : "";
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Generate image",
				input: revised || savedPath,
				status: failure ? "error" : status,
				output: failure || (savedPath ? `Saved to ${savedPath}` : str$1(item.result ?? "")),
				meta: { command: revised ? revised.slice(0, 60) : "image generation" }
			};
		}
		case "imageView":
		case "viewImage": {
			const path = str$1(item.path ?? item.arguments?.path);
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "View image",
				input: path,
				status,
				output: str$1(item.output ?? ""),
				meta: { command: path.split("/").pop() || path }
			};
		}
		case "sleep": {
			const ms = num(item.durationMs ?? item.duration_ms);
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Sleep",
				input: ms,
				status,
				meta: {
					command: ms ? ms >= 1e3 ? `${(ms / 1e3).toFixed(ms % 1e3 === 0 ? 0 : 1)}s wait` : `${ms}ms wait` : "wait",
					durationMs: ms
				}
			};
		}
		case "dynamicToolCall": {
			const tool = str$1(item.tool, "Tool");
			const ns = str$1(item.namespace);
			const args = item.arguments ?? {};
			const summary = summaryFromObject(args);
			return {
				id,
				kind: "tool",
				text: "",
				toolName: ns ? `${ns} · ${tool}` : tool,
				input: args,
				status,
				output: str$1(item.output ?? ""),
				meta: {
					command: summary || void 0,
					durationMs: num(item.durationMs)
				}
			};
		}
		case "collabAgentToolCall": {
			const tool = str$1(item.tool, "collab");
			const pretty = tool.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
			const receivers = Array.isArray(item.receiver_thread_ids ?? item.receiverThreadIds) ? (item.receiver_thread_ids ?? item.receiverThreadIds).length : 0;
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Collab agent",
				input: item,
				status,
				meta: { command: [
					pretty.charAt(0).toUpperCase() + pretty.slice(1),
					receivers ? `${receivers} agent${receivers > 1 ? "s" : ""}` : "",
					str$1(item.prompt ?? "").slice(0, 40)
				].filter(Boolean).join(" · ") || tool }
			};
		}
		case "subAgentActivity": {
			const kind = str$1(item.kind ?? "activity");
			const shortPath = str$1(item.agent_path ?? item.agentPath).split("/").filter(Boolean).slice(-2).join("/");
			return {
				id,
				kind: "tool",
				text: "",
				toolName: "Sub-agent",
				input: item,
				status,
				meta: { command: `${kind.charAt(0).toUpperCase()}${kind.slice(1)}${shortPath ? ` · ${shortPath}` : ""}` }
			};
		}
		case "hookPrompt": {
			const frags = Array.isArray(item.fragments) ? item.fragments : [];
			const hookRunId = frags[0]?.hook_run_id ?? frags[0]?.hookRunId;
			return {
				id,
				kind: "notice",
				text: frags.map((f) => str$1(f.text)).filter(Boolean).join(" ") || "Hook prompt injected",
				status,
				meta: {
					tone: "info",
					command: hookRunId ? `hook: ${str$1(hookRunId).slice(0, 20)}` : void 0
				}
			};
		}
		case "enteredReviewMode":
		case "enteredReview": return {
			id,
			kind: "notice",
			text: `Review mode started — ${str$1(item.review ?? item.text ?? "reviewing changes")}`,
			status,
			meta: { tone: "info" }
		};
		case "exitedReviewMode":
		case "exitedReview": return {
			id,
			kind: "notice",
			text: `Review complete — ${str$1(item.review ?? item.text ?? "changes applied")}`,
			status,
			meta: { tone: "info" }
		};
		case "todoList":
		case "plan": return {
			id,
			kind: "plan",
			text: str$1(item.explanation ?? item.title ?? item.text),
			status,
			meta: { steps: toPlanSteps(item.items ?? item.plan ?? []) }
		};
		case "contextCompaction": return {
			id,
			kind: "notice",
			text: "Context compacted to keep the conversation going",
			status,
			meta: { tone: "info" }
		};
		case "error": return {
			id,
			kind: "notice",
			text: str$1(item.message, "Error"),
			status: "error",
			meta: { tone: "error" }
		};
		default: return {
			id,
			kind: "tool",
			text: "",
			toolName: str$1(item.tool) || str$1(item.name) || type || "Step",
			input: item.arguments ?? item,
			output: str$1(item.output ?? item.result ?? ""),
			status
		};
	}
}
var str = (v, d = "") => v == null ? d : String(v);
var counter = 0;
function makeId(prefix = "id") {
	counter = (counter + 1) % 1e6;
	return `${prefix}_${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 6)}`;
}
async function listSessions(rpc, limit = 50) {
	return ((await rpc.call("thread/list", { limit }))?.data ?? []).filter((t) => t.id).map((t) => {
		const isStatusActive = t.status?.type === "active" || t.status === "active" || t.status === "inProgress";
		const statusType = t.status?.type ?? (typeof t.status === "string" ? t.status : "idle");
		return {
			id: str(t.id),
			title: str(t.name) || str(t.preview) || "New session",
			directory: str(t.cwd, "/"),
			model: t.model ? str(t.model) : void 0,
			updatedAt: typeof t.updatedAt === "number" ? t.updatedAt < 1e10 ? t.updatedAt * 1e3 : t.updatedAt : void 0,
			source: str(t.threadSource ?? t.thread_source) || void 0,
			status: statusType,
			active: isStatusActive
		};
	});
}
/** SandboxMode serializes kebab-case ("read-only" | "workspace-write" | "danger-full-access"). */
function normalizeSandboxMode(v) {
	if (!v) return void 0;
	const kebab = v.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
	return kebab === "read-only" || kebab === "workspace-write" || kebab === "danger-full-access" ? kebab : void 0;
}
async function startSession(rpc, opts) {
	const sandbox = normalizeSandboxMode(opts.sandbox);
	return str((await rpc.call("thread/start", {
		cwd: opts.cwd,
		...opts.model ? { model: opts.model } : {},
		...sandbox ? { sandbox } : {}
	}))?.thread?.id);
}
var deleteSession = (rpc, id) => rpc.call("thread/delete", { threadId: id });
var renameSession = (rpc, id, name) => rpc.call("thread/name/set", {
	threadId: id,
	name
});
async function readSession(rpc, id) {
	let res = null;
	try {
		res = await rpc.call("thread/read", {
			threadId: id,
			includeTurns: true
		});
	} catch {
		try {
			res = await rpc.call("thread/resume", { threadId: id });
		} catch (e) {
			console.warn("[readSession] read error:", e);
			res = null;
		}
	}
	const out = [];
	const turns = res?.thread?.turns ?? res?.turns ?? res?.initialTurnsPage?.turns ?? [];
	const threadStatus = res?.thread?.status ?? res?.status;
	const isThreadActive = threadStatus?.type === "active" || threadStatus === "active";
	let isTurnRunning = isThreadActive;
	let activeTurnId;
	for (let i = 0; i < turns.length; i++) {
		const turn = turns[i];
		const isLastTurn = i === turns.length - 1;
		const isTurnInProgress = !(turn.status === "completed" || turn.status === "failed" || turn.status === "interrupted" || turn.status === "done") && (turn.status === "inProgress" || turn.status === "running" || isLastTurn && isThreadActive);
		if (isTurnInProgress) {
			isTurnRunning = true;
			if (turn.id) activeTurnId = str(turn.id);
		}
		const items = turn.items ?? [];
		const parts = [];
		for (let j = 0; j < items.length; j++) {
			const it = items[j];
			if (it.type === "userMessage") {
				let text = "";
				if (Array.isArray(it.content)) text = it.content.map((c) => str(c?.text ?? (typeof c === "string" ? c : ""))).filter(Boolean).join("\n");
				else if (typeof it.content === "string") text = it.content;
				else if (it.text) text = str(it.text);
				const uId = str(it.id) || makeId("u");
				const uPartId = str(it.id ? `${it.id}_p` : makeId("u_p"));
				if (text) out.push({
					id: uId,
					role: "user",
					parts: [{
						id: uPartId,
						kind: "text",
						text,
						status: "done"
					}]
				});
			} else {
				const hasCompletedEvidence = typeof it.exitCode === "number" || it.status === "completed" || it.status === "done" || it.status === "success" || !!it.aggregatedOutput || !!it.output;
				const isLastItem = j === items.length - 1;
				const p = itemToPart(it, isTurnInProgress && isLastItem && !hasCompletedEvidence ? "running" : hasCompletedEvidence ? "done" : it.status === "failed" || it.status === "error" ? "error" : "done");
				if (p) parts.push(p);
			}
		}
		if (parts.length) {
			const turnIdStr = str(turn.id) || `${i}`;
			out.push({
				id: `a_${turnIdStr}`,
				role: "assistant",
				parts,
				stats: { durationMs: typeof turn.durationMs === "number" ? turn.durationMs : void 0 }
			});
		} else if (turn.status === "interrupted" || turn.status === "failed") {
			const turnIdStr = str(turn.id) || `${i}`;
			const wasInterrupted = turn.status === "interrupted";
			const errText = !wasInterrupted && turn.error ? str(turn.error?.message ?? turn.error) : "";
			out.push({
				id: `a_${turnIdStr}`,
				role: "assistant",
				parts: [{
					id: `${turnIdStr}_p_notice`,
					kind: "notice",
					text: wasInterrupted ? "Stopped" : errText || "Turn failed",
					status: "done",
					meta: wasInterrupted ? { tone: "info" } : { tone: "error" }
				}],
				stats: { durationMs: typeof turn.durationMs === "number" ? turn.durationMs : void 0 }
			});
		}
	}
	return {
		messages: out,
		isTurnRunning,
		activeTurnId
	};
}
async function readDiagnostics(rpc) {
	const res = await rpc.call("server/diagnostics", {});
	return {
		processId: res.process?.id,
		memoryBytes: res.process?.residentMemoryBytes,
		gauges: (res.gauges ?? []).map((g) => ({
			name: g.name ?? "",
			value: g.value ?? 0
		})).filter((g) => g.name)
	};
}
async function readServerConfig(rpc) {
	const c = (await rpc.call("config/read", {})).config ?? {};
	const str = (k) => typeof c[k] === "string" ? c[k] : void 0;
	const num = (k) => typeof c[k] === "number" ? c[k] : void 0;
	return {
		model: str("model"),
		provider: str("model_provider"),
		reasoningEffort: str("model_reasoning_effort"),
		approvalPolicy: str("approval_policy"),
		sandboxMode: str("sandbox_mode"),
		contextWindow: num("model_context_window")
	};
}
/** Runs a shell command on the AvA server and returns its full output. */
async function runCommand(rpc, command, cwd) {
	const res = await rpc.call("command/exec", {
		command: [
			"bash",
			"-lc",
			command
		],
		cwd,
		timeoutMs: 6e4
	});
	return {
		exitCode: res.exitCode ?? 0,
		stdout: res.stdout ?? "",
		stderr: res.stderr ?? ""
	};
}
var EXT = {
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
	mp4: "video",
	webm: "video",
	mov: "video",
	mp3: "audio",
	wav: "audio",
	ogg: "audio",
	m4a: "audio"
};
var MIME = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4"
};
var ext = (name) => name.split(".").pop()?.toLowerCase() ?? "";
function mediaKind(name) {
	return EXT[ext(name)] ?? "other";
}
/** Lists files in the shared media folder, including one level of subfolders. */
async function listMedia(rpc, dir) {
	const entries = await readDirectory(rpc, dir);
	const nested = await Promise.all(entries.filter((e) => e.isDirectory).map((d) => readDirectory(rpc, d.path).catch(() => [])));
	return [...entries, ...nested.flat()].filter((e) => !e.isDirectory).map((e) => ({
		name: e.name,
		path: e.path,
		kind: mediaKind(e.name)
	}));
}
/** Reads a media file and returns a data URL for previewing it. */
async function readMediaUrl(rpc, path) {
	const res = await rpc.call("fs/readFile", { path });
	return `data:${MIME[ext(path)] ?? "application/octet-stream"};base64,${res.dataBase64 ?? ""}`;
}
var removeMedia = (rpc, path) => rpc.call("fs/remove", { path });
/** Tasks live in their own system cron file, so AvA never edits other cron jobs. */
var FILE = "/etc/cron.d/ava-tasks";
var RUN_AS = "root";
var TAG = "# ava-task:";
var SCHEDULE_PRESETS = [
	{
		label: "Every 5 minutes",
		value: "*/5 * * * *"
	},
	{
		label: "Hourly",
		value: "0 * * * *"
	},
	{
		label: "Daily at 03:00",
		value: "0 3 * * *"
	},
	{
		label: "Weekly (Mon)",
		value: "0 3 * * 1"
	}
];
function parse(line) {
	const idx = line.indexOf(TAG);
	if (idx < 0) return null;
	const [id, ...nameParts] = line.slice(idx + 11).trim().split(" ");
	let body = line.slice(0, idx).trim();
	const enabled = !body.startsWith("#");
	if (!enabled) body = body.replace(/^#\s*/, "");
	const parts = body.split(/\s+/);
	return {
		id: id ?? "",
		name: nameParts.join(" ") || id || "Task",
		schedule: parts.slice(0, 5).join(" "),
		command: parts.slice(6).join(" "),
		enabled
	};
}
async function readCrontab(rpc) {
	return (await runCommand(rpc, `cat ${FILE} 2>/dev/null || true`, "/")).stdout.split("\n");
}
async function writeCrontab(rpc, lines) {
	const content = lines.filter((l, i, a) => l.trim() || i < a.length - 1).join("\n") + "\n";
	const res = await runCommand(rpc, `echo '${btoa(unescape(encodeURIComponent(content)))}' | base64 -d > ${FILE} && chmod 644 ${FILE}`, "/");
	if (res.exitCode !== 0) throw new Error(res.stderr || "Could not save schedule");
}
var line = (t) => `${t.enabled ? "" : "# "}${t.schedule} ${RUN_AS} ${t.command} ${TAG}${t.id} ${t.name}`;
async function listTasks(rpc) {
	return (await readCrontab(rpc)).map(parse).filter((t) => !!t);
}
async function saveTask(rpc, task) {
	if (task.schedule.trim().split(/\s+/).length !== 5) throw new Error("Schedule needs 5 parts, e.g. */5 * * * *");
	if (/[\n\r]/.test(task.command) || !task.command.trim()) throw new Error("Command must be a single line");
	const full = {
		...task,
		id: task.id || Date.now().toString(36),
		name: task.name.replace(/\s+/g, " ").trim()
	};
	const lines = await readCrontab(rpc);
	const i = lines.findIndex((l) => parse(l)?.id === full.id);
	if (i >= 0) lines[i] = line(full);
	else lines.push(line(full));
	await writeCrontab(rpc, lines);
}
async function deleteTask(rpc, id) {
	await writeCrontab(rpc, (await readCrontab(rpc)).filter((l) => parse(l)?.id !== id));
}
async function runTaskNow(rpc, task) {
	return runCommand(rpc, task.command, "/");
}
/** Looks for a running X display / VNC server and a screenshot tool on the server. */
async function readDesktopStatus(rpc) {
	const res = await runCommand(rpc, `D=$(ls /tmp/.X11-unix 2>/dev/null | head -1 | sed 's/X/:/'); echo "D=$D"; pgrep -f 'vnc|x11vnc' >/dev/null && echo VNC=1 || echo VNC=0; command -v ffmpeg >/dev/null && echo SHOT=1 || echo SHOT=0; echo SIZE=$(DISPLAY=$D xdotool getdisplaygeometry 2>/dev/null)`, "/");
	const get = (k) => res.stdout.match(new RegExp(`${k}=(.*)`))?.[1]?.trim() ?? "";
	const [w, h] = get("SIZE").split(" ").map(Number);
	return {
		width: w || 1920,
		height: h || 1080,
		display: get("D") || null,
		vncRunning: get("VNC") === "1",
		canScreenshot: get("SHOT") === "1"
	};
}
/** Captures the current screen as a PNG data URL. */
async function captureScreen(rpc, display, width, height) {
	const res = await runCommand(rpc, `F=/tmp/ava-shot.jpg; ffmpeg -loglevel error -y -f x11grab -video_size ${width}x${height} -i ${display} -frames:v 1 -vf scale=1280:-1 -q:v 5 $F && base64 -w0 $F`, "/");
	if (res.exitCode !== 0 || !res.stdout) throw new Error(res.stderr || "Screenshot failed");
	return `data:image/jpeg;base64,${res.stdout.trim()}`;
}
/** Sends a click or key press using xdotool. */
async function sendDesktopInput(rpc, display, input) {
	const esc = (s) => s.replace(/'/g, "'\\''");
	const res = await runCommand(rpc, `export DISPLAY=${display}; ${"key" in input ? `xdotool key '${esc(input.key)}'` : "text" in input ? `xdotool type -- '${esc(input.text)}'` : `xdotool mousemove ${Math.round(input.x)} ${Math.round(input.y)} click 1`}`, "/");
	if (res.exitCode !== 0) throw new Error(res.stderr || "Input failed (is xdotool installed?)");
}
var keys = {
	sessions: ["sessions"],
	session: (id) => ["session", id],
	models: ["models"],
	mcp: ["mcp"],
	dir: (path) => ["dir", path],
	file: (path) => ["file", path],
	diagnostics: ["diagnostics"],
	serverConfig: ["server-config"]
};
function useDirectory(path) {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.dir(path),
		queryFn: () => readDirectory(rpc, path),
		enabled: !!rpc && status === "online"
	});
}
function useFileContent(path) {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.file(path ?? ""),
		queryFn: async () => ({
			text: await readTextFile(rpc, path),
			meta: await getMetadata(rpc, path)
		}),
		enabled: !!rpc && !!path && status === "online"
	});
}
function useRunCommand() {
	const { rpc } = useAva();
	return useMutation({ mutationFn: (v) => runCommand(rpc, v.command, v.cwd) });
}
function useDiagnostics() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.diagnostics,
		queryFn: () => readDiagnostics(rpc),
		enabled: !!rpc && status === "online",
		refetchInterval: 1e4
	});
}
function useServerConfig() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.serverConfig,
		queryFn: () => readServerConfig(rpc),
		enabled: !!rpc && status === "online"
	});
}
function useSessions() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.sessions,
		queryFn: () => listSessions(rpc),
		enabled: !!rpc && status === "online"
	});
}
function useSessionHistory(id) {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.session(id ?? ""),
		queryFn: () => readSession(rpc, id),
		enabled: !!rpc && !!id && status === "online"
	});
}
function useModels() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.models,
		queryFn: () => listModels(rpc),
		enabled: !!rpc && status === "online",
		staleTime: 3e5
	});
}
function useMcpServers() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: keys.mcp,
		queryFn: () => listMcpServers(rpc),
		enabled: !!rpc && status === "online"
	});
}
function useReloadMcp() {
	const { rpc } = useAva();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => reloadMcpServers(rpc),
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.mcp })
	});
}
function useDeleteSession() {
	const { rpc } = useAva();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id) => deleteSession(rpc, id),
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions })
	});
}
function useRenameSession() {
	const { rpc } = useAva();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (v) => renameSession(rpc, v.id, v.name),
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions })
	});
}
function useMedia(dir) {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: ["media", dir],
		queryFn: () => listMedia(rpc, dir),
		enabled: !!rpc && status === "online"
	});
}
function useMediaUrl(path) {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: ["media-url", path],
		queryFn: () => readMediaUrl(rpc, path),
		enabled: !!rpc && !!path && status === "online",
		staleTime: Infinity
	});
}
function useRemoveMedia() {
	const { rpc } = useAva();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (path) => removeMedia(rpc, path),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] })
	});
}
function useTasks() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: ["tasks"],
		queryFn: () => listTasks(rpc),
		enabled: !!rpc && status === "online"
	});
}
function useSaveTask() {
	const { rpc } = useAva();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (t) => saveTask(rpc, t),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] })
	});
}
function useDeleteTask() {
	const { rpc } = useAva();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id) => deleteTask(rpc, id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] })
	});
}
function useRunTask() {
	const { rpc } = useAva();
	return useMutation({ mutationFn: (t) => runTaskNow(rpc, t) });
}
function useDesktopStatus() {
	const { rpc, status } = useAva();
	return useQuery({
		queryKey: ["desktop"],
		queryFn: () => readDesktopStatus(rpc),
		enabled: !!rpc && status === "online"
	});
}
function useCaptureScreen() {
	const { rpc } = useAva();
	return useMutation({ mutationFn: (v) => captureScreen(rpc, v.display, v.width, v.height) });
}
function useDesktopInput() {
	const { rpc } = useAva();
	return useMutation({ mutationFn: (v) => sendDesktopInput(rpc, v.display, v.input) });
}
var PIN_KEY = "ava.workspace.pins";
var NAME_KEY = "ava.workspace.names";
function readJson(key, fallback) {
	try {
		const value = storage.get(key);
		return value ? JSON.parse(value) : fallback;
	} catch {
		return fallback;
	}
}
function groupByProject(sessions) {
	const map = /* @__PURE__ */ new Map();
	for (const session of sessions) {
		const key = session.directory || "/";
		map.set(key, [...map.get(key) ?? [], session]);
	}
	return [...map.entries()];
}
var projectName = (dir) => dir.split("/").filter(Boolean).pop() ?? "Root";
function SessionsList({ onPick }) {
	const { activeSessionId, setActiveSessionId, workingSessionId, status } = useAva();
	const { data, isLoading, error } = useSessions();
	const del = useDeleteSession();
	const rename = useRenameSession();
	const navigate = useNavigate();
	const [pins, setPins] = (0, import_react.useState)([]);
	const [names, setNames] = (0, import_react.useState)({});
	const [expanded, setExpanded] = (0, import_react.useState)([]);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [draftName, setDraftName] = (0, import_react.useState)("");
	const [editingSession, setEditingSession] = (0, import_react.useState)(null);
	const [sessionDraft, setSessionDraft] = (0, import_react.useState)("");
	const [confirmDeleteId, setConfirmDeleteId] = (0, import_react.useState)(null);
	const [query, setQuery] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setPins(readJson(PIN_KEY, []));
		setNames(readJson(NAME_KEY, {}));
	}, []);
	const activeDirectory = data?.find((session) => session.id === (workingSessionId ?? activeSessionId))?.directory;
	const visible = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data ?? [];
		return (data ?? []).filter((session) => session.title.toLowerCase().includes(q));
	}, [data, query]);
	const groups = (0, import_react.useMemo)(() => {
		return groupByProject(visible).sort(([a], [b]) => {
			if (a === activeDirectory) return -1;
			if (b === activeDirectory) return 1;
			const ai = pins.indexOf(a);
			const bi = pins.indexOf(b);
			if (ai >= 0 || bi >= 0) return ai < 0 ? 1 : bi < 0 ? -1 : ai - bi;
			return projectName(a).localeCompare(projectName(b));
		});
	}, [
		visible,
		pins,
		activeDirectory
	]);
	(0, import_react.useEffect)(() => {
		if (activeDirectory) setExpanded((items) => items.includes(activeDirectory) ? items : [...items, activeDirectory]);
	}, [activeDirectory]);
	const pick = async (id) => {
		setActiveSessionId(id);
		onPick();
		if (id) await navigate({
			to: "/session/$sessionId",
			params: { sessionId: id }
		});
		else await navigate({ to: "/" });
	};
	const togglePin = (dir) => {
		setPins((current) => {
			const next = current.includes(dir) ? current.filter((item) => item !== dir) : [dir, ...current];
			storage.set(PIN_KEY, JSON.stringify(next));
			return next;
		});
	};
	const saveName = (dir) => {
		const value = draftName.trim();
		setNames((current) => {
			const next = { ...current };
			if (value) next[dir] = value;
			else delete next[dir];
			storage.set(NAME_KEY, JSON.stringify(next));
			return next;
		});
		setEditing(null);
	};
	const saveSessionName = (id) => {
		const value = sessionDraft.trim();
		if (value) rename.mutate({
			id,
			name: value
		});
		setEditingSession(null);
	};
	const confirmDelete = (id) => {
		if (activeSessionId === id) setActiveSessionId(null);
		del.mutate(id);
		setConfirmDeleteId(null);
	};
	const deleteTarget = data?.find((session) => session.id === confirmDeleteId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "ghost",
			className: "glass mb-4 h-10 w-full justify-start gap-2 rounded-xl",
			onClick: () => void pick(null),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), " New session"]
		}),
		data && data.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative mb-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: query,
					onChange: (event) => setQuery(event.target.value),
					onKeyDown: (event) => {
						if (event.key === "Escape") setQuery("");
					},
					placeholder: "Search sessions",
					"aria-label": "Search sessions",
					className: "h-10 rounded-xl pl-9 pr-9"
				}),
				query !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon-sm",
					"aria-label": "Clear search",
					onClick: () => setQuery(""),
					className: "absolute right-1.5 top-1/2 -translate-y-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
				})
			]
		}),
		status !== "online" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "px-2 text-sm text-muted-foreground",
			children: "Waiting for server connection…"
		}),
		isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, {}),
		error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "px-2 text-sm text-destructive",
			children: "Could not load sessions."
		}),
		data && data.length === 0 && status === "online" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
			icon: MessageSquare,
			title: "No sessions yet",
			description: "Start your first session to chat with AvA.",
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				onClick: () => void pick(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), " New session"]
			})
		}),
		data && data.length > 0 && visible.length === 0 && query.trim() !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "px-2 text-sm text-muted-foreground",
			children: [
				"No sessions match “",
				query.trim(),
				"”."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: groups.map(([dir, sessions]) => {
				const isActiveWorkspace = dir === activeDirectory;
				const isOpen = query.trim() !== "" || isActiveWorkspace || expanded.includes(dir);
				const pinned = pins.includes(dir);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: cn("rounded-xl", isActiveWorkspace && "bg-sidebar-accent/55"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 items-center px-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "ghost",
							size: "sm",
							"aria-expanded": isOpen,
							onClick: () => setExpanded((items) => isOpen ? items.filter((item) => item !== dir) : [...items, dir]),
							className: "h-10 min-w-0 flex-1 justify-start gap-2 px-2 text-muted-foreground",
							children: [
								isOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: cn(isActiveWorkspace && "text-primary") }),
								editing === dir ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									autoFocus: true,
									value: draftName,
									onChange: (event) => setDraftName(event.target.value),
									onClick: (event) => event.stopPropagation(),
									onKeyDown: (event) => {
										if (event.key === "Enter") saveName(dir);
										if (event.key === "Escape") setEditing(null);
									},
									className: "h-7 min-w-0 flex-1 px-2 text-sm"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate",
									children: names[dir] || projectName(dir)
								}),
								workingSessionId && sessions.some((session) => session.id === workingSessionId) || sessions.some((session) => session.active) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto size-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary",
									"aria-label": "Agent working"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto text-xs",
									children: sessions.length
								})
							]
						}), editing === dir ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Save workspace name",
								onClick: () => saveName(dir),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "Cancel rename",
								onClick: () => setEditing(null),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": `Actions for ${names[dir] || projectName(dir)}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
							align: "end",
							className: "rounded-xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onSelect: () => togglePin(dir),
								children: [pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PinOff, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, {}), pinned ? "Unpin workspace" : "Pin workspace"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onSelect: () => {
									setEditing(dir);
									setDraftName(names[dir] || projectName(dir));
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, {}), "Rename display name"]
							})]
						})] })]
					}), isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ml-5 mr-1 space-y-0.5 border-l border-sidebar-border pl-3 pb-2",
						children: sessions.map((session) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "group flex items-center",
							children: editingSession === session.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									autoFocus: true,
									value: sessionDraft,
									onChange: (event) => setSessionDraft(event.target.value),
									onKeyDown: (event) => {
										if (event.key === "Enter") saveSessionName(session.id);
										if (event.key === "Escape") setEditingSession(null);
									},
									className: "h-7 min-w-0 flex-1 px-2 text-sm",
									"aria-label": "Session title"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									"aria-label": "Save session title",
									onClick: () => saveSessionName(session.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									"aria-label": "Cancel rename",
									onClick: () => setEditingSession(null),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
								})
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "ghost",
									onClick: () => void pick(session.id),
									className: cn("h-auto min-h-9 min-w-0 flex-1 justify-start truncate rounded-lg px-2 py-2 text-left text-sm font-normal", activeSessionId === session.id ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate",
										children: session.title
									}), (workingSessionId === session.id || session.active) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ml-auto size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									"aria-label": "Rename session",
									className: "opacity-60 sm:opacity-0 sm:group-hover:opacity-100",
									onClick: () => {
										setEditingSession(session.id);
										setSessionDraft(session.title);
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									"aria-label": "Delete session",
									className: "opacity-60 sm:opacity-0 sm:group-hover:opacity-100",
									onClick: () => setConfirmDeleteId(session.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
								})
							] })
						}, session.id))
					})]
				}, dir);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
			open: confirmDeleteId !== null,
			onOpenChange: (open) => {
				if (!open) setConfirmDeleteId(null);
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete session?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [deleteTarget ? `"${deleteTarget.title}"` : "This session", " will be permanently deleted. This cannot be undone."] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
				className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
				onClick: () => {
					if (confirmDeleteId) confirmDelete(confirmDeleteId);
				},
				children: "Delete"
			})] })] })
		})
	] });
}
function AppDrawer({ open, onOpenChange }) {
	const { auth, status, signOut } = useAva();
	const close = () => onOpenChange(false);
	const [tab, setTab] = (0, import_react.useState)("sessions");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
		open,
		onOpenChange,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
				label: "Open navigation",
				className: "shrink-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {})
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			side: "left",
			className: "glass m-2 flex h-[calc(100%-1rem)] w-[88vw] max-w-[22rem] flex-col gap-0 rounded-3xl p-0 [&>button]:right-3 [&>button]:top-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetHeader, {
					className: "border-b border-sidebar-border px-4 py-3 pr-12 text-left",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-2.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, {
							className: "text-sm font-semibold",
							children: APP.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetDescription, {
							className: "text-xs",
							children: [
								APP.tagline,
								" · v",
								APP.version
							]
						})] })
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
					value: tab,
					onValueChange: (v) => setTab(v),
					className: "flex min-h-0 flex-1 flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "px-3 pt-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsList, {
								className: "grid h-10 w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1",
								children: ["menu", "sessions"].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerTabTrigger, {
									value,
									label: LABELS[value],
									active: tab === value
								}, value))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "menu",
							className: "mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-4",
							children: NAV_SECTIONS.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
								className: "mb-5",
								"aria-label": section.title,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "px-3 pb-1.5 text-xs font-medium uppercase text-muted-foreground",
									children: section.title
								}), section.items.map((item) => item.to ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									variant: "ghost",
									className: "h-10 w-full justify-start gap-3 rounded-xl px-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: item.to,
										onClick: close,
										activeProps: { className: "bg-sidebar-accent" },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {}),
											" ",
											item.label
										]
									})
								}, item.label) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "ghost",
									disabled: true,
									className: "h-10 w-full justify-start gap-3 rounded-xl px-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {}),
										" ",
										item.label,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "secondary",
											className: "ml-auto text-[10px]",
											children: "Soon"
										})
									]
								}, item.label))]
							}, section.title))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "sessions",
							className: "mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionsList, { onPick: close })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 border-t border-sidebar-border p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold uppercase text-primary-foreground",
							children: auth?.username.slice(0, 2)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block truncate text-sm font-medium",
								children: auth?.username
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1.5 truncate text-xs text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status }),
									" ",
									auth?.serverUrl.replace(/^https?:\/\//, "")
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							"aria-label": "Sign out",
							onClick: signOut,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, {})
						})
					]
				})
			]
		})]
	});
}
/** Drawer tab trigger with the animated sliding pill used in the composer. */
function DrawerTabTrigger({ value, label, active }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
		value,
		className: "relative z-10 rounded-xl data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none",
		children: [active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
			layoutId: "drawer-tab-pill",
			className: "absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm",
			transition: {
				type: "spring",
				stiffness: 400,
				damping: 34
			}
		}), label]
	});
}
var LABELS = {
	menu: "Menu",
	sessions: "Sessions"
};
/** Shared page frame: floating glass header + drawer. Redirects to sign-in when signed out. */
function AppShell({ title, actions, children, swipeDrawer = false }) {
	const { ready, auth, status } = useAva();
	const navigate = useNavigate();
	const [drawer, setDrawer] = (0, import_react.useState)(false);
	const gesture = (0, import_react.useRef)(null);
	const startSwipe = (event) => {
		if (swipeDrawer && event.pointerType === "touch" && event.clientX <= 28) gesture.current = {
			x: event.clientX,
			y: event.clientY
		};
	};
	const finishSwipe = (event) => {
		const start = gesture.current;
		gesture.current = null;
		if (!start) return;
		const dx = event.clientX - start.x;
		const dy = Math.abs(event.clientY - start.y);
		if (dx > 64 && dx > dy * 1.4) setDrawer(true);
	};
	(0, import_react.useEffect)(() => {
		if (ready && !auth) navigate({ to: "/login" });
	}, [
		ready,
		auth,
		navigate
	]);
	if (!ready || !auth) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { className: "min-h-dvh bg-background app-glow" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative flex h-dvh flex-col overflow-hidden bg-background app-glow text-foreground",
		onPointerDown: startSwipe,
		onPointerUp: finishSwipe,
		onPointerCancel: () => {
			gesture.current = null;
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "glass z-20 mx-3 mt-3 flex h-14 shrink-0 items-center justify-between rounded-2xl px-2 sm:mx-5 sm:h-16 sm:px-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 items-center gap-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppDrawer, {
					open: drawer,
					onOpenChange: setDrawer
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate text-sm font-semibold",
							children: APP.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status })]
					}), title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-xs text-muted-foreground",
						children: title
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-1.5",
				children: actions
			})]
		}), children]
	});
}
//#endregion
export { useRemoveMedia as A, useDirectory as C, useMediaUrl as D, useMedia as E, useSessionHistory as F, useSessions as I, useTasks as L, useRunTask as M, useSaveTask as N, useModels as O, useServerConfig as P, useDiagnostics as S, useMcpServers as T, toPlanSteps as _, SCHEDULE_PRESETS as a, useDesktopInput as b, SheetHeader as c, keys as d, mediaKind as f, startSession as g, readMediaUrl as h, SANDBOX_MODES as i, useRunCommand as j, useReloadMcp as k, SheetTitle as l, readDirectory as m, Badge as n, Sheet as o, parentPath as p, REASONING_EFFORTS as r, SheetContent as s, AppShell as t, itemToPart as u, useCaptureScreen as v, useFileContent as w, useDesktopStatus as x, useDeleteTask as y };
