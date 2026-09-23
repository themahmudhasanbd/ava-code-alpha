import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { APP_NAME } from "@pi-desktop/shared";

/** `userData` directory of a development installation, beside the shipped one. */
export const DEVELOPMENT_INSTALLATION_NAME = `${APP_NAME} Dev`;

/** Data directory of a shipped installation, below the user's home. */
export const INSTALLATION_DATA_DIR_NAME = ".ava-code";

/** Data directory of a development installation, below the user's home. */
export const DEVELOPMENT_DATA_DIR_NAME = ".ava-code";

export type DataDirInput = {
  /** `AVA_CODE_DATA_DIR`, `AVA_DESKTOP_DATA_DIR` or `PI_DESKTOP_DATA_DIR`; an explicit directory wins over either profile. */
  override: string | undefined;
  /** True for a development build. */
  development: boolean;
  /** The user's home directory. */
  home: string;
};

export function resolveDataDir({
  override,
  development,
  home,
}: DataDirInput): string {
  const explicit = (
    process.env.AVA_CODE_DATA_DIR ||
    process.env.AVA_DESKTOP_DATA_DIR ||
    process.env.PI_DESKTOP_DATA_DIR ||
    override
  )?.trim();
  if (explicit) return resolve(explicit);

  const targetDir = join(
    home,
    INSTALLATION_DATA_DIR_NAME,
  );
  if (existsSync(targetDir)) {
    return resolve(targetDir);
  }
  const legacyDesktop = join(
    home,
    development ? ".ava-desktop-dev" : ".ava-desktop",
  );
  if (existsSync(legacyDesktop)) {
    return resolve(legacyDesktop);
  }
  const legacyPi = join(
    home,
    development ? ".pi-desktop-dev" : ".pi-desktop",
  );
  if (existsSync(legacyPi)) {
    return resolve(legacyPi);
  }
  return resolve(targetDir);
}

/**
 * The data directory this process owns.
 *
 * Electron main passes its own verdict for `development`, because only it can
 * ask `app.isPackaged`, and it publishes the resolved directory back to
 * `AVA_CODE_DATA_DIR`, `AVA_DESKTOP_DATA_DIR`, and `PI_DESKTOP_DATA_DIR` at boot.
 */
export function desktopDataDir(
  development: boolean = process.env.PI_DESKTOP_DEV === "1",
): string {
  return resolveDataDir({
    override:
      process.env.AVA_CODE_DATA_DIR ||
      process.env.AVA_DESKTOP_DATA_DIR ||
      process.env.PI_DESKTOP_DATA_DIR,
    development,
    home: homedir(),
  });
}

/** The Electron `app` surface this helper needs; kept structural so tests need no Electron. */
export type UserDataApp = {
  commandLine: { hasSwitch(name: string): boolean };
  getPath(name: "appData"): string;
  setPath(name: "userData", path: string): void;
};

/**
 * Give a development build its own `userData` so the single-instance lock
 * does not collide with a shipped app that is already running (D236, ADR 0094).
 * An explicit `--user-data-dir` wins, because that is how the E2E harnesses
 * point a build at a throwaway profile.
 */
export function applyDevelopmentUserData(
  app: UserDataApp,
  development: boolean,
): void {
  if (development && !app.commandLine.hasSwitch("user-data-dir")) {
    app.setPath(
      "userData",
      join(app.getPath("appData"), DEVELOPMENT_INSTALLATION_NAME),
    );
  }
}
