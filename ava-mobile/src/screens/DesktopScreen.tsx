import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Monitor, ArrowRight, Cpu, ScreenShare } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";
import { font } from "@/theme/fonts";

export function DesktopScreen() {
  const navigation = useNavigation<any>();

  return (
    <AppShell title="Remote Desktop">
      <View style={styles.container}>
        <Surface style={styles.card}>
          <View style={styles.iconCircle}>
            <Monitor size={36} color={COLORS.primary} />
          </View>

          <View style={styles.badgeRow}>
            <Badge variant="secondary">Coming Soon</Badge>
            <Badge variant="outline">In Active Development</Badge>
          </View>

          <Text style={[styles.title, font("semibold")]}>Remote Desktop & VNC</Text>

          <Text style={[styles.description, font("regular")]}>
            The interactive remote desktop visual environment is currently under development. This feature will bring full Xvfb display management, real-time VNC streaming, and GUI automation directly into AvA.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Cpu size={14} color={COLORS.primary} />
              <Text style={[styles.featureText, font("regular")]}>
                Live Xvfb / virtual display frame buffer streaming
              </Text>
            </View>
            <View style={styles.featureItem}>
              <ScreenShare size={14} color={COLORS.primary} />
              <Text style={[styles.featureText, font("regular")]}>
                Interactive mouse, keyboard, and window management
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("Main", { screen: "Chat" })}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, font("medium")]}>Return to Chat</Text>
            <ArrowRight size={15} color={COLORS.primaryForeground} />
          </TouchableOpacity>
        </Surface>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(66, 64, 225, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontSize: 20,
    color: COLORS.foreground,
    textAlign: "center",
  },
  description: {
    fontSize: 13.5,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  featuresList: {
    width: "100%",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginVertical: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12.5,
    color: COLORS.foreground,
    flex: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    marginTop: 6,
  },
  actionBtnText: {
    fontSize: 14,
    color: COLORS.primaryForeground,
  },
});
