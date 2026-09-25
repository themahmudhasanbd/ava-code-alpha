import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeDrawerContent } from "@/components/layout/NativeDrawerContent";
import { useAva } from "@/state/ava-provider";
import { LoginScreen } from "@/screens/LoginScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { FilesScreen } from "@/screens/FilesScreen";
import { TerminalScreen } from "@/screens/TerminalScreen";
import { BrowserScreen } from "@/screens/BrowserScreen";
import { DesktopScreen } from "@/screens/DesktopScreen";
import { ModelsScreen } from "@/screens/ModelsScreen";
import { SystemScreen } from "@/screens/SystemScreen";
import {
  McpScreen,
  TasksScreen,
  MediaScreen,
  SettingsScreen,
  ProfileScreen,
} from "@/screens/OtherScreens";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function MainDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <NativeDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: "85%", maxWidth: 360 },
      }}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
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
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const { auth, ready } = useAva();

  if (!ready) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!auth ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainDrawerNavigator} />
      )}
    </Stack.Navigator>
  );
}
