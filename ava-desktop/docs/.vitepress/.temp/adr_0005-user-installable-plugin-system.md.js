import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0005: User-installable plugin system","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0005-user-installable-plugin-system.md","filePath":"adr/0005-user-installable-plugin-system.md","lastUpdated":1784913385000}');
const _sfc_main = { name: "adr/0005-user-installable-plugin-system.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0005-user-installable-plugin-system" tabindex="-1">ADR 0005: User-installable plugin system <a class="header-anchor" href="#adr-0005-user-installable-plugin-system" aria-label="Permalink to &quot;ADR 0005: User-installable plugin system&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Date: 2026-07-25</li><li>Updated: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>Built-in features alone are not enough. Users need to install and develop plugins that extend:</p><ul><li>commands</li><li>panels</li><li>agent tools</li><li>skills</li></ul><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>Adopt a first-party <strong>plugin system</strong>:</p><ul><li>directory-based plugin packages</li><li><code>manifest.json</code> contribution + permission declarations</li><li>command palette integration</li><li>agent tool registration support</li><li>local install / enable / disable / uninstall</li><li>default-deny permissions with explicit grants</li></ul><h2 id="rationale" tabindex="-1">Rationale <a class="header-anchor" href="#rationale" aria-label="Permalink to &quot;Rationale&quot;">​</a></h2><ol><li>Enables user customization without forking the app</li><li>Safer than arbitrary Electron main-script loading</li><li>Serves both UI extension and agent extension</li><li>Leaves room for a later marketplace protocol</li></ol><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Extensible product surface</li><li>Clear contribution model</li><li>Aligns with skills/tools ecosystems</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>Extra architecture and security complexity</li><li>Needs management UI, validation, and auditing</li></ul><h2 id="scope-control" tabindex="-1">Scope control <a class="header-anchor" href="#scope-control" aria-label="Permalink to &quot;Scope control&quot;">​</a></h2><ul><li>MVP prioritizes local plugin loading, not marketplace</li><li>First contributions: commands / panel / agentTools / skills</li><li>Plugins are isolated and permissioned by default</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0005-user-installable-plugin-system.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0005UserInstallablePluginSystem = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0005UserInstallablePluginSystem as default
};
