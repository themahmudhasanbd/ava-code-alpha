import * as React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { COLORS } from "@/theme/colors";

interface RadioGroupContextType {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextType>({
  value: undefined,
  onValueChange: () => {},
  disabled: false,
});

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  style,
  children,
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (val: string) => {
    if (disabled) return;
    if (!isControlled) setUncontrolledValue(val);
    onValueChange?.(val);
  };

  return (
    <RadioGroupContext.Provider
      value={{
        value: activeValue,
        onValueChange: handleValueChange,
        disabled,
      }}
    >
      <View style={[styles.group, style]}>{children}</View>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps {
  value: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RadioGroupItem({
  value,
  disabled: itemDisabled,
  style,
}: RadioGroupItemProps) {
  const { value: activeValue, onValueChange, disabled: groupDisabled } =
    React.useContext(RadioGroupContext);
  const disabled = groupDisabled || itemDisabled;
  const isSelected = activeValue === value;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onValueChange(value)}
      style={[
        styles.item,
        isSelected && styles.selectedItem,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isSelected ? <View style={styles.dot} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  item: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  selectedItem: {
    borderColor: COLORS.primary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
