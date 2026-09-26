import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  checkPermission,
  requestPermission,
  type PermissionState,
  type PermissionType,
} from "@/core/permissions";

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<PermissionType, PermissionState>>({
    microphone: "undetermined",
    camera: "undetermined",
    photos: "undetermined",
    notifications: "undetermined",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const types: PermissionType[] = ["microphone", "camera", "photos", "notifications"];
    const results = await Promise.all(types.map((t) => checkPermission(t)));
    const updated: Record<PermissionType, PermissionState> = {
      microphone: results[0]?.status ?? "undetermined",
      camera: results[1]?.status ?? "undetermined",
      photos: results[2]?.status ?? "undetermined",
      notifications: results[3]?.status ?? "undetermined",
    };
    setPermissions(updated);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Recheck when returning to app from settings
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        refresh();
      }
    });

    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(
    async (type: PermissionType) => {
      const ok = await requestPermission(type);
      setPermissions((prev) => ({
        ...prev,
        [type]: ok ? "granted" : "denied",
      }));
      return ok;
    },
    []
  );

  return {
    permissions,
    loading,
    refresh,
    request,
    hasMicrophone: permissions.microphone === "granted",
    hasCamera: permissions.camera === "granted",
    hasPhotos: permissions.photos === "granted",
    hasNotifications: permissions.notifications === "granted",
  };
}
