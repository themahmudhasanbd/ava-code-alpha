import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as cn, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { i as Input, n as EmptyState, r as GlassIconButton, s as SkeletonRows, t as Button } from "./input-B9nJfjjd.mjs";
import { Ct as Check, J as Folder, St as ChevronDown, Y as FolderOpen, Z as File, at as FileCodeCorner, b as RefreshCw, bt as ChevronRight, dt as Download, mt as Copy, r as X, v as Search, xt as ChevronLeft } from "../_libs/lucide-react.mjs";
import { C as useDirectory, p as parentPath, t as AppShell, w as useFileContent } from "./app-shell-Bm7y22VV.mjs";
import { n as CodeBlockContent } from "./code-block-DPM5_VAm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/files-_ywdQQ9k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var languageByExtension = {
	ts: "typescript",
	tsx: "tsx",
	js: "javascript",
	jsx: "jsx",
	json: "json",
	css: "css",
	html: "html",
	md: "markdown",
	py: "python",
	rs: "rust",
	go: "go",
	sh: "bash",
	bash: "bash",
	yaml: "yaml",
	yml: "yaml",
	toml: "toml",
	sql: "sql",
	php: "php",
	java: "java",
	kt: "kotlin",
	dart: "dart",
	xml: "xml"
};
function fileLanguage(path) {
	return languageByExtension[path.split(".").pop()?.toLowerCase() ?? ""] ?? "markdown";
}
function TreeBranch({ path, depth, query, active, onOpen }) {
	const { data, isLoading } = useDirectory(path);
	const [expanded, setExpanded] = (0, import_react.useState)(depth === 0 ? [path] : []);
	const visible = (0, import_react.useMemo)(() => (data ?? []).filter((entry) => !query || entry.name.toLowerCase().includes(query.toLowerCase())), [data, query]);
	if (isLoading) return depth === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-3 py-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 5 })
	}) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: visible.map((entry) => {
		const open = expanded.includes(entry.path);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "ghost",
			onClick: () => {
				if (entry.isDirectory) setExpanded((items) => open ? items.filter((item) => item !== entry.path) : [...items, entry.path]);
				else onOpen(entry);
			},
			className: cn("h-10 w-full justify-start gap-2 rounded-lg px-2 font-normal", active === entry.path && "bg-accent text-accent-foreground"),
			style: { paddingLeft: `${Math.min(depth, 8) * 14 + 8}px` },
			title: entry.path,
			children: [
				entry.isDirectory ? open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-4" }),
				entry.isDirectory ? open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-4 text-primary" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-4 text-primary" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCodeCorner, { className: "size-4 text-muted-foreground" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: entry.name
				})
			]
		}), entry.isDirectory && open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreeBranch, {
			path: entry.path,
			depth: depth + 1,
			query,
			active,
			onOpen
		})] }, entry.path);
	}) });
}
function FileEditor({ path, onBack }) {
	const { data, isLoading, error } = useFileContent(path);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const name = path.split("/").filter(Boolean).pop() ?? path;
	const copy = async () => {
		await navigator.clipboard.writeText(data?.text ?? "");
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	};
	const download = () => {
		if (!data) return;
		const url = URL.createObjectURL(new Blob([data.text], { type: "text/plain;charset=utf-8" }));
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = name;
		anchor.click();
		URL.revokeObjectURL(url);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 flex-1 flex-col bg-code text-code-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-14 shrink-0 items-center border-b border-code-border px-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						"aria-label": "Back to files",
						onClick: onBack,
						className: "text-code-muted hover:bg-code-muted hover:text-code-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "min-w-0 flex-1 truncate text-center text-base font-semibold",
						children: name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						"aria-label": "Show file folder",
						onClick: onBack,
						className: "text-code-muted hover:bg-code-muted hover:text-code-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-12 shrink-0 border-b border-code-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 items-center gap-2 border-r border-code-border bg-code-active px-4 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(File, { className: "size-4 text-code-muted" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4 text-code-muted" })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ml-auto flex items-center border-l border-code-border px-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => void copy(),
						className: "gap-2 text-code-muted hover:bg-code-muted hover:text-code-foreground",
						children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden sm:inline",
							children: "Copy"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: download,
						className: "gap-2 text-code-muted hover:bg-code-muted hover:text-code-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Download" })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 overflow-auto",
				children: [
					isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "p-4 text-sm text-code-muted",
						children: "Opening…"
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "p-4 text-sm text-destructive",
						children: error.message
					}),
					data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlockContent, {
						code: data.text || "(empty file)",
						language: fileLanguage(path),
						showLineNumbers: true
					})
				]
			})
		]
	});
}
function FilesPage() {
	const [root, setRoot] = (0, import_react.useState)(APP.defaultCwd);
	const [query, setQuery] = (0, import_react.useState)("");
	const [openFile, setOpenFile] = (0, import_react.useState)(null);
	const { refetch, isFetching, error } = useDirectory(root);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Code",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
			label: "Refresh files",
			onClick: () => refetch(),
			disabled: isFetching,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: isFetching ? "animate-spin" : "" })
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-h-0 flex-1 overflow-hidden rounded-xl border border-code-border bg-code text-code-foreground shadow-xl",
				children: openFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileEditor, {
					path: openFile,
					onBack: () => setOpenFile(null)
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "flex min-h-0 flex-1 flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex h-14 shrink-0 items-center border-b border-code-border px-3",
							children: [
								root !== "/" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon",
									"aria-label": "Go to parent folder",
									onClick: () => setRoot(parentPath(root)),
									className: "text-code-muted hover:bg-code-muted hover:text-code-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "flex-1 text-center text-lg font-semibold",
									children: "Code"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-10" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border-b border-code-border p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-code-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: query,
									onChange: (event) => setQuery(event.target.value),
									placeholder: "Search code",
									className: "h-11 border-code-border bg-code pl-9 text-code-foreground placeholder:text-code-muted"
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "min-h-0 flex-1 overflow-y-auto px-2 py-3",
							children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
								icon: Folder,
								title: "Could not open this folder",
								description: error.message
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreeBranch, {
								path: root,
								depth: 0,
								query,
								active: openFile,
								onOpen: (entry) => setOpenFile(entry.path)
							})
						})
					]
				})
			})
		})
	});
}
//#endregion
export { FilesPage as component };
