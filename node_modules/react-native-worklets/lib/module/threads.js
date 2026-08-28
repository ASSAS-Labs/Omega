'use strict';

import { IS_JEST } from './platformChecker';
export function scheduleOnUI(worklet, ...args) {
  enqueueUI(worklet, args);
}
export function runOnUI(worklet) {
  return (...args) => {
    scheduleOnUI(worklet, ...args);
  };
}
export function runOnUISync() {
  throw new Error('[Worklets] `runOnUISync` is not supported on web.');
}
export function executeOnUIRuntimeSync() {
  throw new Error('[Worklets] `executeOnUIRuntimeSync` is not supported on web.');
}
export function runOnJS(fun) {
  return (...args) => scheduleOnRN(fun, ...args);
}
export function scheduleOnRN(fun, ...args) {
  queueMicrotask(args.length ? () => fun(...args) : fun);
}
export function runOnUIAsync(worklet, ...args) {
  return new Promise((resolve, reject) => {
    enqueueUI(worklet, args, resolve, reject);
  });
}
let runOnUIQueue = [];
function enqueueUI(worklet, args, resolve, reject) {
  const job = [worklet, args, resolve, reject];
  runOnUIQueue.push(job);
  if (runOnUIQueue.length === 1) {
    if (IS_JEST) {
      flushUIQueue();
    } else {
      queueMicrotask(flushUIQueue);
    }
  }
}
let offset = 0;
function flushUIQueue() {
  const queue = runOnUIQueue;
  runOnUIQueue = [];
  requestAnimationFrame(() => {
    offset = 0;
    while (queue.length > offset) {
      try {
        drainUIQueue(queue);
      } catch (e) {
        const [,,, jobReject] = queue[offset - 1];
        if (jobReject) {
          jobReject(e);
        } else {
          console.error(e);
        }
      }
    }
  });
}
function drainUIQueue(queue) {
  while (queue.length > offset) {
    const [workletFunction, workletArgs, jobResolve] = queue[offset];
    offset++;
    const result = workletFunction(...workletArgs);
    if (jobResolve) {
      jobResolve(result);
    }
  }
}
//# sourceMappingURL=threads.js.map