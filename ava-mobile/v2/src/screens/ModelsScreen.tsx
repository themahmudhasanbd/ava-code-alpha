import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Bot, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ListRow, PageIntro, SkeletonRows, Surface, Badge } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { useModels } from "@/state/queries";
import { COLORS } from "@/theme/colors";

export function ModelsScreen() {
  const { modelId, setModelId } = useAva();
  const { data: models = [], isLoading, error } = useModels();
  const activeId = modelId || models.find((m) => m.isDefault)?.id;

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setModelId(id);
  };

  return (
    <AppShell title="Models">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Models"
          description="Choose which model AvA uses for new messages."
        />

        {isLoading && <SkeletonRows count={6} />}

        {error && (
          <EmptyState
            icon={Bot}
            title="Could not load models"
            description={(error as Error).message}
          />
        )}

        {!isLoading && models.length === 0 && (
          <EmptyState icon={Bot} title="No models found" />
        )}

        {models.length > 0 && (
          <Surface style={styles.card}>
            {models.map((m) => {
              const isSelected = activeId === m.id;
              return (
                <ListRow
                  key={m.id}
                  icon={Bot}
                  title={m.name}
                  subtitle={m.description ?? m.id}
                  onClick={() => handleSelect(m.id)}
                  trailing={
                    <View style={styles.trailingRow}>
                      {m.isDefault ? (
                        <Badge variant="secondary">Default</Badge>
                      ) : null}
                      {isSelected ? (
                        <Check size={16} color={COLORS.primary} />
                      ) : null}
                    </View>
                  }
                />
              );
            })}
          </Surface>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 6,
    borderRadius: 18,
    gap: 2,
  },
  trailingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
