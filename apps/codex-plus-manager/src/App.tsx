import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  CircleArrowUp,
  Copy,
  Download,
  Edit3,
  GripVertical,
  Info,
  ExternalLink,
  Hammer,
  KeyRound,
  Languages,
  LayoutDashboard,
  MessageCircle,
  FileCode2,
  Moon,
  Network,
  Power,
  PowerOff,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Star,
  Stethoscope,
  Sun,
  TestTube,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialSwitch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isGitHubRepositoryHomepage } from "./github-repository";
import { getLanguage, t, tf, toggleLanguage } from "@/i18n";

const isWindowsPlatform = /\bWindows\b/i.test(navigator.userAgent);

type Status = "ok" | "failed" | "not_implemented" | "not_checked" | string;

type CommandResult<T> = T & {
  status: Status;
  message: string;
};

type PathState = {
  status: string;
  path: string | null;
};

type LaunchStatus = {
  status: string;
  message: string;
  started_at_ms: number;
  debug_port: number | null;
  helper_port: number | null;
  codex_app: string | null;
};

type OverviewResult = CommandResult<{
  codex_app: PathState;
  codex_version: string | null;
  silent_shortcut: PathState;
  management_shortcut: PathState;
  latest_launch: LaunchStatus | null;
  current_version: string;
  update_status: string;
  settings_path: string;
  logs_path: string;
}>;

type PluginMarketplaceRepairResult = CommandResult<{
  codexHome: string;
  marketplaceRoot?: string | null;
  initialized: boolean;
  configured: boolean;
  needsRepair: boolean;
}>;

type PluginMarketplaceStatusResult = CommandResult<{
  codexHome: string;
  marketplaceRoot?: string | null;
  configRegistered: boolean;
  needsRepair: boolean;
}>;

type RemotePluginMarketplaceResult = CommandResult<{
  codexHome: string;
  marketplaceRoot?: string | null;
  configRegistered: boolean;
  needsRepair: boolean;
  pluginCount: number;
  skillCount: number;
}>;

type BackendSettings = {
  codexAppPath: string;
  codexExtraArgs: string[];
  enhancementsEnabled: boolean;
  computerUseGuardEnabled: boolean;
  codexAppPluginMarketplaceUnlock: boolean;
  codexAppPluginAutoExpand: boolean;
  codexAppModelWhitelistUnlock: boolean;
  codexAppSessionDelete: boolean;
  codexAppMarkdownExport: boolean;
  codexAppPasteFix: boolean;
  codexAppForceChineseLocale: boolean;
  codexAppFastStartup: boolean;
  codexAppProjectMove: boolean;
  codexAppThreadIdBadge: boolean;
  codexAppConversationView: boolean;
  codexAppThreadScrollRestore: boolean;
  codexAppZedRemoteOpen: boolean;
  zedRemoteOpenStrategy: ZedOpenStrategy;
  zedRemoteProjectRegistryEnabled: boolean;
  zedRemoteSyncToZedSettings: boolean;
  codexAppUpstreamWorktreeCreate: boolean;
  codexAppNativeMenuPlacement: boolean;
  codexAppNativeMenuLocalization: boolean;
  codexAppServiceTierControls: boolean;
  codexAppPetRealMouseLook: boolean;
  codexAppStepwiseEnabled: boolean;
  codexAppStepwiseDirectSend: boolean;
  codexAppStepwiseBaseUrl: string;
  codexAppStepwiseApiKey: string;
  codexAppStepwiseApiKeyEnv: string;
  codexAppStepwiseModel: string;
  codexAppStepwiseMaxItems: number;
  codexAppStepwiseMaxInputChars: number;
  codexAppStepwiseMaxOutputTokens: number;
  codexAppStepwiseTimeoutMs: number;
  codexAppImageOverlayEnabled: boolean;
  codexAppImageOverlayPath: string;
  codexAppImageOverlayOpacity: number;
  codexAppImageOverlayFitMode: ImageOverlayFitMode;
  codexGoalsEnabled: boolean;
  relayCommonConfigContents: string;
  relayContextConfigContents: string;
};

type ZedOpenStrategy = "addToFocusedWorkspace" | "reuseWindow" | "newWindow" | "default";
type ImageOverlayFitMode = "fill" | "fit" | "stretch" | "tile" | "center";

type ContextKind = "mcp" | "skill" | "plugin";

type CodexContextEntry = {
  id: string;
  kind: ContextKind;
  title: string;
  summary: string;
  tomlBody: string;
  enabled: boolean;
};

type CodexContextEntries = {
  mcpServers: CodexContextEntry[];
  skills: CodexContextEntry[];
  plugins: CodexContextEntry[];
};

const SCRIPT_MARKET_REPOSITORY_URL = "https://github.com/BigPizzaV3/CodexPlusPlusScriptMarket";

type UserScriptInventory = {
  enabled?: boolean;
  scripts?: Array<{
    key: string;
    name: string;
    source: string;
    enabled: boolean;
    status: string;
    error: string;
    market_id?: string;
    version?: string;
    installed?: boolean;
    source_url?: string;
    homepage?: string;
  }>;
};

type SettingsResult = CommandResult<{
  settings: BackendSettings;
  settings_path: string;
  user_scripts: UserScriptInventory;
}>;

type LocalSession = {
  id: string;
  title: string;
  cwd: string;
  archived: boolean;
  updatedAtMs: number | null;
  rolloutPath: string;
  dbPath: string;
};

type LocalSessionsResult = CommandResult<{
  dbPath: string;
  dbPaths: string[];
  sessions: LocalSession[];
  offset: number;
  limit: number;
  hasMore: boolean;
}>;

type ZedRemoteProject = {
  id: string;
  label: string;
  hostId: string;
  ssh: {
    user: string;
    host: string;
    port: number | null;
  };
  path: string;
  url: string;
  source: "currentThread" | "codexRemoteProject" | "threadWorkspaceHint" | "sqliteThreadCwd" | "recent" | string;
  lastOpenedAtMs: number | null;
  isCurrent: boolean;
};

type ZedRemoteProjectsResult = CommandResult<{
  projects: ZedRemoteProject[];
}>;

type ZedRemoteOpenResult = CommandResult<{
  url: string;
  strategy: ZedOpenStrategy;
}>;

type DeleteLocalSessionResult = CommandResult<{
  status: string;
  session_id: string;
  message: string;
  undo_token: string | null;
  backup_path: string | null;
}>;

type ContextEntriesResult = CommandResult<{
  settings: BackendSettings;
  entries: CodexContextEntries;
}>;

type LiveContextEntriesResult = CommandResult<{
  entries: CodexContextEntries;
}>;

type StepwiseTestResult = CommandResult<{
  itemCount: number;
  error: string;
}>;

type TaskProgress = {
  active: boolean;
  percent: number;
  message: string;
};

type LogsResult = CommandResult<{
  path: string;
  text: string;
  lines: number;
}>;

type DiagnosticsResult = CommandResult<{
  report: string;
}>;

type WatcherResult = CommandResult<{
  enabled: boolean;
  disabled_flag: string;
}>;

type InstallResult = CommandResult<{
  silent_shortcut: { installed: boolean; path: string | null };
  management_shortcut: { installed: boolean; path: string | null };
}>;

type UpdateResult = CommandResult<{
  currentVersion: string;
  latestVersion?: string | null;
  releaseSummary?: string;
  assetName?: string | null;
  assetUrl?: string | null;
  updateAvailable?: boolean;
  installedPath?: string;
  progress?: number;
}>;

type ScriptMarketItem = {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  homepage: string;
  script_url: string;
  sha256: string;
  installed: boolean;
  installedVersion: string;
  updateAvailable: boolean;
};

type ScriptMarketResult = CommandResult<{
  market: {
    status: string;
    message: string;
    indexUrl: string;
    updatedAt: string;
    scripts: ScriptMarketItem[];
  };
  user_scripts: UserScriptInventory;
}>;

function syncMarketInstalledState(current: ScriptMarketResult | null, userScripts: UserScriptInventory): ScriptMarketResult | null {
  if (!current) return current;
  const installed = new Map(
    (userScripts.scripts ?? [])
      .filter((script) => script.market_id)
      .map((script) => [script.market_id || "", script.version || ""]),
  );
  return {
    ...current,
    user_scripts: userScripts,
    market: {
      ...current.market,
      scripts: current.market.scripts.map((script) => {
        const installedVersion = installed.get(script.id) || "";
        return {
          ...script,
          installed: Boolean(installedVersion),
          installedVersion,
          updateAvailable: Boolean(installedVersion) && installedVersion !== script.version,
        };
      }),
    },
  };
}

type StartupResult = CommandResult<{
  showUpdate: boolean;
}>;

type Route = "overview" | "sessions" | "context" | "enhance" | "zedRemote" | "userScripts" | "maintenance" | "about" | "settings";
type Theme = "dark" | "light";

const routes: Array<{ id: Route; label: string; icon: LucideIcon; badge?: string }> = [
  { id: "overview", label: t("概览"), icon: LayoutDashboard },
  { id: "sessions", label: t("会话管理"), icon: MessageCircle },
  { id: "context", label: t("工具与插件"), icon: Network },
  { id: "enhance", label: t("Codex增强"), icon: Hammer },
  { id: "zedRemote", label: t("Zed 远程项目"), icon: ExternalLink },
  { id: "userScripts", label: t("脚本市场"), icon: FileCode2 },
  { id: "maintenance", label: t("安装维护"), icon: Wrench },
  { id: "about", label: t("关于"), icon: Info },
  { id: "settings", label: t("设置"), icon: Settings },
];

const defaultSettings: BackendSettings = {
  codexAppPath: "",
  codexExtraArgs: [],
  enhancementsEnabled: true,
  computerUseGuardEnabled: false,
  codexAppPluginMarketplaceUnlock: true,
  codexAppPluginAutoExpand: true,
  codexAppModelWhitelistUnlock: true,
  codexAppSessionDelete: true,
  codexAppMarkdownExport: true,
  codexAppPasteFix: false,
  codexAppForceChineseLocale: true,
  codexAppFastStartup: false,
  codexAppProjectMove: true,
  codexAppThreadIdBadge: false,
  codexAppConversationView: false,
  codexAppThreadScrollRestore: true,
  codexAppZedRemoteOpen: true,
  zedRemoteOpenStrategy: "addToFocusedWorkspace",
  zedRemoteProjectRegistryEnabled: true,
  zedRemoteSyncToZedSettings: false,
  codexAppUpstreamWorktreeCreate: true,
  codexAppNativeMenuPlacement: true,
  codexAppNativeMenuLocalization: true,
  codexAppServiceTierControls: false,
  codexAppPetRealMouseLook: false,
  codexAppStepwiseEnabled: false,
  codexAppStepwiseDirectSend: false,
  codexAppStepwiseBaseUrl: "",
  codexAppStepwiseApiKey: "",
  codexAppStepwiseApiKeyEnv: "CODEX_STEPWISE_API_KEY",
  codexAppStepwiseModel: "",
  codexAppStepwiseMaxItems: 6,
  codexAppStepwiseMaxInputChars: 6000,
  codexAppStepwiseMaxOutputTokens: 500,
  codexAppStepwiseTimeoutMs: 8000,
  codexAppImageOverlayEnabled: false,
  codexAppImageOverlayPath: "",
  codexAppImageOverlayOpacity: 35,
  codexAppImageOverlayFitMode: "fit",
  codexGoalsEnabled: false,
  relayCommonConfigContents: "",
  relayContextConfigContents: "",
};

