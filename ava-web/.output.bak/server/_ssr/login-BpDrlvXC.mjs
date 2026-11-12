import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { c as useAva, l as verifyLogin, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { i as Input, l as Surface, t as Button } from "./input-B9nJfjjd.mjs";
import { g as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { F as LoaderCircle } from "../_libs/lucide-react.mjs";
import { t as Label } from "./label-D9_nswTA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-BpDrlvXC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const { signIn } = useAva();
	const navigate = useNavigate();
	const [server, setServer] = (0, import_react.useState)(APP.defaultServerUrl);
	const [username, setUsername] = (0, import_react.useState)(APP.defaultUsername);
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			signIn(await verifyLogin(server, username, password));
			navigate({ to: "/" });
		} catch (err) {
			setError(err.message === "Failed to fetch" ? "Could not reach the server" : err.message);
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "flex min-h-dvh items-center justify-center bg-background app-glow px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
			className: "w-full max-w-sm p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: APP.logo,
					alt: APP.name,
					className: "size-12 rounded-xl object-cover"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-4 text-xl font-semibold",
					children: ["Sign in to ", APP.name]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Use your server login."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					className: "mt-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "server",
								children: "Server"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "server",
								value: server,
								onChange: (e) => setServer(e.target.value),
								className: "rounded-xl"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "user",
								children: "Username"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "user",
								value: username,
								onChange: (e) => setUsername(e.target.value),
								autoComplete: "username",
								className: "rounded-xl"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "pass",
								children: "Password"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "pass",
								type: "password",
								value: password,
								onChange: (e) => setPassword(e.target.value),
								autoComplete: "current-password",
								className: "rounded-xl"
							})]
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "alert",
							className: "text-sm text-destructive",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							disabled: busy,
							className: "h-10 w-full rounded-xl",
							children: [busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" }), " Sign in"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-6 text-center text-xs text-muted-foreground",
					children: ["v", APP.version]
				})
			]
		})
	});
}
//#endregion
export { LoginPage as component };
