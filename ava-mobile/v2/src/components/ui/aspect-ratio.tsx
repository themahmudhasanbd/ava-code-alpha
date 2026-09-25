import * as React from "react";
import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";

export interface AspectRatioProps extends ViewProps {
  ratio?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AspectRatio({ ratio = 1, style, children, ...props }: AspectRatioProps) {
  return (
    <View style={[{ aspectRatio: ratio, width: "100%" }, style]} {...props}>
      {children}
    </View>
  );
}
