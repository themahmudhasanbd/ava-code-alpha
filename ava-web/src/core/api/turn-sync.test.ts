import { describe, expect, test } from "bun:test";
import { canFinishFromSnapshot, historyPollInterval } from "./turn-sync";
describe("authoritative turn synchronization", () => {
  const done = { isTurnRunning: false, latestTurnId: "turn-new", latestTurnStatus: "completed" };
  test("polls live turns every two seconds and idle sessions every five", () => {
    expect(historyPollInterval(true)).toBe(2000);
    expect(historyPollInterval(false)).toBe(5000);
  });
  test("missing and cached snapshots never stop a live turn", () => {
    expect(canFinishFromSnapshot(undefined, "turn-new", 200, 100)).toBe(false);
    expect(canFinishFromSnapshot(done, "turn-new", 90, 100)).toBe(false);
  });
  test("previous turn completion cannot stop the current turn", () => {
    expect(canFinishFromSnapshot(done, "turn-other", 200, 100)).toBe(false);
  });
  test("only a matching terminal snapshot completes recovery", () => {
    for (const latestTurnStatus of ["completed", "failed", "interrupted", "done"]) {
      expect(canFinishFromSnapshot({ ...done, latestTurnStatus }, "turn-new", 200, 100)).toBe(true);
    }
    expect(canFinishFromSnapshot({ ...done, latestTurnStatus: "inProgress" }, "turn-new", 200, 100)).toBe(false);
    expect(canFinishFromSnapshot({ ...done, isTurnRunning: true }, "turn-new", 200, 100)).toBe(false);
  });
});

import { mergeLiveParts } from "./turn-sync";
describe("live snapshot merging", () => {
  test("delayed snapshots cannot shorten streamed text or tool output", () => {
    expect(mergeLiveParts([{ id: "i", text: "He", output: "1", status: "running" }], [{ id: "i", text: "Hello", output: "123", status: "running" }])[0]).toEqual({ id: "i", text: "Hello", output: "123", status: "running" });
  });
  test("newer snapshots catch up to missed stream chunks", () => {
    expect(mergeLiveParts([{ id: "i", text: "Hello", status: "running" }], [{ id: "i", text: "He", status: "running" }])[0]?.text).toBe("Hello");
  });
  test("authoritative completed items do not return to running", () => {
    expect(mergeLiveParts([{ id: "i", text: "Final", status: "done" }], [{ id: "i", text: "Fi", status: "running" }])[0]?.status).toBe("done");
  });
  test("unacknowledged items survive once without duplicate IDs", () => {
    expect(mergeLiveParts([{ id: "a", text: "A" }], [{ id: "a", text: "AB" }, { id: "b", text: "B" }]).map(p => p.id)).toEqual(["a", "b"]);
  });
});
