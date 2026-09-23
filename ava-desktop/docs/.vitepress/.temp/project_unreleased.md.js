import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Unreleased changes","description":"","frontmatter":{},"headers":[],"relativePath":"project/unreleased.md","filePath":"project/unreleased.md","lastUpdated":1790073498000}');
const _sfc_main = { name: "project/unreleased.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="unreleased-changes" tabindex="-1">Unreleased changes <a class="header-anchor" href="#unreleased-changes" aria-label="Permalink to &quot;Unreleased changes&quot;">​</a></h1><ul><li><p>Resuming a subagent no longer selects another definition&#39;s private model binding. On-demand delegation permissions are checked again on the next parent turn, so revoking automatic delegation takes effect without restarting the runtime.</p></li><li><p>Trusted extension cancellation now retires SDK commands, tool updates, subprocesses and queued or visible prompts. Late hook payload mutations are isolated; legitimate long commands and tools retain their runtime budget.</p></li><li><p>A stored hosted web-search record that cannot be replayed no longer fails every later request in that conversation: the message continues without search replay, so histories written before the contract change stay usable.</p></li><li><p>Hosted web search now has a complete replay and estimation contract, including tool/Task continuation and restart recovery. Context rebuilding preserves system-prefix semantics, and structured local preparation failures no longer masquerade as retryable provider failures. Existing search histories need no migration.</p></li><li><p>Trusted extension startup, shutdown, and notification handlers now have bounded waits. Stop cancels pending hook waits before a model request, and disposal ignores late results and runs shutdown once. Deferred event registrations now appear in plugin diagnostics.</p></li><li><p>The Composer reasoning slider now moves smoothly to clicked or keyboard-selected levels, follows dragging immediately, and respects reduced-motion settings. Rapid clicks redirect the animation; failed saves restore the confirmed selection. Opening the menu no longer leaves a press-animation offset that jumps on the first selection.</p></li><li><p>The reasoning slider&#39;s filled track covers the entire starting dot, so its left cap no longer leaves a gray half-dot exposed.</p></li><li><p>Hovering a reasoning stop or its label highlights the corresponding label. Only unfilled dots brighten and enlarge; filled dots and the current thumb keep their appearance.</p></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("project/unreleased.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const unreleased = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  unreleased as default
};
