import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RefreshCw, Square, Radio } from "lucide-react-native";
import { COLORS } from "@/theme/colors";
import { font } from "@/theme/fonts";

interface BrowserLiveViewProps {
  /** Base64 JPEG frame data (without data: prefix), or null if no frame yet. */
  frameData: string | null;
  /** Frame width in px (for aspect ratio). */
  frameWidth?: number;
  /** Frame height in px (for aspect ratio). */
  frameHeight?: number;
  /** Whether live streaming is active. */
  isLive: boolean;
  /** Whether a frame is currently being fetched. */
  isLoading: boolean;
  /** Called when user taps refresh / start. */
  onRefresh: () => void;
  /** Called when user taps stop. */
  onStop?: () => void;
  /** Last update timestamp for display. */
  lastUpdated?: Date | null;
}

export function BrowserLiveView({
  frameData,
  frameWidth,
  frameHeight,
  isLive,
  isLoading,
  onRefresh,
  onStop,
  lastUpdated,
}: BrowserLiveViewProps) {
  const aspectRatio =
    frameWidth && frameHeight && frameHeight > 0 ? frameWidth / frameHeight : 16 / 10;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.liveBadge}>
          <Radio size={12} color={isLive ? COLORS.success : COLORS.mutedForeground} />
          <Text style={[styles.liveText, font("medium"), isLive && styles.liveActive]}>
            {isLive ? "LIVE" : "PAUSED"}
          </Text>
        </View>
        {lastUpdated && (
          <Text style={[styles.timestamp, font("regular")]}>
            Updated {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <View style={[styles.frameContainer, { aspectRatio }]}>
        {frameData ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${frameData}` }}
            style={styles.frame}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.emptyFrame}>
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <>
                <Radio size={32} color={COLORS.mutedForeground} />
                <Text style={[styles.emptyText, font("regular")]}>
                  No live frame yet.{"\n"}Tap refresh to capture the browser.
                </Text>
              </>
            )}
          </View>
        )}
        {isLoading && frameData && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primaryForeground} />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={onRefresh}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <RefreshCw size={15} color={COLORS.primaryForeground} />
          <Text style={[styles.btnText, font("medium")]}>
            {frameData ? "Refresh" : "Start Live View"}
          </Text>
        </TouchableOpacity>
        {isLive && onStop && (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={onStop}
            activeOpacity={0.8}
          >
            <Square size={14} color={COLORS.primary} />
            <Text style={[styles.btnTextSecondary, font("medium")]}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.hint, font("regular")]}>
        Live view shows what the agent's browser sees. Frames update when you refresh
        or while the agent is actively browsing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveText: {
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.mutedForeground,
  },
  liveActive: {
    color: COLORS.success,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  frameContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  frame: {
    width: "100%",
    height: "100%",
  },
  emptyFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    padding: 6,
  },
  controls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  btnText: {
    fontSize: 14,
    color: COLORS.primaryForeground,
  },
  btnTextSecondary: {
    fontSize: 14,
    color: COLORS.primary,
  },
  hint: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 10,
    lineHeight: 16,
    textAlign: "center",
  },
});
