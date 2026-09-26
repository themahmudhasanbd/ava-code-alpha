import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { PanelLeft } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

interface SidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
  toggleSidebar: () => {},
  isMobile: true,
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (val: boolean) => {
    if (!isControlled) setUncontrolledOpen(val);
    onOpenChange?.(val);
  };

  const toggleSidebar = () => setOpen(!open);

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, toggleSidebar, isMobile: true }}
    >
      <View style={styles.provider}>{children}</View>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const { open } = useSidebar();
  if (!open) return null;

  return <View style={[styles.sidebar, style]}>{children}</View>;
}

export function SidebarTrigger({ style }: { style?: StyleProp<ViewStyle> }) {
  const { toggleSidebar } = useSidebar();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={toggleSidebar}
      style={[styles.trigger, style]}
    >
      <PanelLeft size={18} color={COLORS.foreground} />
    </TouchableOpacity>
  );
}

export function SidebarHeader({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function SidebarFooter({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function SidebarContent({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <ScrollView style={[styles.content, style]}>{children}</ScrollView>;
}

export function SidebarGroup({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function SidebarGroupLabel({ style, children }: { style?: StyleProp<TextStyle>; children: React.ReactNode }) {
  return <Text style={[styles.groupLabel, style]}>{children}</Text>;
}

export function SidebarGroupContent({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={style}>{children}</View>;
}

export function SidebarMenu({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.menu, style]}>{children}</View>;
}

export function SidebarMenuItem({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.menuItem, style]}>{children}</View>;
}

export interface SidebarMenuButtonProps {
  isActive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function SidebarMenuButton({
  isActive = false,
  onPress,
  style,
  textStyle,
  children,
}: SidebarMenuButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.menuButton,
        isActive && styles.activeMenuButton,
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.menuButtonText, isActive && styles.activeMenuButtonText, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function SidebarSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.separator, style]} />;
}

export function SidebarRail() {
  return null;
}

export function SidebarInset({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.inset, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 260,
    backgroundColor: COLORS.background,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    padding: 12,
  },
  trigger: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingBottom: 12,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  content: {
    flex: 1,
  },
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  menu: {
    gap: 2,
  },
  menuItem: {},
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 6,
  },
  activeMenuButton: {
    backgroundColor: COLORS.secondary,
  },
  menuButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  activeMenuButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  inset: {
    flex: 1,
  },
});
