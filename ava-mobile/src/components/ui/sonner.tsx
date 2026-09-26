import * as React from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

type ToastType = "default" | "success" | "error" | "info";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

type Listener = (toasts: ToastMessage[]) => void;

let listeners: Listener[] = [];
let memoryToasts: ToastMessage[] = [];

const notify = () => {
  listeners.forEach((l) => l([...memoryToasts]));
};

export const toast = (title: string, options?: { description?: string }) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = {
    id,
    title,
    description: options?.description,
    type: "default",
  };
  memoryToasts = [newToast, ...memoryToasts.slice(0, 3)];
  notify();
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notify();
  }, 3500);
};

toast.success = (title: string, options?: { description?: string }) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = {
    id,
    title,
    description: options?.description,
    type: "success",
  };
  memoryToasts = [newToast, ...memoryToasts.slice(0, 3)];
  notify();
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notify();
  }, 3500);
};

toast.error = (title: string, options?: { description?: string }) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = {
    id,
    title,
    description: options?.description,
    type: "error",
  };
  memoryToasts = [newToast, ...memoryToasts.slice(0, 3)];
  notify();
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notify();
  }, 3500);
};

toast.info = (title: string, options?: { description?: string }) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = {
    id,
    title,
    description: options?.description,
    type: "info",
  };
  memoryToasts = [newToast, ...memoryToasts.slice(0, 3)];
  notify();
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    notify();
  }, 3500);
};

export function Toaster({ style }: { style?: StyleProp<ViewStyle> }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.container, style]}>
      {toasts.map((t) => (
        <View key={t.id} style={styles.toastCard}>
          <View style={styles.iconBox}>
            {t.type === "success" && <CheckCircle2 size={18} color="#22C55E" />}
            {t.type === "error" && <AlertCircle size={18} color={COLORS.destructive} />}
            {t.type === "info" && <Info size={18} color={COLORS.primary} />}
          </View>
          <View style={styles.textBox}>
            <Text style={styles.title}>{t.title}</Text>
            {t.description ? (
              <Text style={styles.description}>{t.description}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBox: {
    marginRight: 10,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  description: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
});
