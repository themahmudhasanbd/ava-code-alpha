import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { ChevronDown, ChevronLeft, Menu, Zap } from "lucide-react-native";
import { WorkspacePreferenceModal } from "@/components/modals/WorkspacePreferenceModal";
import { ContextWindowModal } from "@/components/modals/ContextWindowModal";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import type { ChatMessage } from "@/core/types";
import { COLORS } from "@/theme/colors";
import { font, FONTS } from "@/theme/fonts";

interface Props {
  activeSessionTitle?: string;
  activeSessionId?: string | null;
  chatMessages?: ChatMessage[];
  showBack?: boolean;
  onBack?: () => void;
  onCompactSession?: () => Promise<void>;
  onNewSession?: () => void;
  onOpenDrawer?: () => void;
}

export function AppHeader({
  activeSessionTitle,
  activeSessionId,
  chatMessages = [],
  showBack = false,
  onBack,
  onCompactSession,
  onNewSession,
  onOpenDrawer,
}: Props) {
  const navigation = useNavigation<any>();
  const { status, activeSessionId: contextSessionId, setActiveSessionId } = useAva();
  const { data: sessions = [] } = useSessions();

  const [workspacePrefModalOpen, setWorkspacePrefModalOpen] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  const currentSessionId = activeSessionId ?? contextSessionId;
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const displayTitle =
    activeSessionTitle ||
    currentSession?.title ||
    (currentSessionId
      ? `Session ${currentSessionId.slice(0, 8)}`
      : "Pixel Perfect");

  const handleOpenDrawer = () => {
    if (onOpenDrawer) {
      onOpenDrawer();
    } else {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  };

  const handleLeftAction = () => {
    if (showBack) {
      if (onBack) {
        onBack();
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("Chat");
      }
    } else {
      handleOpenDrawer();
    }
  };

  const handleNewSession = () => {
    if (onNewSession) {
      onNewSession();
    } else {
      setActiveSessionId(null);
      navigation.navigate("Chat");
    }
  };

  const handleSelectSession = (sessId: string) => {
    setActiveSessionId(sessId);
    navigation.navigate("Session", { sessionId: sessId });
  };

  const isConnecting = status === "connecting";
  const isOnline = status === "online";

  return (
    <>
      <View style={styles.headerContainer}>
        {/* ── Left Circle Action Button (Back or Drawer Toggle) ── */}
        <TouchableOpacity
          style={styles.glossyCircleBtn}
          onPress={handleLeftAction}
          activeOpacity={0.75}
        >
          {showBack ? (
            <ChevronLeft size={21} color={COLORS.foreground} />
          ) : (
            <Menu size={19} color={COLORS.foreground} />
          )}
        </TouchableOpacity>

        {/* ── Center Pill Button (Session Title + Chevron Down for Workspace Preference Modal) ── */}
        <TouchableOpacity
          style={styles.glossyCenterPill}
          onPress={() => setWorkspacePrefModalOpen(true)}
          activeOpacity={0.75}
        >
          <Text
            style={[styles.sessionTitleText, font("semibold", displayTitle)]}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <ChevronDown size={14} color={COLORS.mutedForeground} />
        </TouchableOpacity>

        {/* ── Right Circle Action Button (Context Window & Core Diagnostics) ── */}
        <TouchableOpacity
          style={styles.glossyCircleBtn}
          onPress={() => setContextModalOpen(true)}
          activeOpacity={0.75}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Zap size={18} color={isOnline ? "#10B981" : "#EF4444"} />
          )}

          {/* Core Online / Offline Status Dot */}
          <View
            style={[
              styles.headerStatusDot,
              { backgroundColor: isOnline ? "#10B981" : "#EF4444" },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* ── Workspace Preference & Analytics Modal ── */}
      <WorkspacePreferenceModal
        open={workspacePrefModalOpen}
        onClose={() => setWorkspacePrefModalOpen(false)}
        activeSessionId={currentSessionId}
        activeSessionTitle={displayTitle}
        chatMessages={chatMessages}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />

      {/* ── Context Window & Engine Diagnostic Modal ── */}
      <ContextWindowModal
        open={contextModalOpen}
        onClose={() => setContextModalOpen(false)}
        activeSessionId={currentSessionId}
        activeSessionTitle={displayTitle}
        chatMessages={chatMessages}
        onCompactSession={onCompactSession}
        onNewSession={handleNewSession}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 62,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  glossyCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.95)",
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
    borderLeftColor: "rgba(255, 255, 255, 0.65)",
    borderRightColor: "rgba(255, 255, 255, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  glossyCenterPill: {
    height: 44,
    maxWidth: 240,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.95)",
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
    borderLeftColor: "rgba(255, 255, 255, 0.65)",
    borderRightColor: "rgba(255, 255, 255, 0.65)",
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sessionTitleText: {
    fontSize: 14,
    color: COLORS.foreground,
    maxWidth: 170,
  },
  headerStatusDot: {
    position: "absolute",
    bottom: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
