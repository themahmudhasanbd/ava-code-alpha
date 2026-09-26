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

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType>({
  open: false,
  setOpen: () => {},
});

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps) {
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
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { setOpen } = React.useContext(DialogContext);

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

export function DialogClose({ children }: { children: React.ReactNode }) {
  const { setOpen } = React.useContext(DialogContext);

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

export function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DialogOverlay({ style }: { style?: StyleProp<ViewStyle> }) {
  const { setOpen } = React.useContext(DialogContext);
  return (
    <TouchableWithoutFeedback onPress={() => setOpen(false)}>
      <View style={[styles.backdrop, style]} />
    </TouchableWithoutFeedback>
  );
}

export function DialogContent({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { open, setOpen } = React.useContext(DialogContext);

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.dialogCard, style]}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={15} color={COLORS.mutedForeground} />
              </TouchableOpacity>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function DialogHeader({
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
  const { setOpen } = React.useContext(DialogContext);
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

export function DialogFooter({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function DialogTitle({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function DialogDescription({
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
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialogCard: {
    width: 326,
    maxWidth: "92%",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: "rgba(0, 0, 0, 0.08)",
    padding: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
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
    marginBottom: 12,
    gap: 2,
    paddingRight: 30,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
});
