import * as React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

interface DrawerContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DrawerContext = React.createContext<DrawerContextType>({
  open: false,
  setOpen: () => {},
});

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Drawer({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DrawerContext.Provider value={{ open, setOpen }}>
      {children}
    </DrawerContext.Provider>
  );
}

export interface DrawerTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function DrawerTrigger({ children }: DrawerTriggerProps) {
  const { setOpen } = React.useContext(DrawerContext);

  if (React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      onPress: (e: any) => {
        (children.props as any).onPress?.(e);
        setOpen(true);
      },
    });
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen(true)}>
      {children}
    </TouchableOpacity>
  );
}

export function DrawerClose({ children }: { children: React.ReactNode }) {
  const { setOpen } = React.useContext(DrawerContext);

  if (React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      onPress: (e: any) => {
        (children.props as any).onPress?.(e);
        setOpen(false);
      },
    });
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen(false)}>
      {children}
    </TouchableOpacity>
  );
}

export function DrawerPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DrawerOverlay({ style }: { style?: StyleProp<ViewStyle> }) {
  const { setOpen } = React.useContext(DrawerContext);
  return (
    <TouchableWithoutFeedback onPress={() => setOpen(false)}>
      <View style={[styles.overlay, style]} />
    </TouchableWithoutFeedback>
  );
}

export interface DrawerContentProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function DrawerContent({ style, children }: DrawerContentProps) {
  const { open, setOpen } = React.useContext(DrawerContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.drawerBox, style]}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function DrawerHeader({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function DrawerFooter({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function DrawerTitle({ style, children }: { style?: StyleProp<TextStyle>; children: React.ReactNode }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function DrawerDescription({ style, children }: { style?: StyleProp<TextStyle>; children: React.ReactNode }) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  drawerBox: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.mutedForeground,
    opacity: 0.3,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    gap: 4,
    marginBottom: 16,
  },
  footer: {
    gap: 8,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
});
