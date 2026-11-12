import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { c as useAva, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { c as StatusDot, l as Surface, n as EmptyState, o as PageIntro, r as GlassIconButton, s as SkeletonRows } from "./input-B9nJfjjd.mjs";
import { b as RefreshCw, jt as Activity } from "../_libs/lucide-react.mjs";
import { P as useServerConfig, S as useDiagnostics, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/system-IXgfXTzM.js
var import_jsx_runtime = require_jsx_runtime();
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
		className: "px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 truncate text-sm font-semibold",
			children: value
		})]
	});
}
var GAUGE_LABELS = {
	"app.requests.in_flight": "Requests in flight",
	"app.requests.queued": "Queued requests",
	"core.threads.live": "Live sessions",
	"core.turns.active": "Active replies",
	"mcp.connections.live": "MCP connections"
};
function SystemPage() {
	const { status, auth } = useAva();
	const diag = useDiagnostics();
	const config = useServerConfig();
	const memory = diag.data?.memoryBytes ? `${(diag.data.memoryBytes / 1024 / 1024).toFixed(0)} MB` : "—";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "System health",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
			label: "Refresh health",
			onClick: () => void diag.refetch(),
			disabled: diag.isFetching,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: diag.isFetching ? "animate-spin" : "" })
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "System health",
					description: "Updates every few seconds."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					className: "flex items-center gap-2.5 px-3 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium capitalize",
							children: status
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto truncate text-xs text-muted-foreground",
							children: auth?.serverUrl
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "App version",
							value: `v${APP.version}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Server memory",
							value: memory
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Process",
							value: diag.data?.processId ? String(diag.data.processId) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Model",
							value: config.data?.model ?? "—"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-2 text-sm font-semibold",
						children: "Activity"
					}),
					diag.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 3 }),
					diag.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: Activity,
						title: "Could not read health",
						description: diag.error.message
					}),
					!!diag.data?.gauges.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
						className: "divide-y divide-border/50 p-1.5",
						children: diag.data.gauges.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between px-3 py-2.5 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: GAUGE_LABELS[g.name] ?? g.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: g.value
							})]
						}, g.name))
					})
				] })
			]
		})
	});
}
//#endregion
export { SystemPage as component };
