import React, { type ReactNode } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Menu } from "lucide-react-native";
import { AppGlow, GlassIconButton, StatusDot, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { COLORS } from "@/theme/colors";

export function AppShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigation = useNavigation();
  const { status } = useAva();

  return (
    <AppGlow style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Floating Glass Header */}
        <Surface style={styles.headerSurface}>
          <View style={styles.headerLeft}>
            <GlassIconButton
              icon={Menu}
              size={18}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            />
            <View style={styles.headerTextGroup}>
              <View style={styles.headerBrandRow}>
                <Text style={styles.headerBrandText}>{APP.name}</Text>
                <StatusDot status={status} size={7} />
              </View>
              {title ? (
                <Text style={styles.headerTitleText} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.headerRight}>{actions}</View>
        </Surface>

        {/* Main Body */}
        <View style={styles.contentBody}>{children}</View>
      </SafeAreaView>
    </AppGlow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerSurface: {
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
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBrandText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  headerTitleText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contentBody: {
    flex: 1,
  },
});
