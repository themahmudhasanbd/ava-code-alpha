import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR: Persist provider display order independently of configuration","description":"","frontmatter":{},"headers":[],"relativePath":"adr/provider-display-order.md","filePath":"adr/provider-display-order.md","lastUpdated":1789811356000}');
const _sfc_main = { name: "adr/provider-display-order.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-persist-provider-display-order-independently-of-configuration" tabindex="-1">ADR: Persist provider display order independently of configuration <a class="header-anchor" href="#adr-persist-provider-display-order-independently-of-configuration" aria-label="Permalink to &quot;ADR: Persist provider display order independently of configuration&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Related: Issue #587, ADR 0114, ADR 0259</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>Provider rows are listed in creation order. Users need to move frequently used services ahead of others in settings and model selection menus. Plugin-owned configuration is reconciled from manifests, while list placement is a user preference that must survive reconciliation and restart.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>Rust host-core stores the ordered IDs under the existing <code>kv</code> key <code>providers.order</code> and applies them to <code>providers.list</code>. The additive <code>providers.reorder</code> RPC moves one ID before or after another under the host state lock. The renderer sends a move rather than a replacement list, so an unseen provider created during a drag remains present.</p><p>Provider cards use pointer-driven dragging with a live slot preview and edge scrolling. Keyboard moves share the list-order transformation with model ordering. Only completed moves are persisted; failed saves restore the accepted order. Provider fields and default-model selection remain independent of ordering.</p><h2 id="alternatives" tabindex="-1">Alternatives <a class="header-anchor" href="#alternatives" aria-label="Permalink to &quot;Alternatives&quot;">​</a></h2><ul><li>Renderer-only storage would make order depend on which consumer lists providers.</li><li>A sort field in provider configuration would mix user placement with plugin-managed fields and require editing multiple provider records per move.</li></ul><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><p>No SQL schema or protocol-version migration is needed. Older clients ignore the metadata. New providers append in creation order; stale saved IDs are ignored. The UI allows whole-card dragging in the AI services list; OAuth account grouping remains separate. Sorting a plugin row does not grant permission to edit its fields.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/provider-display-order.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const providerDisplayOrder = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  providerDisplayOrder as default
};
