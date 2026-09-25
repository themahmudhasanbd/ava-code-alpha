import React, { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  FileAudio,
  FileQuestion,
  FileVideo,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  X,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmptyState,
  GlassIconButton,
  PageIntro,
  SkeletonRows,
  Surface,
} from "@/components/kit";
import { APP } from "@/config/app";
import type { MediaItem, MediaKind } from "@/core/api/media";
import { useMedia, useRemoveMedia } from "@/state/queries";
import { COLORS } from "@/theme/colors";

const FILTERS: { id: MediaKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
];

export function MediaScreen() {
  const [filter, setFilter] = useState<MediaKind | "all">("all");
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const { data: mediaItems = [], isLoading, error, refetch } = useMedia(APP.mediaDir);
  const removeMedia = useRemoveMedia();

  const filtered = mediaItems.filter(
    (m) => filter === "all" || m.kind === filter
  );

  return (
    <AppShell
      title="Media"
      actions={
        <GlassIconButton
          icon={RotateCw}
          size={18}
          onPress={() => refetch()}
          disabled={isLoading}
        />
      }
    >
      <View style={styles.container}>
        {/* Filter Pills */}
        <View style={styles.filterBar}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterPill,
                filter === f.id && styles.filterPillActive,
              ]}
              onPress={() => {
                setFilter(f.id);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.id && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <View style={{ padding: 16 }}>
            <SkeletonRows count={4} />
          </View>
        )}

        {error && (
          <EmptyState
            icon={ImageIcon}
            title="Could not load media"
            description={(error as Error).message}
          />
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState icon={ImageIcon} title="No media found" />
        )}

        {/* Media Grid */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.path}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => setPreviewItem(item)}
              activeOpacity={0.75}
            >
              <Surface style={styles.gridCardSurface}>
                <View style={styles.gridThumbnailBox}>
                  {item.kind === "image" ? (
                    <ImageIcon size={32} color={COLORS.mutedForeground} />
                  ) : item.kind === "video" ? (
                    <FileVideo size={32} color={COLORS.mutedForeground} />
                  ) : item.kind === "audio" ? (
                    <FileAudio size={32} color={COLORS.mutedForeground} />
                  ) : (
                    <FileQuestion size={32} color={COLORS.mutedForeground} />
                  )}
                </View>
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {item.name}
                </Text>
              </Surface>
            </TouchableOpacity>
          )}
        />

        {/* Media Preview Modal */}
        <Modal
          visible={previewItem !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewItem(null)}
        >
          <View style={styles.modalBackdrop}>
            <Surface style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {previewItem?.name}
                </Text>
                <TouchableOpacity onPress={() => setPreviewItem(null)}>
                  <X size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>{previewItem?.path}</Text>

              {previewItem && (
                <GlassIconButton
                  icon={Trash2}
                  size={16}
                  onPress={() => {
                    removeMedia.mutate(previewItem.path);
                    setPreviewItem(null);
                  }}
                  style={{ alignSelf: "flex-end", marginTop: 16 }}
                />
              )}
            </Surface>
          </View>
        </Modal>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.secondaryForeground,
  },
  filterTextActive: {
    color: COLORS.primaryForeground,
    fontWeight: "600",
  },
  gridContent: {
    padding: 12,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  gridCard: {
    flex: 1,
    aspectRatio: 1,
  },
  gridCardSurface: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    padding: 8,
  },
  gridThumbnailBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.muted,
    borderRadius: 10,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.foreground,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    flex: 1,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
});
