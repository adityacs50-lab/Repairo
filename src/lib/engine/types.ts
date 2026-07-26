export type ChangeSeverity = "breaking" | "non-breaking" | "additive";

export type ChangeKind =
  | "endpoint-removed"
  | "endpoint-added"
  | "field-removed"
  | "field-added"
  | "field-required"
  | "enum-value-removed"
  | "enum-value-added"
  | "type-changed"
  | "server-url-changed"
  | "operation-changed";

export interface ApiChange {
  id: string;
  kind: ChangeKind;
  severity: ChangeSeverity;
  path: string;
  operation?: string;
  field?: string;
  before?: string;
  after?: string;
  summary: string;
}

export interface ImpactMatch {
  file: string;
  line: number;
  column: number;
  snippet: string;
  symbol: string;
  changeId: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface SuggestedFix {
  changeId: string;
  file: string;
  description: string;
  before: string;
  after: string;
  safe: boolean;
  safetyNotes: string[];
}

export interface PullRequestDraft {
  title: string;
  branch: string;
  body: string;
  labels: string[];
  commits: Array<{ message: string; files: string[] }>;
  files: Array<{ path: string; content: string; patch: string }>;
  safetyScore: number;
  autoMergeEligible: boolean;
}

export interface RepairRunResult {
  runId: string;
  detectedAt: string;
  fromVersion: string;
  toVersion: string;
  changes: ApiChange[];
  impacts: ImpactMatch[];
  fixes: SuggestedFix[];
  pullRequest: PullRequestDraft;
  summary: {
    breaking: number;
    nonBreaking: number;
    additive: number;
    impactedFiles: number;
    safeFixes: number;
  };
}

export interface OpenApiDocument {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: Array<{ url: string }>;
  paths?: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

export interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
  [method: string]: OperationObject | undefined;
}

export interface OperationObject {
  operationId?: string;
  summary?: string;
  parameters?: ParameterObject[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: SchemaObject | RefObject }>;
  };
  responses?: Record<
    string,
    { description?: string; content?: Record<string, { schema?: SchemaObject | RefObject }> }
  >;
}

export interface ParameterObject {
  name: string;
  in: string;
  required?: boolean;
  schema?: SchemaObject | RefObject;
}

export interface RefObject {
  $ref: string;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  enum?: Array<string | number | boolean>;
  required?: string[];
  properties?: Record<string, SchemaObject | RefObject>;
  items?: SchemaObject | RefObject;
  additionalProperties?: boolean | SchemaObject | RefObject;
  description?: string;
}

export interface ConsumerFile {
  path: string;
  content: string;
}
