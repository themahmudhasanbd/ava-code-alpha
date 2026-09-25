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
import { Button, type ButtonProps } from "@/components/ui/button";

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType>({
  open: false,
  setOpen: () => {},
});

export interface AlertDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: AlertDialogProps) {
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
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function AlertDialogTrigger({ children }: AlertDialogTriggerProps) {
  const { setOpen } = React.useContext(AlertDialogContext);

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

export interface AlertDialogContentProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AlertDialogContent({ style, children }: AlertDialogContentProps) {
  const { open, setOpen } = React.useContext(AlertDialogContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={[styles.content, style]}>{children}</View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

export interface AlertDialogHeaderProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AlertDialogHeader({ style, children }: AlertDialogHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export interface AlertDialogFooterProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AlertDialogFooter({ style, children }: AlertDialogFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export interface AlertDialogTitleProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertDialogTitle({ style, children }: AlertDialogTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export interface AlertDialogDescriptionProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertDialogDescription({
  style,
  children,
}: AlertDialogDescriptionProps) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

export interface AlertDialogActionProps extends ButtonProps {
  onPress?: (e: any) => void;
}

export function AlertDialogAction({
  onPress,
  children,
  ...props
}: AlertDialogActionProps) {
  const { setOpen } = React.useContext(AlertDialogContext);

  return (
    <Button
      variant="default"
      onPress={(e) => {
        onPress?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export interface AlertDialogCancelProps extends ButtonProps {
  onPress?: (e: any) => void;
}

export function AlertDialogCancel({
  onPress,
  children,
  variant = "outline",
  ...props
}: AlertDialogCancelProps) {
  const { setOpen } = React.useContext(AlertDialogContext);

  return (
    <Button
      variant={variant}
      onPress={(e) => {
        onPress?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
