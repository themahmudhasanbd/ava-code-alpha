import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  Plug,
  RefreshCw,
  Wrench,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  EmptyState,
  GlassIconButton,
  PageIntro,
  SkeletonRows,
  Surface,
} from "@/components/kit";
import type { McpServer } from "@/core/types";
import { useMcpServers, useReloadMcp } from "@/state/queries";
import { COLORS } from "@/theme/colors";

function ServerCard({ server }: { server: McpServer }) {
  const [open, setOpen] = useState(false);

  return (
    <Surface style={styles.serverCard}>
      <TouchableOpacity
        style={styles.serverHeader}
        onPress={() => {
          setOpen(!open);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.serverIconBox}>
          <Plug size={18} color={COLORS.foreground} />
        </View>
        <View style={styles.serverMeta}>
          <Text style={styles.serverName} numberOfLines={1}>
            {server.name}
          </Text>
          <Text style={styles.serverToolsCount}>
            {server.tools.length} tools
          </Text>
        </View>
        <Badge variant="secondary">{server.status}</Badge>
        {open ? (
          <ChevronDown size={16} color={COLORS.mutedForeground} />
        ) : (
          <ChevronRight size={16} color={COLORS.mutedForeground} />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.toolsList}>
          {server.tools.map((t) => (
            <View key={t.name} style={styles.toolItem}>
              <Wrench size={14} color={COLORS.mutedForeground} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.toolName}>{t.name}</Text>
                {t.description ? (
                  <Text style={styles.toolDesc} numberOfLines={2}>
                    {t.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Surface>
  );
}

export function McpScreen() {
  const { data: servers = [], isLoading, error } = useMcpServers();
  const reload = useReloadMcp();

  return (
    <AppShell
      title="MCP servers"
      actions={
        <GlassIconButton
          icon={RefreshCw}
          size={18}
          onPress={() => reload.mutate()}
          disabled={reload.isPending}
        />
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="MCP servers"
          description="Tools your agent can use on the server."
        />

        {isLoading && <SkeletonRows count={4} />}

        {error && (
          <EmptyState
            icon={Plug}
            title="Could not load servers"
            description={(error as Error).message}
          />
        )}

        {!isLoading && servers.length === 0 && (
          <EmptyState icon={Plug} title="No MCP servers configured" />
        )}

        {servers.map((s) => (
          <ServerCard key={s.name} server={s} />
        ))}
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
  serverCard: {
    borderRadius: 16,
    padding: 6,
  },
  serverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  serverIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  serverMeta: {
    flex: 1,
  },
  serverName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  serverToolsCount: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  toolsList: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  toolName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  toolDesc: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
});
