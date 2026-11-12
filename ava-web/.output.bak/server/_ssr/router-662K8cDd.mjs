import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as AvaProvider } from "./ava-provider-C7vD2Dgg.mjs";
import { _ as useRouter, c as HeadContent, d as Outlet, f as lazyRouteComponent, h as Link, m as createRootRouteWithContext, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { r as TooltipProvider } from "./tooltip-BcG1dJoF.mjs";
import { t as Route$14 } from "./session._sessionId-Jlk2SIN_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-662K8cDd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-CZt3kctX.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$13 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "AvA Code" },
			{
				name: "description",
				content: "AI coding workspace"
			},
			{
				name: "author",
				content: "AvA Code"
			},
			{
				property: "og:title",
				content: "AvA Code"
			},
			{
				property: "og:description",
				content: "AI coding workspace"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: "@Lovable"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$13.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvaProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipProvider, {
			delayDuration: 300,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, { position: "top-center" })]
		}) })
	});
}
var $$splitComponentImporter$12 = () => import("./routes-tpEzZrry.mjs");
var Route$12 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "AvA Code — AI Coding Workspace" },
		{
			name: "description",
			content: "Chat with your AvA coding agent and manage sessions by project."
		},
		{
			property: "og:title",
			content: "AvA Code — AI Coding Workspace"
		},
		{
			property: "og:description",
			content: "Chat with your AvA coding agent and manage sessions by project."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./browser-DXazmJZW.mjs");
var Route$11 = createFileRoute("/browser")({
	head: () => ({ meta: [
		{ title: "Browser — AvA Code" },
		{
			name: "description",
			content: "Preview websites and your running apps inside AvA Code."
		},
		{
			property: "og:title",
			content: "Browser — AvA Code"
		},
		{
			property: "og:description",
			content: "Preview websites and your running apps inside AvA Code."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./desktop-BtOz2h1f.mjs");
var Route$10 = createFileRoute("/desktop")({
	head: () => ({ meta: [
		{ title: "Remote desktop — AvA Code" },
		{
			name: "description",
			content: "See and control your server's desktop from AvA Code."
		},
		{
			property: "og:title",
			content: "Remote desktop — AvA Code"
		},
		{
			property: "og:description",
			content: "See and control your server's desktop from AvA Code."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./files-_ywdQQ9k.mjs");
var Route$9 = createFileRoute("/files")({
	head: () => ({ meta: [
		{ title: "Code — AvA Code" },
		{
			name: "description",
			content: "Browse and read workspace code on your AvA Code server."
		},
		{
			property: "og:title",
			content: "Code — AvA Code"
		},
		{
			property: "og:description",
			content: "Browse and read workspace code on your AvA Code server."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./login-BpDrlvXC.mjs");
var Route$8 = createFileRoute("/login")({
	head: () => ({ meta: [
		{ title: "Sign in — AvA Code" },
		{
			name: "description",
			content: "Sign in to your AvA Code server."
		},
		{
			property: "og:title",
			content: "Sign in — AvA Code"
		},
		{
			property: "og:description",
			content: "Sign in to your AvA Code server."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./mcp-BHfK0nmx.mjs");
var Route$7 = createFileRoute("/mcp")({
	head: () => ({ meta: [
		{ title: "MCP Servers & Tools — AvA Code" },
		{
			name: "description",
			content: "Search and inspect MCP servers and tools connected to your AvA agent."
		},
		{
			property: "og:title",
			content: "MCP Servers & Tools — AvA Code"
		},
		{
			property: "og:description",
			content: "Search and inspect MCP servers and tools connected to your AvA agent."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./media-MwA7x93W.mjs");
var Route$6 = createFileRoute("/media")({
	head: () => ({ meta: [
		{ title: "Media — AvA Code" },
		{
			name: "description",
			content: "Images, videos and audio shared with your AvA agent."
		},
		{
			property: "og:title",
			content: "Media — AvA Code"
		},
		{
			property: "og:description",
			content: "Images, videos and audio shared with your AvA agent."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./models-CH0kVC7k.mjs");
var Route$5 = createFileRoute("/models")({
	head: () => ({ meta: [
		{ title: "Models — AvA Code" },
		{
			name: "description",
			content: "Pick the AI model your AvA agent uses."
		},
		{
			property: "og:title",
			content: "Models — AvA Code"
		},
		{
			property: "og:description",
			content: "Pick the AI model your AvA agent uses."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./profile-D0bC4dPa.mjs");
var Route$4 = createFileRoute("/profile")({
	head: () => ({ meta: [
		{ title: "Profile — AvA Code" },
		{
			name: "description",
			content: "Your AvA Code account, server and session summary."
		},
		{
			property: "og:title",
			content: "Profile — AvA Code"
		},
		{
			property: "og:description",
			content: "Your AvA Code account, server and session summary."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./settings-CzXRKk90.mjs");
var Route$3 = createFileRoute("/settings")({
	head: () => ({ meta: [
		{ title: "Settings — AvA Code" },
		{
			name: "description",
			content: "Review the agent settings used by your AvA Code server."
		},
		{
			property: "og:title",
			content: "Settings — AvA Code"
		},
		{
			property: "og:description",
			content: "Review the agent settings used by your AvA Code server."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./system-IXgfXTzM.mjs");
var Route$2 = createFileRoute("/system")({
	head: () => ({ meta: [
		{ title: "System health — AvA Code" },
		{
			name: "description",
			content: "Live health, memory and activity of your AvA Code server."
		},
		{
			property: "og:title",
			content: "System health — AvA Code"
		},
		{
			property: "og:description",
			content: "Live health, memory and activity of your AvA Code server."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./tasks-E21eJx6l.mjs");
var Route$1 = createFileRoute("/tasks")({
	head: () => ({ meta: [
		{ title: "Scheduled tasks — AvA Code" },
		{
			name: "description",
			content: "Run commands on your server on a schedule."
		},
		{
			property: "og:title",
			content: "Scheduled tasks — AvA Code"
		},
		{
			property: "og:description",
			content: "Run commands on your server on a schedule."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./terminal-ADxBFF6X.mjs");
var Route = createFileRoute("/terminal")({
	head: () => ({ meta: [
		{ title: "Terminal — AvA Code" },
		{
			name: "description",
			content: "Run shell commands on your AvA Code server."
		},
		{
			property: "og:title",
			content: "Terminal — AvA Code"
		},
		{
			property: "og:description",
			content: "Run shell commands on your AvA Code server."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = {
	IndexRoute: Route$12.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$13
	}),
	BrowserRoute: Route$11.update({
		id: "/browser",
		path: "/browser",
		getParentRoute: () => Route$13
	}),
	DesktopRoute: Route$10.update({
		id: "/desktop",
		path: "/desktop",
		getParentRoute: () => Route$13
	}),
	FilesRoute: Route$9.update({
		id: "/files",
		path: "/files",
		getParentRoute: () => Route$13
	}),
	LoginRoute: Route$8.update({
		id: "/login",
		path: "/login",
		getParentRoute: () => Route$13
	}),
	McpRoute: Route$7.update({
		id: "/mcp",
		path: "/mcp",
		getParentRoute: () => Route$13
	}),
	MediaRoute: Route$6.update({
		id: "/media",
		path: "/media",
		getParentRoute: () => Route$13
	}),
	ModelsRoute: Route$5.update({
		id: "/models",
		path: "/models",
		getParentRoute: () => Route$13
	}),
	ProfileRoute: Route$4.update({
		id: "/profile",
		path: "/profile",
		getParentRoute: () => Route$13
	}),
	SettingsRoute: Route$3.update({
		id: "/settings",
		path: "/settings",
		getParentRoute: () => Route$13
	}),
	SystemRoute: Route$2.update({
		id: "/system",
		path: "/system",
		getParentRoute: () => Route$13
	}),
	TasksRoute: Route$1.update({
		id: "/tasks",
		path: "/tasks",
		getParentRoute: () => Route$13
	}),
	TerminalRoute: Route.update({
		id: "/terminal",
		path: "/terminal",
		getParentRoute: () => Route$13
	}),
	SessionSessionIdRoute: Route$14.update({
		id: "/session/$sessionId",
		path: "/session/$sessionId",
		getParentRoute: () => Route$13
	})
};
var routeTree = Route$13._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
