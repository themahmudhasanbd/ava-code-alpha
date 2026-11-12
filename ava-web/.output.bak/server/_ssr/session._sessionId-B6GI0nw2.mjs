import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { c as useAva } from "./ava-provider-C7vD2Dgg.mjs";
import { t as Route } from "./session._sessionId-Jlk2SIN_.mjs";
import { t as ChatScreen } from "./chat-screen-QK88rmAj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/session._sessionId-B6GI0nw2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SessionRoute() {
	const { sessionId } = Route.useParams();
	const { setActiveSessionId, auth } = useAva();
	(0, import_react.useEffect)(() => {
		if (sessionId) setActiveSessionId(sessionId);
	}, [sessionId, setActiveSessionId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatScreen, {});
}
//#endregion
export { SessionRoute as component };
