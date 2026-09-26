import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Camera, Keyboard, Menu, Monitor, RefreshCw } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  EmptyState,
  GlassIconButton,
  SkeletonRows,
  Surface,
} from "@/components/kit";
import {
  useCaptureScreen,
  useDesktopInput,
  useDesktopStatus,
} from "@/state/queries";
import { COLORS } from "@/theme/colors";

const KEYS = ["Return", "Escape", "Tab", "BackSpace", "ctrl+c", "ctrl+v"];

export function DesktopScreen() {
  const navigation = useNavigation<any>();
  const { data: status, isLoading, error, refetch, isFetching } = useDesktopStatus();
  const capture = useCaptureScreen();
  const desktopInput = useDesktopInput();

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [text, setText] = useState("");
  const display = status?.display ?? null;

  const handleCapture = async () => {
    if (!display || !status) return;
    try {
      const res = await capture.mutateAsync({
        display,
        width: status.width,
        height: status.height,
      });
      setScreenshot(res);
    } catch (err) {
      console.warn("Capture error:", err);
    }
  };

  const handleSendKey = (k: string) => {
    if (!display) return;
    desktopInput.mutate({ display, input: { key: k } });
  };

  const handleSendText = () => {
    if (!display || !text) return;
    desktopInput.mutate({ display, input: { text } });
    setText("");
  };

  // Dedicated Customized Header for Remote Desktop
  const customDesktopHeader = (
    <Surface style={styles.customHeaderSurface}>
      <View style={styles.headerLeft}>
        <GlassIconButton
          icon={Menu}
          size={18}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <View style={styles.headerTextGroup}>
          <View style={styles.headerTitleRow}>
            <Monitor size={14} color={COLORS.primary} />
            <Text style={styles.headerTitleText}>Remote Desktop</Text>
          </View>
          <Text style={styles.headerSubtitleText} numberOfLines={1}>
            {display ? `Display :${display} · ${status?.vncRunning ? "VNC Active" : "No VNC"}` : "Xvfb / VNC Server"}
          </Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        {display ? (
          <GlassIconButton
            icon={Camera}
            size={17}
            onPress={handleCapture}
            disabled={capture.isPending}
          />
        ) : null}
        <GlassIconButton
          icon={RefreshCw}
          size={17}
          disabled={isFetching}
          onPress={() => refetch()}
        />
      </View>
    </Surface>
  );

  return (
    <AppShell customHeader={customDesktopHeader}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <SkeletonRows count={2} />}

        {error && (
          <EmptyState
            icon={Monitor}
            title="Could not check desktop"
            description={(error as Error).message}
          />
        )}

        {status && !display && (
          <EmptyState
            icon={Monitor}
            title="No desktop running"
            description="Start a desktop session (Xvfb/VNC) on your server, then refresh."
          />
        )}

        {status && display && (
          <>
            <View style={styles.badgeRow}>
              <Badge variant="secondary">Display :{display}</Badge>
              <Badge variant={status.vncRunning ? "default" : "secondary"}>
                {status.vncRunning ? "VNC running" : "VNC off"}
              </Badge>
            </View>

            <Surface style={styles.screenshotBox}>
              {screenshot ? (
                <Image
                  source={{ uri: screenshot }}
                  style={styles.screenImage}
                  resizeMode="contain"
                />
              ) : (
                <TouchableOpacity
                  style={styles.capturePlaceholder}
                  onPress={handleCapture}
                >
                  <Text style={styles.captureText}>
                    {capture.isPending
                      ? "Capturing screen…"
                      : "Tap to capture screen"}
                  </Text>
                </TouchableOpacity>
              )}
            </Surface>

            {/* Keyboard input */}
            <Surface style={styles.keyInputRow}>
              <Keyboard size={16} color={COLORS.mutedForeground} />
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                onSubmitEditing={handleSendText}
                placeholder="Type text and press Return…"
                placeholderTextColor={COLORS.mutedForeground}
              />
            </Surface>

            <View style={styles.keysRow}>
              {KEYS.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={styles.keyBtn}
                  onPress={() => handleSendKey(k)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeaderSurface: {
    marginHorizontal: 12,
    marginTop: Platform.OS === "android" ? 8 : 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    height: 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerTextGroup: {
    justifyContent: "center",
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  headerSubtitleText: {
    fontSize: 10.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  screenshotBox: {
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 200,
  },
  screenImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  capturePlaceholder: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.muted,
  },
  captureText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  keyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
  },
  keysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  keyBtn: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  keyText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: COLORS.foreground,
  },
});
