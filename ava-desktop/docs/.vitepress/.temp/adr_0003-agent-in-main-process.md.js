import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0003: Hybrid runtime — Rust host core + Node pi agent sidecar","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0003-agent-in-main-process.md","filePath":"adr/0003-agent-in-main-process.md","lastUpdated":1784983842000}');
const _sfc_main = { name: "adr/0003-agent-in-main-process.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0003-hybrid-runtime-—-rust-host-core-node-pi-agent-sidecar" tabindex="-1">ADR 0003: Hybrid runtime — Rust host core + Node pi agent sidecar <a class="header-anchor" href="#adr-0003-hybrid-runtime-—-rust-host-core-node-pi-agent-sidecar" aria-label="Permalink to &quot;ADR 0003: Hybrid runtime — Rust host core + Node pi agent sidecar&quot;">​</a></h1><ul><li>Status: Superseded in part by ADR 0010 / ADR 0011</li><li>Date: 2026-07-25</li><li>Updated: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>The original MVP placed the full agent loop in Electron main process for simplicity.</p><p>New product constraints:</p><ol><li>Prefer a stronger systems backend</li><li>Keep pi Agent Harness as the model/agent engine</li><li>Improve long-term isolation and native capability quality</li></ol><h2 id="original-decision" tabindex="-1">Original Decision <a class="header-anchor" href="#original-decision" aria-label="Permalink to &quot;Original Decision&quot;">​</a></h2><p>MVP agent loop in Electron main process.</p><h2 id="revised-direction" tabindex="-1">Revised Direction <a class="header-anchor" href="#revised-direction" aria-label="Permalink to &quot;Revised Direction&quot;">​</a></h2><p>Adopt a hybrid model:</p><ul><li><strong>Rust backend host core</strong> owns desktop host services, tools sandbox, plugin host boundary, persistence adapters, and privileged operations</li><li><strong>Node/TypeScript pi runtime</strong> remains the agent loop engine (<code>pi-ai</code> + <code>pi-agent-core</code>) and runs as a controlled sidecar/utility process</li><li><strong>Electron main</strong> becomes a thin orchestrator between renderer IPC and Rust/Node services</li></ul><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Better native/host capability foundation</li><li>Clearer privilege boundary</li><li>Keeps pi ecosystem leverage</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>Higher integration complexity than pure Node main</li><li>Requires stable local RPC between Electron/Rust/Node</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0003-agent-in-main-process.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0003AgentInMainProcess = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0003AgentInMainProcess as default
};
