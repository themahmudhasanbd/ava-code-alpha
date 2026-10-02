import React, { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { openAppDrawer } from "@/navigation/drawer";
import { ChevronDown, ChevronLeft, Menu, Zap } from "lucide-react-native";
import { WorkspacePreferenceModal } from "@/components/modals/WorkspacePreferenceModal";
import { ContextWindowModal } from "@/components/modals/ContextWindowModal";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import type { ChatMessage } from "@/core/types";
import type { ColorTokens } from "@/theme/colors";
import { useStyles, useTheme } from "@/theme/theme-context";
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
  actions?: ReactNode;
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
  actions,
}: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
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
      return;
    }
    openAppDrawer(navigation);
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
          style={styles.circleBtn}
          onPress={handleLeftAction}
          activeOpacity={0.75}
        >
          {showBack ? (
            <ChevronLeft size={21} color={colors.foreground} />
          ) : (
            <Menu size={19} color={colors.foreground} />
          )}
        </TouchableOpacity>

        {/* ── Center Pill Button (Session Title + Chevron Down for Workspace Preference Modal) ── */}
        <TouchableOpacity
          style={styles.centerPill}
          onPress={() => setWorkspacePrefModalOpen(true)}
          activeOpacity={0.75}
        >
          <Text
            style={[styles.sessionTitleText, font("semibold", displayTitle)]}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <ChevronDown size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* ── Screen-specific action slot (e.g. new task, refresh, new chat) ── */}
        {actions ? <View style={styles.actionsRow}>{actions}</View> : null}

        {/* ── Right Circle Action Button (Context Window & Core Diagnostics) ── */}
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => setContextModalOpen(true)}
          activeOpacity={0.75}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Zap size={18} color={isOnline ? colors.success : colors.destructive} />
          )}

          {/* Core Online / Offline Status Dot */}
          <View
            style={[
              styles.headerStatusDot,
              { backgroundColor: isOnline ? colors.success : colors.destructive },
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

function createStyles(c: ColorTokens) {
  return StyleSheet.create({
    headerContainer: {
      height: 62,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    centerPill: {
      height: 44,
      flexShrink: 1,
      maxWidth: 240,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: 6,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sessionTitleText: {
      fontSize: 14,
      color: c.foreground,
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
      borderColor: c.card,
    },
  });
}
