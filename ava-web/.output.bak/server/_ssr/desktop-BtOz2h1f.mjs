import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as Input, l as Surface, n as EmptyState, o as PageIntro, r as GlassIconButton, s as SkeletonRows } from "./input-B9nJfjjd.mjs";
import { C as Play, D as Pause, O as Monitor, wt as Camera, z as Keyboard } from "../_libs/lucide-react.mjs";
import { b as useDesktopInput, n as Badge, t as AppShell, v as useCaptureScreen, x as useDesktopStatus } from "./app-shell-Bm7y22VV.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/desktop-BtOz2h1f.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEYS = [
	"Return",
	"Escape",
	"Tab",
	"BackSpace",
	"ctrl+c",
	"ctrl+v",
	"super"
];
function DesktopPage() {
	const { data: status, isLoading, error } = useDesktopStatus();
	const capture = useCaptureScreen();
	const input = useDesktopInput();
	const [shot, setShot] = (0, import_react.useState)(null);
	const [live, setLive] = (0, import_react.useState)(false);
	const [text, setText] = (0, import_react.useState)("");
	const imgRef = (0, import_react.useRef)(null);
	const display = status?.display ?? null;
	const refresh = async () => {
		if (!display) return;
		try {
			setShot(await capture.mutateAsync({
				display,
				width: status.width,
				height: status.height
			}));
		} catch (e) {
			setLive(false);
			toast.error(e.message);
		}
	};
	(0, import_react.useEffect)(() => {
		if (!live) return;
		const id = setInterval(refresh, 2500);
		return () => clearInterval(id);
	}, [live, display]);
	const send = async (payload) => {
		if (!display) return;
		try {
			await input.mutateAsync({
				display,
				input: payload
			});
			setTimeout(refresh, 400);
		} catch (e) {
			toast.error(e.message);
		}
	};
	const onClick = (e) => {
		const img = imgRef.current;
		if (!img) return;
		const r = img.getBoundingClientRect();
		send({
			x: (e.clientX - r.left) / r.width * status.width,
			y: (e.clientY - r.top) / r.height * status.height
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Remote desktop",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-5xl flex-1 space-y-4 overflow-y-auto px-4 py-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "Remote desktop",
					description: "Tap the screen to click. Type below to send keys.",
					action: display && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
							label: "Capture",
							onClick: refresh,
							disabled: capture.isPending,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
							label: live ? "Pause live view" : "Start live view",
							onClick: () => setLive((v) => !v),
							children: live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" })
						})]
					})
				}),
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 2 }),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Monitor,
					title: "Could not check the desktop",
					description: error.message
				}),
				status && !display && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Monitor,
					title: "No desktop running",
					description: "Start a desktop session (for example Xvfb or a VNC server) on your server, then come back."
				}),
				status && display && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								variant: "secondary",
								children: ["Display ", display]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: status.vncRunning ? "default" : "secondary",
								children: status.vncRunning ? "VNC running" : "VNC off"
							}),
							!status.canScreenshot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "destructive",
								children: "Screenshot tool missing"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
						className: "overflow-hidden p-1.5",
						children: shot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							ref: imgRef,
							src: shot,
							alt: "Remote screen",
							onClick,
							className: "w-full cursor-crosshair rounded-xl"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: refresh,
							className: "flex aspect-video w-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground",
							children: capture.isPending ? "Capturing…" : "Tap to capture the screen"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
						className: "flex items-center gap-2 p-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keyboard, { className: "ml-2 size-4 shrink-0 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: text,
							onChange: (e) => setText(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter" && text) {
									send({ text });
									setText("");
								}
							},
							placeholder: "Type text and press Enter",
							className: "h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: KEYS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => send({ key: k }),
							className: "glass rounded-full px-3 py-1.5 font-mono text-xs",
							children: k
						}, k))
					})
				] })
			]
		})
	});
}
//#endregion
export { DesktopPage as component };
