import * as React from "react";
import {
  Modal,
  Platform,
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
  side?: "top" | "bottom" | "left" | "right" | "center";
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
      : side === "center"
      ? styles.alignCenter
      : styles.alignBottom;

  const contentShape =
    side === "left"
      ? styles.sheetLeft
      : side === "right"
      ? styles.sheetRight
      : side === "top"
      ? styles.sheetTop
      : side === "center"
      ? styles.sheetCenter
      : styles.sheetBottom;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <View style={[styles.backdrop, containerAlignment]}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheetBase, contentShape, style]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setOpen(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={15} color={COLORS.mutedForeground} />
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
    backgroundColor: "transparent",
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
    alignItems: "center",
  },
  alignCenter: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  alignBottom: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheetBase: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderWidth: 1.2,
    borderColor: "rgba(0, 0, 0, 0.08)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
    position: "relative",
  },
  sheetLeft: {
    width: "88%",
    maxWidth: 340,
    height: "100%",
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderLeftWidth: 0,
  },
  sheetRight: {
    width: "88%",
    maxWidth: 340,
    height: "100%",
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    borderRightWidth: 0,
  },
  sheetBottom: {
    width: 326,
    maxWidth: "92%",
    maxHeight: "80%",
    borderRadius: 22,
    marginBottom: Platform.OS === "ios" ? 24 : 16,
    alignSelf: "center",
  },
  sheetCenter: {
    width: 326,
    maxWidth: "92%",
    maxHeight: "80%",
    borderRadius: 22,
    alignSelf: "center",
  },
  sheetTop: {
    width: 326,
    maxWidth: "92%",
    borderRadius: 22,
    marginTop: Platform.OS === "ios" ? 44 : 20,
    alignSelf: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    zIndex: 10,
  },
  header: {
    marginBottom: 10,
    gap: 2,
    paddingRight: 32,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
});
