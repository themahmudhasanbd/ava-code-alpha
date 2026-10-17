import { useState } from "react";
import { Lock, KeyRound, Globe, Eye, EyeOff, Check, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";

export interface CredentialSpec {
  site_url: string;
  domain?: string;
  username: string;
  secret?: string;
  password?: string;
  auth_type?: "password" | "bearer_token" | "api_key";
  notes?: string;
}

export function SaveCredentialWidget({ spec }: { spec: CredentialSpec }) {
  const domain = spec.domain || extractDomain(spec.site_url);
  const initialSecret = spec.secret || spec.password || "";
  const authType = spec.auth_type || "password";

  const [username, setUsername] = useState(spec.username || "");
  const [secret, setSecret] = useState(initialSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/browser/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_url: spec.site_url,
          domain,
          auth_type: authType,
          username,
          secret,
          notes: spec.notes || "Saved from AvA browser agent chat",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("saved");
        toast.success(`Saved credentials for ${domain} to encrypted vault`);
      } else {
        setStatus("error");
        toast.error(data.error || "Failed to save credential");
      }
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Network error saving credentials");
    }
  }

  function handleCopySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast.info("Password copied to clipboard");
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-primary/20 bg-card/85 backdrop-blur-md shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between border-b border-border/40 bg-primary/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Save Authentication Credentials</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-medium text-primary">
                <ShieldCheck className="h-3 w-3" /> AES-256 Vault
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              AvA Browser Agent can automatically sign into this website in the future
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Domain & URL */}
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground">{domain}</span>
          <span className="text-muted-foreground truncate text-[11px]">({spec.site_url})</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Username / Email */}
          <div>
            <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
              Username / Email
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs text-foreground focus-within:border-primary">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or Email"
                className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 text-xs"
              />
            </div>
          </div>

          {/* Secret / Password */}
          <div>
            <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
              Password / Secret
            </label>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs text-foreground focus-within:border-primary">
              <input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent outline-none text-foreground text-xs"
              />
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  title={showSecret ? "Hide password" : "Show password"}
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  title="Copy password"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
          {status === "saved" ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Saved Securely to Vault</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                Not Now
              </button>
              <button
                type="button"
                disabled={status === "saving" || !username || !secret}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{status === "saving" ? "Saving..." : "Save to Vault"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function extractDomain(url?: string): string {
  if (!url) return "";
  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(clean);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "";
  }
}
