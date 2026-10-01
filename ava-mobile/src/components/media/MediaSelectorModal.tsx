import React, { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { BlurView } from "expo-blur";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  Paperclip,
  Server,
  UploadCloud,
  X,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { ServerMediaModal, type ServerSelectedMedia } from "./ServerMediaModal";

export interface SelectedMedia {
  id: string;
  name: string;
  uri?: string;
  remotePath?: string;
  kind: "image" | "video" | "audio" | "document" | "code" | "file";
  size?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (media: SelectedMedia) => void;
  serverDirectory?: string;
}

export function MediaSelectorModal({
  open,
  onClose,
  onSelect,
  serverDirectory = "/root/shared-media",
}: Props) {
  const { rpc } = useAva();
  const { colors, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [deviceSubView, setDeviceSubView] = useState(false);

  const isSmallMobile = windowWidth < 380;
  const isTabletOrWeb = windowWidth >= 640;
  const cardWidth = Math.min(windowWidth - (isSmallMobile ? 16 : 32), 480);

  const uploadFileToServer = async (
    localUri: string,
    fileName: string,
    kind: SelectedMedia["kind"]
  ): Promise<SelectedMedia | null> => {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const remotePath = `${serverDirectory.replace(/\/$/, "")}/${cleanFileName}`;

    // C1: never return a media entry for a file that was not uploaded.
    if (!rpc || rpc.status !== "online") {
      Alert.alert(
        "Upload failed",
        "You're offline — connect to the server to attach files."
      );
      return null;
    }

    try {
      setUploadStatus(`Uploading ${cleanFileName}…`);
      const localFile = new File(localUri);
      const base64 = await localFile.base64();
      await rpc.call("fs/writeFile", {
        path: remotePath,
        dataBase64: base64,
      });
    } catch (err: any) {
      console.warn("Upload to VPS error:", err);
      Alert.alert(
        "Upload failed",
        err?.message || `Could not upload "${cleanFileName}" to the server.`
      );
      return null;
    }

    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanFileName,
      uri: localUri,
      remotePath,
      kind,
    };
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        setUploading(true);
        const ext = doc.name.split(".").pop()?.toLowerCase() || "";
        let kind: SelectedMedia["kind"] = "document";
        if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) kind = "image";
        else if (["mp4", "mov", "webm"].includes(ext)) kind = "video";
        else if (["mp3", "wav", "m4a"].includes(ext)) kind = "audio";
        else if (["ts", "tsx", "js", "jsx", "py", "sh", "json"].includes(ext)) kind = "code";

        const media = await uploadFileToServer(doc.uri, doc.name, kind);
        setUploading(false);
        setUploadStatus(null);
        if (!media) return;
        onSelect(media);
        onClose();
      }
    } catch (e: any) {
      setUploading(false);
      setUploadStatus(null);
      Alert.alert("File Picker Error", e?.message || "Failed to pick file.");
    }
  };

  const pickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);
        const ext = asset.type === "video" ? "mp4" : "jpg";
        const kind = asset.type === "video" ? "video" : "image";
        const rawName = asset.fileName || `media_${Date.now()}.${ext}`;

        const media = await uploadFileToServer(asset.uri, rawName, kind);
        setUploading(false);
        setUploadStatus(null);
        if (!media) return;
        onSelect(media);
        onClose();
      }
    } catch (e: any) {
      setUploading(false);
      setUploadStatus(null);
      Alert.alert("Gallery Error", e?.message || "Failed to pick from gallery.");
    }
  };

  const pickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);
        const ext = asset.type === "video" ? "mp4" : "jpg";
        const kind = asset.type === "video" ? "video" : "image";
        const name = `camera_${Date.now()}.${ext}`;

        const media = await uploadFileToServer(asset.uri, name, kind);
        setUploading(false);
        setUploadStatus(null);
        if (!media) return;
        onSelect(media);
        onClose();
      }
    } catch (e: any) {
      setUploading(false);
      setUploadStatus(null);
      Alert.alert("Camera Error", e?.message || "Failed to capture photo.");
    }
  };

  // 1. Device: Pick Document or Media
  const handleSelectFromDevice = async () => {

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Choose Document / File", "Take Photo or Video"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickGallery();
          else if (buttonIndex === 2) pickDocument();
          else if (buttonIndex === 3) pickCamera();
        }
      );
    } else {
      // Bottom-sheet sub-view instead of Alert.alert (Android/web parity with iOS sheet)
      setDeviceSubView(true);
    }
  };

  const handleSelectFromServer = () => {
    setServerModalOpen(true);
  };

  const handleServerFileSelected = (media: ServerSelectedMedia) => {
    setServerModalOpen(false);
    onSelect({
      id: media.id,
      name: media.name,
      remotePath: media.remotePath,
      kind: media.kind,
      size: media.size,
    });
    onClose();
  };

  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const isVisible = open && !serverModalOpen;
  const [mounted, setMounted] = React.useState(isVisible);

  React.useEffect(() => {
    if (isVisible) {
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
      setDeviceSubView(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [isVisible, fadeAnim, slideAnim]);

  return (
    <>
      {mounted && (
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
                isTabletOrWeb && styles.backdropCentered,
                {
                  opacity: fadeAnim,
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                },
              ]}
            >
              <BlurView
                intensity={isDark ? 80 : 60}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
              <TouchableWithoutFeedback onPress={() => {}}>
                <Animated.View
                  style={[
                    styles.sheetCard,
                    isTabletOrWeb && styles.floatingCard,
                    {
                      width: isTabletOrWeb ? cardWidth : "100%",
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: colors.glassShadow,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                {/* Drag Handle */}
                {!isTabletOrWeb && <View style={[styles.handleBar, { backgroundColor: colors.border }]} />}

                {/* Header */}
                <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[
                        styles.headerIconBox,
                        {
                          backgroundColor: `${colors.primary}1A`,
                          borderColor: `${colors.primary}33`,
                        },
                      ]}
                    >
                      <Paperclip size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.foreground }, font("bold")]}>
                      Add files
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Upload Indicator if uploading */}
                {uploading && (
                  <View
                    style={[
                      styles.uploadingBox,
                      {
                        backgroundColor: `${colors.primary}14`,
                        borderColor: `${colors.primary}40`,
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.uploadingText, { color: colors.primary }, font("medium")]}>
                      {uploadStatus || "Uploading to VPS server…"}
                    </Text>
                  </View>
                )}

                {/* 2 Primary Options / Device source sub-view */}
                <View style={styles.optionsContainer}>
                  {deviceSubView && (
                    <TouchableOpacity
                      style={styles.backRow}
                      onPress={() => setDeviceSubView(false)}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={16} color={colors.mutedForeground} />
                      <Text
                        style={[styles.backText, { color: colors.mutedForeground }, font("medium")]}
                      >
                        Back
                      </Text>
                    </TouchableOpacity>
                  )}
                  {deviceSubView ? (
                    <>
                      {[
                        { icon: Images, color: colors.primary, title: "Photo / Video Library", sub: "Pick from your gallery", fn: pickGallery },
                        { icon: FileText, color: colors.primary, title: "Files & Documents", sub: "Pick any file or document", fn: pickDocument },
                        { icon: Camera, color: colors.warning, title: "Camera", sub: "Take a photo or video", fn: pickCamera },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.title}
                          style={[
                            styles.optionCard,
                            { backgroundColor: colors.secondary, borderColor: colors.border },
                          ]}
                          onPress={() => { setDeviceSubView(false); opt.fn(); }}
                          disabled={uploading}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.optionIconBox, { backgroundColor: `${opt.color}1A` }]}>
                            <opt.icon size={20} color={opt.color} />
                          </View>
                          <View style={styles.optionContent}>
                            <Text style={[styles.optionTitle, { color: colors.foreground }, font("semibold")]}>
                              {opt.title}
                            </Text>
                            <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }, font("regular")]}>
                              {opt.sub}
                            </Text>
                          </View>
                          <ChevronRight size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <>
                  {/* Option 1: Select from your device */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleSelectFromDevice}
                    disabled={uploading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: `${colors.primary}1A` }]}>
                      <UploadCloud size={20} color={colors.primary} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }, font("semibold")]}>
                        Select from your device
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }, font("regular")]}>
                        Upload images or documents from this device to server media library
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option 2: Select from the server */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleSelectFromServer}
                    disabled={uploading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: colors.success + "24" }]}>
                      <Server size={20} color={colors.success} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }, font("semibold")]}>
                        Select from the server
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }, font("regular")]}>
                        Browse server files & media library ({serverDirectory})
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                    </>
                  )}
                </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Dedicated Server Media Picker Modal */}
      <ServerMediaModal
        open={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
        onSelect={handleServerFileSelected}
        initialDirectory={serverDirectory}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropCentered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingCard: {
    borderRadius: 22,
    paddingTop: 16,
    paddingBottom: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  uploadingText: {
    fontSize: 12,
  },
  optionsContainer: {
    gap: 10,
    paddingVertical: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
  },
  optionSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  backText: {
    fontSize: 13,
  },
});
