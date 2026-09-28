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
  Paperclip,
  Server,
  UploadCloud,
  X,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { COLORS, useTheme } from "@/theme/colors";
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

  // 1. Device: Pick Document or Media
  const handleSelectFromDevice = async () => {
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
          onSelect(media);
          onClose();
        }
      } catch (e: any) {
        setUploading(false);
        setUploadStatus(null);
        Alert.alert("Camera Error", e?.message || "Failed to capture photo.");
      }
    };

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
      Alert.alert(
        "Select from Device",
        "Choose file source",
        [
          { text: "Photo / Video Library", onPress: pickGallery },
          { text: "Files & Documents", onPress: pickDocument },
          { text: "Camera", onPress: pickCamera },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true }
      );
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
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.sheetCard}>
                {/* Drag Handle */}
                <View style={styles.handleBar} />

                {/* Header matching Flutter ChatAddFilesModal */}
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <View style={styles.headerIconBox}>
                      <Paperclip size={18} color="#6366F1" />
                    </View>
                    <Text style={[styles.headerTitle, font("bold")]}>Add files</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Upload Indicator if uploading */}
                {uploading && (
                  <View style={styles.uploadingBox}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={[styles.uploadingText, font("medium")]}>
                      {uploadStatus || "Uploading to VPS server…"}
                    </Text>
                  </View>
                )}

                {/* 2 Primary Options inspired by Flutter ChatAddFilesModal */}
                <View style={styles.optionsContainer}>
                  {/* Option 1: Select from your device */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={handleSelectFromDevice}
                    disabled={uploading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
                      <UploadCloud size={20} color="#6366F1" />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, font("semibold")]}>
                        Select from your device
                      </Text>
                      <Text style={[styles.optionSubtitle, font("regular")]}>
                        Upload images or documents from this device to server media library
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option 2: Select from the server */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={handleSelectFromServer}
                    disabled={uploading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                      <Server size={20} color="#10B981" />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, font("semibold")]}>
                        Select from the server
                      </Text>
                      <Text style={[styles.optionSubtitle, font("regular")]}>
                        Browse server files & media library ({serverDirectory})
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 16,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  handleBar: {
    width: 36,
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  uploadingText: {
    fontSize: 12,
    color: "#6366F1",
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
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  optionSubtitle: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
    lineHeight: 15,
  },
});
