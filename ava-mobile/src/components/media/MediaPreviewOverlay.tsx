import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Check,
  Copy,
  File as FileIcon,
  FileAudio,
  FileText,
  FileVideo,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  IMAGE_PREVIEW_EXTS,
  PREVIEW_MAX_BYTES,
  TEXT_PREVIEW_EXTS,
  cacheThumbnail,
  decodePreviewText,
  formatFileSize,
  getFileExtension,
  type PreviewItem,
} from "./media-helpers";

interface MediaPreviewOverlayProps {
  item: PreviewItem;
  dialogWidth: number;
  dialogHeight: number;
  onClose: () => void;
  onAttach: (item: PreviewItem) => void;
}

/** Rich preview overlay for a single server file, with safety guards. */
export function MediaPreviewOverlay({
  item,
  dialogWidth,
  dialogHeight,
  onClose,
  onAttach,
}: MediaPreviewOverlayProps) {
  const { rpc } = useAva();
  const { colors, isDark } = useTheme();

  const [base64Uri, setBase64Uri] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tooLarge, setTooLarge] = useState(false);
  const [isBinary, setIsBinary] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copiedPath, setCopiedPath] = useState(false);

  const ext = getFileExtension(item.name);
  const isImg = IMAGE_PREVIEW_EXTS.includes(ext);
  const isText = TEXT_PREVIEW_EXTS.includes(ext);
  const isAudioVideo = item.kind === "video" || item.kind === "audio";

  // Theme-token file-kind colors (matches MediaScreen grid pattern):
  // image -> primary, video -> mascot, audio -> warning, document -> destructive,
  // code + generic files -> accentForeground. Adapts to the active theme.
  const kindColor =
    item.kind === "image"
      ? colors.primary
      : item.kind === "video"
        ? colors.mascot
        : item.kind === "audio"
          ? colors.warning
          : item.kind === "document"
            ? colors.destructive
            : colors.accentForeground;

  useEffect(() => {
    let isMounted = true;
    if (!rpc || rpc.status !== "online") return;

    (async () => {
      // Size guard + display size (cheap metadata call first)
      try {
        const meta = await rpc.call<{ size?: number }>("fs/getMetadata", { path: item.path });
        if (!isMounted) return;
        if (typeof meta.size === "number") {
          setFileSize(meta.size);
          if (meta.size > PREVIEW_MAX_BYTES && (isImg || isText)) {
            setTooLarge(true);
            return;
          }
        }
      } catch {
        // Size check unavailable — proceed without it
      }

      if (!isImg && !isText) return;

      setIsLoading(true);
      try {
        const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", {
          path: item.path,
        });
        if (!isMounted || !res.dataBase64) return;
        if (isImg) {
          const mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
          const uri = `data:${mime};base64,${res.dataBase64}`;
          cacheThumbnail(item.path, uri);
          setBase64Uri(uri);
        } else {
          const decoded = decodePreviewText(res.dataBase64);
          if ("binary" in decoded) {
            setIsBinary(true);
          } else {
            setTextContent(decoded.text);
          }
        }
      } catch (err) {
        console.warn("Could not read file preview:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.path, rpc]);

  const handleCopyFilePath = async () => {
    await Clipboard.setStringAsync(item.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const sizeLine = fileSize != null ? ` · ${formatFileSize(fileSize)}` : "";

  const renderInfoCard = (
    notice: string,
    help: string,
    showKindIcon: boolean = true
  ) => (
    <View style={styles.genericFileBox}>
      <View
        style={[
          styles.genericIconCircle,
          { backgroundColor: `${kindColor}18` },
        ]}
      >
        {showKindIcon && item.kind === "video" ? (
          <FileVideo size={42} color={kindColor} />
        ) : showKindIcon && item.kind === "audio" ? (
          <FileAudio size={42} color={kindColor} />
        ) : showKindIcon && item.kind === "document" ? (
          <FileText size={42} color={kindColor} />
        ) : (
          <FileIcon size={42} color={colors.primary} />
        )}
      </View>
      <Text style={[styles.genericFileName, { color: colors.foreground }, font("bold")]}>
        {item.name}
      </Text>
      <Text style={[styles.genericFileNotice, { color: colors.mutedForeground }, mono("regular")]}>
        {notice}
      </Text>
      <Text style={[styles.genericFileHelp, { color: colors.mutedForeground }, font("regular")]}>
        {help}
      </Text>
    </View>
  );

  return (
    <View style={styles.previewOverlay}>
      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Preview Top Header */}
        <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.previewTitleGroup}>
            <View style={styles.previewBadgeRow}>
              <View
                style={[
                  styles.extPill,
                  {
                    backgroundColor: `${kindColor}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.extPillText,
                    { color: kindColor },
                    mono("bold"),
                  ]}
                >
                  {ext.toUpperCase() || item.kind.toUpperCase()}
                </Text>
              </View>
              <Text
                style={[styles.previewFileName, { color: colors.foreground }, font("bold")]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
            <Text
              style={[styles.previewPathText, { color: colors.mutedForeground }, mono("regular")]}
              numberOfLines={1}
            >
              {item.path}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.previewCloseBtn, { backgroundColor: colors.secondary }]}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Preview Body Content */}
        <View style={styles.previewBody}>
          {isLoading ? (
            <View style={styles.previewCenterBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.previewLoadingText, { color: colors.mutedForeground }, font("regular")]}>
                Reading file content from VPS…
              </Text>
            </View>
          ) : tooLarge ? (
            renderInfoCard(
              `File too large to preview${sizeLine}`,
              "This file exceeds the 10 MB preview limit. Attach it and AvA can still process it."
            )
          ) : isBinary ? (
            renderInfoCard(
              `Binary file — preview not available${sizeLine}`,
              "This file doesn't look like readable text. Attach it and AvA can still process it."
            )
          ) : base64Uri ? (
            /* Image Viewer with Zoom Controls */
            <View style={[styles.imageViewerWrap, { backgroundColor: isDark ? colors.codeBg : colors.muted }]}>
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  activeOpacity={0.7}
                >
                  <ZoomOut size={14} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom(1)}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={13} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom((z) => Math.min(3, z + 0.25))}
                  activeOpacity={0.7}
                >
                  <ZoomIn size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                contentContainerStyle={styles.imageScrollContainer}
                showsHorizontalScrollIndicator={false}
              >
                <ScrollView
                  contentContainerStyle={styles.imageScrollContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <RNImage
                    source={{ uri: base64Uri }}
                    style={[
                      styles.fullPreviewImage,
                      {
                        maxWidth: Math.min(dialogWidth - 32, 420),
                        maxHeight: Math.min(dialogHeight * 0.45, 320),
                        transform: [{ scale: zoom }],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </ScrollView>
              </ScrollView>
            </View>
          ) : textContent !== null ? (
            /* Syntax-Highlighted Code / Text Viewer */
            <ScrollView
              style={styles.codePreviewScroll}
              showsVerticalScrollIndicator={false}
            >
              <CodeBlock
                code={textContent || "(empty file)"}
                language={ext}
              />
            </ScrollView>
          ) : (
            /* Generic File Inspection Box */
            renderInfoCard(
              `${item.kind.toUpperCase()} file on VPS${sizeLine}`,
              isAudioVideo
                ? "Video and audio previews aren't supported here. Attach the file and AvA can still process it."
                : "This file reference will be attached to your prompt for AvA to inspect or process."
            )
          )}
        </View>

        {/* Preview Bottom Action Bar */}
        <View
          style={[
            styles.previewFooter,
            { backgroundColor: colors.secondary, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.previewCopyBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={handleCopyFilePath}
            activeOpacity={0.7}
          >
            {copiedPath ? (
              <Check size={14} color={colors.success} />
            ) : (
              <Copy size={14} color={colors.foreground} />
            )}
            <Text style={[styles.previewCopyBtnText, { color: colors.foreground }, font("medium")]}>
              {copiedPath ? "Copied" : "Copy Path"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewBackBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.previewBackBtnText, { color: colors.mutedForeground }, font("medium")]}>
              Back to Files
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewAttachBtn, { backgroundColor: colors.primary }]}
            onPress={() => onAttach(item)}
            activeOpacity={0.8}
          >
            <Check size={15} color={colors.primaryForeground} />
            <Text style={[styles.previewAttachBtnText, { color: colors.primaryForeground }, font("bold")]}>
              Attach This File
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  previewCard: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  previewTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  previewBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewFileName: {
    fontSize: 14,
    flex: 1,
  },
  previewPathText: {
    fontSize: 10,
    marginTop: 2,
  },
  previewCloseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  previewBody: {
    flex: 1,
    position: "relative",
  },
  previewCenterBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  previewLoadingText: {
    fontSize: 12,
  },
  imageViewerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  zoomControls: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 20,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 5,
    borderRadius: 8,
  },
  zoomBtn: {
    padding: 5,
  },
  imageScrollContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: "100%",
    minHeight: "100%",
  },
  fullPreviewImage: {
    width: 320,
    height: 320,
  },
  codePreviewScroll: {
    flex: 1,
    padding: 8,
  },
  genericFileBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  genericIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  genericFileName: {
    fontSize: 14.5,
    textAlign: "center",
  },
  genericFileNotice: {
    fontSize: 11,
    textAlign: "center",
  },
  genericFileHelp: {
    fontSize: 11.5,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
    marginTop: 4,
  },
  extPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  extPillText: {
    fontSize: 9,
  },
  previewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  previewCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewCopyBtnText: {
    fontSize: 11.5,
  },
  previewBackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  previewBackBtnText: {
    fontSize: 12,
  },
  previewAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  previewAttachBtnText: {
    fontSize: 12,
  },
});
