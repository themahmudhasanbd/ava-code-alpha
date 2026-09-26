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
  LogOut,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { PageIntro, StatusDot, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useSessions } from "@/state/queries";
import {
  readUserProfile,
  writeUserProfile,
  type PersonalityPreset,
  type PresetOption,
  type UserProfile,
} from "@/core/api/profile";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  username: "",
  avatar: null,
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

export function ProfileScreen() {
  const { rpc, auth, status, signOut } = useAva();
  const qc = useQueryClient();
  const { data: sessions = [] } = useSessions();
  const projectsCount = new Set(sessions.map((s) => s.directory)).size;

  const [form, setForm] = useState<UserProfile>(DEFAULT_PROFILE);
  const [newRule, setNewRule] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

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
      setForm({
        ...DEFAULT_PROFILE,
        ...profileQuery.data.profile,
        userRules: profileQuery.data.profile.userRules || [],
      });
    } else if (auth?.username) {
      setForm((prev) => ({
        ...prev,
        username: prev.username || auth.username || "",
      }));
    }
  }, [profileQuery.data, auth]);

  const saveMutation = useMutation({
    mutationFn: async (updated: UserProfile) => {
      if (!rpc) throw new Error("RPC client not connected");
      return writeUserProfile(rpc, updated, true);
    },
    onSuccess: (res) => {
      if (res?.profile) {
        setForm((prev) => ({ ...prev, ...res.profile }));
      }
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    },
    onError: (err: any) => {
      Alert.alert("Failed to save profile", err?.message || "Unknown error");
    },
  });

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photos to upload an avatar.");
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
      Alert.alert("Error picking image", e?.message || "Failed to select image");
    }
  };

  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatar: null }));
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
    saveMutation.mutate(form);
  };

  const handleSignOut = () => {
    signOut();
  };

  const presets: PresetOption[] = profileQuery.data?.presets || [
    { id: "autonomous", name: "Autonomous", description: "Independent & thorough" },
    { id: "friendly", name: "Friendly", description: "Approachable & conversational" },
    { id: "pragmatic", name: "Pragmatic", description: "Direct & focused on shipping" },
    { id: "socratic", name: "Socratic", description: "Guides with questions" },
    { id: "custom", name: "Custom", description: "Define your own persona" },
  ];

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
            description="Manage your developer identity and customize AvA's behavior."
          />

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
                >
                  <Camera size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.heroMeta}>
                <Text style={[styles.heroName, font("bold", displayName)]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.heroRole, font("regular")]}>
                  {form.roleOrTitle || "Software Engineer"}
                </Text>
                <View style={styles.serverRow}>
                  <StatusDot status={status} size={6} />
                  <Text style={[styles.serverUrl, mono("regular")]} numberOfLines={1}>
                    @{form.username || auth?.username || "user"} · {auth?.serverUrl?.replace(/^https?:\/\//, "")}
                  </Text>
                </View>
              </View>
            </View>
          </Surface>

          <View style={styles.statsGrid}>
            <Surface style={styles.statCard}>
              <Text style={[styles.statLabel, font("medium")]}>Sessions</Text>
              <Text style={[styles.statVal, mono("bold")]}>{sessions.length}</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <Text style={[styles.statLabel, font("medium")]}>Projects</Text>
              <Text style={[styles.statVal, mono("bold")]}>{projectsCount}</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <Text style={[styles.statLabel, font("medium")]}>Active Rules</Text>
              <Text style={[styles.statVal, mono("bold")]}>{form.userRules.length}</Text>
            </Surface>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>About You</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Full Name</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="e.g. Mahmud Hasan"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.name || ""}
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
                  value={form.username || ""}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, username: v }))}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>Role / Title</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="e.g. Lead Systems Architect"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.roleOrTitle || ""}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, roleOrTitle: v }))}
                />
              </View>

              {form.avatar ? (
                <>
                  <View style={styles.fieldDivider} />
                  <TouchableOpacity
                    style={styles.removeAvatarRow}
                    onPress={handleRemoveAvatar}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={COLORS.destructive} />
                    <Text style={[styles.removeAvatarText, font("medium")]}>
                      Remove custom avatar
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </Surface>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={15} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>AI Persona & Tone</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>AI Name</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="e.g. AvA"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.aiName || ""}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, aiName: v }))}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, font("medium")]}>AI Role</Text>
                <TextInput
                  style={[styles.input, font("regular")]}
                  placeholder="e.g. Autonomous Pair Programmer"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={form.aiRole || ""}
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
                        onPress={() => setForm((prev) => ({ ...prev, personalityPreset: preset.id }))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            font("medium"),
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {form.personalityPreset === "custom" && (
                <>
                  <View style={styles.fieldDivider} />
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, font("medium")]}>Custom Persona Description</Text>
                    <TextInput
                      style={[styles.multilineInput, font("regular")]}
                      placeholder="Describe how AvA should behave, communicate, and think..."
                      placeholderTextColor={COLORS.mutedForeground}
                      value={form.customPersonality || ""}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, customPersonality: v }))}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}
            </Surface>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, font("semibold")]}>Engineering Rules & Context</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchTitle, font("semibold")]}>
                    Inject Profile into Sessions
                  </Text>
                  <Text style={[styles.switchSubtitle, font("regular")]}>
                    When active, your instructions and rules guide every agent turn.
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
                  value={form.customInstructions || ""}
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
                    >
                      <Trash2 size={14} color={COLORS.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addRuleRow}>
                  <TextInput
                    style={[styles.addRuleInput, font("regular")]}
                    placeholder="Add a new engineering constraint..."
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

          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
              activeOpacity={0.8}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : savedSuccess ? (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={[styles.saveBtnText, font("semibold")]}>Saved to Server</Text>
                </>
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" />
                  <Text style={[styles.saveBtnText, font("semibold")]}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <LogOut size={16} color={COLORS.destructive} />
              <Text style={[styles.signOutText, font("medium")]}>Sign Out</Text>
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
  },
  profileHeroCard: {
    padding: 16,
    marginBottom: 16,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + "22",
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 20,
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
  },
  heroName: {
    fontSize: 19,
    color: COLORS.foreground,
  },
  heroRole: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  serverUrl: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 18,
    color: COLORS.foreground,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  card: {
    padding: 14,
  },
  fieldGroup: {
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 6,
  },
  input: {
    height: 42,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.foreground,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 80,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.foreground,
    fontSize: 13,
    textAlignVertical: "top",
  },
  fieldDivider: {
    height: 1,
    backgroundColor: COLORS.border + "66",
    marginVertical: 8,
  },
  removeAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  removeAvatarText: {
    fontSize: 12,
    color: COLORS.destructive,
  },
  presetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  presetChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
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
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 10,
  },
  ruleText: {
    flex: 1,
    fontSize: 12,
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
    height: 38,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    color: COLORS.foreground,
    fontSize: 12,
  },
  addRuleBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  saveBtn: {
    height: 46,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  signOutSection: {
    marginBottom: 24,
  },
  signOutBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.destructive + "66",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.destructive + "10",
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
