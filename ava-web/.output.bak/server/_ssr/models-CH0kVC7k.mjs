import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { c as useAva } from "./ava-provider-C7vD2Dgg.mjs";
import { a as ListRow, l as Surface, n as EmptyState, o as PageIntro, s as SkeletonRows } from "./input-B9nJfjjd.mjs";
import { Ct as Check, Dt as Bot, H as Image } from "../_libs/lucide-react.mjs";
import { O as useModels, n as Badge, t as AppShell } from "./app-shell-Bm7y22VV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/models-CH0kVC7k.js
var import_jsx_runtime = require_jsx_runtime();
function ModelsPage() {
	const { modelId, setModelId } = useAva();
	const { data, isLoading, error } = useModels();
	const activeId = modelId || data?.find((m) => m.isDefault)?.id;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Models",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					title: "Models",
					description: "Choose which model AvA uses for new messages."
				}),
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 6 }),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Bot,
					title: "Could not load models",
					description: error.message
				}),
				data && data.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					icon: Bot,
					title: "No models found"
				}),
				data && data.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Surface, {
					className: "p-1.5",
					children: data.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, {
						icon: Bot,
						title: m.name,
						subtitle: m.description ?? m.id,
						onClick: () => setModelId(m.id),
						trailing: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5",
							children: [
								m.supportsImages && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, {
									className: "size-4 text-muted-foreground",
									"aria-label": "Supports images"
								}),
								m.reasoningEfforts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									children: "Reasoning"
								}),
								activeId === m.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 text-primary" })
							]
						})
					}, m.id))
				})
			]
		})
	});
}
//#endregion
export { ModelsPage as component };
