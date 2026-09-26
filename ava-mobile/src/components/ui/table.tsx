import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface TableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Table({ style, children }: TableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, style]}>{children}</View>
    </ScrollView>
  );
}

export function TableHeader({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function TableBody({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.body, style]}>{children}</View>;
}

export function TableFooter({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function TableRow({
  style,
  selected = false,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.row,
        selected && styles.selectedRow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function TableHead({
  style,
  textStyle,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.cell, styles.headCell, style]}>
      {typeof children === "string" ? (
        <Text style={[styles.headText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function TableCell({
  style,
  textStyle,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.cell, style]}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text style={[styles.cellText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function TableCaption({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  table: {
    minWidth: "100%",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  body: {},
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedRow: {
    backgroundColor: COLORS.muted,
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  headCell: {
    height: 40,
  },
  headText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textAlign: "left",
  },
  cellText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  caption: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
});
