import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as cn } from "./ava-provider-C7vD2Dgg.mjs";
import { i as Input, l as Surface, n as EmptyState, o as PageIntro, r as GlassIconButton, s as SkeletonRows, t as Button } from "./input-B9nJfjjd.mjs";
import { C as Play, E as Pencil, Tt as CalendarClock, c as Trash2, x as Plus } from "../_libs/lucide-react.mjs";
import { L as useTasks, M as useRunTask, N as useSaveTask, a as SCHEDULE_PRESETS, t as AppShell, y as useDeleteTask } from "./app-shell-Bm7y22VV.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tasks-E21eJx6l.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
var EMPTY = {
	name: "",
	schedule: SCHEDULE_PRESETS[1].value,
	command: "",
	enabled: true
};
function TaskForm({ initial, onDone }) {
	const [d, setD] = (0, import_react.useState)(initial);
	const save = useSaveTask();
	const submit = async () => {
		try {
			await save.mutateAsync(d);
			toast.success("Task saved");
			onDone();
		} catch (e) {
			toast.error(e.message);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
		className: "space-y-3 p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Task name",
				value: d.name,
				onChange: (e) => setD({
					...d,
					name: e.target.value
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Command, e.g. cd /var/www && git pull",
				className: "font-mono text-xs",
				value: d.command,
				onChange: (e) => setD({
					...d,
					command: e.target.value
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Cron schedule",
				className: "font-mono text-xs",
				value: d.schedule,
				onChange: (e) => setD({
					...d,
					schedule: e.target.value
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: SCHEDULE_PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: d.schedule === p.value ? "default" : "ghost",
					className: "glass rounded-full",
					onClick: () => setD({
						...d,
						schedule: p.value
					}),
					children: p.label
				}, p.value))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: onDone,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: submit,
					disabled: save.isPending,
					children: save.isPending ? "Saving…" : "Save"
				})]
			})
		]
	});
}
function TaskRow({ task, onEdit }) {
	const save = useSaveTask();
	const del = useDeleteTask();
	const run = useRunTask();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3 rounded-xl px-3 py-2.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block truncate text-sm font-medium",
					children: task.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "block truncate font-mono text-xs text-muted-foreground",
					children: [
						task.schedule,
						" · ",
						task.command
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
				checked: task.enabled,
				onCheckedChange: (enabled) => save.mutate({
					...task,
					enabled
				}),
				"aria-label": "Enabled"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
				label: "Run now",
				disabled: run.isPending,
				onClick: async () => {
					const r = await run.mutateAsync(task).catch((e) => ({
						exitCode: 1,
						stderr: e.message,
						stdout: ""
					}));
					r.exitCode === 0 ? toast.success("Ran successfully") : toast.error(r.stderr || `Exit ${r.exitCode}`);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
				label: "Edit",
				onClick: onEdit,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
				label: "Delete",
				onClick: () => confirm(`Delete "${task.name}"?`) && del.mutate(task.id),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
			})
		]
	});
}
function TasksPage() {
	const { data, isLoading, error } = useTasks();
	const [editing, setEditing] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Scheduled tasks",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "Scheduled tasks",
					description: "Commands that run automatically on your server.",
					action: !editing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "rounded-full",
						onClick: () => setEditing(EMPTY),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), " New"]
					})
				}),
				editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskForm, {
					initial: editing,
					onDone: () => setEditing(null)
				}, editing.id ?? "new"),
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 3 }),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: CalendarClock,
					title: "Could not load tasks",
					description: error.message
				}),
				data && data.length === 0 && !editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: CalendarClock,
					title: "No scheduled tasks",
					description: "Create one to run a command every hour, day or week."
				}),
				data && data.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
					className: "p-1.5",
					children: data.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, {
						task: t,
						onEdit: () => setEditing(t)
					}, t.id))
				})
			]
		})
	});
}
//#endregion
export { TasksPage as component };
