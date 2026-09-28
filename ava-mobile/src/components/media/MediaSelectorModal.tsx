import React, { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { BlurView } from "expo-blur";
import {
  ChevronRight,
  Plus,
  Server,
  Smartphone,
  UploadCloud,
  X,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { COLORS, useTheme } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";
import { ServerMediaModal } from "./ServerMediaModal";

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
  const { isDark } = useTheme();

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const uploadFileToServer = async (
    localUri: string,
    fileName: string,
    kind: SelectedMedia["kind"]
  ): Promise<SelectedMedia> => {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const remotePath = `${serverDirectory.replace(/\/$/, "")}/${cleanFileName}`;

    if (rpc && rpc.status === "online") {
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
      }
    }

    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanFileName,
      uri: localUri,
      remotePath,
      kind,
    };
  };

  // 1. Device: Camera
  const handleCamera = async () => {
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
        onSelect(media);
        onClose();
      }
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Camera Error", e?.message || "Failed to capture photo.");
    }
  };

  // 2. Device: Photo & Video Library
  const handleGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Photo gallery permission is required."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);
        const ext = asset.uri.split(".").pop() || "jpg";
        const isVid =
          asset.type === "video" ||
          ["mp4", "mov", "webm"].includes(ext.toLowerCase());
        const kind = isVid ? "video" : "image";
        const name = asset.fileName || `media_${Date.now()}.${ext}`;

        const media = await uploadFileToServer(asset.uri, name, kind);
        setUploading(false);
        onSelect(media);
        onClose();
      }
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Gallery Error", e?.message || "Failed to pick from gallery.");
    }
  };

  // 3. Device: Document / Files
  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        setUploading(true);
        const ext = doc.name.split(".").pop()?.toLowerCase() || "";
        const isImg = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
          ext
        );
        const isVid = ["mp4", "mov", "webm", "mkv"].includes(ext);
        const isAud = ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext);
        const isCode = [
          "ts",
          "tsx",
          "js",
          "jsx",
          "py",
          "rs",
          "json",
          "html",
          "css",
          "md",
          "sh",
        ].includes(ext);

        const kind = isImg
          ? "image"
          : isVid
          ? "video"
          : isAud
          ? "audio"
          : isCode
          ? "code"
          : "document";

        const media = await uploadFileToServer(doc.uri, doc.name, kind);
        setUploading(false);
        onSelect(media);
        onClose();
      }
    } catch (e: any) {
      setUploading(false);
      Alert.alert("File Picker Error", e?.message || "Failed to pick document.");
    }
  };

  // Trigger Device Selection Options
  const handleSelectFromDevice = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            "Photo & Video Library",
            "Browse Files & Documents",
            "Take Photo / Video",
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleGallery();
          else if (buttonIndex === 2) handleDocument();
          else if (buttonIndex === 3) handleCamera();
        }
      );
    } else {
      Alert.alert("Select from device", "Choose how you want to select files", [
        { text: "Photos & Videos", onPress: handleGallery },
        { text: "Files & Documents", onPress: handleDocument },
        { text: "Camera", onPress: handleCamera },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleOpenServerSelector = () => {
    setServerModalOpen(true);
  };

  return (
    <>
      <Modal
        visible={open && !serverModalOpen}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop}>
            <BlurView
              intensity={85}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.sheetCard}>
                {/* Handle Bar */}
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <View style={styles.headerIconBox}>
                      <UploadCloud size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={[styles.headerTitle, font("semibold")]}>
                        Attach Media & Files
                      </Text>
                      <Text style={[styles.headerSubtitle, font("regular")]}>
                        Select source to attach to prompt
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Uploading Status Overlay */}
                {uploading && (
                  <View style={styles.uploadingBox}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={[styles.uploadingText, font("medium")]}>
                      {uploadStatus || "Uploading to server…"}
                    </Text>
                  </View>
                )}

                {/* ONLY TWO OPTIONS: 1) Select from device, 2) Select from server */}
                <View style={styles.optionsContainer}>
                  {/* Option 1: Select from Device */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={handleSelectFromDevice}
                    activeOpacity={0.7}
                    disabled={uploading}
                  >
                    <View style={styles.optionIconBox}>
                      <Smartphone size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, font("semibold")]}>
                        Select from device
                      </Text>
                      <Text style={[styles.optionSubtitle, font("regular")]}>
                        Pick photos, videos, or documents from this device
                      </Text>
                    </View>
                    <ChevronRight size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option 2: Select from Server */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={handleOpenServerSelector}
                    activeOpacity={0.7}
                    disabled={uploading}
                  >
                    <View style={styles.optionIconBox}>
                      <Server size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, font("semibold")]}>
                        Select from server
                      </Text>
                      <Text style={[styles.optionSubtitle, font("regular")]}>
                        Browse & attach files stored on the VPS server
                      </Text>
                    </View>
                    <ChevronRight size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Dedicated Server Media Selector Modal */}
      <ServerMediaModal
        open={serverModalOpen}
        onClose={() => {
          setServerModalOpen(false);
          onClose();
        }}
        onSelect={(media) => {
          setServerModalOpen(false);
          onSelect(media);
          onClose();
        }}
        initialDirectory={serverDirectory}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 22,
    paddingHorizontal: 16,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  closeBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.primary,
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
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14.5,
    color: COLORS.foreground,
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
});
