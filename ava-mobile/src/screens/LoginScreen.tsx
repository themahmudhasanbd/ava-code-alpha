import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppGlow, Button, Input, Label, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { verifyLogin } from "@/core/auth";
import { useAva } from "@/state/ava-provider";
import { COLORS } from "@/theme/colors";

export function LoginScreen() {
  const { signIn } = useAva();
  const [server, setServer] = useState<string>(APP.defaultServerUrl);
  const [username, setUsername] = useState<string>(APP.defaultUsername);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!password) {
      setError("Password is required");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const auth = await verifyLogin(server, username, password);
      signIn(auth);
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        msg === "Failed to fetch" || msg.includes("Network")
          ? "Could not reach the server"
          : msg
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppGlow style={styles.glowContainer}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.avoidingView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentWrapper}>
              <Surface style={styles.cardSurface}>
                {/* Logo & Header */}
                <View style={styles.headerGroup}>
                  <Image
                    source={require("../../assets/icon.png")}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.appNameText}>{APP.name}</Text>
                  <Text style={styles.taglineText}>{APP.tagline}</Text>
                </View>

                {/* Form Fields */}
                <View style={styles.formGroup}>
                  <View style={styles.fieldItem}>
                    <Label style={styles.fieldLabel}>Server URL</Label>
                    <Input
                      value={server}
                      onChangeText={setServer}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="https://..."
                    />
                  </View>

                  <View style={styles.fieldItem}>
                    <Label style={styles.fieldLabel}>Username</Label>
                    <Input
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="admin"
                    />
                  </View>

                  <View style={styles.fieldItem}>
                    <Label style={styles.fieldLabel}>Password</Label>
                    <Input
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholder="••••••••"
                    />
                  </View>

                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : null}

                  <Button
                    variant="default"
                    size="lg"
                    loading={busy}
                    disabled={busy}
                    onPress={handleSubmit}
                    style={styles.submitBtn}
                  >
                    Connect
                  </Button>
                </View>

                <Text style={styles.footerVersionText}>v{APP.version}</Text>
              </Surface>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppGlow>
  );
}

const styles = StyleSheet.create({
  glowContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  avoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  contentWrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  cardSurface: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerGroup: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: 12,
  },
  appNameText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
    letterSpacing: -0.4,
  },
  taglineText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 4,
    textAlign: "center",
  },
  formGroup: {
    gap: 16,
  },
  fieldItem: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.destructive,
    textAlign: "center",
    marginTop: -4,
  },
  submitBtn: {
    marginTop: 8,
    height: 42,
    borderRadius: 12,
  },
  footerVersionText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 24,
    opacity: 0.7,
  },
});
