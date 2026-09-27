import { test } from "node:test";
import assert from "node:assert/strict";
import { selectLiveMetricKeys } from "./liveMetricSelection.js";

test("payment provider degradation surfaces checkout + availability, not DB internals", () => {
  assert.deepEqual(selectLiveMetricKeys("dependency_degradation"), [
    "checkoutP95Ms",
    "availabilityPercent",
    "trafficRequestsPerMinute",
  ]);
});

test("database saturation surfaces DB metrics first", () => {
  assert.deepEqual(selectLiveMetricKeys("resource_saturation"), [
    "totalConnections",
    "dbUtilizationPercent",
    "checkoutP95Ms",
    "trafficRequestsPerMinute",
  ]);
});

test("traffic spike surfaces traffic + capacity metrics", () => {
  assert.deepEqual(selectLiveMetricKeys("spike"), ["trafficRequestsPerMinute", "checkoutP95Ms", "dbUtilizationPercent"]);
});

test("regional failure leads with availability", () => {
  assert.deepEqual(selectLiveMetricKeys("regional_failure"), ["availabilityPercent", "checkoutP95Ms", "trafficRequestsPerMinute"]);
});

test("every category returns at most 4 keys", () => {
  for (const category of ["dependency_degradation", "resource_saturation", "spike", "regional_failure", "load"] as const) {
    assert.ok(selectLiveMetricKeys(category).length <= 4);
  }
});
