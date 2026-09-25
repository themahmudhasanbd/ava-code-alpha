import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
import { ArrowRight, Globe, RotateCw } from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { GlassIconButton, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { COLORS } from "@/theme/colors";

function normalize(input: string) {
  const t = input.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(t)
    ? `http://${t}`
    : `https://${t}`;
}

export function BrowserScreen() {
  const [address, setAddress] = useState<string>(APP.defaultBrowserUrl);
  const [url, setUrl] = useState<string>(APP.defaultBrowserUrl);
  const [reloadKey, setReloadKey] = useState(0);

  const handleGo = () => {
    const next = normalize(address);
    if (next) {
      setAddress(next);
      setUrl(next);
      setReloadKey((k) => k + 1);
    }
  };

  return (
    <AppShell title="Browser">
      <View style={styles.container}>
        <Surface style={styles.urlBar}>
          <Globe size={16} color={COLORS.mutedForeground} style={{ marginLeft: 6 }} />
          <TextInput
            style={styles.urlInput}
            value={address}
            onChangeText={setAddress}
            onSubmitEditing={handleGo}
            placeholder="Enter a URL…"
            placeholderTextColor={COLORS.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <GlassIconButton icon={ArrowRight} size={16} onPress={handleGo} />
          <GlassIconButton
            icon={RotateCw}
            size={16}
            onPress={() => setReloadKey((k) => k + 1)}
          />
        </Surface>

        <Surface style={styles.webviewContainer}>
          <WebView
            key={reloadKey}
            source={{ uri: url }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
          />
        </Surface>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  urlBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 14,
    gap: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  webviewContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
