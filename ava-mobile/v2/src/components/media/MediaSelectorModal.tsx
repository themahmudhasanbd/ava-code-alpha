import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { BlurView } from "expo-blur";
import {
  Camera,
  Check,
  ChevronRight,
  FileAudio,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  FolderOpen,
  Image as ImageIcon,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { Surface } from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { useDirectory } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

export interface SelectedMedia {
  id: string;
  name: string;
  uri?: string;
  remotePath?: string;
  kind: "image" | "video" | "audio" | "document" | "code" | "file";
  size?: number;
}

function getAudioModule(): any {
  try {
    const { NativeModules } = require("react-native");
    const hasNative =
      Boolean(NativeModules?.ExponentAV) ||
      Boolean((globalThis as any)?.expo?.modules?.ExponentAV);
    if (!hasNative) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-av")?.Audio ?? null;
  } catch {
    return null;
  }
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
  const [activeTab, setActiveTab] = useState<"sources" | "server" | "voice">(
    "sources"
  );
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [serverSearch, setServerSearch] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordingRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    data: serverFiles = [],
    isLoading: isLoadingServer,
    refetch: refetchServer,
  } = useDirectory(serverDirectory);

  useEffect(() => {
    let timer: any = null;
    let animLoop: any = null;

    if (isRecording) {
      setRecordSecs(0);
      timer = setInterval(() => setRecordSecs((s) => s + 1), 1000);
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (animLoop) animLoop.stop();
    };
  }, [isRecording, pulseAnim]);

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

  // 1. Camera Photo/Video
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

  // 2. Photo & Video Library
  const handleGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo gallery permission is required.");
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

  // 3. Document / Device Files
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
        const isImg = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
        const isVid = ["mp4", "mov", "webm", "mkv"].includes(ext);
        const isAud = ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext);
        const isCode = [
          "ts", "tsx", "js", "jsx", "py", "rs", "json", "html", "css", "md", "sh",
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

  // 4. Voice Recording
  const startVoiceRecording = async () => {
    try {
      const ExpoAudio = getAudioModule();
      if (ExpoAudio) {
        const { status: perm } = await ExpoAudio.requestPermissionsAsync();
        if (perm !== "granted") {
          Alert.alert(
            "Microphone Permission",
            "Microphone permission is required to record audio."
          );
          return;
        }

        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const rec = new ExpoAudio.Recording();
        await rec.prepareToRecordAsync(
          ExpoAudio.RecordingOptionsPresets?.HIGH_QUALITY || {}
        );
        await rec.startAsync();
        recordingRef.current = rec;
      }
      setIsRecording(true);
    } catch {
      setIsRecording(true);
    }
  };

  const stopVoiceRecording = async () => {
    setIsRecording(false);
    const durationStr = `${Math.floor(recordSecs / 60)
      .toString()
      .padStart(2, "0")}:${(recordSecs % 60).toString().padStart(2, "0")}`;

    if (!recordingRef.current) {
      const name = `voice_${Date.now()}.m4a`;
      onSelect({
        id: `${Date.now()}_voice`,
        name: `Voice Note (${durationStr})`,
        remotePath: `${serverDirectory}/${name}`,
        kind: "audio",
      });
      onClose();
      return;
    }

    try {
      setUploading(true);
      const rec = recordingRef.current;
      recordingRef.current = null;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      if (uri) {
        const name = `voice_${Date.now()}.m4a`;
        const media = await uploadFileToServer(uri, name, "audio");
        media.name = `Voice Note (${durationStr})`;
        onSelect(media);
      }
    } catch (e: any) {
      console.warn("Audio save error:", e);
    } finally {
      setUploading(false);
      onClose();
    }
  };

  // 5. Select from Server Storage
  const filteredServerFiles = serverFiles.filter((f) =>
    f.name.toLowerCase().includes(serverSearch.toLowerCase())
  );

  const handleSelectServerFile = (file: { name: string; path: string; isDirectory: boolean }) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImg = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
    const isVid = ["mp4", "mov", "webm"].includes(ext);
    const isAud = ["mp3", "wav", "ogg", "m4a"].includes(ext);
    const isCode = [
      "ts", "tsx", "js", "jsx", "py", "rs", "json", "html", "css", "md", "sh",
    ].includes(ext);

    const kind = isImg
      ? "image"
      : isVid
      ? "video"
      : isAud
      ? "audio"
      : isCode
      ? "code"
      : "file";

    onSelect({
      id: `${Date.now()}_srv`,
      name: file.name,
      remotePath: file.path,
      kind,
    });
    onClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheetCard}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <UploadCloud size={18} color={COLORS.primary} />
                  <Text style={[styles.headerTitle, font("semibold")]}>
                    {activeTab === "server"
                      ? "Select Server File"
                      : activeTab === "voice"
                      ? "Record Voice Note"
                      : "Add Media & Files"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <X size={16} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Uploading Overlay */}
              {uploading && (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={[styles.uploadingText, font("medium")]}>
                    {uploadStatus || "Processing & transferring…"}
                  </Text>
                </View>
              )}

              {/* TAB 1: Main Sources */}
              {activeTab === "sources" && (
                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.sourcesList}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Option: Camera */}
                  <TouchableOpacity
                    style={styles.sourceOption}
                    onPress={handleCamera}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.sourceIconBox,
                        { backgroundColor: "rgba(59, 130, 246, 0.12)" },
                      ]}
                    >
                      <Camera size={18} color="#3b82f6" />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={[styles.sourceTitle, font("semibold")]}>Take Photo or Video</Text>
                      <Text style={[styles.sourceSubtitle, font("regular")]}>
                        Use device camera to capture instantly
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option: Gallery */}
                  <TouchableOpacity
                    style={styles.sourceOption}
                    onPress={handleGallery}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.sourceIconBox,
                        { backgroundColor: "rgba(168, 85, 247, 0.12)" },
                      ]}
                    >
                      <ImageIcon size={18} color="#a855f7" />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={[styles.sourceTitle, font("semibold")]}>Photo & Video Library</Text>
                      <Text style={[styles.sourceSubtitle, font("regular")]}>
                        Browse photos, videos, and graphics
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option: Documents */}
                  <TouchableOpacity
                    style={styles.sourceOption}
                    onPress={handleDocument}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.sourceIconBox,
                        { backgroundColor: "rgba(16, 185, 129, 0.12)" },
                      ]}
                    >
                      <FileText size={18} color="#10b981" />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={[styles.sourceTitle, font("semibold")]}>Device Files & Docs</Text>
                      <Text style={[styles.sourceSubtitle, font("regular")]}>
                        PDFs, source code, text files, zip archives
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option: Voice Note */}
                  <TouchableOpacity
                    style={styles.sourceOption}
                    onPress={() => setActiveTab("voice")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.sourceIconBox,
                        { backgroundColor: "rgba(249, 115, 22, 0.12)" },
                      ]}
                    >
                      <Mic size={18} color="#f97316" />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={[styles.sourceTitle, font("semibold")]}>Voice Audio Note</Text>
                      <Text style={[styles.sourceSubtitle, font("regular")]}>
                        Record speech or audio prompt directly
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>

                  {/* Option: Server Storage */}
                  <TouchableOpacity
                    style={styles.sourceOption}
                    onPress={() => setActiveTab("server")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.sourceIconBox,
                        { backgroundColor: "rgba(66, 64, 225, 0.12)" },
                      ]}
                    >
                      <Server size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.sourceContent}>
                      <Text style={[styles.sourceTitle, font("semibold")]}>Server Shared Storage</Text>
                      <Text style={[styles.sourceSubtitle, mono("regular")]}>
                        {serverDirectory} (VPS files)
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* TAB 2: Server Storage Browser */}
              {activeTab === "server" && (
                <View style={styles.serverTabContent}>
                  {/* Search Bar & Back */}
                  <View style={styles.serverTopBar}>
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => setActiveTab("sources")}
                    >
                      <Text style={[styles.backBtnText, font("semibold")]}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.searchBarBox}>
                      <Search size={14} color={COLORS.mutedForeground} />
                      <TextInput
                        style={[styles.serverSearchInput, font("regular")]}
                        value={serverSearch}
                        onChangeText={setServerSearch}
                        placeholder="Search server files…"
                        placeholderTextColor={COLORS.mutedForeground}
                        autoCapitalize="none"
                      />
                      {serverSearch ? (
                        <TouchableOpacity onPress={() => setServerSearch("")}>
                          <X size={13} color={COLORS.mutedForeground} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.refreshBtn}
                      onPress={() => refetchServer()}
                    >
                      <RefreshCw size={14} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Server Files List */}
                  {isLoadingServer ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={[styles.loadingText, font("medium")]}>Reading server files…</Text>
                    </View>
                  ) : filteredServerFiles.length === 0 ? (
                    <View style={styles.emptyServerBox}>
                      <FolderOpen size={32} color={COLORS.mutedForeground} />
                      <Text style={[styles.emptyServerTitle, font("semibold")]}>No files found</Text>
                      <Text style={[styles.emptyServerSub, font("regular")]}>
                        {serverDirectory} is empty or has no matching files.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.serverScroll}
                      contentContainerStyle={styles.serverFileList}
                    >
                      {filteredServerFiles.map((file) => (
                        <TouchableOpacity
                          key={file.path}
                          style={styles.serverFileRow}
                          onPress={() => handleSelectServerFile(file)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.serverFileIconBox}>
                            {file.isDirectory ? (
                              <FolderOpen size={16} color={COLORS.primary} />
                            ) : (
                              <FileText size={16} color={COLORS.mutedForeground} />
                            )}
                          </View>
                          <View style={styles.serverFileInfo}>
                            <Text style={[styles.serverFileName, font("medium", file.name)]} numberOfLines={1}>
                              {file.name}
                            </Text>
                            <Text style={[styles.serverFilePath, mono("regular")]} numberOfLines={1}>
                              {file.path}
                            </Text>
                          </View>
                          <Plus size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* TAB 3: Voice Recorder View */}
              {activeTab === "voice" && (
                <View style={styles.voiceTabContent}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setActiveTab("sources")}
                  >
                    <Text style={[styles.backBtnText, font("semibold")]}>← Back</Text>
                  </TouchableOpacity>

                  <View style={styles.voiceRecordCenter}>
                    <Animated.View
                      style={[
                        styles.voiceRecordPulse,
                        { transform: [{ scale: pulseAnim }] },
                        isRecording && styles.voiceRecordPulseActive,
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.voiceRecordCircle,
                          isRecording && styles.voiceRecordCircleActive,
                        ]}
                        onPress={
                          isRecording ? stopVoiceRecording : startVoiceRecording
                        }
                        activeOpacity={0.8}
                      >
                        <Mic
                          size={32}
                          color={isRecording ? "#FFFFFF" : COLORS.primary}
                        />
                      </TouchableOpacity>
                    </Animated.View>

                    <Text style={[styles.voiceTimerText, mono("bold")]}>
                      {`${Math.floor(recordSecs / 60)
                        .toString()
                        .padStart(2, "0")}:${(recordSecs % 60)
                        .toString()
                        .padStart(2, "0")}`}
                    </Text>

                    <Text style={[styles.voiceHintText, font("medium")]}>
                      {isRecording
                        ? "Recording… Tap the red button to finish"
                        : "Tap microphone to start recording"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
    borderTopColor: "rgba(255, 255, 255, 0.45)",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    paddingHorizontal: 16,
    maxHeight: "88%",
    shadowColor: "#000",
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "rgba(66, 64, 225, 0.1)",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  scrollArea: {
    marginTop: 8,
  },
  sourcesList: {
    gap: 8,
    paddingVertical: 6,
  },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceContent: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  sourceSubtitle: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  serverTabContent: {
    paddingTop: 8,
    minHeight: 280,
  },
  serverTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
    gap: 6,
  },
  serverSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.foreground,
    paddingVertical: 0,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptyServerBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 6,
  },
  emptyServerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  emptyServerSub: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  serverScroll: {
    maxHeight: 320,
  },
  serverFileList: {
    gap: 6,
    paddingBottom: 10,
  },
  serverFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serverFileIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  serverFileInfo: {
    flex: 1,
  },
  serverFileName: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  serverFilePath: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  voiceTabContent: {
    paddingTop: 8,
    minHeight: 220,
  },
  voiceRecordCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  voiceRecordPulse: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(66, 64, 225, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceRecordPulseActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  voiceRecordCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceRecordCircleActive: {
    backgroundColor: COLORS.destructive,
  },
  voiceTimerText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  voiceHintText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
});
