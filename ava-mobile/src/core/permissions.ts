import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";

export type PermissionType = "microphone" | "camera" | "photos" | "notifications";
export type PermissionState = "granted" | "denied" | "undetermined";

export interface PermissionStatusResult {
  granted: boolean;
  canAskAgain: boolean;
  status: PermissionState;
}

/**
 * Check permission status without prompting user.
 */
export async function checkPermission(type: PermissionType): Promise<PermissionStatusResult> {
  try {
    switch (type) {
      case "microphone": {
        const res = await Audio.getPermissionsAsync();
        return {
          granted: res.granted,
          canAskAgain: res.canAskAgain,
          status: res.granted ? "granted" : res.canAskAgain ? "undetermined" : "denied",
        };
      }
      case "camera": {
        const res = await ImagePicker.getCameraPermissionsAsync();
        return {
          granted: res.granted,
          canAskAgain: res.canAskAgain,
          status: res.granted ? "granted" : res.canAskAgain ? "undetermined" : "denied",
        };
      }
      case "photos": {
        const res = await ImagePicker.getMediaLibraryPermissionsAsync();
        return {
          granted: res.granted,
          canAskAgain: res.canAskAgain,
          status: res.granted ? "granted" : res.canAskAgain ? "undetermined" : "denied",
        };
      }
      case "notifications": {
        if (Platform.OS === "android" && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.check(
            "android.permission.POST_NOTIFICATIONS" as any
          );
          return {
            granted,
            canAskAgain: true,
            status: granted ? "granted" : "undetermined",
          };
        }
        return { granted: true, canAskAgain: true, status: "granted" };
      }
    }
  } catch (err) {
    console.warn(`[Permissions] checkPermission failed for ${type}:`, err);
    return { granted: false, canAskAgain: true, status: "undetermined" };
  }
}

/**
 * Request permission with fallback guidance to system settings if previously blocked.
 */
export async function requestPermission(
  type: PermissionType,
  showRationaleAlert = true
): Promise<boolean> {
  try {
    let granted = false;
    let canAskAgain = true;

    switch (type) {
      case "microphone": {
        const res = await Audio.requestPermissionsAsync();
        granted = res.granted;
        canAskAgain = res.canAskAgain;
        break;
      }
      case "camera": {
        const res = await ImagePicker.requestCameraPermissionsAsync();
        granted = res.granted;
        canAskAgain = res.canAskAgain;
        break;
      }
      case "photos": {
        const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = res.granted;
        canAskAgain = res.canAskAgain;
        break;
      }
      case "notifications": {
        if (Platform.OS === "android" && Platform.Version >= 33) {
          const res = await PermissionsAndroid.request(
            "android.permission.POST_NOTIFICATIONS" as any
          );
          granted = res === PermissionsAndroid.RESULTS.GRANTED;
          canAskAgain = res !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        } else {
          granted = true;
          canAskAgain = true;
        }
        break;
      }
    }

    if (!granted && !canAskAgain && showRationaleAlert) {
      promptToSettings(type);
    }

    return granted;
  } catch (err) {
    console.warn(`[Permissions] requestPermission failed for ${type}:`, err);
    return false;
  }
}

function promptToSettings(type: PermissionType) {
  const names: Record<PermissionType, string> = {
    microphone: "Microphone",
    camera: "Camera",
    photos: "Photos / Storage",
    notifications: "Notifications",
  };

  Alert.alert(
    `${names[type]} Permission Required`,
    `Please enable ${names[type]} access in system settings to use this feature with AvA Code.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        onPress: () => {
          if (Platform.OS === "android") {
            Linking.openSettings();
          } else {
            Linking.openURL("app-settings:");
          }
        },
        text: "Open Settings",
      },
    ]
  );
}
