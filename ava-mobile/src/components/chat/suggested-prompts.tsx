import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowUpRight,
  Code2,
  Bug,
  Compass,
  Terminal,
  type LucideIcon,
} from "lucide-react-native";
import { AvaMascot } from "@/components/ui/ava-mascot";
import { COLORS } from "@/theme/colors";
import { font } from "@/theme/fonts";

export interface SuggestedPromptItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  prompt: string;
  autoSend?: boolean;
}

export const SUGGESTED_PROMPTS: SuggestedPromptItem[] = [
  {
    id: "feature",
    icon: Code2,
    iconColor: COLORS.primary,
    iconBg: COLORS.accent,
    title: "Build a feature",
    description: "Create a new screen, UI component, or API flow",
    prompt: "Create a new feature in this project: ",
    autoSend: false,
  },
  {
    id: "fix",
    icon: Bug,
    iconColor: COLORS.destructive,
    iconBg: COLORS.muted,
    title: "Fix an error",
    description: "Debug logs, solve runtime errors or broken UI",
    prompt: "Help me debug and fix an issue in this project: ",
    autoSend: false,
  },
  {
    id: "explain",
    icon: Compass,
    iconColor: COLORS.primary,
    iconBg: COLORS.accent,
    title: "Explain project",
    description: "Understand architecture, file tree, and state",
    prompt: "Analyze this workspace and give me a clear breakdown of the project architecture and main modules.",
    autoSend: true,
  },
  {
    id: "terminal",
    icon: Terminal,
    iconColor: COLORS.success,
    iconBg: COLORS.muted,
    title: "Check health",
    description: "Verify TypeScript types and project build status",
    prompt: "Run project health checks: check TypeScript types and verify if there are any build errors.",
    autoSend: true,
  },
];

interface SuggestedPromptCardsProps {
  onSelectPrompt: (prompt: string, autoSend?: boolean) => void;
}

export function SuggestedPromptCards({ onSelectPrompt }: SuggestedPromptCardsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.mascotGlow}>
          <AvaMascot size="lg" state="idle" gaze="center" />
        </View>
        <Text style={[styles.title, font("bold")]}>What do you want to build?</Text>
        <Text style={[styles.subtitle, font("regular")]}>
          Describe a feature, paste an error, or tap a starter workflow below.
        </Text>
      </View>

      <View style={styles.grid}>
        {SUGGESTED_PROMPTS.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => onSelectPrompt(item.prompt, item.autoSend)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                  <Icon size={16} color={item.iconColor} strokeWidth={2.2} />
                </View>
                <ArrowUpRight size={14} color={COLORS.mutedForeground} />
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, font("semibold")]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardDesc, font("regular")]} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  mascotGlow: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    color: COLORS.foreground,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 290,
    lineHeight: 18,
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 108,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 17,
  },
});
