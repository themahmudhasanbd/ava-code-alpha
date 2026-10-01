import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Check, ShieldAlert, X } from "lucide-react-native";
import { useTheme } from "@/theme/colors";
import { font } from "@/theme/fonts";
import type { PendingApproval } from "@/core/types";

/** Friendly labels per approval method. */
function methodLabel(method: string): string {
  switch (method) {
    case "item/commandExecution/requestApproval":
      return "Command approval";
    case "item/fileChange/requestApproval":
      return "File change approval";
    case "item/permissions/requestApproval":
      return "Permission request";
    case "mcpServer/elicitation/request":
      return "MCP server request";
    default:
      return "Approval requested";
  }
}

interface ApprovalCardProps {
  approval: PendingApproval;
  onRespond: (id: string, approved: boolean) => void;
}

/**
 * Sticky approval card shown above the composer while a server approval
 * is pending. Allow/Deny send the structured protocol response
 * (see answerApproval in core/api/chat).
 */
export function ApprovalCard({ approval, onRespond }: ApprovalCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityRole="alert"
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconChip,
            { backgroundColor: colors.warning + "14", borderColor: colors.warning + "33" },
          ]}
        >
          <ShieldAlert size={14} color={colors.warning} />
        </View>
        <Text style={[styles.label, font("semibold"), { color: colors.warning }]}>
          {methodLabel(approval.method)}
        </Text>
      </View>
      <Text
        style={[styles.title, font("semibold"), { color: colors.foreground }]}
        numberOfLines={3}
      >
        {approval.title}
      </Text>
      {approval.detail ? (
        <Text
          style={[styles.detail, font("regular"), { color: colors.mutedForeground }]}
          numberOfLines={6}
        >
          {approval.detail}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { borderColor: colors.destructive }]}
          onPress={() => onRespond(approval.id, false)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Deny"
        >
          <X size={14} color={colors.destructive} />
          <Text style={[styles.denyText, font("semibold"), { color: colors.destructive }]}>
            Deny
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.success, borderColor: colors.success },
          ]}
          onPress={() => onRespond(approval.id, true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Allow"
        >
          <Check size={14} color={colors.primaryForeground} />
          <Text
            style={[styles.allowText, font("semibold"), { color: colors.primaryForeground }]}
          >
            Allow
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
  },
  detail: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  denyText: {
    fontSize: 13,
  },
  allowText: {
    fontSize: 13,
  },
});
