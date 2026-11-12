import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime, j as Slot } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { i as cn } from "./ava-provider-C7vD2Dgg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/input-B9nJfjjd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9",
			"icon-sm": "size-8",
			"icon-xs": "size-6"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
/** Round glass icon button used in headers and toolbars. */
var GlassIconButton = (0, import_react.forwardRef)(({ label, className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
	ref,
	variant: "ghost",
	size: "icon",
	"aria-label": label,
	className: cn("glass rounded-xl", className),
	...props,
	children
}));
GlassIconButton.displayName = "GlassIconButton";
var statusStyle = {
	online: "bg-success",
	connecting: "bg-warning animate-pulse",
	offline: "bg-destructive"
};
function StatusDot({ status, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-label": status,
		className: cn("inline-block size-2 rounded-full", statusStyle[status], className)
	});
}
function Surface({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("glass rounded-2xl", className),
		...props
	});
}
function PageIntro({ title, description, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-xl font-semibold",
				children: title
			}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: description
			})]
		}), action]
	});
}
function EmptyState({ icon: Icon, title, description, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Surface, {
		className: "flex flex-col items-center px-6 py-10 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 font-medium",
				children: title
			}),
			description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 max-w-xs text-sm text-muted-foreground",
				children: description
			}),
			action && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: action
			})
		]
	});
}
function ListRow({ icon: Icon, title, subtitle, trailing, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(onClick ? "button" : "div", {
		onClick,
		className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
		children: [
			Icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block truncate text-sm font-medium",
					children: title
				}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block truncate text-xs text-muted-foreground",
					children: subtitle
				})]
			}),
			trailing
		]
	});
}
function SkeletonRows({ count = 4 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-2",
		children: Array.from({ length: count }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-14 animate-pulse rounded-xl bg-muted" }, i))
	});
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
//#endregion
export { ListRow as a, StatusDot as c, Input as i, Surface as l, EmptyState as n, PageIntro as o, GlassIconButton as r, SkeletonRows as s, Button as t, buttonVariants as u };
