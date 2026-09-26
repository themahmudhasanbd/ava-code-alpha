import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ size?: number; color?: string }>;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  config,
  style,
  children,
}: {
  config: ChartConfig;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <View style={[styles.container, style]}>{children}</View>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.tooltip, style]}>{children}</View>;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  const { config } = useChart();
  if (!active && !payload?.length) return null;

  return (
    <View style={styles.tooltipCard}>
      {label ? <Text style={styles.tooltipLabel}>{label}</Text> : null}
      {payload?.map((item, idx) => {
        const itemConfig = config[item.name];
        const color = item.color || itemConfig?.color || COLORS.primary;
        return (
          <View key={idx} style={styles.tooltipRow}>
            <View style={[styles.indicator, { backgroundColor: color }]} />
            <Text style={styles.tooltipItemName}>
              {itemConfig?.label || item.name}:
            </Text>
            <Text style={styles.tooltipItemValue}>{item.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ChartLegend({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.legend, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "center",
    alignItems: "center",
  },
  tooltip: {
    padding: 4,
  },
  tooltipCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 2,
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipItemName: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  tooltipItemValue: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
});
