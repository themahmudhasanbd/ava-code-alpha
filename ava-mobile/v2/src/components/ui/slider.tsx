import * as React from "react";
import {
  View,
  PanResponder,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  type LayoutChangeEvent,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onValueChange,
  style,
}: SliderProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const widthRef = React.useRef(0);
  const leftRef = React.useRef(0);

  const clampValue = React.useCallback(
    (val: number) => {
      let rounded = Math.round((val - min) / step) * step + min;
      return Math.min(Math.max(min, rounded), max);
    },
    [min, max, step]
  );

  const updateFromPosition = React.useCallback(
    (pageX: number) => {
      if (widthRef.current <= 0 || disabled) return;
      const relativeX = Math.min(Math.max(0, pageX - leftRef.current), widthRef.current);
      const ratio = relativeX / widthRef.current;
      const rawValue = min + ratio * (max - min);
      const nextValue = clampValue(rawValue);

      if (!isControlled) setUncontrolledValue(nextValue);
      onValueChange?.(nextValue);
    },
    [disabled, isControlled, min, max, clampValue, onValueChange]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          updateFromPosition(evt.nativeEvent.pageX);
        },
        onPanResponderMove: (evt) => {
          updateFromPosition(evt.nativeEvent.pageX);
        },
      }),
    [disabled, updateFromPosition]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    (e.target as any)?.measure?.((_x: number, _y: number, _w: number, _h: number, pageX: number) => {
      leftRef.current = pageX;
    });
  };

  const percentage = Math.min(Math.max(0, ((activeValue - min) / (max - min)) * 100), 100);

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.range, { width: `${percentage}%` }]} />
      </View>
      <View
        style={[
          styles.thumb,
          { left: `${percentage}%`, transform: [{ translateX: -10 }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    width: "100%",
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 6,
    width: "100%",
    borderRadius: 3,
    backgroundColor: "rgba(66, 64, 225, 0.2)",
    overflow: "hidden",
  },
  range: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
