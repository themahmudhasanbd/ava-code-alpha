import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Check, Search, X } from "lucide-react-native";
import { useTheme } from "@/theme/colors";
import { font } from "@/theme/fonts";

export interface OptionPickerItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
}

interface OptionPickerProps {
  open: boolean;
  title: string;
  options: OptionPickerItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * Shared bottom-sheet option picker (M5).
 * One primitive for model picking, sandbox picking, schedule presets, etc.
 * — replaces ad-hoc chips / Alert.alert / duplicated picker UIs over time.
 */
export function OptionPicker({
  open,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = "Search…",
}: OptionPickerProps) {
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const slideAnim = useRef(new Animated.Value(320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 280,
          mass: 0.8,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 320,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => setMounted(false));
    }
  }, [open, fadeAnim, slideAnim]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: isDark
                ? "rgba(0, 0, 0, 0.70)"
                : "rgba(15, 23, 42, 0.45)",
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

              <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.foreground }, font("bold")]}>
                  {title}
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <X size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {searchable && (
                <View style={[styles.searchRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Search size={15} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }, font("regular")]}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                  />
                </View>
              )}

              <FlatList
                data={filtered}
                keyExtractor={(o) => o.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isSel = item.id === selectedId;
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.row,
                        {
                          backgroundColor: isSel ? `${colors.primary}14` : colors.secondary,
                          borderColor: isSel ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      {Icon && (
                        <View style={[styles.iconBox, { backgroundColor: `${item.iconColor ?? colors.primary}1A` }]}>
                          <Icon size={18} color={item.iconColor ?? colors.primary} />
                        </View>
                      )}
                      <View style={styles.textCol}>
                        <Text
                          style={[
                            styles.rowTitle,
                            { color: isSel ? colors.primary : colors.foreground },
                            font("semibold"),
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.description ? (
                          <Text style={[styles.rowDesc, { color: colors.mutedForeground }, font("regular")]}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      {isSel && (
                        <View style={[styles.check, { backgroundColor: colors.primary }]}>
                          <Check size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }, font("regular")]}>
                    No options match.
                  </Text>
                }
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 16,
    maxHeight: "75%",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingTop: 12,
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 24,
  },
});
