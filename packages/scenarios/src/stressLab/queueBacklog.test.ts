import { test } from "node:test";
import assert from "node:assert/strict";
import { stepQueueBacklog } from "./queueBacklog.js";

test("when arrival matches consumer throughput, backlog stays flat", () => {
  const result = stepQueueBacklog(0, 100, 100, 5);
  assert.equal(result.backlog, 0);
});

test("when arrival exceeds throughput, backlog grows", () => {
  const result = stepQueueBacklog(0, 150, 100, 5);
  assert.equal(result.backlog, 250); // (150-100) msgs/sec * 5 sec
});

test("when throughput exceeds arrival, backlog drains", () => {
  const result = stepQueueBacklog(500, 50, 100, 5);
  assert.equal(result.backlog, 250);
});

test("backlog can never fall below zero", () => {
  const result = stepQueueBacklog(100, 0, 1000, 5);
  assert.equal(result.backlog, 0);
});

test("estimated processing delay rises with backlog relative to consumer throughput", () => {
  const shallow = stepQueueBacklog(0, 150, 100, 5);
  const deep = stepQueueBacklog(2000, 150, 100, 5);
  assert.ok(deep.estimatedDelaySeconds > shallow.estimatedDelaySeconds);
});

test("backlog accumulates across successive steps (long-duration soak behavior, spec #42)", () => {
  let backlog = 0;
  for (let i = 0; i < 20; i++) {
    backlog = stepQueueBacklog(backlog, 150, 100, 5).backlog;
  }
  assert.equal(backlog, 20 * 5 * 50);
});
