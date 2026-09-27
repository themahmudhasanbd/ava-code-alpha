import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Check,
  Code2,
  Laptop,
  Moon,
  Paintbrush,
  Sparkles,
  Sun,
  Type,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, Surface } from "@/components/kit";
import { useTheme, type ThemeMode } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface ThemeOption {
  id: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "system",
    label: "System Match",
    description: "Follows your device OS appearance automatically",
    icon: Laptop,
  },
  {
    id: "dark",
    label: "Obsidian Dark",
    description: "Ultra clean deep obsidian palette, easy on eyes",
    icon: Moon,
  },
  {
    id: "light",
    label: "Alabaster Light",
    description: "High clarity crisp bright aesthetic with soft shadows",
    icon: Sun,
  },
];

export function AppearanceSettingsScreen() {
  const navigation = useNavigation<any>();
  const { theme, resolvedTheme, isDark, colors, setTheme } = useTheme();

  return (
    <AppShell
      title="Appearance & Theme"
      showBack
      onBack={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageIntro
          title="Theme & Appearance"
          description="Personalize how AvA Code looks and feels across mobile screens."
        />

        {/* ── Theme Mode Selection ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Paintbrush size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Color Theme
            </Text>
          </View>

          <View style={styles.cardsRow}>
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: colors.glassBg,
                      borderColor: isSelected ? colors.primary : colors.glassBorder,
                    },
                    isSelected && { borderWidth: 1.8 },
                  ]}
                  onPress={() => setTheme(opt.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.themeCardTop}>
                    <View
                      style={[
                        styles.themeIconBox,
                        {
                          backgroundColor: isSelected
                            ? `${colors.primary}20`
                            : colors.secondary,
                        },
                      ]}
                    >
                      <Icon
                        size={18}
                        color={isSelected ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                        <Check size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <Text style={[styles.themeCardTitle, { color: colors.foreground }, font("semibold")]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.themeCardDesc, { color: colors.mutedForeground }, font("regular")]}>
                    {opt.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Active Palette Preview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Live Palette Preview ({resolvedTheme.toUpperCase()})
            </Text>
          </View>

          <Surface style={[styles.previewCard, { borderColor: colors.glassBorder }]}>
            <View style={styles.paletteRow}>
              <View style={styles.swatchCol}>
                <View style={[styles.swatch, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} />
                <Text style={[styles.swatchLabel, { color: colors.mutedForeground }, mono("medium")]}>
                  Background
                </Text>
              </View>
              <View style={styles.swatchCol}>
                <View style={[styles.swatch, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} />
                <Text style={[styles.swatchLabel, { color: colors.mutedForeground }, mono("medium")]}>
                  Card Surface
                </Text>
              </View>
              <View style={styles.swatchCol}>
                <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
                <Text style={[styles.swatchLabel, { color: colors.mutedForeground }, mono("medium")]}>
                  Primary Brand
                </Text>
              </View>
              <View style={styles.swatchCol}>
                <View style={[styles.swatch, { backgroundColor: colors.success }]} />
                <Text style={[styles.swatchLabel, { color: colors.mutedForeground }, mono("medium")]}>
                  Success
                </Text>
              </View>
            </View>

            <View style={[styles.sampleButtonRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }]}>
              <View style={[styles.sampleBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.sampleBtnText, { color: colors.primaryForeground }, font("medium")]}>
                  Primary Action
                </Text>
              </View>
              <View style={[styles.sampleBtn, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.sampleBtnText, { color: colors.secondaryForeground }, font("medium")]}>
                  Secondary
                </Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* ── Typography & Monospace ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }, font("semibold")]}>
              Typography
            </Text>
          </View>

          <Surface style={[styles.typoCard, { borderColor: colors.glassBorder }]}>
            <View style={styles.typoRow}>
              <View style={styles.typoHeader}>
                <Text style={[styles.typoName, { color: colors.foreground }, font("semibold")]}>
                  Plus Jakarta Sans
                </Text>
                <Text style={[styles.typoBadge, { backgroundColor: colors.secondary, color: colors.mutedForeground }, font("medium")]}>
                  UI Heading & Body
                </Text>
              </View>
              <Text style={[styles.typoSample, { color: colors.foreground }, font("regular")]}>
                Autonomous intelligence for pair programming and deep systems engineering.
              </Text>
            </View>

            <View style={[styles.codeBox, { backgroundColor: colors.codeBg, borderColor: colors.codeBorder }]}>
              <View style={styles.codeHeader}>
                <Code2 size={13} color={colors.codeMuted} />
                <Text style={[styles.codeTitle, { color: colors.codeMuted }, mono("regular")]}>
                  JetBrains Mono
                </Text>
              </View>
              <Text style={[styles.codeSnippet, { color: colors.codeForeground }, mono("regular")]}>
                {`fn main() {\n    let ava = Agent::new("ava-rs");\n    ava.execute_turn().await?;\n}`}
              </Text>
            </View>
          </Surface>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 13.5 },
  cardsRow: { gap: 10 },
  themeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  themeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  themeCardTitle: { fontSize: 14 },
  themeCardDesc: { fontSize: 12, lineHeight: 17 },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  paletteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  swatchCol: {
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  swatchLabel: {
    fontSize: 9.5,
  },
  sampleButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  sampleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sampleBtnText: {
    fontSize: 12.5,
  },
  typoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  typoRow: { gap: 6 },
  typoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typoName: { fontSize: 14 },
  typoBadge: {
    fontSize: 10.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typoSample: { fontSize: 12.5, lineHeight: 18 },
  codeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  codeTitle: { fontSize: 11 },
  codeSnippet: { fontSize: 11.5, lineHeight: 18 },
});
