import { createFileRoute } from "@tanstack/react-router";
import { Bot, Check, Image as ImageIcon } from "lucide-react";

import { EmptyState, ListRow, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { useAva } from "@/state/ava-provider";
import { useModels } from "@/state/queries";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models — AvA Code" },
      { name: "description", content: "Pick the AI model your AvA agent uses." },
      { property: "og:title", content: "Models — AvA Code" },
      { property: "og:description", content: "Pick the AI model your AvA agent uses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  const { modelId, setModelId } = useAva();
  const { data, isLoading, error } = useModels();
  const activeId = modelId || data?.find((m) => m.isDefault)?.id;

  return (
    <AppShell title="Models">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <PageIntro title="Models" description="Choose which model AvA uses for new messages." />
        {isLoading && <SkeletonRows count={6} />}
        {error && <EmptyState icon={Bot} title="Could not load models" description={(error as Error).message} />}
        {data && data.length === 0 && <EmptyState icon={Bot} title="No models found" />}
        {data && data.length > 0 && (
          <Surface className="p-1.5">
            {data.map((m) => (
              <ListRow
                key={m.id}
                icon={Bot}
                title={m.name}
                subtitle={m.description ?? m.id}
                onClick={() => setModelId(m.id)}
                trailing={
                  <span className="flex items-center gap-1.5">
                    {m.supportsImages && <ImageIcon className="size-4 text-muted-foreground" aria-label="Supports images" />}
                    {m.reasoningEfforts.length > 0 && <Badge variant="secondary">Reasoning</Badge>}
                    {activeId === m.id && <Check className="size-4 text-primary" />}
                  </span>
                }
              />
            ))}
          </Surface>
        )}
      </div>
    </AppShell>
  );
}
