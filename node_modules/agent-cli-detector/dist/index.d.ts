declare const defaultAgents: ({
    id: string;
    name: string;
    env: ({
        name: string;
        value: string;
    } | {
        name: string;
        value?: never;
    })[];
    process: {
        pattern: RegExp;
    }[];
    sessionEnv: string[];
} | {
    id: string;
    name: string;
    env: ({
        name: string;
        value: string;
    } | {
        name: string;
        value?: never;
    })[];
    process: {
        pattern: RegExp;
    }[];
    sessionEnv?: never;
} | {
    id: string;
    name: string;
    process: {
        pattern: RegExp;
    }[];
    env?: never;
    sessionEnv?: never;
} | {
    id: string;
    name: string;
    env: ({
        name: string;
        value: string;
    } | {
        name: string;
        value?: never;
    })[];
    sessionEnv: string[];
    process?: never;
} | {
    id: string;
    name: string;
    env: {
        name: string;
    }[];
    process?: never;
    sessionEnv?: never;
} | {
    id: string;
    name: string;
    env: {
        name: string;
        value: string;
    }[];
    process?: never;
    sessionEnv?: never;
})[];

type AgentId = "antigravity" | "bolt" | "cline" | "codex" | "copilot" | "cursor" | "devin" | "gemini" | "grok" | "kiro" | "kilocode" | "claude-code" | "muse" | "opencode" | "pi" | "replit" | "rork";
type DetectionStrategyName = "environment" | "process-tree";
type EnvValueMatcher = string | RegExp | ((value: string) => boolean);
interface EnvSignal {
    readonly name: string;
    readonly value?: EnvValueMatcher;
    readonly description?: string;
}
interface ProcessSignal {
    readonly pattern: RegExp;
    readonly description?: string;
}
interface AgentIdentity {
    readonly id: AgentId | string;
    readonly name: string;
}
interface DetectedAgent extends AgentIdentity {
    readonly sessionId?: string;
}
interface AgentDefinition extends AgentIdentity {
    readonly env?: readonly EnvSignal[];
    readonly process?: readonly ProcessSignal[];
    readonly sessionEnv?: readonly string[];
}
interface ProcessInfo {
    readonly pid: number;
    readonly ppid?: number;
    readonly command: string;
}
interface DetectionEvidence {
    readonly agent: AgentIdentity;
    readonly strategy: DetectionStrategyName | string;
    readonly signal: string;
    readonly value?: string;
}
interface DetectionResult {
    readonly detected: boolean;
    readonly agent?: DetectedAgent;
}
interface DetectionContext {
    readonly env: NodeJS.ProcessEnv;
    readonly pid: number;
    readonly agents: readonly AgentDefinition[];
    readonly maxProcessDepth: number;
}
interface DetectionStrategy {
    readonly name: DetectionStrategyName | string;
    detect(context: DetectionContext): readonly DetectionEvidence[];
}
interface DetectAgentOptions {
    readonly env?: NodeJS.ProcessEnv;
    readonly pid?: number;
    readonly agents?: readonly AgentDefinition[];
    readonly strategies?: readonly DetectionStrategy[];
    readonly experimentalProcessTree?: boolean;
    readonly maxProcessDepth?: number;
}

declare function detectAgent(options?: DetectAgentOptions): DetectionResult;
declare function isRunningFromAgent(options?: DetectAgentOptions): boolean;
declare function createDefaultStrategies(experimentalProcessTree?: boolean): readonly DetectionStrategy[];

declare class EnvironmentDetectionStrategy implements DetectionStrategy {
    readonly name = "environment";
    detect(context: DetectionContext): readonly DetectionEvidence[];
}

interface ProcessReader {
    read(pid: number): ProcessInfo | undefined;
}
declare class PsProcessReader implements ProcessReader {
    read(pid: number): ProcessInfo | undefined;
}
declare class ProcessTreeDetectionStrategy implements DetectionStrategy {
    private readonly reader;
    readonly name = "process-tree";
    constructor(reader?: ProcessReader);
    detect(context: DetectionContext): readonly DetectionEvidence[];
}

export { type AgentDefinition, type AgentId, type AgentIdentity, type DetectAgentOptions, type DetectedAgent, type DetectionContext, type DetectionEvidence, type DetectionResult, type DetectionStrategy, type DetectionStrategyName, type EnvSignal, type EnvValueMatcher, EnvironmentDetectionStrategy, type ProcessInfo, type ProcessReader, type ProcessSignal, ProcessTreeDetectionStrategy, PsProcessReader, createDefaultStrategies, defaultAgents, detectAgent, isRunningFromAgent };
