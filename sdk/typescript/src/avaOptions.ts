export type AvaConfigValue = string | number | boolean | AvaConfigValue[] | AvaConfigObject;

export type AvaConfigObject = { [key: string]: AvaConfigValue };

export type AvaOptions = {
  avaPathOverride?: string;
  baseUrl?: string;
  apiKey?: string;
  /**
   * Additional `--config key=value` overrides to pass to the AvA CLI.
   *
   * Provide a JSON object and the SDK will flatten it into dotted paths and
   * serialize values as TOML literals so they are compatible with the CLI's
   * `--config` parsing.
   */
  config?: AvaConfigObject;
  /**
   * Raw `--config key=value` overrides to pass unchanged to the AvA CLI after
   * structured configuration and before SDK-managed or thread-specific overrides.
   */
  configOverrides?: string[];
  /**
   * Environment variables passed to the AvA CLI process. When provided, the SDK
   * will not inherit variables from `process.env`.
   */
  env?: Record<string, string>;
};
