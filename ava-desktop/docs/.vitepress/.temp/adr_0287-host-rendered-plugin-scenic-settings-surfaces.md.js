import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0287 — Host-rendered plugin scenic Settings surfaces","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0287-host-rendered-plugin-scenic-settings-surfaces.md","filePath":"adr/0287-host-rendered-plugin-scenic-settings-surfaces.md","lastUpdated":1789739860000}');
const _sfc_main = { name: "adr/0287-host-rendered-plugin-scenic-settings-surfaces.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0287-—-host-rendered-plugin-scenic-settings-surfaces" tabindex="-1">ADR 0287 — Host-rendered plugin scenic Settings surfaces <a class="header-anchor" href="#adr-0287-—-host-rendered-plugin-scenic-settings-surfaces" aria-label="Permalink to &quot;ADR 0287 — Host-rendered plugin scenic Settings surfaces&quot;">​</a></h1><ul><li><strong>Status:</strong> Accepted for implementation</li><li><strong>Date:</strong> 2026-09-17</li><li><strong>Related:</strong> ADR 0104, ADR 0255</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>An Electron <code>WebContentsView</code> and a sandboxed iframe each create an independent compositing surface. Although an extension document can make its own background transparent, its page canvas remains an opaque rectangle between the root scenic backdrop and the Settings content. Native child surfaces can also intercept the renderer-drawn Windows/Linux controls.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>The generic plugin Settings document surface is retired for appearance extensions. <code>contributes.scenicThemes</code> supplies declarative localized card metadata only. Electron main validates the permissions, same-plugin theme ownership, declared preview image, and the exact <code>--nexus-backdrop-blur</code><code>length</code> variable. The host React Settings tree renders all controls inside its existing transparent scenic canvas.</p><p>Card selection is immediate. The bounded 0–20 integer blur control is a local draft until the user presses Apply; the host then uses the existing typed theme variable persistence boundary. There is no iframe, page protocol, bridge, or second document canvas.</p><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><ul><li>A single root scenic backdrop remains visible through Settings surfaces.</li><li>Host-owned layout, focus, search, narrow-window behavior, drag regions, and native controls cannot be changed or intercepted by plugins.</li><li>Plugins cannot contribute Settings HTML, CSS, JavaScript, selectors, DOM, or arbitrary actions through this capability.</li><li>This deliberately narrow destination does not replace isolated work-panel views or plugin panels.</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0287-host-rendered-plugin-scenic-settings-surfaces.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0287HostRenderedPluginScenicSettingsSurfaces = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0287HostRenderedPluginScenicSettingsSurfaces as default
};
