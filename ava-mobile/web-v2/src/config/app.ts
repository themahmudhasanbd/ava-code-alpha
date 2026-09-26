import avaMark from "@/assets/ava-code-mark.png.asset.json";

/** Single source of truth for brand + server settings. Change here, applies everywhere. */
export const APP = {
  name: "AvA Code",
  tagline: "Coding workspace",
  version: "2.0.0",
  logo: avaMark.url,
  defaultServerUrl: "https://ava.mahmudhasan.pro",
  defaultUsername: "ava",
  clientName: "ava-web",
  defaultCwd: "/var/www/ava-code",
  mediaDir: "/root/shared-media",
  defaultBrowserUrl: "https://ava.mahmudhasan.pro",
} as const;
