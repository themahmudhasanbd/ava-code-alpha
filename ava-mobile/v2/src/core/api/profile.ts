import type { RpcClient } from "../rpc-client";

export type PersonalityPreset = "autonomous" | "friendly" | "pragmatic" | "socratic" | "custom";

/** Mirrors `UserProfileConfig` on the AvA server (camelCase). */
export interface UserProfile {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  roleOrTitle?: string | null;
  aiName?: string | null;
  aiRole?: string | null;
  personalityPreset: PersonalityPreset;
  customPersonality?: string | null;
  characteristics?: string | null;
  customInstructions?: string | null;
  userRules: string[];
  enabled: boolean;
}

export interface PresetOption {
  id: PersonalityPreset;
  name: string;
  description: string;
}

export async function readUserProfile(rpc: RpcClient, cwd?: string) {
  return rpc.call<{ profile: UserProfile; presets: PresetOption[] }>("userProfile/read", cwd ? { cwd } : {});
}

export async function writeUserProfile(rpc: RpcClient, profile: UserProfile, reloadActiveThreads = true) {
  return rpc.call<{ success: boolean; profile: UserProfile }>("userProfile/write", {
    profile,
    reloadActiveThreads,
  });
}
