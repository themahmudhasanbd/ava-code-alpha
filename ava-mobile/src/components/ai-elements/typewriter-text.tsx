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
import { type ColorTokens } from "@/theme/colors";
import { useStyles, useTheme } from "@/theme/theme-context";
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
  cursorColor,
  cursorChar = "▊",
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  const resolvedCursorColor = cursorColor ?? colors.primary;
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
            { color: resolvedCursorColor, opacity: cursorOpacity },
          ]}
        >
          {` ${cursorChar}`}
        </Animated.Text>
      ) : null}
    </Text>
  );
}

export function TypingBlinker({
  color,
  char = "▊",
}: {
  color?: string;
  char?: string;
}) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const styles = useStyles(createStyles);
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
        { color: resolvedColor, opacity: cursorOpacity },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

function createStyles(c: ColorTokens) {
  return StyleSheet.create({
    baseText: {
      fontSize: 15,
      color: c.foreground,
      lineHeight: 23,
    },
    cursor: {
      fontSize: 15,
      lineHeight: 21,
      includeFontPadding: false,
    },
  });
}
