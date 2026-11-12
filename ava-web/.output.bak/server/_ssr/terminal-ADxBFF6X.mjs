import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { i as Input, l as Surface, o as PageIntro, r as GlassIconButton, t as Button } from "./input-B9nJfjjd.mjs";
import { F as LoaderCircle, lt as Eraser, pt as CornerDownLeft, u as SquareTerminal } from "../_libs/lucide-react.mjs";
import { j as useRunCommand, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/terminal-ADxBFF6X.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PRESETS = [
	"ls -la",
	"git status",
	"uptime",
	"df -h",
	"ps aux | head -15"
];
function TerminalPage() {
	const [cwd, setCwd] = (0, import_react.useState)(APP.defaultCwd);
	const [command, setCommand] = (0, import_react.useState)("");
	const [log, setLog] = (0, import_react.useState)([]);
	const run = useRunCommand();
	const exec = async (cmd) => {
		const trimmed = cmd.trim();
		if (!trimmed || run.isPending) return;
		setCommand("");
		try {
			const res = await run.mutateAsync({
				command: trimmed,
				cwd
			});
			setLog((l) => [...l, {
				id: Date.now(),
				command: trimmed,
				output: [res.stdout, res.stderr].filter(Boolean).join("\n"),
				exitCode: res.exitCode
			}]);
		} catch (err) {
			setLog((l) => [...l, {
				id: Date.now(),
				command: trimmed,
				output: err.message,
				exitCode: 1
			}]);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Terminal",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
			label: "Clear output",
			onClick: () => setLog([]),
			disabled: !log.length,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eraser, {})
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-4 py-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "Terminal",
					description: "Commands run on your server in the folder below."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					className: "flex items-center gap-2 px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-muted-foreground",
						children: "Folder"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: cwd,
						onChange: (e) => setCwd(e.target.value),
						"aria-label": "Working folder",
						className: "h-8 rounded-lg border-0 bg-transparent px-1 font-mono text-xs shadow-none focus-visible:ring-0"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-2 overflow-x-auto pb-1",
					children: PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: () => exec(p),
						disabled: run.isPending,
						className: "glass shrink-0 rounded-full font-mono text-xs",
						children: p
					}, p))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
					className: "min-h-0 flex-1 overflow-y-auto bg-foreground/[0.04] p-3 font-mono text-xs",
					children: [
						!log.length && !run.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-2 text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareTerminal, { className: "size-4" }), " Output appears here."]
						}),
						log.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-primary",
									children: ["$ ", e.command]
								}),
								e.output && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									className: `mt-1 whitespace-pre-wrap ${e.exitCode === 0 ? "" : "text-destructive"}`,
									children: e.output
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-0.5 text-[10px] text-muted-foreground",
									children: ["exit ", e.exitCode]
								})
							]
						}, e.id)),
						run.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-2 text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin" }), " running…"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						exec(command);
					},
					className: "glass flex items-center gap-2 rounded-2xl px-2 py-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "pl-2 font-mono text-sm text-muted-foreground",
							children: "$"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: command,
							onChange: (e) => setCommand(e.target.value),
							placeholder: "Type a command",
							"aria-label": "Command",
							className: "h-9 border-0 bg-transparent font-mono text-base shadow-none focus-visible:ring-0 md:text-sm"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							size: "icon-sm",
							disabled: !command.trim() || run.isPending,
							className: "rounded-xl",
							children: run.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CornerDownLeft, {})
						})
					]
				})
			]
		})
	});
}
//#endregion
export { TerminalPage as component };