export function App() {
  const [theme, setTheme] = useState<Theme>(() => loadInitialTheme());
  const [route, setRoute] = useState<Route>(() => loadInitialRoute());
  const [notice, setNotice] = useState<{ title: string; message: string; status?: Status } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const [overview, setOverview] = useState<OverviewResult | null>(null);
  const [settings, setSettings] = useState<SettingsResult | null>(null);
  const [localSessions, setLocalSessions] = useState<LocalSessionsResult | null>(null);
  const [zedRemoteProjects, setZedRemoteProjects] = useState<ZedRemoteProjectsResult | null>(null);
  const [liveContextEntries, setLiveContextEntries] = useState<CodexContextEntries | null>(null);
  const [logs, setLogs] = useState<LogsResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [watcher, setWatcher] = useState<WatcherResult | null>(null);
  const [update, setUpdate] = useState<UpdateResult | null>(null);
  const [updateInstallProgress, setUpdateInstallProgress] = useState<TaskProgress>({
    active: false,
    percent: 0,
    message: t("尚未运行安装包更新。"),
  });
  const [scriptMarket, setScriptMarket] = useState<ScriptMarketResult | null>(null);
  const [launchForm, setLaunchForm] = useState({
    appPath: "",
    debugPort: "9229",
    helperPort: "57321",
  });
  const prevLaunchStatusRef = useRef<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<BackendSettings>({ ...defaultSettings });
  const [pluginMarketplaceProgress, setPluginMarketplaceProgress] = useState<TaskProgress>({
    active: false,
    percent: 0,
    message: t("尚未运行插件市场修复。"),
  });
  const [remotePluginMarketplace, setRemotePluginMarketplace] = useState<RemotePluginMarketplaceResult | null>(null);
  const [remotePluginMarketplaceProgress, setRemotePluginMarketplaceProgress] = useState<TaskProgress>({
    active: false,
    percent: 0,
    message: t("尚未检查官方远端插件缓存。"),
  });
  const [removeOwnedData, setRemoveOwnedData] = useState(false);

  const call = <T,>(command: string, args?: Record<string, unknown>) => invoke<T>(command, args);

  const logDiagnostic = (event: string, detail: Record<string, unknown> = {}) => {
    void invoke("write_diagnostic_event", { event, detail }).catch(() => {});
  };

  const run = async <T,>(task: () => Promise<T>): Promise<T | null> => {
    try {
      return await task();
    } catch (error) {
      showNotice(t("调用失败"), stringifyError(error), "failed");
      return null;
    }
  };

  const refreshOverview = async (silent = false) => {
    const result = await run(() => call<OverviewResult>("load_overview"));
    if (result) {
      // 崩溃检测：进程从运行状态变为停止/失败 → 弹出通知
      const prev = prevLaunchStatusRef.current;
      const current = result.latest_launch?.status;
      if (prev && prev === "running" && current && (current === "stopped" || current === "failed" || current === "crashed")) {
        showNotice(t("Codex 意外停止"), tf("进程状态：{0}。是否要重新启动？", [current]), "failed");
      }
      prevLaunchStatusRef.current = current ?? null;
      setOverview(result);
      if (!silent) showResultNotice(t("概览已检查"), result, { silentSuccess: true });
    }
  };

  const refreshSettings = async (silent = false) => {
    const result = await run(() => call<SettingsResult>("load_settings"));
    if (result) {
      setSettings(result);
      const normalized = normalizeSettings(result.settings);
      setSettingsForm(normalized);
      setLaunchForm((current) => ({
        ...current,
        appPath: current.appPath || result.settings.codexAppPath || "",
      }));
      if (!silent) showResultNotice(t("设置已加载"), result, { silentSuccess: true });
      return normalized;
    }
    return null;
  };

  const refreshScriptMarket = async (silent = false) => {
    const result = await run(() => call<ScriptMarketResult>("refresh_script_market"));
    if (result) {
      setScriptMarket(result);
      setSettings((current) => (current ? { ...current, user_scripts: result.user_scripts } : current));
      if (!silent || !isSuccessStatus(result.status)) showResultNotice(t("脚本市场"), result, { silentSuccess: true });
    }
  };

  const installMarketScript = async (id: string) => {
    const result = await run(() => call<ScriptMarketResult>("install_market_script", { id }));
    if (result) {
      setScriptMarket(result);
      setSettings((current) => (current ? { ...current, user_scripts: result.user_scripts } : current));
      showResultNotice(t("脚本市场"), result);
    }
  };

  const setUserScriptEnabled = async (key: string, enabled: boolean) => {
    const result = await run(() => call<SettingsResult>("set_user_script_enabled", { key, enabled }));
    if (result) {
      setSettings(result);
      setScriptMarket((current) => syncMarketInstalledState(current, result.user_scripts));
      showResultNotice(t("本地脚本"), result);
    }
  };

  const deleteUserScript = async (key: string) => {
    const script = settings?.user_scripts?.scripts?.find((item) => item.key === key);
    const name = script?.name || key;
    if (!window.confirm(tf("删除脚本“{0}”？此操作会移除本地脚本文件。", [name]))) return;
    const result = await run(() => call<SettingsResult>("delete_user_script", { key }));
    if (result) {
      setSettings(result);
      setScriptMarket((current) => syncMarketInstalledState(current, result.user_scripts));
      showResultNotice(t("本地脚本"), result);
    }
  };

  const refreshLocalSessions = async (silent = false, offset = 0): Promise<LocalSessionsResult | null> => {
    const result = await run(() =>
      call<LocalSessionsResult>("list_local_sessions", {
        request: { offset, limit: 50 },
      }),
    );
    if (result) {
      if (!result.sessions.length && result.offset > 0) {
        return refreshLocalSessions(silent, Math.max(0, result.offset - result.limit));
      }
      setLocalSessions(result);
      if (!silent || !isSuccessStatus(result.status)) showResultNotice(t("会话管理"), result, { silentSuccess: true });
    }
    return result;
  };

  const refreshZedRemoteProjects = async (silent = false) => {
    const result = await run(() => call<ZedRemoteProjectsResult>("list_zed_remote_projects"));
    if (result) {
      setZedRemoteProjects(result);
      if (!silent || !isSuccessStatus(result.status)) showResultNotice(t("Zed 远程项目"), result, { silentSuccess: true });
    }
    return result;
  };

  const openZedRemoteProject = async (
    project: ZedRemoteProject,
    strategy: ZedOpenStrategy = settingsForm.zedRemoteOpenStrategy || "addToFocusedWorkspace",
  ) => {
    const result = await run(() =>
      call<ZedRemoteOpenResult>("open_zed_remote", {
        payload: {
          ssh: project.ssh,
          hostId: project.hostId,
          path: project.path,
          strategy,
          remember: settingsForm.zedRemoteProjectRegistryEnabled !== false,
        },
      }),
    );
    if (result) {
      showResultNotice(t("Zed 远程打开"), result);
      await refreshZedRemoteProjects(true);
    }
  };

  const forgetZedRemoteProject = async (project: ZedRemoteProject) => {
    const result = await run(() => call<ZedRemoteProjectsResult>("forget_zed_remote_project", { id: project.id }));
    if (result) {
      setZedRemoteProjects(result);
      showResultNotice(t("Zed 远程项目"), result);
    }
  };

  const requestDeleteLocalSession = (session: LocalSession) =>
    call<DeleteLocalSessionResult>("delete_local_session", {
      request: { sessionId: session.id, title: session.title, dbPath: session.dbPath },
    });

  const confirmSessionDelete = (title: string, message: string) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText: t("确认删除"),
        cancelText: t("取消"),
        resolve,
      });
    });

  const deleteLocalSession = async (session: LocalSession) => {
    const title = session.title || session.id;
    const confirmed = await confirmSessionDelete(t("删除会话"), tf("删除会话“{0}”？此操作会删除本地数据库记录和 rollout 文件，并创建备份。", [title]));
    if (!confirmed) return;
    const result = await run(() => requestDeleteLocalSession(session));
    if (result) {
      showResultNotice(t("会话删除"), result);
      await refreshLocalSessions(true, localSessions?.offset ?? 0);
    }
  };

  const deleteLocalSessions = async (sessions: LocalSession[]) => {
    const uniqueSessions = Array.from(new Map(sessions.map((session) => [session.id, session])).values());
    if (!uniqueSessions.length) {
      showNotice(t("批量删除会话"), t("请先选择要删除的会话。"), "failed");
      return;
    }
    const preview = uniqueSessions
      .slice(0, 6)
      .map((session) => `- ${truncateSessionDeletePreview(session.title || session.id)}`)
      .join("\n");
    const extraCount = uniqueSessions.length > 6 ? tf("\n...以及另外 {0} 个会话", [uniqueSessions.length - 6]) : "";
    const confirmed = await confirmSessionDelete(
      t("批量删除会话"),
      tf("删除选中的 {0} 个会话？此操作会删除本地数据库记录和 rollout 文件，并为每个会话创建备份。\n\n{1}{2}", [uniqueSessions.length, preview, extraCount]),
    );
    if (!confirmed) return;

    let succeeded = 0;
    const failed: string[] = [];
    for (const session of uniqueSessions) {
      const result = await run(() => requestDeleteLocalSession(session));
      if (result && isSuccessStatus(result.status)) {
        succeeded += 1;
      } else {
        failed.push(session.title || session.id);
      }
    }

    if (failed.length) {
      showNotice(
        t("批量删除会话"),
        tf("已删除 {0} 个，失败 {1} 个：{2}", [succeeded, failed.length, failed.slice(0, 3).map(truncateSessionDeletePreview).join(t("、"))]),
        succeeded ? "ok" : "failed",
      );
    } else {
      showNotice(t("批量删除会话"), tf("已删除 {0} 个会话。", [succeeded]), "ok");
    }
    await refreshLocalSessions(true, localSessions?.offset ?? 0);
  };

  const refreshLiveContextEntries = async (silent = false) => {
    const result = await run(() => call<LiveContextEntriesResult>("read_live_context_entries"));
    if (result) {
      setLiveContextEntries(result.entries);
      if (!silent || !isSuccessStatus(result.status)) showResultNotice(t("工具与插件"), result, { silentSuccess: true });
    }
    return result;
  };

  const syncLiveContextEntries = async (next: BackendSettings, silent = false) => {
    const result = await run(() => call<LiveContextEntriesResult>("sync_live_context_entries", { request: { settings: next } }));
    if (result) {
      setLiveContextEntries(result.entries);
      if (!silent || !isSuccessStatus(result.status)) showResultNotice(t("工具与插件"), result, { silentSuccess: true });
    }
    return result;
  };

  const refreshLogs = async (silent = false) => {
    const result = await run(() => call<LogsResult>("read_latest_logs", { request: { lines: 240 } }));
    if (result) {
      setLogs(result);
      if (!silent) showResultNotice(t("日志已刷新"), result, { silentSuccess: true });
    }
  };

  const refreshDiagnostics = async (silent = false) => {
    const result = await run(() => call<DiagnosticsResult>("copy_diagnostics"));
    if (result) {
      setDiagnostics(result);
      if (!silent) showResultNotice(t("诊断已生成"), result, { silentSuccess: true });
    }
  };

  const refreshWatcher = async (silent = false) => {
    const result = await run(() => call<WatcherResult>("load_watcher_state"));
    if (result) {
      setWatcher(result);
      if (!silent) showResultNotice(t("Watcher 状态"), result, { silentSuccess: true });
    }
  };

  const navigate = async (next: Route) => {
    setRoute(next);
    if (next === "overview") await refreshOverview(true);
    if (next === "sessions") {
      await refreshSettings(true);
      await refreshLocalSessions(true);
    }
    if (next === "zedRemote") {
      await refreshSettings(true);
      await refreshZedRemoteProjects(true);
    }
    if (next === "context") {
      await refreshSettings(true);
      await refreshLiveContextEntries(true);
    }
    if (next === "settings") await refreshSettings(true);
    if (next === "userScripts") {
      await refreshSettings(true);
      await refreshScriptMarket(true);
    }
    if (next === "about") {
      await refreshOverview(true);
      await refreshLogs(true);
      await refreshDiagnostics(true);
    }
    if (next === "maintenance") {
      await refreshOverview(true);
      await refreshWatcher(true);
    }
  };

  const launch = async () => {
    const result = await launchCommand("launch_codex_plus");
    if (result) {
      showNotice(t("启动任务"), result.message, result.status);
      await refreshOverview(true);
    }
  };

  const restart = async () => {
    const result = await launchCommand("restart_codex_plus");
    if (result) {
      showNotice(t("重启 Codex++"), result.message, result.status);
      await refreshOverview(true);
    }
  };

  const launchCommand = async (command: "launch_codex_plus" | "restart_codex_plus") => {
    const result = await run(() =>
      call<CommandResult<Record<string, unknown>>>(command, {
        request: {
          appPath: launchForm.appPath,
          debugPort: numberOrDefault(launchForm.debugPort, 9229),
          helperPort: numberOrDefault(launchForm.helperPort, 57321),
        },
      }),
    );
    return result;
  };

  const repairPluginMarketplace = async () => {
    if (pluginMarketplaceProgress.active) return;
    setPluginMarketplaceProgress({ active: true, percent: 8, message: t("正在检查本地插件市场…") });
    const progressTimer = window.setInterval(() => {
      setPluginMarketplaceProgress((current) => {
        if (!current.active) return current;
        const nextPercent = Math.min(92, current.percent + 9);
        const message =
          nextPercent < 28
            ? t("正在连接 openai/plugins…")
            : nextPercent < 62
              ? t("正在下载插件市场快照…")
              : nextPercent < 84
                ? t("正在解压并校验插件文件…")
                : t("正在写入 Codex 配置…");
        return { ...current, percent: nextPercent, message };
      });
    }, 500);
    try {
      const result = await run(() => call<PluginMarketplaceRepairResult>("repair_plugin_marketplace"));
      if (result) {
        setPluginMarketplaceProgress({
          active: false,
          percent: 100,
          message: result.message,
        });
        showNotice(t("插件市场修复"), result.message, result.status);
      } else {
        setPluginMarketplaceProgress({
          active: false,
          percent: 100,
          message: t("插件市场修复失败，请查看错误提示后重试。"),
        });
      }
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  const refreshRemotePluginMarketplace = async (silent = false) => {
    const result = await run(() => call<RemotePluginMarketplaceResult>("remote_plugin_marketplace_status"));
    if (result) {
      setRemotePluginMarketplace(result);
      if (!silent) {
        setRemotePluginMarketplaceProgress({
          active: false,
          percent: 100,
          message: result.message,
        });
      }
      if (!silent) showNotice(t("官方远端插件缓存"), result.message, result.status);
    }
    return result;
  };

  const repairRemotePluginMarketplace = async () => {
    if (remotePluginMarketplaceProgress.active) return;
    setRemotePluginMarketplaceProgress({
      active: true,
      percent: 18,
      message: t("正在检查内置官方远端插件缓存…"),
    });
    const progressTimer = window.setInterval(() => {
      setRemotePluginMarketplaceProgress((current) => {
        if (!current.active) return current;
        const nextPercent = Math.min(92, current.percent + 18);
        const message =
          nextPercent < 50
            ? t("正在释放内置远端插件快照…")
            : nextPercent < 78
              ? t("正在注册官方远端插件市场…")
              : t("正在刷新官方远端插件缓存状态…");
        return { ...current, percent: nextPercent, message };
      });
    }, 450);
    try {
      const result = await run(() => call<RemotePluginMarketplaceResult>("repair_remote_plugin_marketplace"));
      if (result) {
        setRemotePluginMarketplace(result);
        setRemotePluginMarketplaceProgress({
          active: false,
          percent: 100,
          message: result.message,
        });
        showNotice(t("官方远端插件缓存"), result.message, result.status);
      } else {
        setRemotePluginMarketplaceProgress({
          active: false,
          percent: 100,
          message: t("官方远端插件缓存修复失败，请查看错误提示后重试。"),
        });
      }
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  const installEntrypoints = async () => {
    const result = await run(() => call<InstallResult>("install_entrypoints"));
    if (result) {
      showNotice(t("入口安装"), result.message, result.status);
      await refreshOverview(true);
    }
  };

  const uninstallEntrypoints = async () => {
    const result = await run(() =>
      call<InstallResult>("uninstall_entrypoints", {
        options: { removeOwnedData },
      }),
    );
    if (result) {
      showNotice(t("入口卸载"), result.message, result.status);
      await refreshOverview(true);
    }
  };

  const repairShortcuts = async () => {
    const result = await run(() => call<InstallResult>("repair_shortcuts"));
    if (result) {
      showNotice(t("快捷方式修复"), result.message, result.status);
      await refreshOverview(true);
    }
  };

  const watcherAction = async (command: string) => {
    const result = await run(() => call<WatcherResult>(command));
    if (result) {
      setWatcher(result);
      showNotice(t("Watcher 操作"), result.message, result.status);
    }
  };

  const checkUpdate = async (silent = false) => {
    const result = await run(() => call<UpdateResult>("check_update"));
    if (result) {
      setUpdate(result);
      if (!silent || result.updateAvailable) {
        showNotice(t("GitHub Release 检查"), result.message, result.status);
      }
    }
  };

  const performUpdate = async () => {
    if (updateInstallProgress.active) return;
    const release =
      update?.latestVersion && update.assetName && update.assetUrl
        ? {
            version: update.latestVersion,
            url: "",
            body: update.releaseSummary ?? "",
            asset_name: update.assetName,
            asset_url: update.assetUrl,
          }
        : null;
    setUpdateInstallProgress({
      active: true,
      percent: 8,
      message: t("正在准备安装包下载…"),
    });
    const progressTimer = window.setInterval(() => {
      setUpdateInstallProgress((current) => {
        if (!current.active) return current;
        const nextPercent = Math.min(92, current.percent + 10);
        const message =
          nextPercent < 32
            ? t("正在获取 GitHub Release 信息…")
            : nextPercent < 72
              ? t("正在下载安装包…")
              : t("正在启动安装包…");
        return { ...current, percent: nextPercent, message };
      });
    }, 500);
    try {
      const result = await run(() => call<UpdateResult>("perform_update", { release }));
      if (result) {
        setUpdate(result);
        setUpdateInstallProgress({
          active: false,
          percent: result.progress ?? 100,
          message: result.message,
        });
        showNotice(t("更新安装"), result.message, result.status);
      } else {
        setUpdateInstallProgress({
          active: false,
          percent: 100,
          message: t("安装包更新失败，请查看错误提示后重试。"),
        });
      }
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  const saveSettings = async () => {
    const next = normalizeSettings(settingsForm);
    const result = await run(() => call<SettingsResult>("save_settings", { settings: next }));
    if (result) {
      setSettings(result);
      setSettingsForm(normalizeSettings(result.settings));
      showNotice(t("设置保存"), result.message, result.status);
    }
  };

  const saveSettingsValue = async (next: BackendSettings, silent = true) => {
    const normalized = normalizeSettings(next);
    setSettingsForm(normalized);
    const result = await run(() => call<SettingsResult>("save_settings", { settings: normalized }));
    if (result) {
      setSettings(result);
      setSettingsForm(normalizeSettings(result.settings));
      if (!silent || !isSuccessStatus(result.status)) showNotice(t("设置保存"), result.message, result.status);
    }
  };

  const resetSettings = async () => {
    const result = await run(() => call<SettingsResult>("reset_settings"));
    if (result) {
      setSettings(result);
      setSettingsForm(normalizeSettings(result.settings));
      showNotice(t("设置重置"), result.message, result.status);
    }
  };

  const resetImageOverlaySettings = async () => {
    const result = await run(() => call<SettingsResult>("reset_image_overlay_settings"));
    if (result) {
      setSettings(result);
      setSettingsForm(normalizeSettings(result.settings));
      showNotice(t("图片覆盖层"), result.message, result.status);
    }
  };

  const upsertContextEntry = async (next: BackendSettings, kind: ContextKind, id: string, tomlBody: string) => {
    const result = await run(() =>
      call<ContextEntriesResult>("upsert_context_entry", {
        request: { settings: next, kind, id, tomlBody },
      }),
    );
    if (!result) return null;
    let normalized = normalizeSettings(result.settings);
    const saveResult = await run(() => call<SettingsResult>("save_settings", { settings: normalized }));
    if (saveResult) {
      setSettings(saveResult);
      normalized = normalizeSettings(saveResult.settings);
    }
    setSettingsForm(normalized);
    if (!isSuccessStatus(result.status)) showResultNotice(t("工具与插件"), result);
    return normalized;
  };

  const deleteContextEntry = async (next: BackendSettings, kind: ContextKind, id: string) => {
    const result = await run(() =>
      call<ContextEntriesResult>("delete_context_entry", {
        request: { settings: next, kind, id },
      }),
    );
    if (!result) return null;
    let normalized = normalizeSettings(result.settings);
    const saveResult = await run(() => call<SettingsResult>("save_settings", { settings: normalized }));
    if (saveResult) {
      setSettings(saveResult);
      normalized = normalizeSettings(saveResult.settings);
    }
    setSettingsForm(normalized);
    if (!isSuccessStatus(result.status)) showResultNotice(t("工具与插件"), result);
    return normalized;
  };

  const testStepwiseSettings = async (settings: BackendSettings) => {
    const result = await run(() => call<StepwiseTestResult>("test_stepwise_settings", { settings }));
    if (result) showNotice("Stepwise 测试", result.message, result.status);
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      showNotice(t("复制失败"), stringifyError(error), "failed");
    }
  };

  const openExternalUrl = async (url: string) => {
    const result = await run(() => call<CommandResult<Record<string, unknown>>>("open_external_url", { url }));
    if (result) {
      showResultNotice(t("打开链接"), result, { silentSuccess: true });
    }
  };

  const showNotice = (title: string, message: string, status?: Status) => {
    setNotice({ title, message: t(message), status });
  };

  const exitManagerApp = async () => {
    await call<void>("manager_exit_app");
  };

  const hideManagerToTray = async () => {
    await call<void>("manager_hide_to_tray");
  };

  const showResultNotice = (
    title: string,
    result: Pick<CommandResult<unknown>, "message" | "status">,
    options: { silentSuccess?: boolean } = {},
  ) => {
    if (options.silentSuccess && isSuccessStatus(result.status)) return;
    showNotice(title, result.message, result.status);
  };

  useEffect(() => {
    void (async () => {
      const startup = await run(() => call<StartupResult>("startup_options"));
      if (startup?.showUpdate) {
        setRoute("about");
        void checkUpdate(false);
      } else {
        void checkUpdate(true);
      }
      await refreshOverview(true);
      await refreshSettings(true);
      await refreshRemotePluginMarketplace(true);
    })();
  }, []);

  useEffect(() => {
    if (getLanguage() === "en") {
      void invoke("update_tray_labels", {
        showLabel: "Show window",
        quitLabel: "Quit",
        windowTitle: "Codex++ Manager",
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("codex-plus-theme", theme);
  }, [theme]);

  const saveCodexAppPath = async (appPath: string) => {
    const next = { ...settingsForm, codexAppPath: appPath };
    const result = await run(() => call<SettingsResult>("save_settings", { settings: next }));
    if (result) {
      setSettings(result);
      const normalized = normalizeSettings(result.settings);
      setSettingsForm(normalized);
      setLaunchForm((current) => ({ ...current, appPath: normalized.codexAppPath }));
      await refreshOverview(true);
    }
    return result;
  };

  const actions = useMemo(
    () => ({
      refreshCurrent: () => navigate(route),
      launch,
      restart,
      repairPluginMarketplace,
      refreshRemotePluginMarketplace,
      repairRemotePluginMarketplace,
      installEntrypoints,
      uninstallEntrypoints,
      repairShortcuts,
      checkUpdate,
      performUpdate,
      saveSettings,
      saveSettingsValue,
      refreshSettings,
      resetSettings,
      resetImageOverlaySettings,
      chooseCodexAppPath: async (mode: "folder" | "file") => {
        let selected: unknown;
        try {
          selected = await open(
            mode === "folder"
              ? { directory: true, multiple: false, title: t("选择 Codex 应用目录") }
              : {
                  directory: false,
                  multiple: false,
                  title: t("选择 Codex.exe 或 Codex.app"),
                  filters: [{ name: t("Codex 应用"), extensions: ["exe", "app"] }],
                },
          );
        } catch (error) {
          // Surface plugin failures (e.g. missing capability permission) so the
          // buttons no longer appear unresponsive — see #345.
          const message = error instanceof Error ? error.message : String(error);
          showNotice(t("Codex 应用路径"), tf("打开选择器失败：{0}", [message]), "failed");
          return;
        }
        if (typeof selected === "string" && selected.trim()) {
          const result = await saveCodexAppPath(selected.trim());
          if (result) {
            showNotice(t("Codex 应用路径"), t("应用路径已保存，之后启动会自动复用。"), result.status);
          }
        }
      },
      clearCodexAppPath: async () => {
        const next = { ...settingsForm, codexAppPath: "" };
        const result = await run(() => call<SettingsResult>("save_settings", { settings: next }));
        if (result) {
          setSettings(result);
          setSettingsForm(normalizeSettings(result.settings));
          setLaunchForm((current) => ({ ...current, appPath: "" }));
          showNotice(t("Codex 应用路径"), t("已清除保存路径，后续启动会回到自动探测。"), result.status);
          await refreshOverview(true);
        }
      },
      chooseImageOverlayPath: async () => {
        let selected: unknown;
        try {
          selected = await open({
            directory: false,
            multiple: false,
            title: t("选择覆盖图片"),
            filters: [{ name: t("图片"), extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }],
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showNotice(t("图片覆盖层"), tf("打开选择器失败：{0}", [message]), "failed");
          return;
        }
        if (typeof selected === "string" && selected.trim()) {
          setSettingsForm((current) => ({
            ...current,
            codexAppImageOverlayEnabled: true,
            codexAppImageOverlayPath: selected.trim(),
          }));
        }
      },
      saveManualCodexAppPath: async () => {
        const appPath = launchForm.appPath.trim();
        if (!appPath) {
          showNotice(t("Codex 应用路径"), t("请先填写或选择应用路径。"), "failed");
          return;
        }
        const result = await saveCodexAppPath(appPath);
        if (result) {
          showNotice(t("Codex 应用路径"), t("应用路径已保存，之后启动会自动复用。"), result.status);
        }
      },
      refreshLiveContextEntries,
      syncLiveContextEntries,
      refreshScriptMarket,
      installMarketScript,
      setUserScriptEnabled,
      deleteUserScript,
      refreshLocalSessions,
      deleteLocalSession,
      deleteLocalSessions,
      refreshZedRemoteProjects,
      openZedRemoteProject,
      forgetZedRemoteProject,
      openExternalUrl,
      upsertContextEntry,
      deleteContextEntry,
      testStepwiseSettings,
      refreshLogs,
      refreshDiagnostics,
      showMessage: async (title: string, message: string, status?: Status) => showNotice(title, message, status),
      copyLogs: () => copyText(logs?.text ?? "", t("日志已复制。")),
      copyDiagnostics: () => copyText(diagnostics?.report ?? "", t("诊断报告已复制。")),
      goLogs: () => navigate("about"),
      checkHealth: async () => {
        await refreshOverview(true);
        await refreshWatcher(true);
        showNotice(t("检查完成"), t("已刷新 Codex 应用、入口和 Watcher 状态。"), "ok");
      },
      installWatcher: () => watcherAction("install_watcher"),
      uninstallWatcher: () => watcherAction("uninstall_watcher"),
      enableWatcher: () => watcherAction("enable_watcher"),
      disableWatcher: () => watcherAction("disable_watcher"),
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [route, launchForm, settingsForm, settings, removeOwnedData, update, updateInstallProgress.active, logs, diagnostics, theme, localSessions, zedRemoteProjects],
  );
  const hasUpdate = update?.updateAvailable === true;

  return (
    <div className={`shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-copy">
            <div className="brand-title-row">
              <div className="brand-title">Codex++</div>
              {hasUpdate ? (
                <button
                  className="update-dot"
                  onClick={() => {
                    setRoute("about");
                    void checkUpdate(false);
                  }}
                  title={tf("发现新版本 {0}", [update?.latestVersion ?? ""])}
                  type="button"
                >
                  <CircleArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="brand-subtitle">{t("管理控制台")}</div>
          </div>
        </div>
        <nav className="nav">
          {routes.map((item) => {
            const Icon = item.icon;
            return (
            <button
              className={`nav-item ${route === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => void navigate(item.id)}
              title={item.label}
              type="button"
            >
              <span className="nav-icon">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="nav-label">{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          );
          })}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar" key={`topbar-${route}`}>
          <div>
            <h1>{routeTitle(route)}</h1>
            <p>{routeSubtitle(route)}</p>
          </div>
          <div className="topbar-actions">
            <Button
              onClick={() => toggleLanguage()}
              size="icon"
              title={getLanguage() === "en" ? t("切换到中文") : t("切换到英文")}
              variant="outline"
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              onClick={actions.toggleTheme}
              size="icon"
              title={theme === "dark" ? t("切换到浅色") : t("切换到深色")}
              variant="outline"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button onClick={() => void actions.restart()} title={t("重启 Codex++")} variant="outline">
              <Rocket className="h-4 w-4" />
              {t("重启 Codex++")}
            </Button>
            <Button onClick={() => void actions.refreshCurrent()} size="icon" title={t("刷新当前页面")} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <section className="screen" key={route}>
          {route === "overview" ? (
            <OverviewScreen
              overview={overview}
              pluginMarketplaceProgress={pluginMarketplaceProgress}
              actions={actions}
            />
          ) : null}
          {route === "sessions" ? (
            <SessionsScreen
              sessions={localSessions}
              actions={actions}
            />
          ) : null}
          {route === "context" ? (
            <ContextScreen
              form={settingsForm}
              liveEntries={liveContextEntries}
              onFormChange={setSettingsForm}
              actions={actions}
            />
          ) : null}
          {route === "enhance" ? (
            <EnhanceScreen
              form={settingsForm}
              pluginMarketplaceProgress={pluginMarketplaceProgress}
              remotePluginMarketplace={remotePluginMarketplace}
              remotePluginMarketplaceProgress={remotePluginMarketplaceProgress}
              onFormChange={setSettingsForm}
              actions={actions}
            />
          ) : null}
          {route === "zedRemote" ? (
            <ZedRemoteScreen projects={zedRemoteProjects} form={settingsForm} onFormChange={setSettingsForm} actions={actions} />
          ) : null}
          {route === "userScripts" ? <UserScriptsScreen settings={settings} market={scriptMarket} actions={actions} /> : null}
          {route === "maintenance" ? (
            <MaintenanceScreen
              overview={overview}
              watcher={watcher}
              settings={settings}
              launchForm={launchForm}
              onLaunchFormChange={setLaunchForm}
              removeOwnedData={removeOwnedData}
              onRemoveOwnedDataChange={setRemoveOwnedData}
              actions={actions}
            />
          ) : null}
          {route === "about" ? (
            <AboutScreen
              overview={overview}
              update={update}
              updateInstallProgress={updateInstallProgress}
              logs={logs}
              diagnostics={diagnostics}
              actions={actions}
            />
          ) : null}
          {route === "settings" ? (
            <SettingsScreen settings={settings} theme={theme} form={settingsForm} onFormChange={setSettingsForm} actions={actions} />
          ) : null}
        </section>
      </main>
      {notice ? (
        <NoticeDialog
          key={`${notice.title}-${notice.message}-${notice.status ?? ""}`}
          notice={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}
      {confirmDialog ? (
        <ConfirmDialog
          confirm={confirmDialog}
          onCancel={() => {
            confirmDialog.resolve(false);
            setConfirmDialog(null);
          }}
          onConfirm={() => {
            confirmDialog.resolve(true);
            setConfirmDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

type Actions = {
  refreshCurrent: () => Promise<void>;
  launch: () => Promise<void>;
  restart: () => Promise<void>;
  repairPluginMarketplace: () => Promise<void>;
  refreshRemotePluginMarketplace: (silent?: boolean) => Promise<RemotePluginMarketplaceResult | null>;
  repairRemotePluginMarketplace: () => Promise<void>;
  installEntrypoints: () => Promise<void>;
  uninstallEntrypoints: () => Promise<void>;
  repairShortcuts: () => Promise<void>;
  checkUpdate: () => Promise<void>;
  performUpdate: () => Promise<void>;
  saveSettings: () => Promise<void>;
  saveSettingsValue: (settings: BackendSettings, silent?: boolean) => Promise<void>;
  refreshSettings: (silent?: boolean) => Promise<BackendSettings | null>;
  resetSettings: () => Promise<void>;
  resetImageOverlaySettings: () => Promise<void>;
  chooseCodexAppPath: (mode: "folder" | "file") => Promise<void>;
  clearCodexAppPath: () => Promise<void>;
  chooseImageOverlayPath: () => Promise<void>;
  saveManualCodexAppPath: () => Promise<void>;
  refreshLiveContextEntries: () => Promise<LiveContextEntriesResult | null>;
  syncLiveContextEntries: (settings: BackendSettings, silent?: boolean) => Promise<LiveContextEntriesResult | null>;
  refreshScriptMarket: () => Promise<void>;
  installMarketScript: (id: string) => Promise<void>;
  setUserScriptEnabled: (key: string, enabled: boolean) => Promise<void>;
  deleteUserScript: (key: string) => Promise<void>;
  refreshLocalSessions: (silent?: boolean, offset?: number) => Promise<LocalSessionsResult | null>;
  deleteLocalSession: (session: LocalSession) => Promise<void>;
  deleteLocalSessions: (sessions: LocalSession[]) => Promise<void>;
  refreshZedRemoteProjects: () => Promise<ZedRemoteProjectsResult | null>;
  openZedRemoteProject: (project: ZedRemoteProject, strategy?: ZedOpenStrategy) => Promise<void>;
  forgetZedRemoteProject: (project: ZedRemoteProject) => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
  upsertContextEntry: (
    settings: BackendSettings,
    kind: ContextKind,
    id: string,
    tomlBody: string,
  ) => Promise<BackendSettings | null>;
  deleteContextEntry: (settings: BackendSettings, kind: ContextKind, id: string) => Promise<BackendSettings | null>;
  testStepwiseSettings: (settings: BackendSettings) => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  showMessage: (title: string, message: string, status?: Status) => Promise<void>;
  copyLogs: () => Promise<void>;
  copyDiagnostics: () => Promise<void>;
  goLogs: () => Promise<void>;
  installWatcher: () => Promise<void>;
  uninstallWatcher: () => Promise<void>;
  enableWatcher: () => Promise<void>;
  disableWatcher: () => Promise<void>;
  toggleTheme: () => void;
  checkHealth: () => Promise<void>;
};

function OverviewScreen({
  overview,
  pluginMarketplaceProgress,
  actions,
}: {
  overview: OverviewResult | null;
  pluginMarketplaceProgress: TaskProgress;
  actions: Actions;
}) {
  const health = healthItems(overview);
  return (
    <>
      <Panel>
        <CardHead title={t("健康检查")} detail={t("概览只展示关键问题，具体配置在对应页面处理")} />
        <CardContent>
          <div className="health-grid">
            <div className={`health-item ${overview?.codex_version ? "ok" : "needs-fix"}`}>
              {overview?.codex_version ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              <div>
                <strong>{t("Codex 版本")}</strong>
                <span>{overview?.codex_version ?? t("未检测到 Codex 应用版本。")}</span>
              </div>
              <Badge status={overview?.codex_version ? "ok" : "not_checked"} />
            </div>
            {health.map((item) => (
              <div className={`health-item ${item.ok ? "ok" : "needs-fix"}`} key={item.title}>
                {item.ok ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <Badge status={item.status} />
              </div>
            ))}
          </div>
          <Toolbar>
            <Button onClick={() => void actions.checkHealth()}>
              <RefreshCw className="h-4 w-4" />
              {t("检查")}
            </Button>
            <Button variant="secondary" onClick={() => void actions.repairShortcuts()}>
              <Wrench className="h-4 w-4" />
              {t("修复入口")}
            </Button>
            <Button disabled={pluginMarketplaceProgress.active} variant="secondary" onClick={() => void actions.repairPluginMarketplace()}>
              {pluginMarketplaceProgress.active ? t("正在修复…") : t("修复插件市场")}
            </Button>
          </Toolbar>
          <TaskProgressBox progress={pluginMarketplaceProgress} title={t("插件市场修复进度")} />
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("最近启动")} detail={overview?.logs_path ?? t("暂无状态文件")} />
        <CardContent>
          <LatestLaunch status={overview?.latest_launch ?? null} />
          <Toolbar>
            <Button onClick={() => void actions.launch()}>
              <Rocket className="h-4 w-4" />
              {t("启动 Codex++")}
            </Button>
            <Button variant="secondary" onClick={() => void actions.goLogs()}>
              {t("打开关于")}
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
    </>
  );
}

function EnhanceScreen({
  form,
  pluginMarketplaceProgress,
  remotePluginMarketplace,
  remotePluginMarketplaceProgress,
  onFormChange,
  actions,
}: {
  form: BackendSettings;
  pluginMarketplaceProgress: TaskProgress;
  remotePluginMarketplace: RemotePluginMarketplaceResult | null;
  remotePluginMarketplaceProgress: TaskProgress;
  onFormChange: (value: BackendSettings) => void;
  actions: Actions;
}) {
  const setEnhanceFlag = (key: keyof BackendSettings, value: boolean) => onFormChange({ ...form, [key]: value });
  const setPersistedEnhanceFlag = (key: keyof BackendSettings, value: boolean) => {
    const next = { ...form, [key]: value };
    onFormChange(next);
    void actions.saveSettingsValue(next, true);
  };
  const masterEnabled = form.enhancementsEnabled;
  const patchMode = true;
  const remoteMarketplaceStatus = remotePluginMarketplace?.marketplaceRoot
    ? remotePluginMarketplace.configRegistered
      ? t("已注册")
      : t("已缓存未注册")
    : t("未发现缓存");
  const remoteMarketplaceSummary = remotePluginMarketplace?.marketplaceRoot
    ? tf("已缓存 {0} 个插件 / {1} 个技能。", [
        String(remotePluginMarketplace.pluginCount),
        String(remotePluginMarketplace.skillCount),
      ])
    : t("未发现本地缓存；点击按钮会从 Codex++ 内置快照释放并注册，无需官方账号预缓存。");
  return (
    <>
      <Panel className="enhance-panel">
        <CardHead title={t("Codex增强")} detail={t("会话删除、导出、项目移动和用户脚本等界面能力")} />
        <CardContent>
          <label className="switch-row">
            <input
              checked={form.enhancementsEnabled}
              onChange={(event) => onFormChange({ ...form, enhancementsEnabled: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>
              <strong>{t("启用 Codex增强")}</strong>
              <small>{t("关闭后会停用删除、导出、项目移动、插件相关和菜单位置增强。")}</small>
            </span>
            <ToggleVisual />
          </label>
          <label className="switch-row">
            <input
              checked={form.computerUseGuardEnabled}
              onChange={(event) => onFormChange({ ...form, computerUseGuardEnabled: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>
              <strong>{t("启用 Windows Computer Use Guard")}</strong>
              <small>{t("默认关闭；开启后启动 Codex 时会自动保留官方 Computer Use 插件所需的 config.toml、bundled 插件和 notify 配置。")}</small>
            </span>
            <ToggleVisual />
          </label>
          <div className="enhance-feature-groups">
            <FeatureGroup title={t("插件与模型")} detail={t("管理插件市场、模型列表和服务档位相关增强。")}>
              <FeatureToggle title={t("插件市场解锁")} detail={t("API Key 模式下扩展插件市场请求，尽量显示完整插件列表；官方/混合模式通常不需要。")} checked={form.codexAppPluginMarketplaceUnlock} disabled={!masterEnabled || !patchMode} onChange={(value) => setEnhanceFlag("codexAppPluginMarketplaceUnlock", value)} />
              <FeatureToggle title={t("插件列表全量展示")} detail={t("进入插件页后自动连续展开“更多”，尽量一次显示完整插件列表。")} checked={form.codexAppPluginAutoExpand} disabled={!masterEnabled || !patchMode} onChange={(value) => setEnhanceFlag("codexAppPluginAutoExpand", value)} />
              <FeatureToggle title={t("模型白名单解锁")} detail={t("从环境变量和 config.toml 的 /v1/models 拉取模型并补进模型列表。")} checked={form.codexAppModelWhitelistUnlock} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppModelWhitelistUnlock", value)} />
              <FeatureToggle title={t("Fast 按钮")} detail={t("显示服务模式切换按钮；Fast 仅支持 gpt-5.4 / gpt-5.5，其他模型按 Standard 发送。")} checked={form.codexAppServiceTierControls} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppServiceTierControls", value)} />
              <div className="feature-action-row">
                <div>
                  <strong>{t("官方远端插件缓存")}</strong>
                  <small>{t("使用 Codex++ 内置快照补齐远端插件，API 模式也可显示和安装 Product Design 插件。")}</small>
                  <small>{remoteMarketplaceSummary}</small>
                </div>
                <Badge status={remotePluginMarketplace?.configRegistered ? "ok" : "not_checked"} />
                <Button
                  disabled={remotePluginMarketplaceProgress.active}
                  onClick={() => void actions.repairRemotePluginMarketplace()}
                  variant="secondary"
                >
                  {remotePluginMarketplaceProgress.active ? t("正在处理…") : t("释放并注册内置缓存")}
                </Button>
                <Button
                  disabled={remotePluginMarketplaceProgress.active}
                  onClick={() => void actions.refreshRemotePluginMarketplace()}
                  variant="outline"
                >
                  {t("刷新")}
                </Button>
                <span className="feature-action-status">{remoteMarketplaceStatus}</span>
              </div>
            </FeatureGroup>
            <FeatureGroup title={t("对话与输入")} detail={t("调整会话管理、输入行为和对话阅读体验。")}>
              <FeatureToggle title={t("会话删除")} detail={t("在会话列表悬停显示删除按钮，并支持撤销。")} checked={form.codexAppSessionDelete} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppSessionDelete", value)} />
              <FeatureToggle title={t("Markdown 导出")} detail={t("在会话列表显示导出按钮，导出带时间戳的 Markdown。")} checked={form.codexAppMarkdownExport} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppMarkdownExport", value)} />
              <FeatureToggle title={t("粘贴修复")} detail={t("从 Word 等富文本粘贴到 Codex composer 时只保留纯文本，避免被识别为图片/文件附件。需重启 Codex 才生效。")} checked={form.codexAppPasteFix} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppPasteFix", value)} />
              <FeatureToggle title={t("会话项目移动")} detail={t("把会话移动到普通对话或其他本地项目。")} checked={form.codexAppProjectMove} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppProjectMove", value)} />
              <FeatureToggle title={t("会话 ID 标识")} detail={t("在侧边栏会话标题前显示短 ID 和 UUIDv7 创建时间，方便定位历史会话。")} checked={form.codexAppThreadIdBadge} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppThreadIdBadge", value)} />
              <FeatureToggle title={t("对话居中宽度")} detail={t("把主对话和输入框限制到固定最大宽度，适合大屏阅读。")} checked={form.codexAppConversationView} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppConversationView", value)} />
              <FeatureToggle title={t("切换对话保留位置")} detail={t("切换 thread 时恢复上一次浏览位置。")} checked={form.codexAppThreadScrollRestore} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppThreadScrollRestore", value)} />
            </FeatureGroup>
            <FeatureGroup title="Stepwise" detail={t("基于当前对话生成下一步建议，使用独立 API 配置。")}>
              <FeatureToggle title="Stepwise" detail={t("在 Codex 页面显示可拖动的后续建议浮层；建议由单独配置的 Stepwise API 生成。")} checked={form.codexAppStepwiseEnabled} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppStepwiseEnabled", value)} />
              <FeatureToggle title={t("Stepwise 直接发送")} detail={t("点击建议后自动发送；关闭时只填入输入框。")} checked={form.codexAppStepwiseDirectSend} disabled={!masterEnabled || !form.codexAppStepwiseEnabled} onChange={(value) => setEnhanceFlag("codexAppStepwiseDirectSend", value)} />
            </FeatureGroup>
            <FeatureGroup title={t("界面与启动")} detail={t("控制语言、启动速度和 Codex 原生界面调整。")}>
              {isWindowsPlatform ? <FeatureToggle title={t("桌宠跟随真实鼠标")} detail={t("仅支持 V2 桌宠；不会修改宠物文件。将 V2 的 Computer Use 光标朝向动作映射到真实鼠标，V1 开启后安全不生效；拖拽、原生悬停或 Computer Use 活跃时自动让步。")} checked={form.codexAppPetRealMouseLook} disabled={!masterEnabled} onChange={(value) => setPersistedEnhanceFlag("codexAppPetRealMouseLook", value)} /> : null}
              <FeatureToggle title={t("强制中文界面")} detail={t("强制启用 Codex App 内置 zh-CN 语言包，避免 Statsig/VPN 不通时回退英文。需重启 Codex 才能完整生效。")} checked={form.codexAppForceChineseLocale} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppForceChineseLocale", value)} />
              <FeatureToggle title={t("快速启动")} detail={t("默认关闭；无 VPN 时可开启，让 Statsig 初始化快速失败，减少启动时长。需重启 Codex 才生效。")} checked={form.codexAppFastStartup} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppFastStartup", value)} />
              <FeatureToggle title={t("原生菜单栏位置")} detail={t("把 Codex++ 菜单插入 Codex 顶部原生菜单栏。")} checked={form.codexAppNativeMenuPlacement} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppNativeMenuPlacement", value)} />
              <FeatureToggle title={t("原生菜单汉化")} detail={t("启动时通过本地主进程调试端口汉化 Codex 原生菜单；不修改安装包。需重启 Codex 才生效。")} checked={form.codexAppNativeMenuLocalization} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppNativeMenuLocalization", value)} />
            </FeatureGroup>
            <FeatureGroup title={t("远程项目")} detail={t("连接 Zed Remote 和 upstream worktree 辅助能力。")}>
              <FeatureToggle title="Zed Remote open" detail={t("远程 SSH 文件引用可直接用 Zed Remote Development 打开。")} checked={form.codexAppZedRemoteOpen} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppZedRemoteOpen", value)} />
              <FeatureToggle title={t("Zed 项目记录")} detail={t("维护 Codex++ 自己的远程项目最近列表。")} checked={form.zedRemoteProjectRegistryEnabled} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("zedRemoteProjectRegistryEnabled", value)} />
              <FeatureToggle title={t("同步 Zed settings")} detail={t("高级选项，默认关闭；当前实现不主动改写 Zed settings。")} checked={form.zedRemoteSyncToZedSettings} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("zedRemoteSyncToZedSettings", value)} />
              <FeatureToggle title="Upstream worktree" detail={t("从最新 upstream 分支创建 Git worktree。")} checked={form.codexAppUpstreamWorktreeCreate} disabled={!masterEnabled} onChange={(value) => setEnhanceFlag("codexAppUpstreamWorktreeCreate", value)} />
            </FeatureGroup>
          </div>
          <div className="hint-line">
            <Wrench className="h-4 w-4" />
            <span>{t("新机器没有本地插件市场时，可从 openai/plugins 初始化到当前 CODEX_HOME。")}</span>
            <Button disabled={pluginMarketplaceProgress.active} variant="secondary" onClick={() => void actions.repairPluginMarketplace()}>
              {pluginMarketplaceProgress.active ? t("正在修复…") : t("修复插件市场")}
            </Button>
          </div>
          <TaskProgressBox progress={pluginMarketplaceProgress} title={t("插件市场修复进度")} />
          <TaskProgressBox progress={remotePluginMarketplaceProgress} title={t("官方远端插件缓存进度")} />
          <div className="zed-remote-settings">
            <Field label={t("Zed 默认打开策略")}>
              <select
                className="select-input"
                disabled={!masterEnabled}
                onChange={(event) => onFormChange({ ...form, zedRemoteOpenStrategy: event.currentTarget.value as ZedOpenStrategy })}
                value={form.zedRemoteOpenStrategy}
              >
                <option value="addToFocusedWorkspace">{t("加入当前工作区")}</option>
                <option value="reuseWindow">{t("复用窗口")}</option>
                <option value="newWindow">{t("新窗口")}</option>
                <option value="default">{t("Zed 默认行为")}</option>
              </select>
            </Field>
          </div>
          <div className="hint-line">
            <Info className="h-4 w-4" />
            <span>{t("如果使用官方模式或官方混入 API 模式，通常不需要开启插件市场解锁。")}</span>
          </div>
          <Toolbar>
            <Button onClick={() => void actions.saveSettings()}>{t("保存增强设置")}</Button>
          </Toolbar>
        </CardContent>
      </Panel>
    </>
  );
}

function ZedRemoteScreen({
  projects,
  form,
  onFormChange,
  actions,
}: {
  projects: ZedRemoteProjectsResult | null;
  form: BackendSettings;
  onFormChange: (value: BackendSettings) => void;
  actions: Actions;
}) {
  const allProjects = projects?.projects ?? [];
  const currentProjects = allProjects.filter((project) => project.isCurrent);
  const currentIds = new Set(currentProjects.map((project) => project.id));
  const recentProjects = allProjects.filter((project) => !currentIds.has(project.id) && (project.source === "recent" || project.lastOpenedAtMs));
  const recentIds = new Set(recentProjects.map((project) => project.id));
  const discoveredProjects = allProjects.filter((project) => !currentIds.has(project.id) && !recentIds.has(project.id));
  const copyUrl = async (project: ZedRemoteProject) => {
    try {
      await navigator.clipboard.writeText(project.url);
      await actions.showMessage("Zed Remote URL", t("ssh:// URL 已复制。"), "ok");
    } catch (error) {
      await actions.showMessage(t("复制失败"), stringifyError(error), "failed");
    }
  };
  return (
    <>
      <Panel>
        <CardHead title={t("Zed 远程项目")} detail={tf("{0} 个 Codex++ 可识别项目，默认策略：{1}", [allProjects.length, zedStrategyLabel(form.zedRemoteOpenStrategy)])} />
        <CardContent>
          <div className="metric-list">
            <Metric label="Current" value={String(currentProjects.length)} />
            <Metric label="Recent" value={String(recentProjects.length)} />
            <Metric label="Discovered" value={String(discoveredProjects.length)} />
          </div>
          <div className="zed-remote-settings">
            <Field label={t("默认打开策略")}>
              <select
                className="select-input"
                onChange={(event) => onFormChange({ ...form, zedRemoteOpenStrategy: event.currentTarget.value as ZedOpenStrategy })}
                value={form.zedRemoteOpenStrategy}
              >
                <option value="addToFocusedWorkspace">{t("加入当前工作区")}</option>
                <option value="reuseWindow">{t("复用窗口")}</option>
                <option value="newWindow">{t("新窗口")}</option>
                <option value="default">{t("Zed 默认行为")}</option>
              </select>
            </Field>
            <label className="switch-row compact">
              <input
                checked={form.zedRemoteProjectRegistryEnabled}
                onChange={(event) => onFormChange({ ...form, zedRemoteProjectRegistryEnabled: event.currentTarget.checked })}
                type="checkbox"
              />
              <span>
                <strong>{t("记录最近打开")}</strong>
                <small>{t("保存到 Codex++ state，不改写 Zed settings。")}</small>
              </span>
              <ToggleVisual />
            </label>
          </div>
          <Toolbar>
            <Button onClick={() => void actions.refreshZedRemoteProjects()}>
              <RefreshCw className="h-4 w-4" />
              {t("刷新项目")}
            </Button>
            <Button variant="secondary" onClick={() => void actions.saveSettingsValue(form, false)}>
              <Save className="h-4 w-4" />
              {t("保存策略")}
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <ZedRemoteProjectSection title="Current" projects={currentProjects} actions={actions} onCopyUrl={copyUrl} />
      <ZedRemoteProjectSection title="Recent" projects={recentProjects} actions={actions} onCopyUrl={copyUrl} />
      <ZedRemoteProjectSection title="Discovered from Codex" projects={discoveredProjects} actions={actions} onCopyUrl={copyUrl} />
    </>
  );
}

function ZedRemoteProjectSection({
  title,
  projects,
  actions,
  onCopyUrl,
}: {
  title: string;
  projects: ZedRemoteProject[];
  actions: Actions;
  onCopyUrl: (project: ZedRemoteProject) => Promise<void>;
}) {
  return (
    <Panel>
      <CardHead title={title} detail={tf("{0} 个项目", [projects.length])} />
      <CardContent>
        {projects.length ? (
          <div className="zed-remote-project-list">
            {projects.map((project) => (
              <div className="zed-remote-project-row" key={project.id}>
                <div className="zed-remote-project-main">
                  <div>
                    <strong>{project.label}</strong>
                    <span>{zedRemoteHostLabel(project)}</span>
                  </div>
                  <code>{project.path}</code>
                  <small>
                    {zedRemoteSourceLabel(project.source)}
                    {project.lastOpenedAtMs ? ` · ${formatTime(project.lastOpenedAtMs)}` : ""}
                  </small>
                </div>
                <div className="zed-remote-project-actions">
                  <Button onClick={() => void actions.openZedRemoteProject(project, "addToFocusedWorkspace")} size="sm">
                    <ExternalLink className="h-4 w-4" />
                    {t("加入当前工作区")}
                  </Button>
                  <Button onClick={() => void actions.openZedRemoteProject(project, "reuseWindow")} size="sm" variant="outline">
                    {t("复用窗口")}
                  </Button>
                  <Button onClick={() => void actions.openZedRemoteProject(project, "newWindow")} size="sm" variant="outline">
                    {t("新窗口")}
                  </Button>
                  <Button onClick={() => void onCopyUrl(project)} size="icon" title={t("复制 ssh:// URL")} variant="ghost">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {project.source === "recent" ? (
                    <Button onClick={() => void actions.forgetZedRemoteProject(project)} size="icon" title={t("移除最近记录")} variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">{t("暂无项目。")}</div>
        )}
      </CardContent>
    </Panel>
  );
}

function UserScriptsScreen({ settings, market, actions }: { settings: SettingsResult | null; market: ScriptMarketResult | null; actions: Actions }) {
  const inventory = settings?.user_scripts;
  const scripts = inventory?.scripts ?? [];
  const marketScripts = market?.market.scripts ?? [];
  const installedCount = marketScripts.filter((script) => script.installed).length;
  return (
    <>
      <Panel>
        <CardHead title={t("脚本市场")} detail={tf("{0} 个市场脚本，已安装 {1} 个，本地整体 {2}", [marketScripts.length, installedCount, inventory?.enabled === false ? t("关闭") : t("开启")])} />
        <CardContent>
          <div className="metric-list">
            <Metric label={t("市场状态")} value={market?.market.message ?? t("尚未刷新")} />
            <Metric label={t("远程脚本")} value={tf("{0} 个", [marketScripts.length])} />
            <Metric label={t("已安装")} value={tf("{0} 个", [installedCount])} />
            <Metric label={t("本地整体")} value={inventory?.enabled === false ? t("关闭") : t("开启")} />
          </div>
          <Toolbar>
            <Button onClick={() => void actions.refreshScriptMarket()}>
              <RefreshCw className="h-4 w-4" />
              {t("刷新市场")}
            </Button>
            <Button onClick={() => void actions.openExternalUrl(SCRIPT_MARKET_REPOSITORY_URL)} variant="secondary">
              <ExternalLink className="h-4 w-4" />
              {t("投稿")}
            </Button>
            <Button onClick={() => void actions.refreshCurrent()} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              {t("刷新本地")}
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("市场脚本")} detail={market?.market.updatedAt ? tf("清单更新时间：{0}", [market.market.updatedAt]) : t("从 GitHub 静态清单加载")} />
        <CardContent>
          {marketScripts.length ? (
            <div className="script-market-grid">
              {marketScripts.map((script) => (
                <MarketScriptCard key={script.id} script={script} actions={actions} />
              ))}
            </div>
          ) : (
            <div className="empty">{market?.status === "failed" ? market.message : t("点击刷新市场加载远程脚本。")}</div>
          )}
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("本地脚本")} detail={t("内置、手动和市场安装脚本；可在这里启停或删除用户脚本")} />
        <CardContent>
          <div className="table">
            {scripts.length ? scripts.map((script) => <ScriptRow key={script.key} script={script} actions={actions} />) : <div className="empty">{t("未发现用户脚本。")}</div>}
          </div>
        </CardContent>
      </Panel>
    </>
  );
}

function SessionsScreen({
  sessions,
  actions,
}: {
  sessions: LocalSessionsResult | null;
  actions: Actions;
}) {
  const items = sessions?.sessions ?? [];
  const pageOffset = sessions?.offset ?? 0;
  const pageSize = sessions?.limit ?? 50;
  const currentPage = Math.floor(pageOffset / pageSize) + 1;
  const hasPreviousPage = pageOffset > 0;
  const hasNextPage = sessions?.hasMore === true;
  const activeCount = items.filter((item) => !item.archived).length;
  const archivedCount = items.length - activeCount;
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectedSessions = useMemo(() => items.filter((session) => selectedSessionIds.has(session.id)), [items, selectedSessionIds]);
  const selectedCount = selectedSessions.length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  useEffect(() => {
    const itemIds = new Set(items.map((session) => session.id));
    setSelectedSessionIds((current) => {
      const next = new Set(Array.from(current).filter((id) => itemIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const toggleSessionSelection = (sessionId: string, checked: boolean) => {
    setSelectedSessionIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(sessionId);
      } else {
        next.delete(sessionId);
      }
      return next;
    });
  };

  const selectAllSessions = () => {
    setSelectionMode(true);
    setSelectedSessionIds(new Set(items.map((session) => session.id)));
  };

  const clearSelectedSessions = () => setSelectedSessionIds(new Set());

  const deleteSelectedSessions = async () => {
    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }
    setBulkDeleting(true);
    try {
      await actions.deleteLocalSessions(selectedSessions);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      <Panel>
        <CardHead title={t("会话管理")} detail={t("读取 Codex 本地 SQLite 会话库，会删除数据库记录和对应 rollout 文件")} />
        <CardContent>
          <div className="metric-list">
            <Metric label={t("当前页会话")} value={tf("{0} 个", [items.length])} />
            <Metric label={t("当前页未归档")} value={tf("{0} 个", [activeCount])} />
            <Metric label={t("当前页已归档")} value={tf("{0} 个", [archivedCount])} />
            <Metric label={t("数据库")} value={sessions?.dbPath ?? "~/.codex/sqlite/*.db"} />
          </div>
          <Toolbar>
            <Button onClick={() => void actions.refreshLocalSessions()}>
              <RefreshCw className="h-4 w-4" />
              {t("刷新会话")}
            </Button>
          </Toolbar>
          <div className="hint-line">
            <Info className="h-4 w-4" />
            <span>{t("删除会创建本地备份；如果 Codex App 正在使用该会话，建议先关闭对应会话窗口再操作。")}</span>
          </div>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead
          title={t("本地会话")}
          detail={sessions ? tf("第 {0} 页，每页最多 {1} 条，按更新时间倒序显示", [currentPage, pageSize]) : t("点击刷新会话读取本地数据库")}
        />
        <CardContent>
          {items.length ? (
            <>
              <div className="session-list-toolbar">
                <span className="session-selection-summary">{t("已选择")} {selectedCount} / {items.length} {t("个会话")}</span>
                <div className="session-selection-actions">
                  <Button disabled={allSelected || bulkDeleting} onClick={selectAllSessions} size="sm" variant="outline">
                    {t("全选当前列表")}
                  </Button>
                  <Button disabled={!selectedCount || bulkDeleting} onClick={clearSelectedSessions} size="sm" variant="outline">
                    {t("清空选择")}
                  </Button>
                  <Button disabled={(selectionMode && !selectedCount) || bulkDeleting} onClick={() => void deleteSelectedSessions()} size="sm" variant="outline">
                    {selectionMode ? <Trash2 className="h-4 w-4" /> : null}
                    {selectionMode ? (bulkDeleting ? t("正在删除…") : t("删除已选")) : t("多选")}
                  </Button>
                </div>
              </div>
              <div className="session-list">
                {items.map((session) => {
                  const selected = selectedSessionIds.has(session.id);
                  return (
                    <div className="session-row" data-selection-mode={selectionMode} data-selected={selected} key={session.id}>
                      {selectionMode ? (
                        <label className="session-select" title={t("选择会话")}>
                          <input
                            aria-label={tf("选择会话 {0}", [session.title || session.id])}
                            checked={selected}
                            onChange={(event) => toggleSessionSelection(session.id, event.currentTarget.checked)}
                            type="checkbox"
                          />
                        </label>
                      ) : null}
                      <div className="session-main">
                        <strong>{session.title || t("未命名会话")}</strong>
                        <span>{session.id}</span>
                        <small>{session.cwd || t("未记录项目路径")}</small>
                      </div>
                      <div className="session-meta">
                        <Badge status={session.archived ? "archived" : "ok"} />
                        <span>{formatTime(session.updatedAtMs ?? 0)}</span>
                      </div>
                      <Button className="session-delete-button" variant="outline" onClick={() => void actions.deleteLocalSession(session)}>
                        <Trash2 className="h-4 w-4" />
                        {t("删除")}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="session-pagination">
                <Button
                  aria-label={t("上一页")}
                  disabled={!hasPreviousPage || bulkDeleting}
                  onClick={() => void actions.refreshLocalSessions(true, Math.max(0, pageOffset - pageSize))}
                  size="icon"
                  title={t("上一页")}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span>{tf("第 {0} 页", [currentPage])}</span>
                <Button
                  aria-label={t("下一页")}
                  disabled={!hasNextPage || bulkDeleting}
                  onClick={() => void actions.refreshLocalSessions(true, pageOffset + pageSize)}
                  size="icon"
                  title={t("下一页")}
                  variant="outline"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="empty">{t("未读取到本地会话，或当前 SQLite 会话库不存在。")}</div>
          )}
        </CardContent>
      </Panel>
    </>
  );
}

function MaintenanceScreen({
  overview,
  watcher,
  settings,
  launchForm,
  onLaunchFormChange,
  removeOwnedData,
  onRemoveOwnedDataChange,
  actions,
}: {
  overview: OverviewResult | null;
  watcher: WatcherResult | null;
  settings: SettingsResult | null;
  launchForm: { appPath: string; debugPort: string; helperPort: string };
  onLaunchFormChange: (next: { appPath: string; debugPort: string; helperPort: string }) => void;
  removeOwnedData: boolean;
  onRemoveOwnedDataChange: (value: boolean) => void;
  actions: Actions;
}) {
  const savedCodexAppPath = settings?.settings.codexAppPath ?? "";
  return (
    <>
      <Panel>
        <CardHead title={t("检查与修复")} detail={t("检查入口、Codex 应用和 Watcher 状态")} />
        <CardContent>
          <div className="status-table">
            <StatusRow title={t("Codex 应用")} status={overview?.codex_app.status} path={overview?.codex_app.path} />
            <StatusRow title={t("静默启动入口")} status={overview?.silent_shortcut.status} path={overview?.silent_shortcut.path} />
            <StatusRow title={t("管理控制台入口")} status={overview?.management_shortcut.status} path={overview?.management_shortcut.path} />
            <StatusRow title={t("Watcher 自动接管")} status={watcher?.enabled ? "ok" : "disabled"} path={watcher?.disabled_flag} />
          </div>
          <Toolbar>
            <Button onClick={() => void actions.checkHealth()}>{t("检查")}</Button>
            <Button variant="secondary" onClick={() => void actions.repairShortcuts()}>{t("修复快捷方式")}</Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("入口管理")} detail={t("快捷方式写入系统实际桌面位置，不使用写死桌面路径")} />
        <CardContent>
          <label className="check-row">
            <input checked={removeOwnedData} onChange={(event) => onRemoveOwnedDataChange(event.currentTarget.checked)} type="checkbox" />
            <span>{t("卸载时移除 Codex++ 托管数据")}</span>
          </label>
          <Toolbar>
            <Button onClick={() => void actions.installEntrypoints()}>{t("安装入口")}</Button>
            <Button variant="secondary" onClick={() => void actions.uninstallEntrypoints()}>{t("卸载入口")}</Button>
            <Button variant="secondary" onClick={() => void actions.repairShortcuts()}>{t("修复入口")}</Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("自动接管")} detail={t("Watcher 用于保持 Codex++ 接管状态")} />
        <CardContent>
          <Toolbar>
            <Button variant="secondary" onClick={() => void actions.installWatcher()}>{t("安装 watcher")}</Button>
            <Button variant="secondary" onClick={() => void actions.uninstallWatcher()}>{t("移除 watcher")}</Button>
            <Button variant="secondary" onClick={() => void actions.enableWatcher()}>{t("启用")}</Button>
            <Button variant="secondary" onClick={() => void actions.disableWatcher()}>{t("禁用")}</Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("Codex 应用路径")} detail={t("免安装版或解包版只需要选择一次，之后静默启动会自动复用")} />
        <CardContent>
          <div className="status-table">
            <StatusRow title={t("保存路径")} status={savedCodexAppPath ? "ok" : "not_checked"} path={savedCodexAppPath || null} />
            <StatusRow title={t("当前识别")} status={overview?.codex_app.status} path={overview?.codex_app.path} />
          </div>
          <Field label={t("保存的应用路径")}>
            <Input
              value={settings?.settings.codexAppPath ?? ""}
              placeholder={t("选择 Codex.exe、Codex.app、app 目录或解包目录")}
              readOnly
            />
          </Field>
          <Toolbar>
            <Button onClick={() => void actions.chooseCodexAppPath("folder")}>{t("选择应用目录")}</Button>
            <Button variant="secondary" onClick={() => void actions.chooseCodexAppPath("file")}>{t("选择 Codex.exe")}</Button>
            <Button variant="secondary" onClick={() => void actions.clearCodexAppPath()}>{t("清除保存路径")}</Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("手动启动")} detail={t("应用路径留空时使用已保存路径；没有保存路径时使用自动探测")} />
        <CardContent>
          <Field label={t("应用路径覆盖")}>
            <Input
              value={launchForm.appPath}
              onChange={(event) => onLaunchFormChange({ ...launchForm, appPath: event.currentTarget.value })}
              placeholder={savedCodexAppPath || t("例如 C:\\Program Files\\WindowsApps\\OpenAI.Codex...\\app")}
            />
          </Field>
          <div className="form-row">
            <Field label={t("Debug 端口")}>
              <Input
                value={launchForm.debugPort}
                onChange={(event) => onLaunchFormChange({ ...launchForm, debugPort: event.currentTarget.value })}
              />
            </Field>
            <Field label={t("Helper 端口")}>
              <Input
                value={launchForm.helperPort}
                onChange={(event) => onLaunchFormChange({ ...launchForm, helperPort: event.currentTarget.value })}
              />
            </Field>
          </div>
          <Toolbar>
            <Button onClick={() => void actions.launch()}>{t("启动 Codex++")}</Button>
            <Button variant="secondary" onClick={() => void actions.saveManualCodexAppPath()}>
              {t("保存为默认路径")}
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
    </>
  );
}

function AboutScreen({
  overview,
  update,
  updateInstallProgress,
  logs,
  diagnostics,
  actions,
}: {
  overview: OverviewResult | null;
  update: UpdateResult | null;
  updateInstallProgress: TaskProgress;
  logs: LogsResult | null;
  diagnostics: DiagnosticsResult | null;
  actions: Actions;
}) {
  return (
    <>
      <Panel>
        <CardHead title={t("关于 Codex++")} detail={t("本地 Codex 增强、管理工具和安装包维护")} />
        <CardContent>
          <div className="metric-list">
            <Metric label={t("Codex++ 版本")} value={overview?.current_version ?? update?.currentVersion ?? "-"} />
            <Metric label={t("Codex 版本")} value={overview?.codex_version ?? t("未检测到")} />
            <Metric label={t("项目地址")} value="github.com/BigPizzaV3/CodexPlusPlus" />
          </div>
          <Toolbar>
            <Button onClick={() => void actions.openExternalUrl("https://github.com/BigPizzaV3/CodexPlusPlus")} variant="secondary">
              <ExternalLink className="h-4 w-4" />
              {t("打开项目主页")}
            </Button>
            <Button onClick={() => void actions.openExternalUrl("https://github.com/BigPizzaV3/CodexPlusPlus/issues")} variant="secondary">
              <ExternalLink className="h-4 w-4" />
              {t("反馈问题")}
            </Button>
            <Button onClick={() => void actions.openExternalUrl("https://discord.gg/y96kX7A76v")} variant="secondary">
              <MessageCircle className="h-4 w-4" />
              Discord
            </Button>
            <Button onClick={() => void actions.openExternalUrl("https://t.me/CodexPlusPlus")} variant="secondary">
              <MessageCircle className="h-4 w-4" />
              Telegram
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("GitHub Release 更新")} detail={tf("当前版本 {0}", [overview?.current_version ?? update?.currentVersion ?? "-"])} />
        <CardContent>
          <div className="metric-list">
            <Metric label={t("状态")} value={update?.status ?? "not_checked"} />
            <Metric label={t("最新版本")} value={update?.latestVersion ?? t("未检查")} />
            <Metric label={t("资源")} value={update?.assetName ?? "-"} />
            <Metric label={t("进度")} value={`${update?.progress ?? 0}%`} />
          </div>
          <Textarea className="log-view" readOnly value={update?.releaseSummary || update?.message || t("尚未检查 GitHub Release；更新会下载并启动安装包。")} />
          <TaskProgressBox completedTitle={t("上次更新结果")} progress={updateInstallProgress} title={t("安装包更新进度")} />
          <Toolbar>
            <Button onClick={() => void actions.checkUpdate()}>{t("检查更新")}</Button>
            <Button disabled={updateInstallProgress.active} variant="secondary" onClick={() => void actions.performUpdate()}>
              {updateInstallProgress.active ? t("正在下载安装包…") : t("下载并运行安装包")}
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <LogsPanel logs={logs} actions={actions} />
      <DiagnosticsPanel diagnostics={diagnostics} actions={actions} />
    </>
  );
}

function SettingsScreen({
  settings,
  theme,
  form,
  onFormChange,
  actions,
}: {
  settings: SettingsResult | null;
  theme: Theme;
  form: BackendSettings;
  onFormChange: (value: BackendSettings) => void;
  actions: Actions;
}) {
  return (
    <>
      <Panel>
        <CardHead title={t("基础设置")} detail={settings?.settings_path ?? ""} />
        <CardContent>
          <div className="theme-row">
            <div>
              <strong>{t("界面主题")}</strong>
              <span>{t("当前为")}{theme === "dark" ? t("深色") : t("浅色")}{t("模式。")}</span>
            </div>
            <Button variant="secondary" onClick={actions.toggleTheme}>{t("切换主题")}</Button>
          </div>
          <div className="settings-block stepwise-settings-block">
            <div className="section-title">Stepwise</div>
            <div className="stepwise-settings-section">{t("连接")}</div>
            <div className="form-row">
              <Field label="Base URL">
                <Input
                  value={form.codexAppStepwiseBaseUrl}
                  onChange={(event) => onFormChange({ ...form, codexAppStepwiseBaseUrl: event.currentTarget.value })}
                  placeholder="https://api.example.com/v1"
                />
              </Field>
              <Field label="Model">
                <Input
                  value={form.codexAppStepwiseModel}
                  onChange={(event) => onFormChange({ ...form, codexAppStepwiseModel: event.currentTarget.value })}
                  placeholder={t("例如 gpt-5.4-mini")}
                />
              </Field>
            </div>
            <Field label="API Key">
              <Input
                type="password"
                value={form.codexAppStepwiseApiKey}
                onChange={(event) => onFormChange({ ...form, codexAppStepwiseApiKey: event.currentTarget.value })}
              />
            </Field>
            <details className="stepwise-advanced">
              <summary>{t("高级参数")}</summary>
              <div className="form-row">
                <Field label={t("API Key 环境变量")}>
                  <Input
                    value={form.codexAppStepwiseApiKeyEnv}
                    onChange={(event) => onFormChange({ ...form, codexAppStepwiseApiKeyEnv: event.currentTarget.value })}
                  />
                </Field>
                <Field label={t("最多建议数")}>
                  <Input
                    max={6}
                    min={0}
                    type="number"
                    value={form.codexAppStepwiseMaxItems}
                    onChange={(event) =>
                      onFormChange({ ...form, codexAppStepwiseMaxItems: clampNumber(Number(event.currentTarget.value), 0, 6) })
                    }
                  />
                </Field>
              </div>
              <div className="form-row">
                <Field label={t("超时毫秒")}>
                  <Input
                    min={1000}
                    type="number"
                    value={form.codexAppStepwiseTimeoutMs}
                    onChange={(event) =>
                      onFormChange({ ...form, codexAppStepwiseTimeoutMs: clampNumber(Number(event.currentTarget.value), 1000, 60000) })
                    }
                  />
                </Field>
                <Field label={t("最大输入字符")}>
                  <Input
                    min={1000}
                    type="number"
                    value={form.codexAppStepwiseMaxInputChars}
                    onChange={(event) =>
                      onFormChange({ ...form, codexAppStepwiseMaxInputChars: clampNumber(Number(event.currentTarget.value), 1000, 24000) })
                    }
                  />
                </Field>
              </div>
              <Field label={t("最大输出 tokens")}>
                <Input
                  min={100}
                  type="number"
                  value={form.codexAppStepwiseMaxOutputTokens}
                  onChange={(event) =>
                    onFormChange({ ...form, codexAppStepwiseMaxOutputTokens: clampNumber(Number(event.currentTarget.value), 100, 4000) })
                  }
                />
              </Field>
            </details>
            <div className="toolbar stepwise-settings-actions">
              <Button variant="secondary" onClick={() => void actions.testStepwiseSettings(form)}>{t("测试连接")}</Button>
              <Button onClick={() => void actions.saveSettings()}>{t("保存设置")}</Button>
            </div>
          </div>
          <div className="settings-block">
            <label className="check-row">
              <input
                checked={form.codexAppImageOverlayEnabled}
                onChange={(event) =>
                  onFormChange({ ...form, codexAppImageOverlayEnabled: event.currentTarget.checked })
                }
                type="checkbox"
              />
              <span>{t("启用 Codex 图片覆盖层")}</span>
            </label>
            <div className="form-row">
              <Field label={t("覆盖图片")}>
                <Input
                  value={form.codexAppImageOverlayPath}
                  onChange={(event) => onFormChange({ ...form, codexAppImageOverlayPath: event.currentTarget.value })}
                  placeholder={t("选择 png / jpg / webp / gif / bmp")}
                />
              </Field>
              <Toolbar>
                <Button variant="secondary" onClick={() => void actions.chooseImageOverlayPath()}>
                  {t("选择图片")}
                </Button>
              </Toolbar>
            </div>
            <Field label={tf("透明度 {0}%", [form.codexAppImageOverlayOpacity])}>
              <Input
                min={1}
                max={100}
                type="range"
                value={form.codexAppImageOverlayOpacity}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    codexAppImageOverlayOpacity: clampNumber(Number(event.currentTarget.value), 1, 100),
                  })
                }
              />
            </Field>
            <Field label={t("背景适配方式")}>
              <select
                className="select-input"
                value={form.codexAppImageOverlayFitMode}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    codexAppImageOverlayFitMode: event.currentTarget.value as ImageOverlayFitMode,
                  })
                }
              >
                <option value="fill">{t("填充")}</option>
                <option value="fit">{t("适应")}</option>
                <option value="stretch">{t("拉伸")}</option>
                <option value="tile">{t("平铺")}</option>
                <option value="center">{t("居中")}</option>
              </select>
            </Field>
          </div>
          <Toolbar>
            <Button onClick={() => void actions.saveSettings()}>{t("保存设置")}</Button>
            <Button variant="secondary" onClick={() => void actions.resetImageOverlaySettings()}>
              {t("重置背景")}
            </Button>
          </Toolbar>
        </CardContent>
      </Panel>
      <Panel>
        <CardHead title={t("Codex 启动参数")} detail={t("启动 Codex App 时追加到默认 CDP 参数后。留空则保持默认启动行为。")} />
        <CardContent>
          <Field label={t("额外参数")}>
            <Textarea
              className="launch-args-input"
              placeholder="--force_high_performance_gpu"
              spellCheck={false}
              value={codexExtraArgsToInput(form.codexExtraArgs)}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  codexExtraArgs: inputToCodexExtraArgs(event.currentTarget.value),
                })
              }
            />
          </Field>
          <p className="field-hint">{t("每行一个参数，例如 --force_high_performance_gpu。不需要填写 open 或 --args。")}</p>
          <Toolbar>
            <Button onClick={() => void actions.saveSettings()}>{t("保存设置")}</Button>
          </Toolbar>
        </CardContent>
      </Panel>
    </>
  );
}

function LogsPanel({ logs, actions }: { logs: LogsResult | null; actions: Actions }) {
  const lines = splitLogLines(logs?.text ?? "");
  return (
    <Panel>
      <CardHead title={t("最近日志")} detail={logs?.path ?? ""} />
      <CardContent>
        <div className="log-lines">
          {lines.length ? (
            lines.map((line, index) => (
              <div className="log-line" key={`${index}-${line.slice(0, 12)}`}>
                <span>{index + 1}</span>
                <code>{line || " "}</code>
              </div>
            ))
          ) : (
            <div className="empty">{t("暂无日志。")}</div>
          )}
        </div>
        <Toolbar>
          <Button onClick={() => void actions.refreshLogs()}>{t("刷新")}</Button>
          <Button variant="secondary" onClick={() => void actions.copyLogs()}>
            {t("复制")}
          </Button>
        </Toolbar>
      </CardContent>
    </Panel>
  );
}

function DiagnosticsPanel({ diagnostics, actions }: { diagnostics: DiagnosticsResult | null; actions: Actions }) {
  return (
    <Panel>
      <CardHead title={t("诊断报告")} detail={t("包含版本、路径、设置和平台信息")} />
      <CardContent>
        <Textarea className="log-view tall" readOnly value={diagnostics?.report ?? t("尚未生成诊断报告。")} />
        <Toolbar>
          <Button onClick={() => void actions.refreshDiagnostics()}>{t("重新生成")}</Button>
          <Button variant="secondary" onClick={() => void actions.copyDiagnostics()}>
            {t("复制报告")}
          </Button>
        </Toolbar>
      </CardContent>
    </Panel>
  );
}

function MarketScriptCard({ script, actions }: { script: ScriptMarketItem; actions: Actions }) {
  const status = script.updateAvailable ? t("可更新") : script.installed ? tf("已安装 {0}", [script.installedVersion]) : t("未安装");
  const isGitHubHomepage = script.homepage ? isGitHubRepositoryHomepage(script.homepage) : false;
  const githubSupportLabel = isGitHubHomepage ? tf("在 GitHub 上支持作者：{0}", [script.name]) : undefined;
  return (
    <div className="script-market-card">
      <div className="script-market-title">
        <div>
          <strong>{script.name}</strong>
          <span>{script.author || t("未知作者")}</span>
        </div>
        <UiBadge variant={script.updateAvailable ? "default" : script.installed ? "secondary" : "outline"}>{status}</UiBadge>
      </div>
      <p className="script-market-description">{script.description || t("暂无描述。")}</p>
      <div className="script-market-tags">
        <span className="script-market-tag">v{script.version}</span>
        {script.tags.map((tag) => (
          <span className="script-market-tag" key={tag}>{tag}</span>
        ))}
      </div>
      <div className="script-market-actions">
        <Button onClick={() => void actions.installMarketScript(script.id)} size="sm">
          <Download className="h-4 w-4" />
          {script.updateAvailable ? t("更新") : script.installed ? t("重新安装") : t("安装")}
        </Button>
        {script.homepage ? (
          <Button
            aria-label={githubSupportLabel}
            onClick={() => void actions.openExternalUrl(script.homepage)}
            size="sm"
            title={githubSupportLabel}
            variant="secondary"
          >
            {isGitHubHomepage ? (
              <>
                <Star className="h-4 w-4" />
                Star
                <ExternalLink className="h-3 w-3" />
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                {t("主页")}
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ContextScreen({
  form,
  liveEntries,
  onFormChange,
  actions,
}: {
  form: BackendSettings;
  liveEntries: CodexContextEntries | null;
  onFormChange: (value: BackendSettings) => void;
  actions: Actions;
}) {
  return (
    <Panel fill>
      <CardHead title={t("Codex 工具与插件")} detail={t("独立管理 Codex 的 MCP、Skills、Plugins。")} />
      <CardContent>
        <RelayContextManager
          form={normalizeSettings(form)}
          liveEntries={liveEntries}
          onFormChange={onFormChange}
          actions={actions}
        />
      </CardContent>
    </Panel>
  );
}

function RelayContextManager({
  form,
  liveEntries,
  onFormChange,
  actions,
}: {
  form: BackendSettings;
  liveEntries: CodexContextEntries | null;
  onFormChange: (value: BackendSettings) => void;
  actions: Actions;
}) {
  const entries = contextEntriesWithLiveEntries(form, liveEntries);
  const [activeKind, setActiveKind] = useState<ContextKind>("mcp");
  const [editor, setEditor] = useState<{ kind: ContextKind; entry?: CodexContextEntry } | null>(null);
  const visibleEntries = contextEntriesByKind(entries, activeKind);
  const label = contextKindLabel(activeKind);

  const saveEntry = async (kind: ContextKind, id: string, tomlBody: string) => {
    const next = await actions.upsertContextEntry(form, kind, id, tomlBody);
    if (!next) return;
    onFormChange(next);
    setEditor(null);
  };

  const toggleContextEntryEnabled = async (entry: CodexContextEntry) => {
    const nextBody = setContextEntryEnabled(entry.tomlBody, !entry.enabled);
    const next = await actions.upsertContextEntry(form, entry.kind, entry.id, nextBody);
    if (!next) return;
    onFormChange(next);
    await actions.syncLiveContextEntries(next, true);
  };

  const deleteEntry = async (entry: CodexContextEntry) => {
    const next = await actions.deleteContextEntry(form, entry.kind, entry.id);
    if (!next) return;
    onFormChange(next);
  };

  return (
    <div className="relay-context-panel">
      <div className="relay-context-head">
        <div>
          <strong>{t("Codex 工具与插件")}</strong>
          <span>{t("MCP、Skills、Plugins 作为全局配置独立管理。")}</span>
        </div>
        <div className="relay-context-head-actions">
          <Button onClick={() => setEditor({ kind: activeKind })} size="sm" variant="secondary">
            <Plus className="h-4 w-4" />
            {t("新增")}{label}
          </Button>
        </div>
      </div>
      <div className="segmented">
        {contextKindOptions.map((option) => (
          <button
            className={activeKind === option.kind ? "active" : ""}
            key={option.kind}
            onClick={() => setActiveKind(option.kind)}
            type="button"
          >
            <span>{option.label}</span>
            <small>{contextEntriesByKind(entries, option.kind).length}</small>
          </button>
        ))}
      </div>
      <div className="relay-context-summary">
        {t("当前共有")} {visibleEntries.length} {t("个")}{label}{t("；这些条目独立保存，会写入 Codex 通用配置。")}
      </div>
      <div className="relay-context-list">
        {visibleEntries.length ? (
          visibleEntries.map((entry) => (
            <div className="relay-context-row" key={`${entry.kind}-${entry.id}`}>
              <strong className="context-title">{entry.title || entry.id}</strong>
              <div className="relay-context-actions">
                <button
                  aria-checked={entry.enabled}
                  aria-label={`contextEnabledSwitch-${entry.kind}-${entry.id}`}
                  className={`context-enabled-switch ${entry.enabled ? "active" : ""}`}
                  onClick={() => void toggleContextEntryEnabled(entry)}
                  role="switch"
                  title={entry.enabled ? t("禁用此扩展项") : t("启用此扩展项")}
                  type="button"
                >
                  <span className="context-switch-track" aria-hidden="true">
                    <span className="context-switch-thumb" />
                  </span>
                </button>
                <Button onClick={() => setEditor({ kind: entry.kind, entry })} size="icon" title={t("编辑扩展项")} variant="ghost">
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  className="relay-context-delete"
                  onClick={() => void deleteEntry(entry)}
                  size="icon"
                  title={t("删除扩展项")}
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">{t("暂无")}{label}{t("，可以从通用配置文件或这里新增。")}</div>
        )}
      </div>
      {editor ? (
        <ContextEntryEditor
          entry={editor.entry}
          kind={editor.kind}
          onCancel={() => setEditor(null)}
          onSave={(kind, id, tomlBody) => void saveEntry(kind, id, tomlBody)}
        />
      ) : null}
    </div>
  );
}

function ContextEntryEditor({
  kind,
  entry,
  onCancel,
  onSave,
}: {
  kind: ContextKind;
  entry?: CodexContextEntry;
  onCancel: () => void;
  onSave: (kind: ContextKind, id: string, tomlBody: string) => void;
}) {
  const [draftKind, setDraftKind] = useState<ContextKind>(entry?.kind ?? kind);
  const [id, setId] = useState(entry?.id ?? "");
  const [tomlBody, setTomlBody] = useState(entry?.tomlBody ?? "");
  const canSave = id.trim().length > 0;

  return (
    <div className="context-editor">
      <div className="context-editor-fields">
        <Field label={t("类型")}>
          <select
            className="field-select"
            disabled={!!entry}
            value={draftKind}
            onChange={(event) => setDraftKind(event.currentTarget.value as ContextKind)}
          >
            {contextKindOptions.map((option) => (
              <option key={option.kind} value={option.kind}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label="ID">
          <Input
            disabled={!!entry}
            value={id}
            onChange={(event) => setId(event.currentTarget.value.trim())}
            placeholder={t("例如 context7")}
          />
        </Field>
      </div>
      <Field label={t("TOML 配置体")}>
        <Textarea
          className="context-editor-textarea"
          value={tomlBody}
          onChange={(event) => setTomlBody(event.currentTarget.value)}
          placeholder={t("只填写表头下面的内容，例如：\ncommand = \"npx\"\nargs = [\"-y\", \"@upstash/context7-mcp\"]")}
          spellCheck={false}
        />
      </Field>
      <Toolbar>
        <Button disabled={!canSave} onClick={() => onSave(draftKind, id.trim(), tomlBody)} size="sm">
          <Save className="h-4 w-4" />
          {t("保存扩展项")}
        </Button>
        <Button onClick={onCancel} size="sm" variant="secondary">{t("取消")}</Button>
      </Toolbar>
    </div>
  );
}

function SyncedTextarea({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);
  const latestExternalValueRef = useRef(value);

  useEffect(() => {
    latestExternalValueRef.current = value;
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <Textarea
      className={className}
      value={localValue}
      onBlur={() => {
        isFocusedRef.current = false;
        setLocalValue(latestExternalValueRef.current);
      }}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setLocalValue(next);
        onValueChange(next);
      }}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      spellCheck={false}
    />
  );
}

function FeatureItem({ title, detail, enabled }: { title: string; detail: string; enabled: boolean }) {
  return (
    <div className="feature-item">
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <Badge status={enabled ? "ok" : "disabled"} />
    </div>
  );
}

function FeatureGroup({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="feature-group">
      <div className="feature-group-head">
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <div className="feature-switch-grid">{children}</div>
    </section>
  );
}

function FeatureToggle({
  title,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`feature-toggle ${disabled ? "disabled" : ""}`}>
      <MaterialSwitch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </label>
  );
}

// A few compact inline toggles retain this visual-only helper. The primary
// feature controls above use Material Web's accessible md-switch component.
function ToggleVisual() {
  return (
    <span aria-hidden="true" className="toggle-switch-visual">
      <span className="toggle-switch-thumb" />
    </span>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function GuideList({ items }: { items: string[] }) {
  return (
    <div className="guide-list">
      {items.map((item, index) => (
        <div className="guide-step" key={item}>
          <span>{index + 1}</span>
          <p>{item}</p>
        </div>
      ))}
    </div>
  );
}

function NoticeDialog({
  notice,
  onClose,
}: {
  notice: { title: string; message: string; status?: Status };
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className={`toast-card ${notice.status === "failed" ? "failed" : ""}`}>
        <div className="toast-progress" />
        <div className="toast-icon">
          {notice.status === "failed" ? <Bell className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </div>
        <div className="toast-body">
          <h2>{notice.title}</h2>
          <p>{notice.message}</p>
        </div>
        <button className="toast-close" onClick={onClose} type="button">×</button>
      </div>
    </div>
  );
}

function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel,
}: {
  confirm: { title: string; message: string; confirmText: string; cancelText: string };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <h2>{confirm.title}</h2>
            <p className="modal-message">{confirm.message}</p>
          </div>
          <button className="toast-close" onClick={onCancel} type="button">×</button>
        </div>
        <Toolbar>
          <Button onClick={onConfirm}>
            <Trash2 className="h-4 w-4" />
            {confirm.confirmText}
          </Button>
          <Button onClick={onCancel} variant="secondary">{confirm.cancelText}</Button>
        </Toolbar>
      </div>
    </div>
  );
}

function TaskProgressBox({ progress, title, completedTitle = t("上次修复结果") }: { progress: TaskProgress; title: string; completedTitle?: string }) {
  if (!progress.active && progress.percent <= 0) return null;
  return (
    <div className="task-progress" data-active={progress.active}>
      <div className="task-progress-head">
        <strong>{progress.active ? title : completedTitle}</strong>
        <span>{progress.percent}%</span>
      </div>
      <div
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress.percent}
        className="task-progress-bar"
        role="progressbar"
      >
        <div className="task-progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <small>{progress.message}</small>
    </div>
  );
}

function Panel({ children, fill = false, className = "" }: { children: React.ReactNode; fill?: boolean; className?: string }) {
  return (
    <Card className={`panel ${fill ? "fill" : ""} ${className}`}>
      {children}
    </Card>
  );
}

function CardHead({ title, detail }: { title: string; detail: string }) {
  return (
    <CardHeader className="panel-head">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{detail}</CardDescription>
    </CardHeader>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <Label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </Label>
  );
}

function StatusRow({ title, status = "unknown", path }: { title: string; status?: string; path?: string | null }) {
  return (
    <div className="status-row">
      <span>{title}</span>
      <Badge status={status} />
      <code>{path || t("未记录路径")}</code>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  return <UiBadge className={statusClass(status)} variant="secondary">{statusLabel(status)}</UiBadge>;
}

function LatestLaunch({ status }: { status: LaunchStatus | null }) {
  if (!status) return <div className="empty">{t("暂无启动状态。")}</div>;
  return (
    <div className="metric-list">
      <Metric label={t("状态")} value={status.status} />
      <Metric label={t("消息")} value={status.message} />
      <Metric label="Debug" value={String(status.debug_port ?? "-")} />
      <Metric label="Helper" value={String(status.helper_port ?? "-")} />
      <Metric label={t("时间")} value={formatTime(status.started_at_ms)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScriptRow({ script, actions }: { script: NonNullable<UserScriptInventory["scripts"]>[number]; actions: Actions }) {
  const source = script.market_id ? tf("市场 · {0}", [script.version || t("未知版本")]) : script.source === "builtin" ? t("内置") : t("用户");
  const canDelete = script.source === "user";
  return (
    <div className="table-row">
      <span>{script.name}</span>
      <span>{source}</span>
      <span>{script.enabled ? t("启用") : t("关闭")}</span>
      <span>{script.status}</span>
      <div className="script-row-actions">
        <Button onClick={() => void actions.setUserScriptEnabled(script.key, !script.enabled)} size="sm" variant="secondary">
          {script.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          {script.enabled ? t("禁用") : t("启用")}
        </Button>
        {canDelete ? (
          <Button onClick={() => void actions.deleteUserScript(script.key)} size="sm" variant="outline">
            <Trash2 className="h-4 w-4" />
            {t("删除")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function routeTitle(route: Route) {
  return routes.find((item) => item.id === route)?.label ?? t("概览");
}

function routeSubtitle(route: Route) {
  const subtitles: Record<Route, string> = {
    overview: t("检查问题、启动与快速修复"),
    sessions: t("查看、删除和修复 Codex 本地会话"),
    context: t("独立管理 MCP、Skills、Plugins"),
    enhance: t("会话删除、导出、项目移动和脚本能力"),
    zedRemote: t("管理 Codex SSH 项目并加入 Zed workspace"),
    userScripts: t("内置和用户自定义脚本清单"),
    maintenance: t("入口安装、修复、Watcher 与手动启动"),
    about: t("版本信息、项目链接、GitHub Release 更新、日志与诊断"),
    settings: t("主题和启动参数"),
  };
  return subtitles[route];
}

const contextKindOptions: Array<{ kind: ContextKind; label: string; tableName: string }> = [
  { kind: "mcp", label: "MCP", tableName: "mcp_servers" },
  { kind: "skill", label: "Skills", tableName: "skills" },
  { kind: "plugin", label: t("插件"), tableName: "plugins" },
];

function contextKindLabel(kind: ContextKind) {
  return contextKindOptions.find((option) => option.kind === kind)?.label ?? t("扩展项");
}

function contextEntriesFromSettings(settings: BackendSettings): CodexContextEntries {
  const commonConfig = normalizeDuplicateTomlTables(settings.relayContextConfigContents || "");
  return {
    mcpServers: parseContextEntries(commonConfig, "mcp", "mcp_servers"),
    skills: parseContextEntries(commonConfig, "skill", "skills"),
    plugins: parseContextEntries(commonConfig, "plugin", "plugins"),
  };
}

function contextEntriesWithLiveEntries(settings: BackendSettings, liveEntries: CodexContextEntries | null): CodexContextEntries {
  const commonEntries = contextEntriesFromSettings(settings);
  if (!liveEntries) return commonEntries;
  const liveByKind: Record<ContextKind, Map<string, CodexContextEntry>> = {
    mcp: new Map(liveEntries.mcpServers.map((entry) => [entry.id, entry])),
    skill: new Map(liveEntries.skills.map((entry) => [entry.id, entry])),
    plugin: new Map(liveEntries.plugins.map((entry) => [entry.id, entry])),
  };
  return {
    mcpServers: mergeLiveContextEntries(commonEntries.mcpServers, liveByKind.mcp),
    skills: mergeLiveContextEntries(commonEntries.skills, liveByKind.skill),
    plugins: mergeLiveContextEntries(commonEntries.plugins, liveByKind.plugin),
  };
}

function mergeLiveContextEntries(entries: CodexContextEntry[], liveEntries: Map<string, CodexContextEntry>): CodexContextEntry[] {
  const uniqueEntries = dedupeContextEntryList(entries);
  const merged = uniqueEntries.map((entry) => {
    const live = liveEntries.get(entry.id);
    return withLiveEntryState(entry, live);
  });
  const knownIds = new Set(uniqueEntries.map((entry) => entry.id));
  for (const liveEntry of liveEntries.values()) {
    if (!knownIds.has(liveEntry.id)) merged.push(liveEntry);
  }
  return merged;
}

function withLiveEntryState(entry: CodexContextEntry, live?: CodexContextEntry): CodexContextEntry {
  return live ? { ...entry, enabled: live.enabled } : { ...entry, enabled: false };
}

function contextEntriesFromConfig(configContents: string): CodexContextEntries {
  return {
    mcpServers: parseContextEntries(configContents, "mcp", "mcp_servers"),
    skills: parseContextEntries(configContents, "skill", "skills"),
    plugins: parseContextEntries(configContents, "plugin", "plugins"),
  };
}

function mergeContextEntries(primary: CodexContextEntries, secondary: CodexContextEntries): CodexContextEntries {
  return {
    mcpServers: mergeContextEntryList(primary.mcpServers, secondary.mcpServers),
    skills: mergeContextEntryList(primary.skills, secondary.skills),
    plugins: mergeContextEntryList(primary.plugins, secondary.plugins),
  };
}

function mergeContextEntryList(primary: CodexContextEntry[], secondary: CodexContextEntry[]): CodexContextEntry[] {
  return dedupeContextEntryList([...primary, ...secondary]);
}

function dedupeContextEntryList(entries: CodexContextEntry[]): CodexContextEntry[] {
  const byId = new Map<string, CodexContextEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values());
}

function parseContextEntries(commonConfig: string, kind: ContextKind, tableName: string): CodexContextEntry[] {
  const anyHeaderPattern = /^\s*\[[^\]]+\]\s*$/;
  const entries = new Map<string, CodexContextEntry>();
  let currentId: string | null = null;
  let body: string[] = [];

  const flush = () => {
    if (!currentId) return;
    const tomlBody = ensureTrailingNewline(body.join("\n").trimEnd());
    entries.set(currentId, {
      id: currentId,
      kind,
      title: currentId,
      summary: contextEntrySummary(tomlBody),
      tomlBody,
      enabled: contextEntryEnabled(tomlBody),
    });
  };

  for (const line of commonConfig.split(/\r?\n/)) {
    const path = tomlTablePathFromLine(line);
    if (path?.[0] === tableName && path.length >= 2) {
      const id = path[1];
      if (currentId === id && path.length > 2) {
        body.push(`[${path.slice(2).map(tomlKey).join(".")}]`);
        continue;
      }
      flush();
      currentId = id;
      body = [];
      continue;
    }
    if (currentId && anyHeaderPattern.test(line)) {
      flush();
      currentId = null;
      body = [];
      continue;
    }
    if (currentId) body.push(line);
  }
  flush();

  return Array.from(entries.values());
}

function tomlTablePathFromLine(line: string): string[] | null {
  const match = /^\s*\[([^\]]+)\]\s*$/.exec(line);
  if (!match) return null;
  return parseTomlDottedPath(match[1].trim());
}

function parseTomlDottedPath(path: string): string[] | null {
  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of path) {
    if (quote) {
      if (quote === '"' && escaping) {
        current += char;
        escaping = false;
      } else if (quote === '"' && char === "\\") {
        escaping = true;
      } else if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ".") {
      if (!current.trim()) return null;
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (quote || escaping || !current.trim()) return null;
  parts.push(current.trim());
  return parts;
}

function contextEntrySummary(tomlBody: string) {
  return tomlBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !/^enabled\s*=/.test(line))
    ?.slice(0, 96) ?? "";
}

function contextEntryEnabled(tomlBody: string) {
  return !tomlBody.split(/\r?\n/).some((line) => /^\s*enabled\s*=\s*false\s*(#.*)?$/i.test(line));
}

function setContextEntryEnabled(tomlBody: string, enabled: boolean) {
  const lines = tomlBody.trimEnd().split(/\r?\n/);
  const nextValue = `enabled = ${enabled ? "true" : "false"}`;
  let replaced = false;
  const next = lines.map((line) => {
    if (/^\s*enabled\s*=/.test(line)) {
      replaced = true;
      return nextValue;
    }
    return line;
  });
  if (!replaced) next.unshift(nextValue);
  return ensureTrailingNewline(next.join("\n").trimEnd());
}

function ensureTrailingNewline(value: string) {
  return value.trim() ? `${value}\n` : "";
}

function unquoteTomlKey(key: string) {
  if (key.length >= 2 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
    return key.slice(1, -1);
  }
  return key;
}

function contextEntriesByKind(entries: CodexContextEntries, kind: ContextKind): CodexContextEntry[] {
  if (kind === "mcp") return dedupeContextEntryList(entries.mcpServers);
  if (kind === "skill") return dedupeContextEntryList(entries.skills);
  return dedupeContextEntryList(entries.plugins);
}

function selectedContextConfigToml(entries: CodexContextEntries): string {
  const sections: string[] = [];
  for (const option of contextKindOptions) {
    for (const entry of dedupeContextEntryList(contextEntriesByKind(entries, option.kind))) {
      if (!entry.enabled) continue;
      sections.push(contextEntryToTomlSection(option.tableName, entry));
    }
  }
  return ensureTrailingNewline(sections.join("\n\n"));
}

function allContextConfigToml(entries: CodexContextEntries): string {
  const sections: string[] = [];
  for (const option of contextKindOptions) {
    for (const entry of dedupeContextEntryList(contextEntriesByKind(entries, option.kind))) {
      sections.push(contextEntryToTomlSection(option.tableName, entry));
    }
  }
  return ensureTrailingNewline(sections.join("\n\n"));
}

function contextEntryToTomlSection(tableName: string, entry: CodexContextEntry): string {
  const parentHeader = `[${tableName}.${tomlKey(entry.id)}]`;
  const body = entry.tomlBody
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => relativeContextSubtableToAbsolute(line, tableName, entry.id))
    .join("\n");
  return `${parentHeader}\n${body}`;
}

function relativeContextSubtableToAbsolute(line: string, tableName: string, id: string): string {
  const match = /^\s*\[([^\]]+)\]\s*$/.exec(line);
  if (!match) return line;
  const subtable = match[1].trim();
  if (!subtable || subtable.includes(".")) return line;
  return `[${tableName}.${tomlKey(id)}.${tomlKey(subtable)}]`;
}

function syncLiveConfigContextState(liveConfigContents: string, settings: BackendSettings): string {
  const entries = contextEntriesFromSettings(settings);
  const withoutManaged = stripContextEntriesFromConfig(liveConfigContents, entries);
  return joinTomlSectionsRootFirst([withoutManaged, selectedContextConfigToml(entries)]);
}

function splitContextConfigText(configContents: string): { common: string; context: string } {
  const entries = contextEntriesFromConfig(configContents);
  return {
    common: stripContextEntriesFromConfig(configContents, entries),
    context: allContextConfigToml(entries),
  };
}

function stripContextEntriesFromConfig(configContents: string, entries: CodexContextEntries): string {
  const knownIds: Record<ContextKind, Set<string>> = {
    mcp: new Set(entries.mcpServers.map((entry) => entry.id)),
    skill: new Set(entries.skills.map((entry) => entry.id)),
    plugin: new Set(entries.plugins.map((entry) => entry.id)),
  };
  const lines = configContents.split(/\r?\n/);
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const contextHeader = contextHeaderFromLine(line);
    if (contextHeader) {
      skipping = knownIds[contextHeader.kind].has(contextHeader.id);
    } else if (/^\s*\[[^\]]+\]\s*$/.test(line)) {
      skipping = false;
    }
    if (!skipping) kept.push(line);
  }

  return ensureTrailingNewline(kept.join("\n").trimEnd());
}

function stripCommonConfigTextFallback(configContents: string, commonConfig: string): string {
  const anchors = commonConfigAnchors(commonConfig);
  if (!anchors.rootKeys.size && !anchors.tableHeaders.size) return ensureTrailingNewline(configContents.trimEnd());

  const kept: string[] = [];
  let skippingTable = false;

  for (const line of configContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\[[^\]]+\]$/.test(trimmed)) {
      skippingTable = anchors.tableHeaders.has(trimmed);
      if (skippingTable) continue;
    }
    if (skippingTable) continue;
    const key = tomlRootKeyFromLine(trimmed);
    if (key && anchors.rootKeys.has(key)) continue;
    kept.push(line);
  }

  return ensureTrailingNewline(kept.join("\n").trimEnd());
}

function commonConfigAnchors(commonConfig: string): { rootKeys: Set<string>; tableHeaders: Set<string> } {
  const rootKeys = new Set<string>();
  const tableHeaders = new Set<string>();
  let inRoot = true;

  for (const line of commonConfig.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\[[^\]]+\]$/.test(trimmed)) {
      inRoot = false;
      tableHeaders.add(trimmed);
      continue;
    }
    if (inRoot) {
      const key = tomlRootKeyFromLine(trimmed);
      if (key) rootKeys.add(key);
    }
  }

  return { rootKeys, tableHeaders };
}

function tomlRootKeyFromLine(line: string): string | null {
  if (!line || line.startsWith("#")) return null;
  const index = line.indexOf("=");
  if (index < 0) return null;
  const key = line.slice(0, index).trim();
  return key || null;
}

function contextHeaderFromLine(line: string): { kind: ContextKind; id: string } | null {
  const path = tomlTablePathFromLine(line);
  if (!path || path.length !== 2) return null;
  const option = contextKindOptions.find((item) => item.tableName === path[0]);
  return option ? { kind: option.kind, id: path[1] } : null;
}

function removeRootTomlKey(contents: string, key: string): string {
  const lines: string[] = [];
  let inRoot = true;
  for (const line of contents.split(/\r?\n/)) {
    if (/^\s*\[[^\]]+\]\s*$/.test(line)) inRoot = false;
    if (inRoot && new RegExp(`^\\s*${key}\\s*=`).test(line)) continue;
    lines.push(line);
  }
  return ensureTrailingNewline(lines.join("\n").trimEnd());
}

function joinTomlSections(sections: string[]): string {
  return ensureTrailingNewline(
    sections
      .map((section) => section.trim())
      .filter(Boolean)
      .join("\n\n"),
  );
}

function joinTomlSectionsRootFirst(sections: string[]): string {
  const rootParts: string[] = [];
  const tableParts: string[] = [];

  for (const section of sections) {
    const { root, tables } = splitTomlRootAndTables(section);
    if (root.trim()) rootParts.push(root.trim());
    if (tables.trim()) tableParts.push(tables.trim());
  }

  return normalizeDuplicateTomlTables(joinTomlSections([...dedupeTomlRootLines(rootParts), ...tableParts]));
}

function normalizeDuplicateTomlTables(contents: string): string {
  const seenHeaders = new Set<string>();
  const kept: string[] = [];
  let skipping = false;

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\[[^\]]+\]$/.test(trimmed)) {
      skipping = seenHeaders.has(trimmed);
      seenHeaders.add(trimmed);
      if (skipping) continue;
    }
    if (!skipping) kept.push(line);
  }

  return ensureTrailingNewline(kept.join("\n").trimEnd());
}

function dedupeTomlRootLines(rootParts: string[]): string[] {
  const rootLines = rootParts
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
  const rootSeen = new Set<string>();
  const kept: string[] = [];

  for (let index = rootLines.length - 1; index >= 0; index -= 1) {
    const line = rootLines[index];
    const key = tomlRootKeyFromLine(line.trim());
    if (key) {
      if (rootSeen.has(key)) continue;
      rootSeen.add(key);
    }
    kept.push(line);
  }

  const normalized = kept.reverse().join("\n").trim();
  return normalized ? [normalized] : [];
}

function splitTomlRootAndTables(section: string): { root: string; tables: string } {
  const lines = section.trim().split(/\r?\n/);
  const firstTable = lines.findIndex((line) => /^\s*\[[^\]]+\]\s*$/.test(line));
  if (firstTable < 0) return { root: lines.join("\n"), tables: "" };
  return {
    root: lines.slice(0, firstTable).join("\n"),
    tables: lines.slice(firstTable).join("\n"),
  };
}

function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : `"${tomlString(key)}"`;
}

function tomlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    found: t("已找到"),
    missing: t("缺失"),
    installed: t("已安装"),
    ok: t("正常"),
    running: t("运行中"),
    failed: t("失败"),
    archived: t("已归档"),
    accepted: t("已受理"),
    not_checked: t("未检查"),
    not_implemented: t("未实现"),
    disabled: t("已禁用"),
    unknown: t("未知"),
  };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (["found", "installed", "ok", "running"].includes(status)) return "good";
  if (["failed", "missing"].includes(status)) return "bad";
  return "warn";
}

function isSuccessStatus(status?: Status) {
  return status === "ok" || status === "accepted";
}

function truncateSessionDeletePreview(value: string) {
  const normalized = value.trim();
  return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized;
}

function healthItems(overview: OverviewResult | null) {
  return [
    {
      title: t("Codex 应用"),
      status: overview?.codex_app.status ?? "not_checked",
      ok: overview?.codex_app.status === "found",
      detail: overview?.codex_app.path || t("尚未检查 Codex 应用路径。"),
    },
    {
      title: t("静默启动入口"),
      status: overview?.silent_shortcut.status ?? "not_checked",
      ok: overview?.silent_shortcut.status === "installed",
      detail: overview?.silent_shortcut.path || t("缺少 Codex++ 静默启动快捷方式时可在安装维护页修复。"),
    },
    {
      title: t("管理工具入口"),
      status: overview?.management_shortcut.status ?? "not_checked",
      ok: overview?.management_shortcut.status === "installed",
      detail: overview?.management_shortcut.path || t("缺少管理工具快捷方式时可在安装维护页修复。"),
    },
  ];
}

function normalizeSettings(settings: BackendSettings): BackendSettings {
  const splitCommon = splitContextConfigText(settings.relayCommonConfigContents || "");
  const relayCommonConfigContents = splitCommon.common;
  const relayContextConfigContents = joinTomlSectionsRootFirst([
    settings.relayContextConfigContents || "",
    splitCommon.context,
  ]);
  return {
    ...defaultSettings,
    ...settings,
    computerUseGuardEnabled: settings.computerUseGuardEnabled === true,
    codexAppImageOverlayOpacity: clampNumber(settings.codexAppImageOverlayOpacity || 35, 1, 100),
    codexAppImageOverlayFitMode: normalizeImageOverlayFitMode(settings.codexAppImageOverlayFitMode),
    codexAppStepwiseMaxItems: clampNumber(settings.codexAppStepwiseMaxItems ?? 6, 0, 6),
    codexAppStepwiseMaxInputChars: clampNumber(settings.codexAppStepwiseMaxInputChars || 6000, 1000, 24000),
    codexAppStepwiseMaxOutputTokens: clampNumber(settings.codexAppStepwiseMaxOutputTokens || 500, 100, 4000),
    codexAppStepwiseTimeoutMs: clampNumber(settings.codexAppStepwiseTimeoutMs || 8000, 1000, 60000),
    relayCommonConfigContents,
    relayContextConfigContents,
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeImageOverlayFitMode(value: string | undefined): ImageOverlayFitMode {
  return value === "fill" || value === "fit" || value === "stretch" || value === "tile" || value === "center"
    ? value
    : "fit";
}

function codexExtraArgsToInput(args: string[] | undefined) {
  return (args ?? []).join("\n");
}

function inputToCodexExtraArgs(value: string) {
  return value === "" ? [] : value.split(/\r?\n/);
}

function numberOrDefault(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitLogLines(text: string) {
  return text.trimEnd().split(/\r?\n/).filter((line, index, lines) => line.length > 0 || index < lines.length - 1);
}

function zedStrategyLabel(strategy: ZedOpenStrategy) {
  if (strategy === "reuseWindow") return t("复用窗口");
  if (strategy === "newWindow") return t("新窗口");
  if (strategy === "default") return t("Zed 默认行为");
  return t("加入当前工作区");
}

function zedRemoteHostLabel(project: ZedRemoteProject) {
  const user = project.ssh.user ? `${project.ssh.user}@` : "";
  const port = project.ssh.port ? `:${project.ssh.port}` : "";
  return `${user}${project.ssh.host}${port}`;
}

function zedRemoteSourceLabel(source: string) {
  if (source === "currentThread") return t("当前会话");
  if (source === "codexRemoteProject") return "Codex remote project";
  if (source === "threadWorkspaceHint") return "Thread workspace hint";
  if (source === "sqliteThreadCwd") return "SQLite cwd";
  if (source === "recent") return t("最近打开");
  return source || t("未知来源");
}

function formatTime(value: number) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

function formatDuration(startedAtMs: number): string {
  if (!startedAtMs) return "-";
  const elapsed = Date.now() - startedAtMs;
  if (elapsed < 0) return formatTime(startedAtMs);
  const mins = Math.floor(elapsed / 60000);
  if (mins < 1) return t("刚刚启动");
  if (mins < 60) return tf("已运行 {0} 分钟", [mins]);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return tf("已运行 {0} 小时 {1} 分钟", [hours, remainMins]);
}

function stringifyError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function loadInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem("codex-plus-theme") === "light" ? "light" : "dark";
}

function loadInitialRoute(): Route {
  if (typeof window === "undefined") return "overview";
  const params = new URLSearchParams(window.location.search);
  if (params.get("showUpdate") === "1" || window.location.hash === "#about") {
    return "about";
  }
  return "overview";
}
