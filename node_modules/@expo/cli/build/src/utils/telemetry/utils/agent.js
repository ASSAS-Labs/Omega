"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getAgentTelemetryContext", {
    enumerable: true,
    get: function() {
        return getAgentTelemetryContext;
    }
});
function _agentclidetector() {
    const data = require("agent-cli-detector");
    _agentclidetector = function() {
        return data;
    };
    return data;
}
const debug = require('debug')('expo:telemetry:agent');
let agentTelemetryContext;
function getAgentTelemetryContext() {
    if (agentTelemetryContext === undefined) {
        agentTelemetryContext = resolveAgentTelemetryContext();
    }
    return agentTelemetryContext;
}
function resolveAgentTelemetryContext() {
    try {
        const { agent, detected } = (0, _agentclidetector().detectAgent)();
        if (!detected || agent == null) {
            return null;
        }
        return {
            id: agent.id,
            sessionId: agent.sessionId
        };
    } catch (error) {
        debug('Failed to detect coding agent: %s', (error == null ? void 0 : error.message) ?? error);
        return null;
    }
}

//# sourceMappingURL=agent.js.map