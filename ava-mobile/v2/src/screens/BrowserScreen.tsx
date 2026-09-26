import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Globe,
  Menu,
  RotateCw,
  Search,
  X,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import { GlassIconButton, Surface } from "@/components/kit";
import { APP } from "@/config/app";
import { COLORS } from "@/theme/colors";
import { font } from "@/theme/fonts";

function normalize(input: string) {
  const t = input.trim();
  if (!t) return "https://google.com";

  // If query has spaces or no dot and not localhost, search on Google
  if (/\s/.test(t) || (!t.includes(".") && !t.startsWith("http://") && !t.startsWith("https://") && !t.startsWith("localhost"))) {
    return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
  }

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (/\s/.test(u.hostname)) {
        return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
      }
      return t;
    } catch {
      return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
    }
  }

  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\d+\.\d+\.\d+\.\d+)(:\d+)?(\/.*)?$/i.test(t)) {
    return `http://${t}`;
  }

  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/.*)?$/i.test(t)) {
    return `https://${t}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}

interface BrowserScreenProps {
  route?: {
    params?: {
      initialUrl?: string;
    };
  };
}

export function BrowserScreen({ route }: BrowserScreenProps = {}) {
  const navigation = useNavigation<any>();
  const initialUrl = route?.params?.initialUrl;
  const startUrl = initialUrl ? normalize(initialUrl) : APP.defaultBrowserUrl;
  const [address, setAddress] = useState<string>(startUrl);
  const [url, setUrl] = useState<string>(startUrl);
  const [canGoBackWebView, setCanGoBackWebView] = useState(false);
  const webViewRef = useRef<any>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (initialUrl) {
      const next = normalize(initialUrl);
      setAddress(next);
      setUrl(next);
      setReloadKey((k) => k + 1);
    }
  }, [initialUrl]);

  const handleBack = useCallback(() => {
    if (canGoBackWebView && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    if (navigation?.canGoBack()) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [canGoBackWebView, navigation]);

  useEffect(() => {
    const onBackPress = () => handleBack();
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const handleGo = () => {
    const next = normalize(address);
    if (next) {
      setAddress(next);
      setUrl(next);
      setReloadKey((k) => k + 1);
    }
  };

  const handleSearchGoogle = () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(address)}`;
    setAddress(searchUrl);
    setUrl(searchUrl);
    setReloadKey((k) => k + 1);
  };

  // Dedicated Customized Omnibar Header for Browser
  const customBrowserHeader = (
    <Surface style={styles.customHeaderSurface}>
      <View style={styles.headerLeft}>
        {(canGoBackWebView || navigation.canGoBack()) && (
          <GlassIconButton
            icon={ChevronLeft}
            size={18}
            onPress={handleBack}
          />
        )}
        <GlassIconButton
          icon={Menu}
          size={18}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <View style={styles.omnibarBox}>
          <Globe size={14} color={COLORS.primary} />
          <TextInput
            style={styles.urlInput}
            value={address}
            onChangeText={setAddress}
            onSubmitEditing={handleGo}
            placeholder="Search or enter web URL…"
            placeholderTextColor={COLORS.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {address ? (
            <GlassIconButton
              icon={X}
              size={13}
              onPress={() => setAddress("")}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.headerRight}>
        <GlassIconButton icon={ArrowRight} size={16} onPress={handleGo} />
        <GlassIconButton
          icon={RotateCw}
          size={16}
          onPress={() => setReloadKey((k) => k + 1)}
        />
      </View>
    </Surface>
  );

  return (
    <AppShell customHeader={customBrowserHeader}>
      <View style={styles.container}>
        <Surface style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            key={reloadKey}
            source={{ uri: url }}
            onNavigationStateChange={(navState) => setCanGoBackWebView(navState.canGoBack)}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            renderError={(_errorDomain, errorCode, errorDesc) => (
              <View style={styles.errorCard}>
                <AlertCircle size={36} color={COLORS.destructive} />
                <Text style={[styles.errorTitle, font("semibold")]}>
                  Webpage not available
                </Text>
                <Text style={[styles.errorSubtitle, font("regular")]}>
                  {errorDesc || `Error code: ${errorCode}`}
                </Text>
                <View style={styles.errorBtnRow}>
                  <TouchableOpacity
                    style={styles.errorRetryBtn}
                    onPress={() => setReloadKey((k) => k + 1)}
                    activeOpacity={0.7}
                  >
                    <RotateCw size={14} color={COLORS.foreground} />
                    <Text style={[styles.errorRetryText, font("medium")]}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.errorSearchBtn}
                    onPress={handleSearchGoogle}
                    activeOpacity={0.7}
                  >
                    <Search size={14} color="#FFFFFF" />
                    <Text style={[styles.errorSearchText, font("medium")]}>
                      Search Google
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  },
  customHeaderSurface: {
    marginHorizontal: 12,
    marginTop: Platform.OS === "android" ? 8 : 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    height: 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  omnibarBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 38,
    gap: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  webviewContainer: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.card,
    gap: 10,
  },
  errorTitle: {
    fontSize: 16,
    color: COLORS.foreground,
    marginTop: 6,
  },
  errorSubtitle: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
    textAlign: "center",
    maxWidth: 280,
  },
  errorBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  errorRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  errorRetryText: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  errorSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  errorSearchText: {
    fontSize: 12.5,
    color: "#FFFFFF",
  },
});
