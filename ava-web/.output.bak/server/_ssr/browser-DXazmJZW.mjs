import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { i as Input, l as Surface, r as GlassIconButton } from "./input-B9nJfjjd.mjs";
import { K as Globe, ct as ExternalLink, kt as ArrowRight, y as RotateCw } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/browser-DXazmJZW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function normalize(input) {
	const t = input.trim();
	if (!t) return "";
	if (/^https?:\/\//i.test(t)) return t;
	return /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(t) ? `http://${t}` : `https://${t}`;
}
function BrowserPage() {
	const [address, setAddress] = (0, import_react.useState)(APP.defaultBrowserUrl);
	const [url, setUrl] = (0, import_react.useState)(APP.defaultBrowserUrl);
	const [reloadKey, setReloadKey] = (0, import_react.useState)(0);
	const go = () => {
		const next = normalize(address);
		if (next) {
			setAddress(next);
			setUrl(next);
			setReloadKey((k) => k + 1);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Browser",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 px-4 py-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					className: "flex items-center gap-2 p-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "ml-2 size-4 shrink-0 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: address,
							onChange: (e) => setAddress(e.target.value),
							onKeyDown: (e) => e.key === "Enter" && go(),
							placeholder: "Enter a URL",
							className: "h-9 border-0 bg-transparent shadow-none focus-visible:ring-0",
							inputMode: "url"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
							label: "Go",
							onClick: go,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
							label: "Reload",
							onClick: () => setReloadKey((k) => k + 1),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
							label: "Open in new tab",
							onClick: () => window.open(url, "_blank", "noopener"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-4" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
					className: "relative min-h-[60vh] flex-1 overflow-hidden p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						src: url,
						title: "Browser preview",
						className: "absolute inset-0 size-full bg-background",
						sandbox: "allow-scripts allow-same-origin allow-forms allow-popups"
					}, reloadKey)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-xs text-muted-foreground",
					children: "Some sites block being shown inside apps — use “Open in new tab” for those."
				})
			]
		})
	});
}
//#endregion
export { BrowserPage as component };
