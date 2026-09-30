import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Check, ShieldAlert, X } from "lucide-react-native";
import { COLORS } from "@/theme/colors";
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
  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.header}>
        <ShieldAlert size={15} color={COLORS.warning} />
        <Text style={[styles.label, font("semibold")]}>{methodLabel(approval.method)}</Text>
      </View>
      <Text style={[styles.title, font("semibold")]} numberOfLines={3}>
        {approval.title}
      </Text>
      {approval.detail ? (
        <Text style={[styles.detail, font("regular")]} numberOfLines={6}>
          {approval.detail}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.denyButton]}
          onPress={() => onRespond(approval.id, false)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Deny"
        >
          <X size={14} color={COLORS.destructive} />
          <Text style={[styles.denyText, font("semibold")]}>Deny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.allowButton]}
          onPress={() => onRespond(approval.id, true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Allow"
        >
          <Check size={14} color="#FFF" />
          <Text style={[styles.allowText, font("semibold")]}>Allow</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 11,
    color: COLORS.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  detail: {
    fontSize: 12,
    color: COLORS.mutedForeground,
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
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  denyButton: {
    backgroundColor: "transparent",
    borderColor: COLORS.destructive,
  },
  denyText: {
    fontSize: 13,
    color: COLORS.destructive,
  },
  allowButton: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  allowText: {
    fontSize: 13,
    color: "#FFF",
  },
});
