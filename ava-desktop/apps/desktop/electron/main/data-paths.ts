import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { APP_NAME } from "@pi-desktop/shared";

/**
 * The two directories that define an installation, and the development split
 * between them.
 *
 * A packaged PI-Desktop and a `pnpm dev` host used to share both: the
 * name-derived `userData` — where Electron keeps the single-instance lock,
 * renderer `localStorage`, and the plugin panel partitions — and
 * `~/.pi-desktop`, where host-core keeps `pi.sqlite` beside the persistence
 * outbox and the log tree. Sharing them meant a shipped app that was already
 * running held the lock, so the development launch quit on arrival; a
 * development host that won the race instead put a second host-core over the
 * same single-writer database, which is the divergence D236 exists to
 * prevent. Neither is workable while someone debugs against the app they use.
 *
 * Only the development side moves, and only these two names differ. A shipped
 * installation keeps `PI-Desktop` and `~/.pi-desktop`, so no upgrade relocates
 * a user's database, secrets, plugins, or renderer-local state, and
 * `PI_DESKTOP_DATA_DIR` still overrides either profile outright.
 */

import { existsSync } from "node:fs";

/** `userData` directory of a development installation, beside the shipped one. */
export const DEVELOPMENT_INSTALLATION_NAME = `${APP_NAME} Dev`;

/** Data directory of a shipped installation, below the user's home. */
export const INSTALLATION_DATA_DIR_NAME = ".ava-desktop";

/** Data directory of a development installation, below the user's home. */
export const DEVELOPMENT_DATA_DIR_NAME = ".ava-desktop-dev";

export type DataDirInput = {
  /** `AVA_DESKTOP_DATA_DIR` or `PI_DESKTOP_DATA_DIR`; an explicit directory wins over either profile. */
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
  const explicit = (process.env.AVA_DESKTOP_DATA_DIR || override)?.trim();
  if (explicit) return resolve(explicit);
  const targetDir = join(
    home,
    development ? DEVELOPMENT_DATA_DIR_NAME : INSTALLATION_DATA_DIR_NAME,
  );
  const legacyDir = join(
    home,
    development ? ".pi-desktop-dev" : ".pi-desktop",
  );
  if (!existsSync(targetDir) && existsSync(legacyDir)) {
    return resolve(legacyDir);
  }
  return resolve(targetDir);
}

/**
 * The data directory this process owns.
 *
 * Electron main passes its own verdict for `development`, because only it can
 * ask `app.isPackaged`, and it publishes the resolved directory back to
 * `PI_DESKTOP_DATA_DIR` at boot. That publication is what keeps the plugin
 * runtime — which resolves this root from the environment rather than taking
 * it as a parameter — on one directory instead of falling back to the shipped
 * default, which would strand a development host's plugin data inside the
 * packaged profile.
 */
export function desktopDataDir(
  development: boolean = process.env.PI_DESKTOP_DEV === "1",
): string {
  return resolveDataDir({
    override: process.env.PI_DESKTOP_DATA_DIR,
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
