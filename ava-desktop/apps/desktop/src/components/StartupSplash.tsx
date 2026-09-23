import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { cx } from "./ui";

/** Full-window boot surface shown until host/settings bootstrap finishes. */
export function StartupSplash({ exiting = false }: { exiting?: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={cx("startup-splash", exiting && "is-exiting")}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      data-testid="startup-splash"
    >
      <div className="startup-splash-card">
        <div className="startup-splash-mark" aria-hidden>
          <BrandLogo size={64} />
        </div>
        <div className="startup-splash-copy">
          <div className="startup-splash-name" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span>{t("app.shellName")}</span>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: "5px", background: "rgba(139, 92, 246, 0.18)", color: "#a855f7", border: "1px solid rgba(139, 92, 246, 0.35)", lineHeight: "1.2" }}>
              ALPHA
            </span>
          </div>
          <div className="startup-splash-tagline">{t("app.tagline")}</div>
        </div>
        <div className="startup-splash-track" aria-hidden>
          <span className="startup-splash-bar" />
        </div>
        <span className="sr-only">{t("app.starting")}</span>
      </div>
    </div>
  );
}
