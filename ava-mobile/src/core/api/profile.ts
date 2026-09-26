import type { RpcClient } from "../rpc-client";

export type PersonalityPreset = "autonomous" | "friendly" | "pragmatic" | "socratic" | "custom";

/** Mirrors `UserProfileConfig` on the AvA server (camelCase). */
export interface UserProfile {
  name?: string;
  username?: string;
  avatar?: string;
  roleOrTitle?: string;
  aiName?: string;
  aiRole?: string;
  personalityPreset: PersonalityPreset;
  customPersonality?: string;
  characteristics?: string;
  customInstructions?: string;
  userRules: string[];
  enabled: boolean;
}

export interface PresetOption {
  id: PersonalityPreset;
  name: string;
  description: string;
}

export function sanitizeProfile(profile: Partial<UserProfile>): UserProfile {
  return {
    name: (profile.name ?? "").trim(),
    username: (profile.username ?? "").trim(),
    avatar: profile.avatar ?? "",
    roleOrTitle: (profile.roleOrTitle ?? "").trim(),
    aiName: (profile.aiName ?? "AvA").trim(),
    aiRole: (profile.aiRole ?? "Autonomous Pair Programmer").trim(),
    personalityPreset: (profile.personalityPreset || "autonomous") as PersonalityPreset,
    customPersonality: (profile.customPersonality ?? "").trim(),
    characteristics: (profile.characteristics ?? "").trim(),
    customInstructions: (profile.customInstructions ?? "").trim(),
    userRules: Array.isArray(profile.userRules)
      ? profile.userRules.map((r) => String(r).trim()).filter(Boolean)
      : [],
    enabled: typeof profile.enabled === "boolean" ? profile.enabled : true,
  };
}

export async function readUserProfile(rpc: RpcClient, cwd?: string) {
  const res = await rpc.call<{ profile: Record<string, any>; presets: PresetOption[] }>(
    "userProfile/read",
    cwd ? { cwd } : {}
  );

  return {
    profile: sanitizeProfile(res.profile || {}),
    presets: res.presets || [],
  };
}

export async function writeUserProfile(
  rpc: RpcClient,
  profile: Partial<UserProfile>,
  reloadActiveThreads = true
) {
  const clean = sanitizeProfile(profile);
  return rpc.call<{ success: boolean; profile: UserProfile }>("userProfile/write", {
    profile: clean,
    reloadActiveThreads,
  });
}
