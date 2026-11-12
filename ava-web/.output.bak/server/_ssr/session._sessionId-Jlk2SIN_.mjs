import { f as lazyRouteComponent, p as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/session._sessionId-Jlk2SIN_.js
var $$splitComponentImporter = () => import("./session._sessionId-B6GI0nw2.mjs");
var Route = createFileRoute("/session/$sessionId")({
	beforeLoad: ({ context, location }) => {},
	head: () => ({ meta: [{ title: "AvA Code — Session" }, {
		name: "description",
		content: "AI coding session"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
