import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { LogOut } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, StatusDot, Surface, Button } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import { COLORS } from "@/theme/colors";

export function ProfileScreen() {
  const { auth, status, signOut } = useAva();
  const { data: sessions = [] } = useSessions();
  const projectsCount = new Set(sessions.map((s) => s.directory)).size;

  const handleSignOut = () => {
    signOut();
  };

  return (
    <AppShell title="Profile">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro title="Profile" />

        <Surface style={styles.profileCard}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.metaCol}>
            <Text style={styles.username}>{auth?.username ?? "—"}</Text>
            <View style={styles.serverRow}>
              <StatusDot status={status} size={6} />
              <Text style={styles.serverUrl} numberOfLines={1}>
                {auth?.serverUrl}
              </Text>
            </View>
          </View>
        </Surface>

        <View style={styles.statsGrid}>
          <Surface style={styles.statCard}>
            <Text style={styles.statLabel}>Sessions</Text>
            <Text style={styles.statVal}>{sessions.length}</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statLabel}>Projects</Text>
            <Text style={styles.statVal}>{projectsCount}</Text>
          </Surface>
        </View>

        <Button
          variant="secondary"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        >
          Sign out
        </Button>

        <Text style={styles.footerBrand}>
          {APP.name} v{APP.version} · {APP.tagline}
        </Text>
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
    gap: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  metaCol: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  serverUrl: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  statVal: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 4,
  },
  signOutBtn: {
    height: 44,
    borderRadius: 14,
  },
  footerBrand: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 8,
  },
});
