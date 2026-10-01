import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Download, Eye, Image as ImageIcon, Maximize2, X, Copy, Check } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import type { MediaItem } from "@/core/types";
import { useMediaUrl } from "@/state/queries";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface MediaPreviewGalleryProps {
  media?: MediaItem[];
  title?: string;
  compact?: boolean;
}

function getFileExtension(nameOrPath: string): string {
  const clean = (nameOrPath || "").split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toUpperCase() || "";
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG", "BMP", "ICO"].includes(ext)) {
    return ext === "JPEG" ? "JPG" : ext;
  }
  return "IMG";
}

function SingleImageThumbnail({
  item,
  onPress,
  compact = false,
}: {
  item: MediaItem;
  onPress: (uri: string, name: string) => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const [loadError, setLoadError] = useState(false);

  const cleanUrl = (item.url || "").trim();
  const isDirectUri =
    cleanUrl.startsWith("data:image/") ||
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("blob:") ||
    cleanUrl.startsWith("file://");

  const serverPath = !isDirectUri ? cleanUrl : null;
  const { data: serverDataUrl, isLoading, error } = useMediaUrl(serverPath);

  const finalUri = isDirectUri ? cleanUrl : serverDataUrl;
  const displayName = item.name || cleanUrl.split("/").pop() || "Screenshot";
  const extBadge = getFileExtension(displayName || cleanUrl);

  // Suppress broken or failed images completely — no blank cards!
  if (loadError || error) {
    return null;
  }

  if (serverPath && isLoading) {
    return (
      <View
        style={[
          styles.thumbnailCard,
          compact && styles.thumbnailCardCompact,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text
          style={[styles.loadingLabel, mono("regular"), { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
      </View>
    );
  }

  if (!finalUri || finalUri.trim().length < 15) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.thumbnailCard,
        compact && styles.thumbnailCardCompact,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
        },
      ]}
      onPress={() => onPress(finalUri, displayName)}
      activeOpacity={0.82}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: finalUri }}
          style={styles.thumbnailImg}
          resizeMode="cover"
          onError={() => setLoadError(true)}
        />
        {/* Top badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.extPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.extPillText, mono("bold"), { color: colors.secondaryForeground }]}>
              {extBadge}
            </Text>
          </View>
          <View style={[styles.expandBtn, { backgroundColor: colors.secondary }]}>
            <Maximize2 size={11} color={colors.secondaryForeground} />
          </View>
        </View>
      </View>

      {/* Meta info footer */}
      <View style={[styles.metaFooter, { borderTopColor: colors.border }]}>
        <ImageIcon size={11} color={colors.mutedForeground} />
        <Text
          style={[styles.metaText, mono("regular"), { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function MediaPreviewGallery({ media, title, compact }: MediaPreviewGalleryProps) {
  const { colors } = useTheme();
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  const imageItems = useMemo(() => {
    if (!media || media.length === 0) return [];
    const seen = new Set<string>();
    const list: MediaItem[] = [];

    for (const m of media) {
      if (!m || !m.url) continue;
      const cleanUrl = m.url.trim();
      const lower = cleanUrl.toLowerCase();
      if (seen.has(lower)) continue;

      const isImage =
        m.type === "image" ||
        cleanUrl.startsWith("data:image/") ||
        /\.(png|jpe?g|gif|webp|svg|bmp|ico)(?=[?#]|$)/i.test(cleanUrl);

      if (isImage) {
        seen.add(lower);
        list.push({ ...m, url: cleanUrl });
      }
    }
    return list;
  }, [media]);

  if (imageItems.length === 0) return null;

  const handleOpenPreview = (uri: string, name: string) => {
    setSelectedUri(uri);
    setSelectedName(name);
    setCopiedLink(false);
  };

  const handleClosePreview = () => {
    setSelectedUri(null);
    setSelectedName("");
    setCopiedLink(false);
  };

  const handleCopyUri = async () => {
    if (!selectedUri) return;
    await Clipboard.setStringAsync(selectedUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareOrDownload = async () => {
    if (!selectedUri) return;
    try {
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = selectedUri;
        a.download = selectedName || `image_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      if (selectedUri.startsWith("data:image/")) {
        const base64Code = selectedUri.split("base64,")[1];
        if (!base64Code) return;
        const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || "";
        const filename = `${dir}${selectedName || `image_${Date.now()}.png`}`;
        await FileSystem.writeAsStringAsync(filename, base64Code, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filename);
        }
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(selectedUri);
      }
    } catch (e) {
      console.warn("[MediaPreviewGallery] Export failed:", e);
    }
  };

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={[styles.galleryTitle, font("medium"), { color: colors.mutedForeground }]}>
          {title}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {imageItems.map((item, index) => (
          <SingleImageThumbnail
            key={`img_${index}_${item.url.slice(-30)}`}
            item={item}
            onPress={handleOpenPreview}
            compact={compact}
          />
        ))}
      </View>

      {/* Fullscreen Lightbox Modal */}
      <Modal
        visible={!!selectedUri}
        transparent
        animationType="fade"
        onRequestClose={handleClosePreview}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={handleClosePreview}
          />
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalTitleCol}>
                <Text
                  style={[styles.modalTitleText, font("semibold"), { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {selectedName || "Image Preview"}
                </Text>
                <Text style={[styles.modalSubText, mono("regular"), { color: colors.mutedForeground }]}>
                  {selectedUri?.startsWith("data:image/") ? "Raw base64 preview" : "Server media asset"}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalIconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={handleCopyUri}
                  activeOpacity={0.7}
                  accessibilityLabel="Copy image URI"
                >
                  {copiedLink ? (
                    <Check size={14} color={colors.success} />
                  ) : (
                    <Copy size={14} color={colors.foreground} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalIconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={handleShareOrDownload}
                  activeOpacity={0.7}
                  accessibilityLabel="Save / Download image"
                >
                  <Download size={14} color={colors.foreground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalIconBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={handleClosePreview}
                  activeOpacity={0.7}
                  accessibilityLabel="Close preview"
                >
                  <X size={15} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Image View */}
            <View style={styles.modalImageContainer}>
              {selectedUri ? (
                <Image
                  source={{ uri: selectedUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 6,
    width: "100%",
  },
  galleryTitle: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  thumbnailCard: {
    width: 150,
    height: 125,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbnailCardCompact: {
    width: 120,
    height: 100,
    borderRadius: 10,
  },
  imageWrapper: {
    flex: 1,
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },
  badgeRow: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  extPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  extPillText: {
    fontSize: 8.5,
    letterSpacing: 0.5,
  },
  expandBtn: {
    padding: 3.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  metaFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: 10,
    flex: 1,
  },
  loadingLabel: {
    fontSize: 10,
    marginTop: 6,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  backdropTouch: {
    ...(StyleSheet.absoluteFill as any),
  },
  modalBox: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitleCol: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  modalTitleText: {
    fontSize: 13.5,
  },
  modalSubText: {
    fontSize: 10.5,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalImageContainer: {
    width: "100%",
    height: Math.min(520, screenWidth * 0.9),
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
});
