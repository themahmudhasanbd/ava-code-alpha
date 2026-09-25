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
import * as Haptics from "expo-haptics";
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const auth = await verifyLogin(server, username, password);
      signIn(auth);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        msg === "Failed to fetch" || msg.includes("Network")
          ? "Could not reach the server"
          : msg
      );
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppGlow style={styles.glowContainer}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.avoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Surface style={styles.card}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logo}
                resizeMode="cover"
              />

              <Text style={styles.title}>Sign in to {APP.name}</Text>
              <Text style={styles.subtitle}>Use your server login.</Text>

              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <Label>Server</Label>
                  <Input
                    value={server}
                    onChangeText={setServer}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="https://ava.example.com"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Label>Username</Label>
                  <Input
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="username"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Label>Password</Label>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="••••••••"
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                  variant="default"
                  loading={busy}
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                >
                  Sign in
                </Button>
              </View>

              <Text style={styles.versionText}>v{APP.version}</Text>
            </Surface>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    padding: 24,
    borderRadius: 22,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.destructive,
    marginTop: 2,
  },
  submitBtn: {
    height: 42,
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginTop: 24,
  },
});
