import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as cn, t as APP } from "./ava-provider-C7vD2Dgg.mjs";
import { l as Surface, n as EmptyState, o as PageIntro, r as GlassIconButton, s as SkeletonRows, t as Button } from "./input-B9nJfjjd.mjs";
import { $ as FileQuestionMark, H as Image, c as Trash2, et as FilePlay, r as X, rt as FileHeadphone, y as RotateCw } from "../_libs/lucide-react.mjs";
import { A as useRemoveMedia, D as useMediaUrl, E as useMedia, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/media-MwA7x93W.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FILTERS = [
	{
		id: "all",
		label: "All"
	},
	{
		id: "image",
		label: "Images"
	},
	{
		id: "video",
		label: "Videos"
	},
	{
		id: "audio",
		label: "Audio"
	}
];
var kindIcon = {
	image: Image,
	video: FilePlay,
	audio: FileHeadphone,
	other: FileQuestionMark
};
function Thumb({ item, onOpen }) {
	const { data } = useMediaUrl(item.kind === "image" ? item.path : null);
	const Icon = kindIcon[item.kind];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: onOpen,
		className: "glass group flex aspect-square flex-col overflow-hidden rounded-2xl text-left",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "flex min-h-0 flex-1 items-center justify-center bg-muted/40",
			children: data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: data,
				alt: item.name,
				className: "size-full object-cover",
				loading: "lazy"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-7 text-muted-foreground" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "truncate px-2.5 py-2 text-xs font-medium",
			children: item.name
		})]
	});
}
function Viewer({ item, onClose }) {
	const { data, isLoading } = useMediaUrl(item.path);
	const remove = useRemoveMedia();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex flex-col bg-background/80 p-4 backdrop-blur-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-w-0 flex-1 truncate text-sm font-medium",
					children: item.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
					label: "Delete",
					onClick: async () => {
						if (confirm(`Delete ${item.name}?`)) {
							await remove.mutateAsync(item.path);
							onClose();
						}
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
					label: "Close",
					onClick: onClose,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 items-center justify-center py-4",
			children: [
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Loading…"
				}),
				data && item.kind === "image" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: data,
					alt: item.name,
					className: "max-h-full max-w-full rounded-2xl object-contain"
				}),
				data && item.kind === "video" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
					src: data,
					controls: true,
					className: "max-h-full max-w-full rounded-2xl"
				}),
				data && item.kind === "audio" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
					src: data,
					controls: true
				}),
				data && item.kind === "other" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: FileQuestionMark,
					title: "No preview for this file type"
				})
			]
		})]
	});
}
function MediaPage() {
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [open, setOpen] = (0, import_react.useState)(null);
	const { data, isLoading, error, refetch } = useMedia(APP.mediaDir);
	const items = (data ?? []).filter((m) => filter === "all" || m.kind === filter);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Media",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto px-4 py-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "Media",
					description: `Shared files in ${APP.mediaDir}`,
					action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassIconButton, {
						label: "Refresh",
						onClick: () => refetch(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, { className: "size-4" })
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-2 overflow-x-auto",
					children: FILTERS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: filter === f.id ? "default" : "ghost",
						className: cn("rounded-full", filter !== f.id && "glass"),
						onClick: () => setFilter(f.id),
						children: f.label
					}, f.id))
				}),
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 4 }),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Image,
					title: "Could not open media folder",
					description: error.message
				}),
				data && items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Image,
					title: "Nothing here yet",
					description: "Files the agent saves to the shared media folder show up here."
				}),
				items.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
					className: "grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4",
					children: items.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, {
						item: m,
						onOpen: () => setOpen(m)
					}, m.path))
				})
			]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewer, {
			item: open,
			onClose: () => setOpen(null)
		})]
	});
}
//#endregion
export { MediaPage as component };
