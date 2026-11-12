import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as decodeCredentials, c as useAva, l as verifyLogin, r as cleanUrl, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { c as StatusDot, i as Input, l as Surface, n as EmptyState, o as PageIntro, s as SkeletonRows, t as Button } from "./input-B9nJfjjd.mjs";
import { i as useQueryClient } from "../_libs/tanstack__react-query.mjs";
import { F as LoaderCircle, h as Settings } from "../_libs/lucide-react.mjs";
import { P as useServerConfig, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
import { t as Label } from "./label-D9_nswTA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-CzXRKk90.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Row({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-3 px-3 py-2.5 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "min-w-0 truncate font-medium",
			children: value
		})]
	});
}
var STATUS_LABEL = {
	online: "Online",
	connecting: "Connecting…",
	offline: "Offline"
};
function ConnectionSection() {
	const { auth, status, signIn } = useAva();
	const qc = useQueryClient();
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [url, setUrl] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const beginEdit = () => {
		setUrl(auth?.serverUrl ?? "");
		setError(null);
		setEditing(true);
	};
	const commit = async () => {
		if (!auth || busy) return;
		const next = cleanUrl(url);
		if (next === cleanUrl(auth.serverUrl)) {
			setEditing(false);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const { password } = decodeCredentials(auth.token);
			const nextAuth = await verifyLogin(next, auth.username, password);
			signIn(nextAuth);
			await qc.invalidateQueries();
			setEditing(false);
		} catch (e) {
			setError(e.message === "Failed to fetch" ? "Could not reach the server" : e.message);
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-2 flex items-center justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-sm font-semibold",
			children: "Connection"
		}), !editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			variant: "ghost",
			size: "sm",
			className: "h-7 px-2 text-xs",
			onClick: beginEdit,
			children: "Change server"
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
		className: "divide-y divide-border/50 p-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 px-3 py-2.5 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: "Status"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1.5 font-medium",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status }), STATUS_LABEL[status]]
				})]
			}),
			editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-2.5 px-3 py-3",
				onSubmit: (e) => {
					e.preventDefault();
					commit();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "server-url",
						children: "Server URL"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "server-url",
						inputMode: "url",
						autoFocus: true,
						value: url,
						onChange: (e) => setUrl(e.target.value),
						placeholder: APP.defaultServerUrl,
						className: "rounded-xl",
						disabled: busy
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-destructive",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							disabled: busy,
							onClick: () => setEditing(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							size: "sm",
							disabled: busy || !url.trim(),
							children: [busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" }), "Connect"]
						})]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Server",
				value: auth?.serverUrl ?? "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Signed in as",
				value: auth?.username ?? "—"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "App",
				value: `${APP.name} v${APP.version}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
				label: "Client",
				value: APP.clientName
			})
		]
	})] });
}
function SettingsPage() {
	const { modelId } = useAva();
	const { data, isLoading, error } = useServerConfig();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Settings",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "Settings",
					description: "Read from your server's configuration."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionSection, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-2 text-sm font-semibold",
						children: "Agent"
					}),
					isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 3 }),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						icon: Settings,
						title: "Could not read settings",
						description: error.message
					}),
					data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
						className: "divide-y divide-border/50 p-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Selected model",
								value: modelId || data.model || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Provider",
								value: data.provider ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Thinking effort",
								value: data.reasoningEffort ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Approvals",
								value: data.approvalPolicy ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Sandbox",
								value: data.sandboxMode ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Context window",
								value: data.contextWindow ? `${data.contextWindow.toLocaleString()} tokens` : "—"
							})
						]
					})
				] })
			]
		})
	});
}
//#endregion
export { SettingsPage as component };
