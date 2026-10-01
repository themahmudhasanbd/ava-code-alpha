import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  Platform,
} from "react-native";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface Props {
  text: string;
  isStreaming?: boolean;
  style?: StyleProp<TextStyle>;
  cursorColor?: string;
  cursorChar?: string;
}

export function TypewriterText({
  text,
  isStreaming = false,
  style,
  cursorColor = COLORS.primary,
  cursorChar = "▊",
}: Props) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isStreaming) {
      cursorOpacity.setValue(0);
      return;
    }

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(cursorOpacity, {
          toValue: 0.1,
          duration: 380,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );

    blink.start();
    return () => blink.stop();
  }, [isStreaming, cursorOpacity]);

  return (
    <Text style={[styles.baseText, font("regular"), style]}>
      {text}
      {isStreaming ? (
        <Animated.Text
          style={[
            styles.cursor,
            mono("bold"),
            { color: cursorColor, opacity: cursorOpacity },
          ]}
        >
          {` ${cursorChar}`}
        </Animated.Text>
      ) : null}
    </Text>
  );
}

export function TypingBlinker({
  color = COLORS.primary,
  char = "▊",
}: {
  color?: string;
  char?: string;
}) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(cursorOpacity, {
          toValue: 0.1,
          duration: 400,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [cursorOpacity]);

  return (
    <Animated.Text
      style={[
        styles.cursor,
        mono("bold"),
        { color, opacity: cursorOpacity },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  baseText: {
    fontSize: 15,
    color: COLORS.foreground,
    lineHeight: 23,
  },
  cursor: {
    fontSize: 15,
    lineHeight: 21,
    includeFontPadding: false,
  },
});
