#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/agents.ts
var defaultAgents = [
  {
    id: "codex",
    name: "Codex",
    env: [
      { name: "CODEX_CI", value: "1" },
      { name: "CODEX_SHELL", value: "1" },
      { name: "CODEX_THREAD_ID" }
    ],
    process: [{ pattern: /^codex$/i }],
    sessionEnv: ["CODEX_THREAD_ID"]
  },
  {
    id: "cursor",
    name: "Cursor",
    env: [
      { name: "CURSOR_AGENT", value: "1" },
      { name: "CURSOR_CONVERSATION_ID" }
    ],
    process: [{ pattern: /^cursor$/i }],
    sessionEnv: ["CURSOR_CONVERSATION_ID"]
  },
  {
    id: "claude-code",
    name: "Claude Code",
    env: [
      { name: "CLAUDECODE", value: "1" },
      { name: "CLAUDE_CODE_SESSION_ID" }
    ],
    process: [{ pattern: /^claude$/i }],
    sessionEnv: ["CLAUDE_CODE_SESSION_ID"]
  },
  {
    id: "opencode",
    name: "OpenCode",
    env: [
      { name: "OPENCODE", value: "1" },
      { name: "OPENCODE_PID" }
    ],
    process: [{ pattern: /^opencode$/i }]
  },
  {
    id: "devin",
    name: "Devin",
    process: [{ pattern: /devin/i }]
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    env: [{ name: "GEMINI_CLI", value: "1" }],
    process: [{ pattern: /^gemini$/i }]
  },
  {
    id: "grok",
    name: "Grok",
    env: [
      { name: "GROK_AGENT", value: "1" },
      { name: "GROK_SESSION_ID" }
    ],
    sessionEnv: ["GROK_SESSION_ID"]
  },
  {
    id: "antigravity",
    name: "Antigravity",
    env: [
      { name: "ANTIGRAVITY_AGENT", value: "1" },
      { name: "ANTIGRAVITY_TRAJECTORY_ID" }
    ],
    process: [{ pattern: /^antigravity$/i }],
    sessionEnv: ["ANTIGRAVITY_TRAJECTORY_ID"]
  },
  {
    id: "bolt",
    name: "Bolt",
    env: [
      { name: "BOLT_ENV" },
      { name: "BOLT_ORIGIN" },
      { name: "BOLT_SERVER_URL" }
    ]
  },
  {
    id: "pi",
    name: "Pi",
    env: [{ name: "PI_CODING_AGENT", value: "true" }]
  },
  {
    id: "replit",
    name: "Replit",
    env: [{ name: "REPLIT_SESSION" }],
    sessionEnv: ["REPLIT_SESSION"]
  },
  {
    id: "rork",
    name: "Rork",
    env: [{ name: "RORK_API_URL" }]
  },
  {
    id: "kiro",
    name: "Kiro",
    env: [{ name: "KIRO_SESSION_ID" }],
    process: [{ pattern: /kiro/i }],
    sessionEnv: ["KIRO_SESSION_ID"]
  },
  {
    id: "muse",
    name: "Muse Code",
    env: [{ name: "MUSE_RELEASE_INFO" }]
  },
  {
    id: "cline",
    name: "Cline",
    env: [{ name: "CLINE_WRAPPER_PATH" }],
    process: [{ pattern: /^cline$/i }]
  },
  {
    id: "kilocode",
    name: "Kilo Code",
    env: [
      { name: "KILO", value: "1" },
      { name: "KILOCODE_VERSION" },
      { name: "KILO_RUN_ID" }
    ],
    process: [{ pattern: /^(kilo|kilocode)$/i }],
    sessionEnv: ["KILO_RUN_ID"]
  },
  {
    id: "copilot",
    name: "GitHub Copilot CLI",
    env: [
      { name: "COPILOT_CLI", value: "1" },
      { name: "COPILOT_AGENT_SESSION_ID" },
      { name: "COPILOT_RUN_APP", value: "1" }
    ],
    process: [{ pattern: /^(github-copilot-cli|copilot)$/i }],
    sessionEnv: ["COPILOT_AGENT_SESSION_ID"]
  }
];

// src/strategies/environment.ts
var EnvironmentDetectionStrategy = class {
  name = "environment";
  detect(context) {
    const matches = [];
    for (const agent of context.agents) {
      for (const signal of agent.env ?? []) {
        const value = context.env[signal.name];
        if (value === void 0 || !matchesEnvValue(value, signal.value)) {
          continue;
        }
        matches.push(toEvidence(agent, signal, value));
      }
    }
    return matches;
  }
};
function matchesEnvValue(value, matcher) {
  if (matcher === void 0) {
    return true;
  }
  if (typeof matcher === "string") {
    return value === matcher;
  }
  if (matcher instanceof RegExp) {
    return matcher.test(value);
  }
  return matcher(value);
}
function toEvidence(agent, signal, value) {
  return {
    agent: {
      id: agent.id,
      name: agent.name
    },
    strategy: "environment",
    signal: signal.name,
    value
  };
}

