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
  /** Full set of property/parameter names on the affected schema (before ∪ after), used to
   * structurally identify the corresponding TS interface/object literal when the changed
   * field itself doesn't exist anywhere in consumer code yet (e.g. a brand-new required field). */
  relatedFields?: string[];
  /** JSON Schema `type` of the affected field, when known, used to pick a TS type for inserted properties. */
  fieldType?: string;
  /** Whether this change affects the request or response schema of the operation — request and
   * response shapes often share field names by design (a response echoes the request), so this
   * disambiguates which TS type structural matching should prefer. */
  side?: "request" | "response";
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

/** Where a fix's target value came from. Absent/"deterministic" (today's only behavior)
 * means it was derived solely from the spec diff with no ambiguity. "agent-proposed" means
 * an LLM proposed the candidate mapping for a genuinely ambiguous case — the resulting
 * fix still goes through the exact same AST transformation and compile verification as
 * any other, but it is a guess, not a proof, and always requires human review. */
export type FixOrigin = "deterministic" | "agent-proposed";

export interface SuggestedFix {
  changeId: string;
  file: string;
  description: string;
  before: string;
  after: string;
  safe: boolean;
  safetyNotes: string[];
  /** Absent = "deterministic" (today's only behavior). */
  origin?: FixOrigin;
  /** Model-reported confidence, hard-bounded to [minConfidence, 1] by `validateProposal`
   *  (see agent-resolve.ts) before a fix can ever carry this field. This is NOT a
   *  calibrated probability of correctness — it's whatever the model self-reports, just
   *  clamped to a sane range. Do not treat it as trustworthy on its own; it exists for the
   *  human reviewer's context and for future calibration once enough real outcomes are
   *  logged (confidence bucket -> actual correctness rate). Present only when
   *  origin === "agent-proposed". */
  agentConfidence?: number;
  /** The model's stated reasoning for the proposed mapping. Present only when
   * origin === "agent-proposed". */
  agentReasoning?: string;
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
  sbom?: any;
  typecheck: { passed: boolean; errors: string[] };
  summary: {
    breaking: number;
    nonBreaking: number;
    additive: number;
    impactedFiles: number;
    safeFixes: number;
    agentAssistedFixes: number;
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
