import * as React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

interface SheetContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType>({
  open: false,
  setOpen: () => {},
});

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: SheetProps) {
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
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { setOpen } = React.useContext(SheetContext);

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

export function SheetClose({ children }: { children: React.ReactNode }) {
  const { setOpen } = React.useContext(SheetContext);

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

export function SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SheetOverlay({ style }: { style?: StyleProp<ViewStyle> }) {
  const { setOpen } = React.useContext(SheetContext);
  return (
    <TouchableWithoutFeedback onPress={() => setOpen(false)}>
      <View style={[styles.backdrop, style]} />
    </TouchableWithoutFeedback>
  );
}

export interface SheetContentProps {
  side?: "top" | "bottom" | "left" | "right";
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function SheetContent({
  side = "bottom",
  style,
  children,
}: SheetContentProps) {
  const { open, setOpen } = React.useContext(SheetContext);

  const containerAlignment =
    side === "left"
      ? styles.alignLeft
      : side === "right"
      ? styles.alignRight
      : side === "top"
      ? styles.alignTop
      : styles.alignBottom;

  const contentShape =
    side === "left"
      ? styles.sheetLeft
      : side === "right"
      ? styles.sheetRight
      : side === "top"
      ? styles.sheetTop
      : styles.sheetBottom;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <View style={[styles.backdrop, containerAlignment]}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheetBase, contentShape, style]}>
          <View style={styles.handle} />
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setOpen(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={COLORS.mutedForeground} />
          </TouchableOpacity>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function SheetHeader({
  title,
  description,
  onClose,
  style,
  children,
}: {
  title?: string;
  description?: string;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { setOpen } = React.useContext(SheetContext);
  const handleClose = onClose || (() => setOpen(false));

  if (children) {
    return <View style={[styles.header, style]}>{children}</View>;
  }

  return (
    <View style={[styles.header, style]}>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function SheetFooter({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function SheetTitle({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function SheetDescription({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.60)",
  },
  alignLeft: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
  alignRight: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  alignTop: {
    justifyContent: "flex-start",
  },
  alignBottom: {
    justifyContent: "flex-end",
  },
  sheetBase: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    position: "relative",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.mutedForeground,
    opacity: 0.25,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetLeft: {
    width: "88%",
    maxWidth: 360,
    height: "100%",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderLeftWidth: 0,
  },
  sheetRight: {
    width: "88%",
    maxWidth: 360,
    height: "100%",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderRightWidth: 0,
  },
  sheetBottom: {
    width: "100%",
    maxHeight: "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 0,
    paddingBottom: 36,
  },
  sheetTop: {
    width: "100%",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopWidth: 0,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
    zIndex: 10,
  },
  header: {
    marginBottom: 12,
    gap: 2,
    paddingRight: 32,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
});
