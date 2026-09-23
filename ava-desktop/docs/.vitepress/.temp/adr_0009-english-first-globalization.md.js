import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0009: English-first globalization","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0009-english-first-globalization.md","filePath":"adr/0009-english-first-globalization.md","lastUpdated":1784913385000}');
const _sfc_main = { name: "adr/0009-english-first-globalization.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0009-english-first-globalization" tabindex="-1">ADR 0009: English-first globalization <a class="header-anchor" href="#adr-0009-english-first-globalization" aria-label="Permalink to &quot;ADR 0009: English-first globalization&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Date: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>PI-Desktop targets global users and open contribution. Chinese-only product surfaces would block international adoption and plugin ecosystem growth.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>PI-Desktop is <strong>English-first</strong>:</p><ol><li>Product UI default language: <strong>English</strong></li><li>Specs, ADRs, code comments, commits, issues, plugin docs: <strong>English primary</strong></li><li>i18n framework is required from early UI work</li><li>Additional locales (including Chinese) are optional packs, not the source of truth</li></ol><h2 id="localization-rules" tabindex="-1">Localization Rules <a class="header-anchor" href="#localization-rules" aria-label="Permalink to &quot;Localization Rules&quot;">​</a></h2><ul><li>Source strings live in English</li><li>No hard-coded non-English UI copy in core code</li><li>Locale packs use stable message IDs</li><li>Plugin manifests/docs recommended in English; localized fields optional later</li></ul><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Global-ready baseline</li><li>Easier external contribution</li><li>Cleaner plugin ecosystem language default</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>Chinese copy becomes a translation layer, not primary authoring format</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0009-english-first-globalization.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0009EnglishFirstGlobalization = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0009EnglishFirstGlobalization as default
};
