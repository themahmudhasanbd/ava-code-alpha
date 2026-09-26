import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  FolderGit2,
  Layers,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageIntro, SkeletonRows, StatusDot, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import {
  readUserProfile,
  sanitizeProfile,
  writeUserProfile,
  type PresetOption,
  type UserProfile,
} from "@/core/api/profile";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  username: "",
  avatar: "",
  roleOrTitle: "",
  aiName: "AvA",
  aiRole: "Autonomous Pair Programmer",
  personalityPreset: "autonomous",
  customPersonality: "",
  characteristics: "",
  customInstructions: "",
  userRules: [],
  enabled: true,
};

const DEFAULT_PRESETS: PresetOption[] = [
  {
    id: "autonomous",
    name: "Autonomous",
    description: "Proactive, high-ownership partner. Anticipates pitfalls and executes to completion.",
  },
  {
    id: "friendly",
    name: "Friendly",
    description: "Warm, empathetic and encouraging companion.",
  },
  {
    id: "pragmatic",
    name: "Pragmatic",
    description: "Direct, concise, and focused on code and shipping.",
  },
  {
    id: "socratic",
    name: "Socratic",
    description: "Guides through questions and foundational principles.",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Define your own specific persona and reasoning style.",
  },
];

export function ProfileScreen() {
  const { rpc, auth, status, signOut } = useAva();
  const qc = useQueryClient();
  const { data: sessions = [] } = useSessions();
  const projectsCount = new Set(sessions.map((s) => s.directory)).size;

  const [form, setForm] = useState<UserProfile>(DEFAULT_PROFILE);
  const [newRule, setNewRule] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      if (!rpc) throw new Error("RPC not connected");
      return readUserProfile(rpc);
    },
    enabled: !!rpc && status === "online",
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setForm(sanitizeProfile(profileQuery.data.profile));
    } else if (auth?.username) {
      setForm((prev) => ({
        ...prev,
        username: prev.username || auth.username || "",
      }));
    }
  }, [profileQuery.data, auth]);

  const saveMutation = useMutation({
    mutationFn: async (updated: UserProfile) => {
      if (!rpc) throw new Error("RPC client not connected to AvA server");
      return writeUserProfile(rpc, updated, true);
    },
    onSuccess: (res) => {
      setErrorMessage(null);
      if (res?.profile) {
        setForm(sanitizeProfile(res.profile));
      }
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2600);
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to save profile to server";
      setErrorMessage(msg);
      Alert.alert("Save Error", msg);
    },
  });

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access to choose an avatar.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]?.base64) {
        const mime = res.assets[0].mimeType || "image/jpeg";
        const dataUrl = `data:${mime};base64,${res.assets[0].base64}`;
        setForm((prev) => ({ ...prev, avatar: dataUrl }));
      }
    } catch (e: any) {
      Alert.alert("Image Error", e?.message || "Could not select image");
    }
  };

  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatar: "" }));
  };

  const handleAddRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      userRules: [...prev.userRules, trimmed],
    }));
    setNewRule("");
  };

  const handleRemoveRule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      userRules: prev.userRules.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    setErrorMessage(null);
    saveMutation.mutate(form);
  };

  const presets = profileQuery.data?.presets?.length
    ? profileQuery.data.presets
    : DEFAULT_PRESETS;

  const currentPresetInfo = presets.find((p) => p.id === form.personalityPreset);

  const displayName = form.name?.trim() || form.username?.trim() || auth?.username || "Developer";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <AppShell title="Profile">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PageIntro
            title="Profile & Persona"
            description="Manage your identity and customize AvA's behavior across sessions."
          />

          {/* ── 1. User Hero Card ── */}
          <Surface style={styles.profileHeroCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                {form.avatar ? (
                  <Image source={{ uri: form.avatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={[styles.avatarInitials, mono("bold")]}>{initials}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handlePickAvatar}
                  activeOpacity={0.8}
                  accessibilityLabel="Change avatar"
                >
                  <Camera size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.heroMeta}>
                <Text style={[styles.heroName, font("bold", displayName)]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.heroRole, font("medium")]} numberOfLines={1}>
                  {form.roleOrTitle || "Software Engineer / Architect"}
                </Text>
                <View style={styles.serverRow}>
                  <StatusDot status={status} size={7} />
                  <Text style={[styles.serverUrl, mono("regular")]} numberOfLines={1}>
                    @{form.username || auth?.username || "user"} · {auth?.serverUrl?.replace(/^https?:\/\//, "")}
                  </Text>
                </View>
              </View>
            </View>

            {form.avatar ? (
              <TouchableOpacity
                style={styles.removeAvatarRow}
                onPress={handleRemoveAvatar}
                activeOpacity={0.7}
              >
                <Trash2 size={13} color={COLORS.destructive} />
                <Text style={[styles.removeAvatarText, font("medium")]}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </Surface>

          {/* ── 2. Metric Grid ── */}
          <View style={styles.statsGrid}>
            <Surface style={styles.statCard}>
              <View style={styles.statIconBox}>
                <Layers size={14} color={COLORS.primary} />
              </View>
              <Text style={[styles.statVal, mono("bold")]}>{sessions.length}</Text>
              <Text style={[styles.statLabel, font("medium")]}>Sessions</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <View style={styles.statIconBox}>
                <FolderGit2 size={14} color={COLORS.primary} />
              </View>
              <Text style={[styles.statVal, mono("bold")]}>{projectsCount}</Text>
              <Text style={[styles.statLabel, font("medium")]}>Projects</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <View style={styles.statIconBox}>
                <Shield size={14} color={COLORS.primary} />
              </View>
              <Text style={[styles.statVal, mono("bold")]}>{form.userRules.length}</Text>
              <Text style={[styles.statLabel, font("medium")]}>Rules</Text>
            </Surface>
          </View>

          {/* ── 3. Developer Details ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>Developer Details</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Full Name</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="e.g. Mahmud Hasan"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.name}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, name: v }))}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Username</Text>
                <TextInput
                  style={[styles.input, mono("regular")]}
                  placeholder="e.g. mahmud"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.username}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, username: v }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Role / Title</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="e.g. Lead Full-Stack Architect"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.roleOrTitle}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, roleOrTitle: v }))}
                />
              </View>
            </Surface>
          </View>

          {/* ── 4. AI Persona & Tone ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>AI Persona & Tone</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>AI Name</Text>
                <TextInput
                  style={[styles.input, font("semibold")]}
                  placeholder="AvA"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.aiName}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, aiName: v }))}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>AI Role</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="Autonomous Pair Programmer"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.aiRole}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, aiRole: v }))}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Personality Preset</Text>
                <View style={styles.presetChips}>
                  {presets.map((preset) => {
                    const isSelected = form.personalityPreset === preset.id;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        onPress={() =>
                          setForm((prev) => ({
                            ...prev,
                            personalityPreset: preset.id,
                          }))
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            font("semibold"),
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {currentPresetInfo?.description ? (
                  <Text style={[styles.presetDesc, font("regular")]}>
                    {currentPresetInfo.description}
                  </Text>
                ) : null}
              </View>

              {form.personalityPreset === "custom" && (
                <>
                  <View style={styles.fieldDivider} />
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, font("medium")]}>Custom Persona Description</Text>
                    <TextInput
                      style={[styles.multilineInput, font("regular")]}
                      placeholder="Describe how AvA should behave, communicate, and solve problems..."
                      placeholderTextColor={COLORS.mutedForeground}
                      value={form.customPersonality}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, customPersonality: v }))}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}
            </Surface>
          </View>

          {/* ── 5. Engineering Context & Constraints ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>Engineering Rules & Context</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.switchTitle, font("semibold")]}>
                    Inject Profile into Agent Sessions
                  </Text>
                  <Text style={[styles.switchSubtitle, font("regular")]}>
                    When active, your instructions and rules automatically guide every agent turn.
                  </Text>
                </View>
                <Switch
                  value={form.enabled}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, enabled: val }))}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Custom Instructions</Text>
                <TextInput
                  style={[styles.multilineInput, font("regular")]}
                  placeholder="e.g. Always write typed Rust/TypeScript, prefer functional patterns, explain trade-offs concisely..."
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.customInstructions}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, customInstructions: v }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Engineering Guidelines / Rules</Text>
                {form.userRules.map((rule, idx) => (
                  <View key={idx} style={styles.ruleItem}>
                    <View style={styles.ruleBullet} />
                    <Text style={[styles.ruleText, font("regular")]}>{rule}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveRule(idx)}
                      style={styles.ruleDeleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete rule"
                    >
                      <Trash2 size={14} color={COLORS.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addRuleRow}>
                  <TextInput
                    style={[styles.addRuleInput, font("regular")]}
                    placeholder="Add a new engineering rule..."
                    placeholderTextColor={COLORS.mutedForeground}
                    value={newRule}
                    onChangeText={setNewRule}
                    onSubmitEditing={handleAddRule}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.addRuleBtn}
                    onPress={handleAddRule}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </Surface>
          </View>

          {/* ── 6. Save Action & Feedback ── */}
          {errorMessage ? (
            <Surface style={styles.errorBox}>
              <Text style={[styles.errorText, font("medium")]}>{errorMessage}</Text>
            </Surface>
          ) : null}

          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                saveMutation.isPending && styles.saveBtnDisabled,
                savedSuccess && styles.saveBtnSuccess,
              ]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
              activeOpacity={0.8}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : savedSuccess ? (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={[styles.saveBtnText, font("semibold")]}>Saved to AvA Server!</Text>
                </>
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" />
                  <Text style={[styles.saveBtnText, font("semibold")]}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── 7. Sign Out ── */}
          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={signOut}
              activeOpacity={0.8}
            >
              <LogOut size={16} color={COLORS.destructive} />
              <Text style={[styles.signOutText, font("semibold")]}>Sign Out of Server</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, font("regular")]}>
              {APP.name} v{APP.version} · {APP.tagline}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileHeroCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 16,
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 22,
    color: COLORS.primary,
  },
  cameraBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  heroMeta: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 18,
    color: COLORS.foreground,
  },
  heroRole: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  serverUrl: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  removeAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  removeAvatarText: {
    fontSize: 12,
    color: COLORS.destructive,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  statVal: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  fieldGroup: {
    paddingVertical: 2,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 6,
  },
  input: {
    height: 42,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: COLORS.foreground,
    fontSize: 13.5,
  },
  multilineInput: {
    minHeight: 84,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.foreground,
    fontSize: 13,
    textAlignVertical: "top",
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 4,
  },
  presetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 12,
    color: COLORS.foreground,
  },
  presetChipTextActive: {
    color: "#FFFFFF",
  },
  presetDesc: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 8,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  switchSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  ruleBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  ruleDeleteBtn: {
    padding: 4,
  },
  addRuleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  addRuleInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: COLORS.foreground,
    fontSize: 12.5,
  },
  addRuleBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    backgroundColor: "rgba(231, 0, 11, 0.10)",
    borderColor: COLORS.destructive,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.destructive,
    textAlign: "center",
  },
  actionsSection: {
    marginTop: 4,
  },
  saveBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnSuccess: {
    backgroundColor: COLORS.success,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  signOutSection: {
    marginTop: 4,
  },
  signOutBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(231, 0, 11, 0.35)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(231, 0, 11, 0.06)",
  },
  signOutText: {
    color: COLORS.destructive,
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
});
