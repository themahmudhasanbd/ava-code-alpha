import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ADR 0002: Use the pi Agent Harness as the kernel","description":"","frontmatter":{},"headers":[],"relativePath":"adr/0002-use-pi-agent-harness.md","filePath":"adr/0002-use-pi-agent-harness.md","lastUpdated":1784983842000}');
const _sfc_main = { name: "adr/0002-use-pi-agent-harness.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="adr-0002-use-the-pi-agent-harness-as-the-kernel" tabindex="-1">ADR 0002: Use the pi Agent Harness as the kernel <a class="header-anchor" href="#adr-0002-use-the-pi-agent-harness-as-the-kernel" aria-label="Permalink to &quot;ADR 0002: Use the pi Agent Harness as the kernel&quot;">​</a></h1><ul><li>Status: Accepted</li><li>Date: 2026-07-25</li></ul><h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><p>We need an extensible multi-model agent loop, rather than implementing tool calling, streaming events, and provider adapters from scratch.</p><h2 id="decision" tabindex="-1">Decision <a class="header-anchor" href="#decision" aria-label="Permalink to &quot;Decision&quot;">​</a></h2><p>Use the following packages as the kernel:</p><ul><li><code>@earendil-works/pi-ai</code></li><li><code>@earendil-works/pi-agent-core</code></li></ul><p>Optionally adopt later:</p><ul><li><code>@earendil-works/pi-coding-agent</code></li><li><code>@earendil-works/pi-storage-sqlite-node</code></li></ul><h2 id="rationale" tabindex="-1">Rationale <a class="header-anchor" href="#rationale" aria-label="Permalink to &quot;Rationale&quot;">​</a></h2><ol><li>Unified LLM provider interface</li><li>Clear agent event model, well suited to a desktop UI</li><li>Provides extensibility across the tool calling / session / skills ecosystem</li><li>Projects such as LiveAgent have already validated it as a viable kernel for desktop products</li></ol><h2 id="consequences" tabindex="-1">Consequences <a class="header-anchor" href="#consequences" aria-label="Permalink to &quot;Consequences&quot;">​</a></h2><h3 id="positive" tabindex="-1">Positive <a class="header-anchor" href="#positive" aria-label="Permalink to &quot;Positive&quot;">​</a></h3><ul><li>Avoids building an in-house agent framework</li><li>Can keep pace with upstream capability evolution</li></ul><h3 id="negative" tabindex="-1">Negative <a class="header-anchor" href="#negative" aria-label="Permalink to &quot;Negative&quot;">​</a></h3><ul><li>Requires adapting to pi&#39;s events and version constraints (Node &gt;= 22.19)</li><li>Some desktop product requirements must be filled in at the upper layer ourselves (permission UX, session product model)</li></ul><h2 id="alternatives" tabindex="-1">Alternatives <a class="header-anchor" href="#alternatives" aria-label="Permalink to &quot;Alternatives&quot;">​</a></h2><ul><li>Build our own agent loop: high cost, no</li><li>Use another coding agent directly as the kernel: inconsistent with the &quot;based on pi&quot; goal</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("adr/0002-use-pi-agent-harness.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _0002UsePiAgentHarness = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _0002UsePiAgentHarness as default
};
