import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0001: Use Electron as the desktop shell","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0001-use-electron.md","filePath":"adr/0001-use-electron.md","lastUpdated":1784983842000}');
const _sfc_main = { name: "adr/0001-use-electron.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0001-use-electron-as-the-desktop-shell" tabindex="-1">ADR 0001: Use Electron as the desktop shell <a class="header-anchor" href="#adr-0001-use-electron-as-the-desktop-shell" aria-label="Permalink to &quot;ADR 0001: Use Electron as the desktop shell&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Date: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>PI-Desktop needs desktop distribution, local permission control, session UI, and system integration capabilities. The main candidate options are Electron and Tauri.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>Adopt <strong>Electron</strong> as the desktop shell.</p><h2 id="rationale" tabindex="-1">Rationale <a class="header-anchor" href="#rationale" aria-label="Permalink to &quot;Rationale&quot;">​</a></h2><ol><li>Close to the technical path of the already-researched ChatGPT Desktop / WorkBuddy, making it easier to draw on their engineering experience</li><li>Smoother fit between the Node ecosystem and pi&#39;s TypeScript runtime</li><li>More mature native modules, debugging toolchain, and packaging resources</li><li>The team&#39;s current roadmap clearly prefers Electron</li></ol><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Fast development speed</li><li>The agent runtime can be placed directly on the main/node side</li><li>Later integration of pty, sqlite, and auto-update is more conventional</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>Heavier bundle size and memory footprint relative to Tauri</li><li>Requires strict enforcement of the Electron security baseline</li></ul><h2 id="alternatives" tabindex="-1">Alternatives <a class="header-anchor" href="#alternatives" aria-label="Permalink to &quot;Alternatives&quot;">​</a></h2><ul><li>Tauri 2: lighter, but inconsistent with the current roadmap; dropped as the MVP baseline</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0001-use-electron.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0001UseElectron = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0001UseElectron as default
};