// src/strategies/process-tree.ts
var import_node_child_process = require("child_process");
var import_node_path = __toESM(require("path"), 1);
var PsProcessReader = class {
  read(pid) {
    const command = readPsField(pid, "comm");
    const ppid = Number.parseInt(readPsField(pid, "ppid"), 10);
    if (!command || !Number.isInteger(ppid)) {
      return void 0;
    }
    return {
      pid,
      ppid,
      command: normalizeCommand(command)
    };
  }
};
var ProcessTreeDetectionStrategy = class {
  constructor(reader = new PsProcessReader()) {
    this.reader = reader;
  }
  reader;
  name = "process-tree";
  detect(context) {
    const matches = [];
    let currentPid = context.pid;
    for (let depth = 0; depth < context.maxProcessDepth; depth += 1) {
      const processInfo = this.reader.read(currentPid);
      if (processInfo === void 0) {
        break;
      }
      matches.push(...matchProcess(context.agents, processInfo));
      if (processInfo.ppid === void 0 || processInfo.ppid <= 1 || processInfo.ppid === currentPid) {
        break;
      }
      currentPid = processInfo.ppid;
    }
    return matches;
  }
};
function matchProcess(agents, processInfo) {
  const matches = [];
  const command = normalizeCommand(processInfo.command);
  for (const agent of agents) {
    for (const signal of agent.process ?? []) {
      if (!signal.pattern.test(command)) {
        continue;
      }
      matches.push(toEvidence2(agent, signal, { ...processInfo, command }));
    }
  }
  return matches;
}
function toEvidence2(agent, signal, processInfo) {
  return {
    agent: {
      id: agent.id,
      name: agent.name
    },
    strategy: "process-tree",
    signal: signal.pattern.toString(),
    value: `${processInfo.pid}:${processInfo.command}`
  };
}
function readPsField(pid, field) {
  try {
    return (0, import_node_child_process.execFileSync)("ps", ["-o", `${field}=`, "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}
function normalizeCommand(command) {
  const baseName = import_node_path.default.basename(command.trim());
  return baseName.replace(/^-+/, "");
}

// src/detector.ts
function detectAgent(options = {}) {
  const agents = options.agents ?? defaultAgents;
  const strategies = options.strategies ?? defaultStrategies(options.experimentalProcessTree);
  const context = {
    env: options.env ?? process.env,
    pid: options.pid ?? process.pid,
    agents,
    maxProcessDepth: options.maxProcessDepth ?? 20
  };
  const matches = strategies.flatMap((strategy) => strategy.detect(context));
  const bestMatch = selectBestAgent(agents, matches, context.env);
  if (bestMatch === void 0) {
    return {
      detected: false
    };
  }
  return {
    detected: true,
    agent: bestMatch
  };
}
function defaultStrategies(experimentalProcessTree = false) {
  const strategies = [new EnvironmentDetectionStrategy()];
  if (experimentalProcessTree) {
    strategies.push(new ProcessTreeDetectionStrategy());
  }
  return strategies;
}
function selectBestAgent(agents, matches, env) {
  const matchedAgentIds = new Set(matches.map((match) => match.agent.id));
  for (const agent of agents) {
    if (!matchedAgentIds.has(agent.id)) {
      continue;
    }
    return {
      id: agent.id,
      name: agent.name,
      ...sessionIdProperties(agent, env)
    };
  }
  return void 0;
}
function sessionIdProperties(agent, env) {
  for (const envName of agent.sessionEnv ?? []) {
    const value = env[envName];
    if (value !== void 0 && value.length > 0) {
      return { sessionId: value };
    }
  }
  return {};
}

// src/cli.ts
var args = new Set(process.argv.slice(2));
var json = args.has("--json");
var quiet = args.has("--quiet");
var help = args.has("--help") || args.has("-h");
if (help) {
  printHelp();
  process.exit(0);
}
var result = detectAgent();
if (json) {
  console.log(JSON.stringify(toJsonResult(result), null, 2));
} else if (!quiet) {
  if (result.detected && result.agent !== void 0) {
    console.log(`detected: ${result.agent.name}`);
  } else {
    console.log("no coding agent detected");
  }
}
process.exit(result.detected ? 0 : 1);
function printHelp() {
  console.log(`Usage: detect-agent [--json] [--quiet]

Detect whether the current process is running inside a coding agent.

Options:
  --json    Print the full detection result as JSON
  --quiet   Print nothing and use only the exit code
  -h, --help
           Show this help message
`);
}
function toJsonResult(result2) {
  return {
    detected: result2.detected,
    agent: result2.agent === void 0 ? void 0 : {
      id: result2.agent.id,
      name: result2.agent.name,
      sessionId: result2.agent.sessionId
    }
  };
}
//# sourceMappingURL=cli.cjs.map