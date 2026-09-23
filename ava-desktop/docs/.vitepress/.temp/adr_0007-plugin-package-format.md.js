import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0007: Plugin distribution package format uses .piplug (zip)","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0007-plugin-package-format.md","filePath":"adr/0007-plugin-package-format.md","lastUpdated":1784983842000}');
const _sfc_main = { name: "adr/0007-plugin-package-format.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0007-plugin-distribution-package-format-uses-piplug-zip" tabindex="-1">ADR 0007: Plugin distribution package format uses .piplug (zip) <a class="header-anchor" href="#adr-0007-plugin-distribution-package-format-uses-piplug-zip" aria-label="Permalink to &quot;ADR 0007: Plugin distribution package format uses .piplug (zip)&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Date: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>We need a plugin package format that is convenient for local sharing and marketplace download.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>Adopt <code>.piplug</code> as the product-level distribution extension. Its contents are a zip archive, with a <code>manifest.json</code> at the root.</p><h2 id="rationale" tabindex="-1">Rationale <a class="header-anchor" href="#rationale" aria-label="Permalink to &quot;Rationale&quot;">​</a></h2><ol><li>Simple to implement, cross-platform</li><li>Easy to do checksum / signing</li><li>Developer-friendly (can be unzipped and inspected locally)</li></ol><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Lightweight toolchain</li><li>Can share unified verification logic with local directory packages</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>Must guard against zip slip and oversized-package attacks</li></ul><h2 id="constraints" tabindex="-1">Constraints <a class="header-anchor" href="#constraints" aria-label="Permalink to &quot;Constraints&quot;">​</a></h2><ul><li>Path safety checks must be performed before installation</li><li>Marketplace packages must provide at least sha256</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0007-plugin-package-format.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0007PluginPackageFormat = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0007PluginPackageFormat as default
};
