import test from "node:test";
import assert from "node:assert/strict";
import {
  completionPercent,
  defaultFilters,
  matchesFilters,
  prioritizeForPractice,
  rateLineup,
  validateStoredState,
} from "../src/domain.ts";

const lineup = (id, overrides = {}) => ({
  id,
  mapId: "abyss",
  agentId: "sage",
  ability: "Slow Orb",
  title: `Drill ${id}`,
  summary: "Retake the site",
  side: "Defense",
  site: "B",
  category: "Retake",
  difficulty: 1,
  tags: ["slow"],
  start: { x: 20, y: 70 },
  target: { x: 70, y: 25 },
  steps: ["Stand on the marker"],
  notes: "Repeat twice",
  creator: "Test",
  sourceUrl: "https://example.com",
  origin: "starter",
  updatedAt: "2026-10-13",
  ...overrides,
});

test("filters combine search, map, agent, side, status, and favorite", () => {
  const progress = { one: { mastery: "learning", favorite: true, practiceCount: 2 } };
  assert.equal(matchesFilters(lineup("one"), {
    ...defaultFilters,
    search: "slow",
    mapId: "abyss",
    agentId: "sage",
    side: "Defense",
    mastery: "learning",
    favoritesOnly: true,
  }, progress), true);
  assert.equal(matchesFilters(lineup("one"), { ...defaultFilters, mapId: "bind" }, progress), false);
});

test("practice ordering favors learning, then unseen, then mastered", () => {
  const items = [lineup("mastered"), lineup("new"), lineup("learning")];
  const progress = {
    mastered: { mastery: "mastered", favorite: false, practiceCount: 4, lastPracticedAt: "2026-10-20T10:00:00Z" },
    learning: { mastery: "learning", favorite: false, practiceCount: 1, lastPracticedAt: "2026-10-21T10:00:00Z" },
  };
  assert.deepEqual(prioritizeForPractice(items, progress).map((item) => item.id), ["learning", "new", "mastered"]);
});

test("rating increments practice count and maps again to learning", () => {
  const updated = rateLineup(undefined, "again", "2026-10-26T10:00:00Z");
  assert.equal(updated.mastery, "learning");
  assert.equal(updated.practiceCount, 1);
  assert.equal(updated.lastPracticedAt, "2026-10-26T10:00:00Z");
});

test("completion returns percentage of mastered drills", () => {
  assert.equal(completionPercent([lineup("a"), lineup("b")], {
    a: { mastery: "mastered", favorite: false, practiceCount: 1 },
  }), 50);
});

test("backup validation rejects malformed coordinates", () => {
  const valid = {
    version: 1,
    progress: {},
    customLineups: [lineup("custom", { origin: "custom" })],
    activity: [],
    filters: defaultFilters,
  };
  assert.equal(validateStoredState(valid), true);
  assert.equal(validateStoredState({ ...valid, customLineups: [lineup("bad", { start: { x: 101, y: 0 } })] }), false);
});
