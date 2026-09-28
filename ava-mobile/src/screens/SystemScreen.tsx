import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { AppShell } from "@/components/layout/AppShell";
import {
  GlassCapsule,
  GlassIconButton,
  PageIntro,
  Skeleton,
  SkeletonCard,
  SkeletonCapsule,
  SkeletonRows,
  StatusDot,
  Surface,
} from "@/components/kit";
import { useAva } from "@/state/ava-provider";
import { useDiagnostics, useRunCommand } from "@/state/queries";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

// ── Types ─────────────────────────────────────────────────────────────────

interface SystemHardwareStats {
  cores: number;
  load: [number, number, number];
  loadPct: number;
  ramTotal: number; // in MB
  ramUsed: number;  // in MB
  ramFree: number;  // in MB
  ramPct: number;
  diskTotal: number; // in GB
  diskUsed: number;  // in GB
  diskFree: number;  // in GB
  diskPct: number;
  uptime: number;    // seconds
  hostname: string;
  os: string;
}

interface Pm2Process {
  name: string;
  pid: number;
  status: string;
  cpu: string;
  memory: string;
  uptime: string;
  restarts: number;
}

interface SystemdService {
  name: string;
  loaded: string;
  active: string;
  status: string;
  description: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "online" || s === "active" || s === "running") {
    return <CheckCircle2 size={15} color={COLORS.success} />;
  }
  if (s === "stopped" || s === "inactive" || s === "dead") {
    return <XCircle size={15} color={COLORS.mutedForeground} />;
  }
  if (s === "errored" || s === "failed") {
    return <AlertTriangle size={15} color={COLORS.destructive} />;
  }
  return <Activity size={15} color={COLORS.warning} />;
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onPress,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: `${color}30` }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size={12} color={color} />
      ) : (
        <Icon size={13} color={color} />
      )}
      <Text style={[styles.actionText, font("medium"), { color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={16} color={COLORS.primary} />
      <Text style={[styles.sectionTitle, font("semibold")]}>{title}</Text>
      {badge && <View style={{ marginLeft: "auto" }}>{badge}</View>}
    </View>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function formatUptimeMs(startMs: number): string {
  const diff = Date.now() - startMs;
  return formatDuration(Math.floor(diff / 1000));
}

function getServiceDescription(name: string): string {
  const descs: Record<string, string> = {
    "ava-server": "AvA Code Server Daemon",
    nginx: "Reverse Proxy & Web Server",
    redis: "In-Memory Cache & Queue",
    postgresql: "Relational Database Server",
    docker: "Container Engine Runtime",
  };
  return descs[name] || name;
}

// ── Main Component ────────────────────────────────────────────────────────

export function SystemScreen() {
  const { status, auth } = useAva();
  const diag = useDiagnostics();
  const runCmd = useRunCommand();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hwStats, setHwStats] = useState<SystemHardwareStats | null>(null);
  const [loadingHw, setLoadingHw] = useState(true);

  const [pm2Processes, setPm2Processes] = useState<Pm2Process[]>([]);
  const [systemdServices, setSystemdServices] = useState<SystemdService[]>([]);
  const [loadingPm2, setLoadingPm2] = useState(false);
  const [loadingSystemd, setLoadingSystemd] = useState(false);
  const [expandedPm2, setExpandedPm2] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Command to read hardware RAM/ROM/CPU/Load stats
  const fetchHardwareStats = useCallback(async () => {
    try {
      const pythonCmd = `python3 -c "import os,shutil,json,socket,platform; l=os.getloadavg(); c=os.cpu_count() or 1; m=dict(x.split(':') for x in open('/proc/meminfo') if ':' in x); tm=int(m['MemTotal'].split()[0])//1024; am=int(m.get('MemAvailable',m['MemFree']).split()[0])//1024; dt,du,df=shutil.disk_usage('/'); print(json.dumps({'cores':c,'load':[round(x,2) for x in l],'loadPct':round(min(100,(l[0]/c)*100),1),'ramTotal':tm,'ramUsed':tm-am,'ramFree':am,'ramPct':round(((tm-am)/tm)*100,1),'diskTotal':round(dt/(1024**3),1),'diskUsed':round(du/(1024**3),1),'diskFree':round(df/(1024**3),1),'diskPct':round((du/dt)*100,1),'uptime':int(float(open('/proc/uptime').read().split()[0])),'hostname':socket.gethostname(),'os':platform.platform()}))" 2>/dev/null`;
      const res = await runCmd.mutateAsync({ command: pythonCmd, cwd: "/root" });
      const raw = res.stdout?.trim();
      if (raw && raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        setHwStats(parsed);
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoadingHw(false);
    }
  }, [runCmd]);

  const loadPm2 = useCallback(async () => {
    setLoadingPm2(true);
    try {
      const result = await runCmd.mutateAsync({
        command: "pm2 jlist 2>/dev/null || echo '[]'",
        cwd: "/root",
      });
      const stdout = result.stdout?.trim() || "[]";
      const parsed = JSON.parse(stdout);
      setPm2Processes(
        Array.isArray(parsed)
          ? parsed.map((p: any) => ({
              name: p.name || p.pm2_env?.name || "?",
              pid: p.pid || 0,
              status: p.pm2_env?.status || "unknown",
              cpu: `${p.monit?.cpu ?? 0}%`,
              memory: p.monit?.memory
                ? `${(p.monit.memory / 1024 / 1024).toFixed(1)}MB`
                : "—",
              uptime: p.pm2_env?.pm_uptime
                ? formatUptimeMs(p.pm2_env.pm_uptime)
                : "—",
              restarts: p.pm2_env?.restart_time ?? 0,
            }))
          : []
      );
    } catch {
      setPm2Processes([]);
    } finally {
      setLoadingPm2(false);
    }
  }, [runCmd]);

  const loadSystemd = useCallback(async () => {
    setLoadingSystemd(true);
    try {
      const services = ["ava-server", "nginx", "redis", "postgresql", "docker"];
      const result = await runCmd.mutateAsync({
        command: `for s in ${services.join(" ")}; do systemctl is-active $s 2>/dev/null || echo "inactive"; done`,
        cwd: "/root",
      });
      const lines = result.stdout?.trim().split("\n") || [];
      setSystemdServices(
        services.map((name, i) => ({
          name,
          loaded: "loaded",
          active: (lines[i] || "unknown").trim(),
          status: (lines[i] || "unknown").trim(),
          description: getServiceDescription(name),
        }))
      );
    } catch {
      setSystemdServices([]);
    } finally {
      setLoadingSystemd(false);
    }
  }, [runCmd]);

  const handleRefreshAll = useCallback(() => {
    void diag.refetch();
    void fetchHardwareStats();
    void loadPm2();
    void loadSystemd();
  }, [diag, fetchHardwareStats, loadPm2, loadSystemd]);

  // Initial load
  useEffect(() => {
    void fetchHardwareStats();
    void loadPm2();
    void loadSystemd();
  }, [fetchHardwareStats, loadPm2, loadSystemd]);

  // Auto-refresh interval (every 4s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void diag.refetch();
      void fetchHardwareStats();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, diag, fetchHardwareStats]);

  const handlePm2Action = useCallback(
    async (action: string, processName: string) => {
      setActionLoading(`${action}-${processName}`);
      try {
        await runCmd.mutateAsync({
          command: `pm2 ${action} ${processName}`,
          cwd: "/root",
        });
        setTimeout(loadPm2, 1200);
      } catch {
        Alert.alert("Error", `Failed to ${action} ${processName}`);
      } finally {
        setActionLoading(null);
      }
    },
    [runCmd, loadPm2]
  );

  const handleSystemdAction = useCallback(
    async (action: string, serviceName: string) => {
      setActionLoading(`${action}-${serviceName}`);
      try {
        await runCmd.mutateAsync({
          command: `systemctl ${action} ${serviceName}`,
          cwd: "/root",
        });
        setTimeout(loadSystemd, 1200);
      } catch {
        Alert.alert("Error", `Failed to ${action} ${serviceName}`);
      } finally {
        setActionLoading(null);
      }
    },
    [runCmd, loadSystemd]
  );

  // Helper values for hardware calculations
  const loadVal = hwStats?.load[0] ?? 0;
  const loadPct = hwStats?.loadPct ?? 0;
  const loadVariant =
    loadPct >= 85 ? "destructive" : loadPct >= 65 ? "warning" : "success";

  const ramPct = hwStats?.ramPct ?? 0;
  const ramVariant =
    ramPct >= 90 ? "destructive" : ramPct >= 75 ? "warning" : "primary";

  const diskPct = hwStats?.diskPct ?? 0;
  const diskVariant =
    diskPct >= 90 ? "destructive" : diskPct >= 80 ? "warning" : "cyan";

  const isRefreshing =
    diag.isFetching || loadingHw || loadingPm2 || loadingSystemd;

  return (
    <AppShell
      title="System Status"
      actions={
        <GlassIconButton
          icon={RefreshCw}
          size={16}
          onPress={handleRefreshAll}
          disabled={isRefreshing}
        />
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshAll}
            tintColor={COLORS.primary}
          />
        }
      >
        <PageIntro
          title="Hardware & Services"
          description="Live telemetry of CPU load, RAM memory, ROM disk storage, and host daemons."
        />

        {/* ── 1. Hero Connection & Live Status ── */}
        <Surface style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconBox}>
              <StatusDot status={status} size={10} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.heroTitleRow}>
                <Text style={[styles.heroTitle, font("semibold")]}>
                  {status === "online" ? "Host Connected" : `Server ${status}`}
                </Text>
                <GlassCapsule
                  label={status.toUpperCase()}
                  variant={status === "online" ? "success" : "destructive"}
                  size="xs"
                />
              </View>
              <Text style={[styles.heroSub, mono("regular")]} numberOfLines={1}>
                {auth?.serverUrl || "ws://127.0.0.1:4096"}
              </Text>
            </View>
          </View>

          <GlassCapsule
            label={autoRefresh ? "LIVE" : "PAUSED"}
            variant={autoRefresh ? "primary" : "secondary"}
            size="sm"
            active={autoRefresh}
            statusDot={autoRefresh ? "online" : "offline"}
            onPress={() => setAutoRefresh((p) => !p)}
          />
        </Surface>

        {/* ── 2. Quick Hardware Capsule Badges ── */}
        <View style={styles.quickCapsulesRow}>
          {loadingHw && !hwStats ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SkeletonCapsule width={95} height={30} />
              <SkeletonCapsule width={95} height={30} />
              <SkeletonCapsule width={95} height={30} />
            </View>
          ) : (
            <>
              <GlassCapsule
                icon={Zap}
                label="Load"
                value={`${loadVal} (${loadPct}%)`}
                variant={loadVariant}
                size="sm"
              />
              <GlassCapsule
                icon={Cpu}
                label="RAM"
                value={`${ramPct}%`}
                variant={ramVariant}
                size="sm"
              />
              <GlassCapsule
                icon={HardDrive}
                label="ROM"
                value={`${diskPct}%`}
                variant={diskVariant}
                size="sm"
              />
              {hwStats && (
                <GlassCapsule
                  icon={Clock}
                  label="Up"
                  value={formatDuration(hwStats.uptime)}
                  variant="default"
                  size="sm"
                />
              )}
            </>
          )}
        </View>

        {/* ── 3. CPU & Load Average Gauge Card ── */}
        <View style={styles.section}>
          <SectionHeader
            icon={Zap}
            title="CPU & Load Average"
            badge={
              hwStats ? (
                <GlassCapsule
                  label={`${hwStats.cores} Cores`}
                  variant="secondary"
                  size="xs"
                />
              ) : null
            }
          />

          {loadingHw && !hwStats ? (
            <SkeletonCard />
          ) : (
            <Surface style={styles.metricCard}>
              <View style={styles.metricCardTop}>
                <View style={styles.metricIconWrap}>
                  <Zap size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metricCardTitle, font("semibold")]}>
                    Processor Activity
                  </Text>
                  <Text style={[styles.metricCardSubtitle, font("regular")]}>
                    Current utilization relative to {hwStats?.cores ?? 1} CPU cores
                  </Text>
                </View>
                <GlassCapsule
                  label={`${loadPct}%`}
                  variant={loadVariant}
                  size="md"
                  active
                />
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(4, loadPct))}%`,
                      backgroundColor:
                        loadPct >= 85
                          ? COLORS.destructive
                          : loadPct >= 65
                          ? COLORS.warning
                          : COLORS.primary,
                    },
                  ]}
                />
              </View>

              {/* Capsules for 1m, 5m, 15m load intervals */}
              <View style={styles.loadIntervalRow}>
                <GlassCapsule
                  label="1 min"
                  value={hwStats?.load[0] ?? 0}
                  variant="default"
                  size="xs"
                />
                <GlassCapsule
                  label="5 min"
                  value={hwStats?.load[1] ?? 0}
                  variant="default"
                  size="xs"
                />
                <GlassCapsule
                  label="15 min"
                  value={hwStats?.load[2] ?? 0}
                  variant="default"
                  size="xs"
                />
                <GlassCapsule
                  label="Capacity"
                  value={`${loadPct}%`}
                  variant={loadVariant}
                  size="xs"
                />
              </View>
            </Surface>
          )}
        </View>

        {/* ── 4. Memory (RAM) Gauge Card ── */}
        <View style={styles.section}>
          <SectionHeader
            icon={Cpu}
            title="System Memory (RAM)"
            badge={
              hwStats ? (
                <GlassCapsule
                  label={`${hwStats.ramPct}%`}
                  variant={ramVariant}
                  size="xs"
                />
              ) : null
            }
          />

          {loadingHw && !hwStats ? (
            <SkeletonCard />
          ) : (
            <Surface style={styles.metricCard}>
              <View style={styles.metricCardTop}>
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: "rgba(59,179,96,0.12)" },
                  ]}
                >
                  <Cpu size={18} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metricCardTitle, font("semibold")]}>
                    RAM Allocation
                  </Text>
                  <Text style={[styles.metricCardSubtitle, font("regular")]}>
                    {hwStats
                      ? `${(hwStats.ramUsed / 1024).toFixed(1)} GB used of ${(
                          hwStats.ramTotal / 1024
                        ).toFixed(1)} GB total`
                      : "Calculating memory..."}
                  </Text>
                </View>
                <GlassCapsule
                  label={`${hwStats?.ramPct ?? 0}%`}
                  variant={ramVariant}
                  size="md"
                  active
                />
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(4, ramPct))}%`,
                      backgroundColor:
                        ramPct >= 90
                          ? COLORS.destructive
                          : ramPct >= 75
                          ? COLORS.warning
                          : COLORS.success,
                    },
                  ]}
                />
              </View>

              {/* Sub metrics */}
              <View style={styles.resourceGrid}>
                <View style={styles.resourceItem}>
                  <Text style={[styles.resourceLabel, font("regular")]}>
                    Used
                  </Text>
                  <Text style={[styles.resourceValue, mono("bold")]}>
                    {hwStats
                      ? `${(hwStats.ramUsed / 1024).toFixed(2)} GB`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.resourceDivider} />
                <View style={styles.resourceItem}>
                  <Text style={[styles.resourceLabel, font("regular")]}>
                    Free
                  </Text>
                  <Text style={[styles.resourceValue, mono("bold")]}>
                    {hwStats
                      ? `${(hwStats.ramFree / 1024).toFixed(2)} GB`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.resourceDivider} />
                <View style={styles.resourceItem}>
                  <Text style={[styles.resourceLabel, font("regular")]}>
                    Total
                  </Text>
                  <Text style={[styles.resourceValue, mono("bold")]}>
                    {hwStats
                      ? `${(hwStats.ramTotal / 1024).toFixed(2)} GB`
                      : "—"}
                  </Text>
                </View>
              </View>
            </Surface>
          )}
        </View>

        {/* ── 5. Disk Storage (ROM) Gauge Card ── */}
        <View style={styles.section}>
          <SectionHeader
            icon={HardDrive}
            title="Disk Storage (ROM)"
            badge={
              hwStats ? (
                <GlassCapsule
                  label={`${hwStats.diskPct}%`}
                  variant={diskVariant}
                  size="xs"
                />
              ) : null
            }
          />

          {loadingHw && !hwStats ? (
            <SkeletonCard />
          ) : (
            <Surface style={styles.metricCard}>
              <View style={styles.metricCardTop}>
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: "rgba(6,182,212,0.12)" },
                  ]}
                >
                  <HardDrive size={18} color="#06B6D4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metricCardTitle, font("semibold")]}>
                    Primary Disk Partition (/)
                  </Text>
                  <Text style={[styles.metricCardSubtitle, font("regular")]}>
                    {hwStats
                      ? `${hwStats.diskUsed} GB used of ${hwStats.diskTotal} GB capacity`
                      : "Calculating disk..."}
                  </Text>
                </View>
                <GlassCapsule
                  label={`${hwStats?.diskPct ?? 0}%`}
                  variant={diskVariant}
                  size="md"
                  active
                />
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(4, diskPct))}%`,
                      backgroundColor:
                        diskPct >= 90
                          ? COLORS.destructive
                          : diskPct >= 80
                          ? COLORS.warning
                          : "#06B6D4",
                    },
                  ]}
                />
              </View>

              {/* Sub metrics */}
              <View style={styles.resourceGrid}>
                <View style={styles.resourceItem}>
                  <Text style={[styles.resourceLabel, font("regular")]}>
                    Used
                  </Text>
                  <Text style={[styles.resourceValue, mono("bold")]}>
                    {hwStats ? `${hwStats.diskUsed} GB` : "—"}
                  </Text>
                </View>
                <View style={styles.resourceDivider} />
                <View style={styles.resourceItem}>
                  <Text style={[styles.resourceLabel, font("regular")]}>
                    Free
                  </Text>
                  <Text style={[styles.resourceValue, mono("bold")]}>
                    {hwStats ? `${hwStats.diskFree} GB` : "—"}
                  </Text>
                </View>
                <View style={styles.resourceDivider} />
                <View style={styles.resourceItem}>
                  <Text style={[styles.resourceLabel, font("regular")]}>
                    Total
                  </Text>
                  <Text style={[styles.resourceValue, mono("bold")]}>
                    {hwStats ? `${hwStats.diskTotal} GB` : "—"}
                  </Text>
                </View>
              </View>
            </Surface>
          )}
        </View>

        {/* ── 6. Host Details & Daemon Telemetry ── */}
        <View style={styles.section}>
          <SectionHeader icon={Terminal} title="Host Details" />
          <Surface style={styles.detailsCard}>
            <View style={styles.detailsRow}>
              <Text style={[styles.detailsLabel, font("regular")]}>Hostname</Text>
              <GlassCapsule
                label={hwStats?.hostname || "ad.thundernexus.com"}
                variant="secondary"
                size="xs"
              />
            </View>

            <View style={styles.detailsDivider} />

            <View style={styles.detailsRow}>
              <Text style={[styles.detailsLabel, font("regular")]}>OS & Kernel</Text>
              <Text style={[styles.detailsValue, mono("medium")]} numberOfLines={1}>
                {hwStats?.os || "Linux x86_64"}
              </Text>
            </View>

            <View style={styles.detailsDivider} />

            <View style={styles.detailsRow}>
              <Text style={[styles.detailsLabel, font("regular")]}>
                System Uptime
              </Text>
              <Text style={[styles.detailsValue, mono("bold")]}>
                {hwStats ? formatDuration(hwStats.uptime) : "—"}
              </Text>
            </View>

            {diag.data?.processId && (
              <>
                <View style={styles.detailsDivider} />
                <View style={styles.detailsRow}>
                  <Text style={[styles.detailsLabel, font("regular")]}>
                    AvA Server PID
                  </Text>
                  <GlassCapsule
                    label={`PID #${diag.data.processId}`}
                    variant="primary"
                    size="xs"
                  />
                </View>
              </>
            )}
          </Surface>
        </View>

        {/* ── 7. PM2 Process Manager ── */}
        <View style={styles.section}>
          <SectionHeader
            icon={Layers}
            title="PM2 Processes"
            badge={
              pm2Processes.length > 0 ? (
                <GlassCapsule
                  label={`${pm2Processes.length} Managed`}
                  variant="secondary"
                  size="xs"
                />
              ) : null
            }
          />
          {loadingPm2 ? (
            <SkeletonRows count={2} />
          ) : pm2Processes.length === 0 ? (
            <Surface style={styles.emptyCard}>
              <Text style={[styles.emptyText, font("regular")]}>
                No PM2 processes found.
              </Text>
            </Surface>
          ) : (
            <Surface style={styles.listCard}>
              {pm2Processes.map((proc) => {
                const isOnline = proc.status === "online";
                return (
                  <View key={proc.name}>
                    <TouchableOpacity
                      style={styles.processRow}
                      onPress={() =>
                        setExpandedPm2((p) => ({
                          ...p,
                          [proc.name]: !p[proc.name],
                        }))
                      }
                      activeOpacity={0.7}
                    >
                      <StatusIcon status={proc.status} />
                      <View style={styles.processInfo}>
                        <Text style={[styles.processName, mono("medium")]}>
                          {proc.name}
                        </Text>
                        <Text style={[styles.processMeta, font("regular")]}>
                          PID {proc.pid} · RAM {proc.memory} · CPU {proc.cpu}
                        </Text>
                      </View>
                      <GlassCapsule
                        label={proc.status.toUpperCase()}
                        variant={
                          isOnline
                            ? "success"
                            : proc.status === "errored"
                            ? "destructive"
                            : "warning"
                        }
                        size="xs"
                      />
                      <ChevronRight
                        size={14}
                        color={COLORS.mutedForeground}
                        style={{
                          transform: [
                            {
                              rotate: expandedPm2[proc.name]
                                ? "90deg"
                                : "0deg",
                            },
                          ],
                        }}
                      />
                    </TouchableOpacity>

                    {expandedPm2[proc.name] && (
                      <View style={styles.processActions}>
                        <ActionButton
                          icon={RotateCcw}
                          label="Restart"
                          color={COLORS.primary}
                          onPress={() => handlePm2Action("restart", proc.name)}
                          loading={actionLoading === `restart-${proc.name}`}
                        />
                        <ActionButton
                          icon={Square}
                          label="Stop"
                          color={COLORS.destructive}
                          onPress={() => handlePm2Action("stop", proc.name)}
                          loading={actionLoading === `stop-${proc.name}`}
                        />
                        <ActionButton
                          icon={Play}
                          label="Start"
                          color={COLORS.success}
                          onPress={() => handlePm2Action("start", proc.name)}
                          loading={actionLoading === `start-${proc.name}`}
                        />
                        <View style={styles.processStats}>
                          <Text style={[styles.processStatText, mono("regular")]}>
                            Uptime: {proc.uptime} · Restarts: {proc.restarts}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </Surface>
          )}
        </View>

        {/* ── 8. Systemd Services ── */}
        <View style={styles.section}>
          <SectionHeader
            icon={Server}
            title="Systemd Services"
            badge={
              systemdServices.length > 0 ? (
                <GlassCapsule
                  label={`${systemdServices.length} Monitored`}
                  variant="secondary"
                  size="xs"
                />
              ) : null
            }
          />
          {loadingSystemd ? (
            <SkeletonRows count={3} />
          ) : systemdServices.length === 0 ? (
            <Surface style={styles.emptyCard}>
              <Text style={[styles.emptyText, font("regular")]}>
                Could not inspect systemd services.
              </Text>
            </Surface>
          ) : (
            <Surface style={styles.listCard}>
              {systemdServices.map((svc) => {
                const isActive = svc.active === "active";
                return (
                  <View key={svc.name} style={styles.serviceRow}>
                    <StatusIcon status={svc.active} />
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, mono("medium")]}>
                        {svc.name}
                      </Text>
                      <Text style={[styles.serviceDesc, font("regular")]}>
                        {svc.description}
                      </Text>
                    </View>
                    <GlassCapsule
                      label={svc.active.toUpperCase()}
                      variant={isActive ? "success" : "default"}
                      size="xs"
                    />
                    <TouchableOpacity
                      style={styles.serviceActionBtn}
                      onPress={() =>
                        handleSystemdAction(
                          isActive ? "restart" : "start",
                          svc.name
                        )
                      }
                      disabled={actionLoading?.includes(svc.name)}
                      activeOpacity={0.7}
                    >
                      {actionLoading ===
                      `${isActive ? "restart" : "start"}-${svc.name}` ? (
                        <ActivityIndicator
                          size={12}
                          color={COLORS.mutedForeground}
                        />
                      ) : (
                        <RotateCcw size={12} color={COLORS.mutedForeground} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </Surface>
          )}
        </View>

        {/* ── 9. Ecosystem Daemons ── */}
        <View style={styles.section}>
          <SectionHeader icon={ShieldCheck} title="Ecosystem Daemons" />
          <Surface style={styles.listCard}>
            <View style={styles.ecoRow}>
              <View style={styles.ecoIconBox}>
                <Globe size={15} color={COLORS.primary} />
              </View>
              <View style={styles.ecoInfo}>
                <Text style={[styles.ecoTitle, font("semibold")]}>
                  AI Gateway Router
                </Text>
                <Text style={[styles.ecoSub, mono("regular")]}>
                  Multi-Provider Gateway
                </Text>
              </View>
              <GlassCapsule label="RUNNING" variant="success" size="xs" />
            </View>

            <View style={styles.detailsDivider} />

            <View style={styles.ecoRow}>
              <View style={styles.ecoIconBox}>
                <Database size={15} color={COLORS.primary} />
              </View>
              <View style={styles.ecoInfo}>
                <Text style={[styles.ecoTitle, font("semibold")]}>
                  MCP Bridge Service
                </Text>
                <Text style={[styles.ecoSub, mono("regular")]}>
                  Tools & Context Host
                </Text>
              </View>
              <GlassCapsule label="ACTIVE" variant="success" size="xs" />
            </View>
          </Surface>
        </View>
      </ScrollView>
    </AppShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },

  // Hero
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: 12,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  heroIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  heroSub: {
    fontSize: 11.5,
    color: COLORS.mutedForeground,
  },

  // Quick Capsules Row
  quickCapsulesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  // Metric Cards (CPU, RAM, ROM)
  metricCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  metricCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(66, 64, 225, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  metricCardTitle: {
    fontSize: 13.5,
    color: COLORS.foreground,
  },
  metricCardSubtitle: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  loadIntervalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },

  // Resource Grid (Used / Free / Total)
  resourceGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  resourceItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  resourceLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  resourceValue: {
    fontSize: 12.5,
    color: COLORS.foreground,
  },
  resourceDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },

  // Details Card
  detailsCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  detailsLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  detailsValue: {
    fontSize: 12,
    color: COLORS.foreground,
    maxWidth: "60%",
  },
  detailsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },

  // Lists (PM2 & Systemd)
  listCard: {
    borderRadius: 16,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  processRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  processInfo: { flex: 1, gap: 2 },
  processName: { fontSize: 13, color: COLORS.foreground },
  processMeta: { fontSize: 11, color: COLORS.mutedForeground },
  processActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingBottom: 8,
    flexWrap: "wrap",
  },
  processStats: { marginLeft: "auto" },
  processStatText: { fontSize: 10.5, color: COLORS.mutedForeground },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: COLORS.secondary,
  },
  actionText: { fontSize: 11 },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  serviceInfo: { flex: 1, gap: 2 },
  serviceName: { fontSize: 13, color: COLORS.foreground },
  serviceDesc: { fontSize: 11, color: COLORS.mutedForeground },
  serviceActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },

  ecoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  ecoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ecoInfo: { flex: 1, gap: 2 },
  ecoTitle: { fontSize: 13, color: COLORS.foreground },
  ecoSub: { fontSize: 11, color: COLORS.mutedForeground },

  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12.5,
    color: COLORS.mutedForeground,
  },
});
