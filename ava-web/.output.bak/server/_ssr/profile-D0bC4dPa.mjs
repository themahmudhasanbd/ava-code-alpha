import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { c as useAva, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { c as StatusDot, l as Surface, o as PageIntro, t as Button } from "./input-B9nJfjjd.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { N as LogOut } from "../_libs/lucide-react.mjs";
import { I as useSessions, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-D0bC4dPa.js
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const { auth, status, signOut } = useAva();
	const navigate = useNavigate();
	const sessions = useSessions();
	const projects = new Set((sessions.data ?? []).map((s) => s.directory)).size;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Profile",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, { title: "Profile" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					className: "flex items-center gap-3 px-4 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: APP.logo,
						alt: "",
						className: "size-12 rounded-xl object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-semibold",
							children: auth?.username ?? "—"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-1.5 truncate text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status }),
								" ",
								auth?.serverUrl
							]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
						className: "px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Sessions"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-lg font-semibold",
							children: sessions.data?.length ?? "—"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
						className: "px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Projects"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-lg font-semibold",
							children: sessions.data ? projects : "—"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "secondary",
					className: "glass h-11 w-full rounded-xl",
					onClick: () => {
						signOut();
						navigate({ to: "/login" });
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, {}), " Sign out"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-center text-xs text-muted-foreground",
					children: [
						APP.name,
						" v",
						APP.version,
						" · ",
						APP.tagline
					]
				})
			]
		})
	});
}
//#endregion
export { ProfilePage as component };
