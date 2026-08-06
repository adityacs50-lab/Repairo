export type SeverityLevel = "low" | "medium" | "high";

export interface Metric {
  id: string;
  label: string;
  value: number;
  trend?: string;
  icon?: string;
}

export interface BreakingChange {
  id: string;
  repository: string;
  timestamp: string;
  breakingChangesCount: number;
  severity: SeverityLevel;
}

export interface PullRequestInfo {
  repository: string;
  serviceName: string;
  title: string;
  prNumber: number;
  status: "ready" | "open" | "merged";
  openedTimeAgo: string;
  prUrl?: string;
}

export interface ActivityEvent {
  id: string;
  time: string;
  title: string;
  repository?: string;
}

export interface ImpactData {
  affected: number;
  pending: number;
  safe: number;
  totalFiles: number;
}

export interface DashboardState {
  metrics: Metric[];
  breakingChanges: BreakingChange[];
  activePR: PullRequestInfo;
  activity: ActivityEvent[];
  impact: ImpactData;
}
