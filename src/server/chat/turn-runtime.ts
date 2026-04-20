export type TurnStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "interrupted";

export type TurnFinalStatus = "completed" | "failed" | "interrupted";

export type TurnInterruptionReason =
  | "user_cancelled"
  | "network_disconnected"
  | "server_timeout"
  | "unknown";

export type TurnMainStage = "A" | "B" | "C" | "D" | "E" | "F";

export type TurnStep = {
  stepKey: string;
  mainStage: TurnMainStage;
  subStage: string;
  status: TurnStepStatus;
  reasonTag: string | null;
  safeMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  error: { code: string; message: string } | null;
  details: Array<{ title: string; content: string }>;
  seq: number;
};

export type TurnMainStageState = {
  stage: TurnMainStage;
  status: TurnStepStatus;
};

export type TurnSnapshot = {
  version: "0.1.8";
  frozen: boolean;
  mainStages: TurnMainStageState[];
  subSteps: TurnStep[];
  reasoning: {
    visibilityLevel: 0;
    status: "not_triggered" | "running" | "completed" | "failed" | "interrupted";
    safeSummary: string | null;
  };
};

export type TurnDeltaPayload = {
  turnId: string;
  seq: number;
  step: TurnStep;
  snapshot: TurnSnapshot;
};

const ORDERED_STEPS: Array<{ stepKey: string; mainStage: TurnMainStage; subStage: string }> = [
  { stepKey: "A1", mainStage: "A", subStage: "request_validation" },
  { stepKey: "A2", mainStage: "A", subStage: "persist_user_message" },
  { stepKey: "B1", mainStage: "B", subStage: "prepare_history" },
  { stepKey: "C1", mainStage: "C", subStage: "knowledge_injection" },
  { stepKey: "D1", mainStage: "D", subStage: "assistant_generation" },
  { stepKey: "E1", mainStage: "E", subStage: "summary_persist" },
  { stepKey: "F1", mainStage: "F", subStage: "persist_assistant_message" },
];

const STAGE_ORDER: TurnMainStage[] = ["A", "B", "C", "D", "E", "F"];
const STATUS_PRIORITY: Record<TurnStepStatus, number> = {
  pending: 0,
  running: 1,
  completed: 2,
  skipped: 2,
  failed: 3,
  interrupted: 4,
};

function nowIso() {
  return new Date().toISOString();
}

export function createInitialTurnSnapshot(): TurnSnapshot {
  return {
    version: "0.1.8",
    frozen: false,
    mainStages: STAGE_ORDER.map((stage) => ({ stage, status: "pending" })),
    subSteps: ORDERED_STEPS.map((step) => ({
      ...step,
      status: "pending",
      reasonTag: null,
      safeMessage: null,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      error: null,
      details: [],
      seq: 0,
    })),
    reasoning: {
      visibilityLevel: 0,
      status: "not_triggered",
      safeSummary: null,
    },
  };
}

export function serializeTurnSnapshot(snapshot: TurnSnapshot): string {
  return JSON.stringify(snapshot);
}

export class TurnRuntimeState {
  private seq = 0;

  constructor(
    public readonly turnId: string,
    private readonly snapshot: TurnSnapshot,
  ) {}

  getSnapshot(): TurnSnapshot {
    return this.snapshot;
  }

  updateStep(
    stepKey: string,
    status: TurnStepStatus,
    options?: {
      reasonTag?: string | null;
      safeMessage?: string | null;
      error?: { code: string; message: string } | null;
      details?: Array<{ title: string; content: string }>;
    },
  ): TurnDeltaPayload {
    const step = this.snapshot.subSteps.find((s) => s.stepKey === stepKey);
    if (!step || this.snapshot.frozen) {
      return {
        turnId: this.turnId,
        seq: this.seq,
        step: step ?? this.snapshot.subSteps[0],
        snapshot: this.snapshot,
      };
    }
    this.seq += 1;
    const now = nowIso();
    if (status === "running" && !step.startedAt) {
      step.startedAt = now;
    }
    if (["completed", "failed", "skipped", "interrupted"].includes(status)) {
      step.endedAt = now;
      const startMs = step.startedAt ? Date.parse(step.startedAt) : Date.now();
      step.durationMs = Math.max(0, Date.parse(now) - startMs);
    }
    step.status = status;
    step.reasonTag = options?.reasonTag ?? step.reasonTag;
    step.safeMessage = options?.safeMessage ?? step.safeMessage;
    step.error = options?.error ?? step.error;
    step.details = options?.details ?? step.details;
    step.seq = this.seq;
    this.recomputeMainStages();
    return { turnId: this.turnId, seq: this.seq, step: { ...step }, snapshot: this.snapshot };
  }

  updateReasoning(status: TurnSnapshot["reasoning"]["status"], safeSummary?: string | null): void {
    if (this.snapshot.frozen) return;
    this.snapshot.reasoning.status = status;
    if (typeof safeSummary === "string") {
      this.snapshot.reasoning.safeSummary = safeSummary.slice(0, 200);
    }
  }

  freeze(finalStatus: TurnFinalStatus, reason?: TurnInterruptionReason): void {
    if (this.snapshot.frozen) return;
    for (const step of this.snapshot.subSteps) {
      if (step.status === "pending") {
        this.seq += 1;
        if (finalStatus === "completed") {
          step.status = "skipped";
        } else {
          step.status = finalStatus === "failed" ? "skipped" : "interrupted";
        }
        step.seq = this.seq;
      }
    }
    if (reason) {
      const failed = this.snapshot.subSteps.find((step) => step.status === "failed");
      if (failed) {
        failed.reasonTag = reason;
      }
    }
    this.recomputeMainStages();
    this.snapshot.frozen = true;
  }

  private recomputeMainStages(): void {
    for (const stage of STAGE_ORDER) {
      const steps = this.snapshot.subSteps.filter((s) => s.mainStage === stage);
      let nextStatus: TurnStepStatus = "pending";
      for (const step of steps) {
        if (STATUS_PRIORITY[step.status] > STATUS_PRIORITY[nextStatus]) {
          nextStatus = step.status;
        }
      }
      this.snapshot.mainStages.find((s) => s.stage === stage)!.status = nextStatus;
    }
  }
}
