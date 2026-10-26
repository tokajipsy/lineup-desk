export type AgentId = "sage" | "clove" | "fade" | "neon";
export type MapId =
  | "abyss"
  | "bind"
  | "corrode"
  | "haven"
  | "lotus"
  | "sunset"
  | "summit";
export type Side = "Attack" | "Defense" | "Either";
export type Category = "Setup" | "Entry" | "Post-plant" | "Retake" | "Info";
export type Mastery = "new" | "learning" | "mastered";

export interface Point {
  x: number;
  y: number;
}

export interface Lineup {
  id: string;
  mapId: MapId;
  agentId: AgentId;
  ability: string;
  title: string;
  summary: string;
  side: Side;
  site: string;
  category: Category;
  difficulty: 1 | 2 | 3;
  tags: string[];
  start: Point;
  target: Point;
  steps: string[];
  notes: string;
  mediaUrl?: string;
  creator: string;
  sourceUrl: string;
  origin: "starter" | "custom";
  updatedAt: string;
}

export interface LineupProgress {
  mastery: Mastery;
  favorite: boolean;
  practiceCount: number;
  lastPracticedAt?: string;
}

export interface PracticeEvent {
  id: string;
  lineupId: string;
  rating: Exclude<Mastery, "new"> | "again";
  practicedAt: string;
}

export interface Filters {
  search: string;
  mapId: "all" | MapId;
  agentId: "all" | AgentId;
  ability: "all" | string;
  site: "all" | string;
  side: "all" | Side;
  category: "all" | Category;
  mastery: "all" | Mastery;
  favoritesOnly: boolean;
}

export interface StoredState {
  version: 1;
  progress: Record<string, LineupProgress>;
  customLineups: Lineup[];
  activity: PracticeEvent[];
  filters: Filters;
}

export const defaultFilters: Filters = {
  search: "",
  mapId: "all",
  agentId: "all",
  ability: "all",
  site: "all",
  side: "all",
  category: "all",
  mastery: "all",
  favoritesOnly: false,
};

export const defaultProgress = (): LineupProgress => ({
  mastery: "new",
  favorite: false,
  practiceCount: 0,
});

export function getProgress(
  progress: Record<string, LineupProgress>,
  id: string,
): LineupProgress {
  return progress[id] ?? defaultProgress();
}

export function matchesFilters(
  lineup: Lineup,
  filters: Filters,
  progress: Record<string, LineupProgress>,
): boolean {
  const state = getProgress(progress, lineup.id);
  const haystack = [
    lineup.title,
    lineup.summary,
    lineup.ability,
    lineup.site,
    lineup.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return (
    (!filters.search || haystack.includes(filters.search.toLowerCase())) &&
    (filters.mapId === "all" || lineup.mapId === filters.mapId) &&
    (filters.agentId === "all" || lineup.agentId === filters.agentId) &&
    (filters.ability === "all" || lineup.ability === filters.ability) &&
    (filters.site === "all" || lineup.site === filters.site) &&
    (filters.side === "all" || lineup.side === filters.side || lineup.side === "Either") &&
    (filters.category === "all" || lineup.category === filters.category) &&
    (filters.mastery === "all" || state.mastery === filters.mastery) &&
    (!filters.favoritesOnly || state.favorite)
  );
}

export function prioritizeForPractice(
  lineups: Lineup[],
  progress: Record<string, LineupProgress>,
): Lineup[] {
  const masteryWeight: Record<Mastery, number> = {
    learning: 0,
    new: 1,
    mastered: 2,
  };
  return [...lineups].sort((a, b) => {
    const aProgress = getProgress(progress, a.id);
    const bProgress = getProgress(progress, b.id);
    const masteryDelta = masteryWeight[aProgress.mastery] - masteryWeight[bProgress.mastery];
    if (masteryDelta !== 0) return masteryDelta;
    if (!aProgress.lastPracticedAt && bProgress.lastPracticedAt) return -1;
    if (aProgress.lastPracticedAt && !bProgress.lastPracticedAt) return 1;
    return (aProgress.lastPracticedAt ?? "").localeCompare(
      bProgress.lastPracticedAt ?? "",
    );
  });
}

export function rateLineup(
  current: LineupProgress | undefined,
  rating: "again" | "learning" | "mastered",
  now: string,
): LineupProgress {
  const previous = current ?? defaultProgress();
  return {
    ...previous,
    mastery: rating === "again" ? "learning" : rating,
    practiceCount: previous.practiceCount + 1,
    lastPracticedAt: now,
  };
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Point;
  return (
    typeof point.x === "number" &&
    typeof point.y === "number" &&
    point.x >= 0 &&
    point.x <= 100 &&
    point.y >= 0 &&
    point.y <= 100
  );
}

export function isLineup(value: unknown): value is Lineup {
  if (!value || typeof value !== "object") return false;
  const item = value as Lineup;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.summary === "string" &&
    typeof item.ability === "string" &&
    typeof item.creator === "string" &&
    typeof item.sourceUrl === "string" &&
    Array.isArray(item.steps) &&
    item.steps.every((step) => typeof step === "string") &&
    isPoint(item.start) &&
    isPoint(item.target) &&
    ["sage", "clove", "fade", "neon"].includes(item.agentId) &&
    ["abyss", "bind", "corrode", "haven", "lotus", "sunset", "summit"].includes(
      item.mapId,
    )
  );
}

export function validateStoredState(value: unknown): value is StoredState {
  if (!value || typeof value !== "object") return false;
  const state = value as StoredState;
  return (
    state.version === 1 &&
    !!state.progress &&
    typeof state.progress === "object" &&
    Array.isArray(state.customLineups) &&
    state.customLineups.every(isLineup) &&
    Array.isArray(state.activity) &&
    !!state.filters &&
    typeof state.filters === "object"
  );
}

export function completionPercent(
  lineups: Lineup[],
  progress: Record<string, LineupProgress>,
): number {
  if (!lineups.length) return 0;
  const mastered = lineups.filter(
    (lineup) => getProgress(progress, lineup.id).mastery === "mastered",
  ).length;
  return Math.round((mastered / lineups.length) * 100);
}
