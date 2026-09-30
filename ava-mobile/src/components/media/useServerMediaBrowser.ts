import { useMemo, useState } from "react";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  Folder,
  FolderGit2,
  HardDrive,
  Images,
  type LucideIcon,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { useDirectory } from "@/state/queries";
import { APP } from "@/config/app";
import {
  getFileKind,
  type MediaFilterCategory,
  type PreviewItem,
  type ServerSelectedMedia,
  type ViewMode,
} from "./media-helpers";

export interface ServerMediaBrowserOptions {
  initialDirectory?: string;
  allowUpload?: boolean;
  onSelect: (media: ServerSelectedMedia) => void;
}

interface ShortcutDir {
  label: string;
  path: string;
  icon: LucideIcon;
}

/**
 * All browsing state for the server media picker: navigation, search,
 * category filter, view mode, selection and upload. Preview overlay state
 * lives in MediaPreviewOverlay instead.
 */
export function useServerMediaBrowser({
  initialDirectory = APP.mediaDir || "/root/shared-media",
  allowUpload = true,
  onSelect,
}: ServerMediaBrowserOptions) {
  const { rpc } = useAva();

  const [currentDir, setCurrentDir] = useState<string>(initialDirectory);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<MediaFilterCategory>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedFile, setSelectedFile] = useState<PreviewItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    data: entries = [],
    isLoading,
    refetch,
    isRefetching,
  } = useDirectory(currentDir);

  const canGoUp = currentDir !== "/" && currentDir.length > 1;

  /** Shared reset applied on every directory navigation. */
  const resetForNavigation = () => {
    setSearchQuery("");
    setSelectedFile(null);
  };

  const goUp = () => {
    if (!canGoUp) return;
    const parts = currentDir.replace(/\/+$/, "").split("/");
    parts.pop();
    const parent = parts.join("/") || "/";
    setCurrentDir(parent);
    resetForNavigation();
  };

  const enterFolder = (folderPath: string) => {
    setCurrentDir(folderPath);
    resetForNavigation();
  };

  const goToDirectory = (dir: string) => {
    setCurrentDir(dir);
    resetForNavigation();
  };

  const selectFileItem = (file: { name: string; path: string }) => {
    const kind = getFileKind(file.name);
    setSelectedFile({
      name: file.name,
      path: file.path,
      kind,
    });
  };

  const confirmAttach = (fileToAttach: PreviewItem | null = selectedFile) => {
    if (!fileToAttach) return;
    onSelect({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fileToAttach.name,
      remotePath: fileToAttach.path,
      kind: fileToAttach.kind,
    });
  };

  // Direct upload to current browsing directory
  const uploadToCurrentDir = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        // C2: never claim success when offline — bail out before touching state.
        if (!rpc || rpc.status !== "online") {
          Alert.alert(
            "Upload Error",
            "You're offline — connect to the server to upload files."
          );
          return;
        }
        setIsUploading(true);
        const cleanName = doc.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetPath = `${currentDir.replace(/\/$/, "")}/${cleanName}`;

        const localFile = new File(doc.uri);
        const base64 = await localFile.base64();
        await rpc.call("fs/writeFile", {
          path: targetPath,
          dataBase64: base64,
        });

        setIsUploading(false);
        const kind = getFileKind(cleanName);
        setSelectedFile({
          name: cleanName,
          path: targetPath,
          kind,
        });
        refetch();
        Alert.alert("Uploaded", `Successfully uploaded "${cleanName}" to ${currentDir}`);
      }
    } catch (e: any) {
      setIsUploading(false);
      Alert.alert("Upload Error", e?.message || "Failed to upload file to current server directory.");
    }
  };

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    if (activeCategory !== "all") {
      result = result.filter((e) => {
        if (e.isDirectory) return true;
        const kind = getFileKind(e.name);
        if (activeCategory === "images") return kind === "image";
        if (activeCategory === "media") return kind === "image" || kind === "video" || kind === "audio";
        if (activeCategory === "docs") return kind === "document";
        if (activeCategory === "code") return kind === "code";
        return true;
      });
    }

    return result;
  }, [entries, searchQuery, activeCategory]);

  const folders = filteredEntries.filter((e) => e.isDirectory);
  const files = filteredEntries.filter((e) => !e.isDirectory);

  const shortcutDirs: ShortcutDir[] = [
    { label: "Shared Media", path: APP.mediaDir || "/root/shared-media", icon: Images },
    { label: "Workspace", path: APP.defaultCwd || "/var/www/ava-code", icon: FolderGit2 },
    { label: "Root /", path: "/", icon: HardDrive },
    { label: "Temp", path: "/tmp", icon: Folder },
  ];

  const pathSegments = currentDir.split("/").filter((s) => s.length > 0);

  return {
    currentDir,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    viewMode,
    setViewMode,
    selectedFile,
    setSelectedFile,
    selectFileItem,
    isUploading,
    entries,
    filteredEntries,
    folders,
    files,
    isLoading,
    isRefetching,
    refetch,
    canGoUp,
    goUp,
    enterFolder,
    goToDirectory,
    confirmAttach,
    uploadToCurrentDir,
    allowUpload,
    shortcutDirs,
    pathSegments,
  };
}

export type ServerMediaBrowser = ReturnType<typeof useServerMediaBrowser>;
