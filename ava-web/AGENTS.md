<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Session history polling belongs to the query layer, and terminal recovery requires a fresh matching turn snapshot; this prevents render-reset timers and stale history from leaving or stopping live turns incorrectly.

- Reattach existing turns after transport reconnection without submitting prompts, and merge live item fields by stable IDs so delayed snapshots cannot roll back streamed output.
