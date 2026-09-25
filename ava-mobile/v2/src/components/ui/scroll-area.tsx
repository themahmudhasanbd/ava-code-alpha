import * as React from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export interface ScrollAreaProps extends ScrollViewProps {
  orientation?: "vertical" | "horizontal";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function ScrollArea({
  orientation = "vertical",
  style,
  children,
  ...props
}: ScrollAreaProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <ScrollView
      horizontal={isHorizontal}
      showsVerticalScrollIndicator={!isHorizontal}
      showsHorizontalScrollIndicator={isHorizontal}
      style={style}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function ScrollBar() {
  return null;
}
