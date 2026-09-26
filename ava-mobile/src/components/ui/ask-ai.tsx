import React, { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { ArrowUpRight, Check, Copy } from "lucide-react-native";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { COLORS } from "@/theme/colors";

export type MascotGaze = "up" | "down" | "left" | "right";

export function AIMascot({
  awake = false,
  gaze,
  size = "default",
  brand = false,
  style,
}: {
  awake?: boolean;
  gaze?: MascotGaze;
  size?: "default" | "compact";
  brand?: boolean;
  style?: ViewStyle;
}) {
  const dim = brand ? 22 : size === "compact" ? 28 : 40;
  const eyeScaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(eyeScaleY, {
          toValue: 0.12,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(eyeScaleY, {
          toValue: 1,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start();
    }, 6500);

    return () => clearInterval(blinkInterval);
  }, [eyeScaleY]);

  const eyeShiftX =
    gaze === "left" ? -2 : gaze === "right" ? 2 : 0;
  const eyeShiftY =
    gaze === "up" ? -2 : gaze === "down" ? 2 : 0;

  return (
    <View
      style={[
        styles.mascotBlob,
        {
          width: dim,
          height: dim,
          borderRadius: dim * 0.46,
        },
        awake && styles.mascotAwake,
        style,
      ]}
    >
      <View
        style={[
          styles.mascotFace,
          {
            gap: brand ? 3 : size === "compact" ? 4 : 6,
            transform: [{ translateX: eyeShiftX }, { translateY: eyeShiftY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.mascotEye,
            {
              width: brand ? 2.5 : size === "compact" ? 3 : 4,
              height: brand ? 5 : size === "compact" ? 7 : 10,
              transform: [{ scaleY: eyeScaleY }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mascotEye,
            {
              width: brand ? 2.5 : size === "compact" ? 3 : 4,
              height: brand ? 5 : size === "compact" ? 7 : 10,
              transform: [{ scaleY: eyeScaleY }],
            },
          ]}
        />
      </View>
    </View>
  );
}

export type AIProvider = {
  id: string;
  name: string;
  url: string;
  promptParam?: string;
  brandColor: string;
};

export const defaultAIProviders: readonly AIProvider[] = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", promptParam: "q", brandColor: COLORS.foreground },
  { id: "claude", name: "Claude", url: "https://claude.ai/new", promptParam: "q", brandColor: COLORS.primary },
  { id: "grok", name: "Grok", url: "https://grok.com/", promptParam: "q", brandColor: COLORS.foreground },
  { id: "perplexity", name: "Perplexity", url: "https://www.perplexity.ai/search", promptParam: "q", brandColor: COLORS.success },
];

export function AskAI({
  prompt,
  title = "Ask an AI about me",
  description = "A fresh perspective, from your favorite assistant.",
  providers = defaultAIProviders,
}: {
  prompt: string;
  title?: string;
  description?: string;
  providers?: readonly AIProvider[];
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openProvider = (p: AIProvider) => {
    const url = new URL(p.url);
    if (p.promptParam) url.searchParams.set(p.promptParam, prompt);
    Linking.openURL(url.toString());
  };

  return (
    <Popover>
      <PopoverTrigger>
        <View style={styles.askAiTrigger}>
          <Text style={styles.askAiTriggerText}>Ask an AI</Text>
          <AIMascot size="compact" />
        </View>
      </PopoverTrigger>
      <PopoverContent style={styles.popoverCard}>
        <Text style={styles.popoverTitle}>{title}</Text>
        <Text style={styles.popoverDesc}>{description}</Text>
        <View style={styles.providersRow}>
          {providers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.providerBtn}
              onPress={() => openProvider(p)}
            >
              <ArrowUpRight size={14} color={p.brandColor} />
              <Text style={styles.providerName} numberOfLines={1}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={handleCopy}
          style={{ marginTop: 8 }}
        >
          {copied ? <Check size={14} color={COLORS.success} /> : <Copy size={14} />}
          <Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>
            {copied ? "Copied prompt" : "Copy prompt"}
          </Text>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const styles = StyleSheet.create({
  mascotBlob: {
    backgroundColor: COLORS.mascot,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mascot,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  mascotAwake: {
    transform: [{ scale: 1.05 }, { rotate: "6deg" }],
  },
  mascotFace: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  mascotEye: {
    backgroundColor: COLORS.mascotForeground,
    borderRadius: 999,
  },
  askAiTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  askAiTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  popoverCard: {
    gap: 8,
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  popoverDesc: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  providersRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  providerBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    padding: 4,
    gap: 2,
  },
  providerName: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.foreground,
  },
});
