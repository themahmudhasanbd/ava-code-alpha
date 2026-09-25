import * as React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { Minus } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

interface OTPContextType {
  value: string;
  onChange: (val: string) => void;
  maxLength: number;
  focusedIndex: number;
}

const OTPContext = React.createContext<OTPContextType>({
  value: "",
  onChange: () => {},
  maxLength: 6,
  focusedIndex: -1,
});

export interface InputOTPProps {
  value?: string;
  onChangeText?: (text: string) => void;
  maxLength?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function InputOTP({
  value = "",
  onChangeText,
  maxLength = 6,
  disabled = false,
  style,
  children,
}: InputOTPProps) {
  const inputRef = React.useRef<TextInput>(null);
  const [focused, setFocused] = React.useState(false);

  return (
    <OTPContext.Provider
      value={{
        value,
        onChange: (text) => onChangeText?.(text.slice(0, maxLength)),
        maxLength,
        focusedIndex: focused ? value.length : -1,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[styles.container, style]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(t) => onChangeText?.(t.slice(0, maxLength))}
          maxLength={maxLength}
          keyboardType="number-pad"
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.hiddenInput}
        />
        {children}
      </TouchableOpacity>
    </OTPContext.Provider>
  );
}

export function InputOTPGroup({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function InputOTPSlot({
  index,
  style,
}: {
  index: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { value, focusedIndex } = React.useContext(OTPContext);
  const char = value[index] || "";
  const isFocused = focusedIndex === index || (index === value.length && focusedIndex >= 0);

  return (
    <View
      style={[
        styles.slot,
        isFocused && styles.focusedSlot,
        style,
      ]}
    >
      <Text style={styles.slotText}>{char}</Text>
    </View>
  );
}

export function InputOTPSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.separator, style]}>
      <Minus size={14} color={COLORS.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  slot: {
    width: 38,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.input,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  focusedSlot: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  slotText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  separator: {
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
