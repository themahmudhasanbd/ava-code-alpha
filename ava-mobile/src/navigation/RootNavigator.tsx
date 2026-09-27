import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppDrawer } from "@/components/layout/AppDrawer";
import { useTheme } from "@/theme/colors";
import { useAva } from "@/state/ava-provider";
import { LoginScreen } from "@/screens/LoginScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { SessionScreen } from "@/screens/SessionScreen";
import { TimelineScreen } from "@/screens/TimelineScreen";
import { FilesScreen } from "@/screens/FilesScreen";
import { TerminalScreen } from "@/screens/TerminalScreen";
import { BrowserScreen } from "@/screens/BrowserScreen";
import { DesktopScreen } from "@/screens/DesktopScreen";
import { ModelsScreen } from "@/screens/ModelsScreen";
import { SystemScreen } from "@/screens/SystemScreen";
import { McpScreen } from "@/screens/McpScreen";
import { TasksScreen } from "@/screens/TasksScreen";
import { MediaScreen } from "@/screens/MediaScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { NotificationSettingsScreen } from "@/screens/NotificationSettingsScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { AppearanceSettingsScreen } from "@/screens/AppearanceSettingsScreen";
import { WorkspaceSettingsScreen } from "@/screens/WorkspaceSettingsScreen";
import { ServerSettingsScreen } from "@/screens/ServerSettingsScreen";
import { PermissionsSettingsScreen } from "@/screens/PermissionsSettingsScreen";
import { StorageSettingsScreen } from "@/screens/StorageSettingsScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function MainDrawerNavigator() {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      defaultStatus="closed"
      backBehavior="history"
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(0, 0, 0, 0.40)",
        swipeEnabled: true,
        swipeEdgeWidth: 100,
        drawerHideStatusBarOnOpen: false,
        drawerStyle: {
          width: "82%",
          maxWidth: 340,
          backgroundColor: colors.card,
        },
      }}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="Session" component={SessionScreen} />
      <Drawer.Screen name="Files" component={FilesScreen} />
      <Drawer.Screen name="Terminal" component={TerminalScreen} />
      <Drawer.Screen name="Browser" component={BrowserScreen} />
      <Drawer.Screen name="Desktop" component={DesktopScreen} />
      <Drawer.Screen name="Models" component={ModelsScreen} />
      <Drawer.Screen name="System" component={SystemScreen} />
      <Drawer.Screen name="Mcp" component={McpScreen} />
      <Drawer.Screen name="Tasks" component={TasksScreen} />
      <Drawer.Screen name="Media" component={MediaScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const { auth, ready } = useAva();

  if (!ready) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {!auth ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainDrawerNavigator} />
          <Stack.Screen
            name="Timeline"
            component={TimelineScreen}
            options={{ animation: "slide_from_right" }}
          />
          {/* Settings Sub-screens */}
          <Stack.Screen
            name="AppearanceSettings"
            component={AppearanceSettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="WorkspaceSettings"
            component={WorkspaceSettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="ServerSettings"
            component={ServerSettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="PermissionsSettings"
            component={PermissionsSettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="StorageSettings"
            component={StorageSettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
