import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0004: No remote Gateway in the MVP","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0004-no-gateway-in-mvp.md","filePath":"adr/0004-no-gateway-in-mvp.md","lastUpdated":1784983842000}');
const _sfc_main = { name: "adr/0004-no-gateway-in-mvp.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0004-no-remote-gateway-in-the-mvp" tabindex="-1">ADR 0004: No remote Gateway in the MVP <a class="header-anchor" href="#adr-0004-no-remote-gateway-in-the-mvp" aria-label="Permalink to &quot;ADR 0004: No remote Gateway in the MVP&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Date: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>Products such as LiveAgent provide a remote WebUI/Gateway. Whether PI-Desktop should add remote control capability in the first phase is a trade-off that needs to be made.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>The MVP will <strong>not</strong> build a remote Gateway / browser-based remote control.</p><h2 id="rationale" tabindex="-1">Rationale <a class="header-anchor" href="#rationale" aria-label="Permalink to &quot;Rationale&quot;">​</a></h2><ol><li>It conflicts in priority with the local-first desktop closed-loop goal</li><li>A remote link would significantly increase authentication, synchronization, and security complexity</li><li>We should first prove that the local agent UX and permission model hold up</li></ol><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Scope convergence</li><li>Simpler security model</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>No browser-based remote control of the local agent in the short term</li></ul><h2 id="follow-up" tabindex="-1">Follow-up <a class="header-anchor" href="#follow-up" aria-label="Permalink to &quot;Follow-up&quot;">​</a></h2><p>If remote capability is to be built, a separate ADR must be added, with its own dedicated milestone.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0004-no-gateway-in-mvp.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0004NoGatewayInMvp = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0004NoGatewayInMvp as default
};
