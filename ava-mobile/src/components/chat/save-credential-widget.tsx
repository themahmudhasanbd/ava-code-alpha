import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Check, Eye, EyeOff, Globe, Lock, ShieldCheck } from "lucide-react-native";
import { useTheme } from "@/theme/colors";
import { font } from "@/theme/fonts";

export interface MobileCredentialSpec {
  site_url: string;
  domain?: string;
  username: string;
  secret?: string;
  password?: string;
  auth_type?: "password" | "bearer_token" | "api_key";
  notes?: string;
}

export function MobileSaveCredentialWidget({ spec }: { spec: MobileCredentialSpec }) {
  const { colors } = useTheme();
  const domain = spec.domain || extractDomain(spec.site_url);
  const initialSecret = spec.secret || spec.password || "";
  const authType = spec.auth_type || "password";

  const [username, setUsername] = useState(spec.username || "");
  const [secret, setSecret] = useState(initialSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("https://ava.mahmudhasan.pro/api/browser/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_url: spec.site_url,
          domain,
          auth_type: authType,
          username,
          secret,
          notes: spec.notes || "Saved from AvA Mobile chat",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("saved");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
      <View style={[styles.header, { backgroundColor: colors.primary + "15", borderBottomColor: colors.border + "30" }]}>
        <View style={[styles.iconChip, { backgroundColor: colors.primary + "20" }]}>
          <Lock size={14} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, font("semibold"), { color: colors.foreground }]}>
              Save Authentication
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.primary + "25" }]}>
              <ShieldCheck size={11} color={colors.primary} />
              <Text style={[styles.badgeText, font("medium"), { color: colors.primary }]}>
                AES-256 Vault
              </Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            AvA Browser Agent auto-fills this site on login
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.domainRow}>
          <Globe size={13} color={colors.mutedForeground} />
          <Text style={[styles.domainText, font("medium"), { color: colors.foreground }]}>
            {domain}
          </Text>
        </View>

        <View style={styles.inputsRow}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
              USERNAME / EMAIL
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background + "80" }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
              PASSWORD
            </Text>
            <View style={[styles.passwordWrapper, { borderColor: colors.border, backgroundColor: colors.background + "80" }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.foreground }]}
                value={secret}
                onChangeText={setSecret}
                secureTextEntry={!showSecret}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
              />
              <TouchableOpacity
                onPress={() => setShowSecret(!showSecret)}
                style={styles.eyeBtn}
              >
                {showSecret ? (
                  <EyeOff size={14} color={colors.mutedForeground} />
                ) : (
                  <Eye size={14} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          {status === "saved" ? (
            <View style={[styles.savedBadge, { backgroundColor: "#10b98125", borderColor: "#10b98150" }]}>
              <Check size={13} color="#10b981" />
              <Text style={[styles.savedText, font("medium")]}>Saved to Vault</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setDismissed(true)}
                style={styles.dismissBtn}
              >
                <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Not Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={status === "saving" || !username || !secret}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: status === "saving" ? 0.6 : 1 }]}
              >
                <Lock size={12} color="#ffffff" />
                <Text style={[styles.saveText, font("semibold")]}>
                  {status === "saving" ? "Saving..." : "Save to Vault"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function extractDomain(url?: string): string {
  if (!url) return "";
  const clean = url.replace(/^https?:\/\//, "").split("/")[0] || "";
  return clean.split(":")[0];
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
  },
  body: {
    padding: 12,
    gap: 10,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  domainText: {
    fontSize: 12,
  },
  inputsRow: {
    gap: 8,
  },
  inputContainer: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 12,
  },
  eyeBtn: {
    padding: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dismissText: {
    fontSize: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveText: {
    fontSize: 12,
    color: "#ffffff",
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  savedText: {
    fontSize: 12,
    color: "#10b981",
  },
});
