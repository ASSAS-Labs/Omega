# agent-cli-detector

Detect whether a JavaScript CLI is running inside a coding agent.

Please [open an issue](https://github.com/expo/agent-cli-detector/issues/new)
if your coding agent isn't properly detected :)

[![npm](https://img.shields.io/npm/v/agent-cli-detector.svg)](https://www.npmjs.com/package/agent-cli-detector)
[![Tests](https://github.com/expo/agent-cli-detector/actions/workflows/test.yml/badge.svg)](https://github.com/expo/agent-cli-detector/actions)

## Installation

```bash
npm install agent-cli-detector
```

## Usage

```js
import { detectAgent } from "agent-cli-detector";

const result = detectAgent();

if (result.detected) {
  console.log("The name of the coding agent is:", result.agent.name);
} else {
  console.log("This program is not running inside a coding agent");
}
```

## Supported agents

Officially supported coding agents:

| Name                                                              | ID            | Session ID |
| ----------------------------------------------------------------- | ------------- | ---------- |
| [Antigravity](https://antigravity.google/)                        | `antigravity` | ✅         |
| [Bolt](https://bolt.new/)                                          | `bolt`        | 🚫         |
| [Claude Code](https://claude.com/claude-code)                     | `claude-code` | ✅         |
| [Cline](https://cline.bot/)                                       | `cline`       | 🚫         |
| [Codex](https://developers.openai.com/codex/)                     | `codex`       | ✅         |
| [Cursor](https://cursor.com/)                                     | `cursor`      | ✅         |
| [Devin](https://devin.ai/)                                        | `devin`       | 🚫         |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli)         | `gemini`      | 🚫         |
| [GitHub Copilot CLI](https://github.com/github/copilot-cli)       | `copilot`     | ✅         |
| [Grok](https://x.ai/build)                                        | `grok`        | ✅         |
| [Kilo Code](https://kilocode.ai/)                                 | `kilocode`    | ✅         |
| [Kiro](https://kiro.dev/)                                         | `kiro`        | ✅         |
| [Muse Code][muse-code]                                            | `muse`        | 🚫         |
| [OpenCode](https://opencode.ai/)                                  | `opencode`    | 🚫         |
| [Pi](https://github.com/badlogic/pi-mono)                         | `pi`          | 🚫         |
| [Replit](https://replit.com/)                                      | `replit`      | ✅         |
| [Rork](https://rork.com/)                                          | `rork`        | 🚫         |

[muse-code]: https://developer.meta.com/ai/products/muse-code/

Detection is data-driven: the exact environment variables and process
patterns for each agent live in [`src/agents.ts`](src/agents.ts).

OpenCode 1.0.19 and later is detected from environment variables by default.
OpenCode 0.x requires experimental process-tree detection.

## API

### `detectAgent([options])`

Runs detection and returns a `DetectionResult`:

```js
{
  detected: true,
  agent: {
    id: "cursor",
    name: "Cursor",
    sessionId: "d9e9cd60-2e1c-487c-9bc7-fceee5e9c3a2"
  }
}
```

### `result.detected`

A boolean. Will be `true` if the code is running inside a coding agent,
otherwise `false`.

### `result.agent.id`

A stable identifier for the detected agent (see the ID column in the
support table above). Prefer comparing against this instead of
`result.agent.name`.

### `result.agent.name`

A string containing the display name of the detected coding agent.

Don't depend on the value of this string not to change for a specific
agent. If you find yourself writing `result.agent.name === "Claude Code"`,
you most likely want to use `result.agent.id === "claude-code"` instead.

### `result.agent.sessionId`

A string containing the agent's session identifier, normalized from
agent-specific environment variables such as `CODEX_THREAD_ID`,
`CURSOR_CONVERSATION_ID`, `CLAUDE_CODE_SESSION_ID`,
`ANTIGRAVITY_TRAJECTORY_ID`, `KIRO_SESSION_ID`, `KILO_RUN_ID`, and
`COPILOT_AGENT_SESSION_ID`, `REPLIT_SESSION`, and `GROK_SESSION_ID`.
Omitted when the agent doesn't expose one
(see the Session ID column in the support table above).

### `isRunningFromAgent([options])`

A convenience shortcut that returns `result.detected` as a boolean:

```js
import { isRunningFromAgent } from "agent-cli-detector";

if (isRunningFromAgent()) {
  // Adjust CLI behavior for agent-driven execution.
}
```

## CLI

The package also ships a CLI:

```bash
npx agent-cli-detector
npx agent-cli-detector --json
```

Exit codes:

- `0`: a coding agent was detected
- `1`: no coding agent was detected

## Process-tree detection (experimental)

Detection uses environment variables by default. Parent-process
inspection is available as an opt-in for callers that can tolerate
best-effort process-tree matching:

```js
const result = detectAgent({ experimentalProcessTree: true });
```

Some sandboxes block `ps`, and process names can vary by launcher, so
process-tree detection should be treated as experimental. It has only
been tested on macOS and does not work on Windows.

## Custom agents

Add an agent by supplying an `AgentDefinition`:

```js
import { detectAgent, defaultAgents } from "agent-cli-detector";

const result = detectAgent({
  agents: [
    ...defaultAgents,
    {
      id: "my-agent",
      name: "My Agent",
      env: [{ name: "MY_AGENT", value: "1" }],
      process: [{ pattern: /^my-agent$/i }]
    }
  ]
});
```

## Custom strategies

Add a detection strategy by implementing `DetectionStrategy`:

```ts
import type { DetectionStrategy } from "agent-cli-detector";

const strategy: DetectionStrategy = {
  name: "my-strategy",
  detect(context) {
    return [];
  }
};
```

## License

[MIT](LICENSE)
