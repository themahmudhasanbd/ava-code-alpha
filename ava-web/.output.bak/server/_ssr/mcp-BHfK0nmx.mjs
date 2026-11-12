import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as Input, l as Surface, n as EmptyState, o as PageIntro, r as GlassIconButton, s as SkeletonRows } from "./input-B9nJfjjd.mjs";
import { S as Plug, St as ChevronDown, b as RefreshCw, bt as ChevronRight, i as Wrench, r as X, v as Search } from "../_libs/lucide-react.mjs";
import { T as useMcpServers, k as useReloadMcp, n as Badge, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mcp-BHfK0nmx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ServerCard({ server, forceOpen, filterQuery }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const isOpen = forceOpen || open;
	const tools = (0, import_react.useMemo)(() => {
		if (!filterQuery) return server.tools;
		const q = filterQuery.toLowerCase();
		return server.tools.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
	}, [server.tools, filterQuery]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
		className: "p-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setOpen(!open),
			className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/60",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-9 items-center justify-center rounded-lg bg-secondary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plug, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-sm font-medium",
						children: server.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted-foreground",
						children: tools.length === server.tools.length ? `${server.tools.length} tools` : `${tools.length} of ${server.tools.length} tools matching`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "secondary",
					className: "capitalize",
					children: server.status
				}),
				isOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4" })
			]
		}), isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-1 px-3 pb-2 pt-1",
			children: tools.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "py-2 text-center text-xs text-muted-foreground",
				children: "No matching tools in this server"
			}) : tools.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted/50",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "mt-0.5 size-3.5 shrink-0 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-mono text-xs font-semibold",
						children: t.name
					}), t.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "line-clamp-2 text-xs text-muted-foreground",
						children: t.description
					})]
				})]
			}, t.name))
		})]
	});
}
function McpPage() {
	const { data, isLoading, error } = useMcpServers();
	const reload = useReloadMcp();
	const [query, setQuery] = (0, import_react.useState)("");
	const filteredServers = (0, import_react.useMemo)(() => {
		if (!data) return [];
		if (!query.trim()) return data;
		const q = query.toLowerCase().trim();
		return data.filter((s) => {
			const serverMatch = s.name.toLowerCase().includes(q);
			const toolMatch = s.tools.some((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
			return serverMatch || toolMatch;
		});
	}, [data, query]);
	const totalTools = (0, import_react.useMemo)(() => (data ?? []).reduce((acc, s) => acc + s.tools.length, 0), [data]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "MCP servers & tools",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
			label: "Reload servers",
			onClick: () => reload.mutate(),
			disabled: reload.isPending,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: reload.isPending ? "animate-spin" : "" })
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "MCP servers & tools",
					description: `Browse and search ${totalTools} tools connected to your AvA agent across ${data?.length ?? 0} servers.`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "Search tools or servers (e.g. browser, github, sql, email)...",
							className: "h-11 rounded-xl pl-9 pr-9 text-sm"
						}),
						query && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setQuery(""),
							className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
							"aria-label": "Clear tool search",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
						})
					]
				}),
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, {}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Plug,
					title: "Could not load servers",
					description: error.message
				}),
				!isLoading && data?.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Plug,
					title: "No MCP servers configured"
				}),
				!isLoading && data && data.length > 0 && filteredServers.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Search,
					title: "No tools match your search",
					description: `No tools or servers matching "${query}" were found.`
				}),
				filteredServers.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServerCard, {
					server: s,
					forceOpen: query.trim().length > 0,
					filterQuery: query.trim()
				}, s.name))
			]
		})
	});
}
//#endregion
export { McpPage as component };
