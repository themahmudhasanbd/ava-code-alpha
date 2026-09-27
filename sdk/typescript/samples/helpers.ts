import path from "node:path";

export function avaPathOverride() {
  return (
    process.env.AVA_EXECUTABLE ??
    path.join(process.cwd(), "..", "..", "ava-rs", "target", "debug", "ava")
  );
}
