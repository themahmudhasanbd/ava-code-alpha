import React, { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Check, ChevronDown, ChevronRight, Wrench, X } from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/kit";
import { CodeBlock } from "./code-block";
import { COLORS } from "@/theme/colors";

export type ToolState =
  | "running"
  | "completed"
  | "error"
  | "input-available"
  | "output-available"
  | "output-error";

export function Tool({
  toolName,
  state = "completed",
  input,
  output,
  errorText,
  style,
}: {
  toolName: string;
  state?: ToolState;
  input?: any;
  output?: any;
  errorText?: string;
  style?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);

  const toggle = () => {

    setOpen(!open);
  };

  const isRunning = state === "running" || state === "input-available";
  const isError = state === "error" || state === "output-error" || !!errorText;

  return (
    <Surface style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.75}
      >
        <View style={styles.titleRow}>
          <Wrench size={14} color={COLORS.primary} />
          <Text style={styles.toolNameText} numberOfLines={1}>
            {toolName}
          </Text>
          <Badge
            variant={isError ? "destructive" : "secondary"}
            style={styles.badge}
          >
            {isRunning
              ? "Running"
              : isError
              ? "Error"
              : "Completed"}
          </Badge>
        </View>

        {isRunning ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : open ? (
          <ChevronDown size={16} color={COLORS.mutedForeground} />
        ) : (
          <ChevronRight size={16} color={COLORS.mutedForeground} />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          {input != null && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PARAMETERS</Text>
              <CodeBlock
                code={
                  typeof input === "string"
                    ? input
                    : JSON.stringify(input, null, 2)
                }
                language="json"
              />
            </View>
          )}

          {(output != null || errorText) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {errorText ? "ERROR" : "RESULT"}
              </Text>
              {errorText ? (
                <Text style={styles.errorOutput}>{errorText}</Text>
              ) : null}
              {output != null && (
                <CodeBlock
                  code={
                    typeof output === "string"
                      ? output
                      : JSON.stringify(output, null, 2)
                  }
                  language="json"
                />
              )}
            </View>
          )}
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  toolNameText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  section: {
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  errorOutput: {
    fontSize: 12,
    color: COLORS.destructive,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
});
