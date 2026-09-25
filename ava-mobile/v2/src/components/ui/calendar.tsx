import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  style?: StyleProp<ViewStyle>;
}

export function Calendar({ selected, onSelect, style }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date()
  );

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString("default", { month: "long" });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isSameDay = (d1?: Date, d2?: Date) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const weekHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <View style={[styles.calendar, style]}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={prevMonth} style={styles.navBtn}>
          <ChevronLeft size={16} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {monthName} {year}
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={nextMonth} style={styles.navBtn}>
          <ChevronRight size={16} color={COLORS.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {weekHeaders.map((day, idx) => (
          <Text key={idx} style={styles.weekHeader}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((day, idx) => {
          if (day === null) {
            return <View key={idx} style={styles.dayCell} />;
          }

          const thisDate = new Date(year, month, day);
          const isSelected = isSameDay(selected, thisDate);

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => onSelect?.(thisDate)}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDayCell,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    width: 280,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekHeader: {
    width: 32,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    borderRadius: 6,
  },
  selectedDayCell: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  selectedDayText: {
    color: COLORS.primaryForeground,
    fontWeight: "600",
  },
});
