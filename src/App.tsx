import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, FormEvent } from "react";
import { agents, getAgent, getMap, maps, MAP_POOL, starterLineups } from "./data";
import {
  completionPercent,
  defaultFilters,
  getProgress,
  matchesFilters,
  prioritizeForPractice,
  rateLineup,
  validateStoredState,
} from "./domain";
import type {
  AgentId,
  Category,
  Filters,
  Lineup,
  LineupProgress,
  MapId,
  Mastery,
  PracticeEvent,
  Side,
  StoredState,
} from "./domain";

const STORAGE_KEY = "lineup-desk-state-v1";
const routes = ["browse", "practice", "progress", "library"] as const;
type Route = (typeof routes)[number];

function emptyState(): StoredState {
  return {
    version: 1,
    progress: {},
    customLineups: [],
    activity: [],
    filters: { ...defaultFilters },
  };
}

function readState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    return validateStoredState(parsed)
      ? { ...parsed, filters: { ...defaultFilters, ...parsed.filters } }
      : emptyState();
  } catch {
    return emptyState();
  }
}

function getRoute(): Route {
  const value = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return routes.includes(value as Route) ? (value as Route) : "browse";
}

const masteryLabel: Record<Mastery, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

function TacticalMap({ lineup, compact = false }: { lineup: Lineup; compact?: boolean }) {
  const map = getMap(lineup.mapId);
  const style = { "--map-accent": map.accent } as CSSProperties;
  return (
    <div
      className={`tactical-map ${compact ? "tactical-map--compact" : ""}`}
      style={style}
      aria-label={`${map.name} tactical diagram. Start at ${lineup.start.x}, ${lineup.start.y}; target at ${lineup.target.x}, ${lineup.target.y}.`}
    >
      <img className="map-art" src={map.minimapUrl} alt="" loading="lazy" />
      <div className="map-grid" />
      <div
        className="marker marker--start"
        style={{ left: `${lineup.start.x}%`, top: `${lineup.start.y}%` }}
      >
        S
      </div>
      <div
        className="marker marker--target"
        style={{ left: `${lineup.target.x}%`, top: `${lineup.target.y}%` }}
      >
        T
      </div>
      <div className="map-caption">
        <span>{map.code}</span>
        <span>{map.locale}</span>
      </div>
    </div>
  );
}

function AgentBadge({ id, small = false }: { id: AgentId; small?: boolean }) {
  const agent = getAgent(id);
  return (
    <span
      className={`agent-badge ${small ? "agent-badge--small" : ""}`}
      style={{ "--agent-color": agent.color } as CSSProperties}
    >
      <span><img src={agent.iconUrl} alt={small ? agent.name : ""} loading="lazy" /></span>
      {!small && <b>{agent.name}</b>}
    </span>
  );
}

function youtubeEmbedUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.split("/embed/")[1] || url.pathname.split("/shorts/")[1];
      if (id) return `https://www.youtube-nocookie.com/embed/${id.split("/")[0]}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function LineupMedia({ lineup, compact = false }: { lineup: Lineup; compact?: boolean }) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const map = getMap(lineup.mapId);
  const agent = getAgent(lineup.agentId);
  const suppliedMedia = lineup.mediaUrl?.trim();
  const youtubeUrl = youtubeEmbedUrl(suppliedMedia);
  const isVideo = Boolean(suppliedMedia && /\.(mp4|webm)(?:[?#].*)?$/i.test(suppliedMedia));
  const showContextArt = !suppliedMedia || mediaFailed;

  return (
    <figure className={`media-reference ${compact ? "media-reference--compact" : ""}`}>
      {youtubeUrl && !mediaFailed ? (
        <iframe
          src={youtubeUrl}
          title={`${lineup.title} video reference`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : isVideo && !mediaFailed ? (
        <video controls preload="metadata" poster={map.splashUrl} onError={() => setMediaFailed(true)}>
          <source src={suppliedMedia} />
        </video>
      ) : (
        <div className="media-reference__art">
          <img
            className="media-reference__map"
            src={showContextArt ? map.splashUrl : suppliedMedia}
            alt={showContextArt ? `${map.name} environment` : `${lineup.title} visual reference`}
            loading="lazy"
            onError={() => setMediaFailed(true)}
          />
          {showContextArt && <img className="media-reference__agent" src={agent.portraitUrl} alt="" loading="lazy" />}
          <span>{showContextArt ? `${map.name} · ${agent.name}` : "Lineup reference"}</span>
        </div>
      )}
      <figcaption>
        <b>{showContextArt ? "Map context" : "Visual reference"}</b>
        <span>{showContextArt ? "Use the marked minimap for the practice start and target." : `Media supplied by ${lineup.creator}.`}</span>
      </figcaption>
    </figure>
  );
}

function MasteryPill({ value }: { value: Mastery }) {
  return <span className={`mastery mastery--${value}`}>{masteryLabel[value]}</span>;
}

function FilterBar({
  filters,
  setFilters,
  count,
  lineups,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  count: number;
  lineups: Lineup[];
}) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters({ ...filters, [key]: value });
  const activeCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "search") return Boolean(value);
    if (key === "favoritesOnly") return value === true;
    return value !== "all";
  }).length;
  const abilities = [...new Set(lineups.map((lineup) => lineup.ability))].sort();
  const sites = [...new Set(lineups.map((lineup) => lineup.site))].sort();

  return (
    <section className="filter-bar" aria-label="Lineup filters">
      <label className="search-field">
        <span>⌕</span>
        <input
          aria-label="Search lineups"
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search ability, setup, tag…"
        />
        <kbd>/</kbd>
      </label>
      <select
        aria-label="Filter by map"
        value={filters.mapId}
        onChange={(event) => update("mapId", event.target.value as Filters["mapId"])}
      >
        <option value="all">All maps</option>
        {maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
      </select>
      <select
        aria-label="Filter by agent"
        value={filters.agentId}
        onChange={(event) => update("agentId", event.target.value as Filters["agentId"])}
      >
        <option value="all">All agents</option>
        {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </select>
      <select
        aria-label="Filter by side"
        value={filters.side}
        onChange={(event) => update("side", event.target.value as Filters["side"])}
      >
        <option value="all">Both sides</option>
        <option>Attack</option>
        <option>Defense</option>
      </select>
      <select
        aria-label="Filter by ability"
        value={filters.ability}
        onChange={(event) => update("ability", event.target.value)}
      >
        <option value="all">All abilities</option>
        {abilities.map((ability) => <option key={ability} value={ability}>{ability}</option>)}
      </select>
      <select
        aria-label="Filter by site"
        value={filters.site}
        onChange={(event) => update("site", event.target.value)}
      >
        <option value="all">All sites</option>
        {sites.map((site) => <option key={site} value={site}>{site} site</option>)}
      </select>
      <select
        aria-label="Filter by drill type"
        value={filters.category}
        onChange={(event) => update("category", event.target.value as Filters["category"])}
      >
        <option value="all">All drill types</option>
        <option>Setup</option><option>Entry</option><option>Post-plant</option><option>Retake</option><option>Info</option>
      </select>
      <select
        aria-label="Filter by mastery"
        value={filters.mastery}
        onChange={(event) => update("mastery", event.target.value as Filters["mastery"])}
      >
        <option value="all">Any status</option>
        <option value="new">New</option>
        <option value="learning">Learning</option>
        <option value="mastered">Mastered</option>
      </select>
      <button
        className={`chip-button ${filters.favoritesOnly ? "is-active" : ""}`}
        onClick={() => update("favoritesOnly", !filters.favoritesOnly)}
        aria-pressed={filters.favoritesOnly}
      >
        ★ Favorites
      </button>
      {activeCount > 0 && (
        <button className="text-button" onClick={() => setFilters({ ...defaultFilters })}>
          Clear {activeCount}
        </button>
      )}
      <span className="result-count">{count} drills</span>
    </section>
  );
}

function LineupCard({
  lineup,
  progress,
  onOpen,
  onFavorite,
}: {
  lineup: Lineup;
  progress: LineupProgress;
  onOpen: () => void;
  onFavorite: () => void;
}) {
  return (
    <article className="lineup-card">
      <button className="card-map-button" onClick={onOpen} aria-label={`Open ${lineup.title}`}>
        <TacticalMap lineup={lineup} compact />
      </button>
      <div className="lineup-card__body">
        <div className="card-kicker">
          <AgentBadge id={lineup.agentId} small />
          <span>{getMap(lineup.mapId).name}</span>
          <span>·</span>
          <span>{lineup.side}</span>
          <button
            className={`favorite-button ${progress.favorite ? "is-active" : ""}`}
            onClick={onFavorite}
            aria-label={progress.favorite ? "Remove favorite" : "Add favorite"}
          >
            ★
          </button>
        </div>
        <button className="card-title" onClick={onOpen}>{lineup.title}</button>
        <p>{lineup.summary}</p>
        <div className="card-footer">
          <MasteryPill value={progress.mastery} />
          <span>{lineup.ability}</span>
          <span className="difficulty">{"◆".repeat(lineup.difficulty)}{"◇".repeat(3 - lineup.difficulty)}</span>
        </div>
      </div>
    </article>
  );
}

function DetailPanel({
  lineup,
  progress,
  onClose,
  onFavorite,
  onPractice,
}: {
  lineup: Lineup;
  progress: LineupProgress;
  onClose: () => void;
  onFavorite: () => void;
  onPractice: () => void;
}) {
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="detail-panel" role="dialog" aria-modal="true" aria-label={lineup.title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="detail-header">
          <div>
            <span className="eyebrow">{getMap(lineup.mapId).name} · {lineup.side} · {lineup.site} site</span>
            <h2>{lineup.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details">×</button>
        </div>
        <TacticalMap lineup={lineup} />
        <LineupMedia lineup={lineup} compact />
        <div className="detail-meta">
          <AgentBadge id={lineup.agentId} />
          <div><b>{lineup.ability}</b><span>{lineup.category}</span></div>
          <MasteryPill value={progress.mastery} />
        </div>
        <p className="detail-summary">{lineup.summary}</p>
        <ol className="steps-list">
          {lineup.steps.map((step, index) => (
            <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>
          ))}
        </ol>
        <div className="coach-note"><b>Coach note</b><p>{lineup.notes}</p></div>
        <div className="detail-source">
          <span>Guide by {lineup.creator}</span>
          <a href={lineup.sourceUrl} target="_blank" rel="noreferrer">Ability reference ↗</a>
        </div>
        <div className="detail-actions">
          <button className="secondary-button" onClick={onFavorite}>{progress.favorite ? "★ Saved" : "☆ Save"}</button>
          <button className="primary-button" onClick={onPractice}>Practice this drill</button>
        </div>
      </aside>
    </div>
  );
}

function BrowseView({
  lineups,
  progress,
  filters,
  setFilters,
  updateFavorite,
  openLineup,
}: {
  lineups: Lineup[];
  progress: Record<string, LineupProgress>;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  updateFavorite: (id: string) => void;
  openLineup: (id: string) => void;
}) {
  const visible = lineups.filter((lineup) => matchesFilters(lineup, filters, progress));
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Current competitive pool</span>
          <h1>Find the setup. Build the habit.</h1>
          <p>Utility drills for the agents you actually queue.</p>
        </div>
        <button className="primary-button" onClick={() => { window.location.hash = "#/practice"; }}>
          Start filtered session <span>→</span>
        </button>
      </header>
      <FilterBar filters={filters} setFilters={setFilters} count={visible.length} lineups={lineups} />
      {visible.length ? (
        <div className="lineup-grid">
          {visible.map((lineup) => (
            <LineupCard
              key={lineup.id}
              lineup={lineup}
              progress={getProgress(progress, lineup.id)}
              onOpen={() => openLineup(lineup.id)}
              onFavorite={() => updateFavorite(lineup.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-card">
          <span>00</span><h2>No drills match this stack.</h2>
          <p>Clear a filter or add a personal setup to the library.</p>
          <button className="secondary-button" onClick={() => setFilters({ ...defaultFilters })}>Reset filters</button>
        </div>
      )}
    </>
  );
}

function PracticeView({
  session,
  progress,
  rate,
  updateFavorite,
}: {
  session: Lineup[];
  progress: Record<string, LineupProgress>;
  rate: (id: string, rating: "again" | "learning" | "mastered") => void;
  updateFavorite: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const current = session[index % Math.max(session.length, 1)];

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
  }, [session.length]);

  const next = () => {
    setIndex((value) => (value + 1) % session.length);
    setRevealed(false);
  };
  const previous = () => {
    setIndex((value) => (value - 1 + session.length) % session.length);
    setRevealed(false);
  };
  const chooseRating = (rating: "again" | "learning" | "mastered") => {
    if (!current) return;
    rate(current.id, rating);
    next();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.code === "Space") { event.preventDefault(); setRevealed((value) => !value); }
      if (event.key === "ArrowRight" && session.length) next();
      if (event.key === "ArrowLeft" && session.length) previous();
      if (event.key.toLowerCase() === "f" && current) updateFavorite(current.id);
      if (revealed && event.key === "1") chooseRating("again");
      if (revealed && event.key === "2") chooseRating("learning");
      if (revealed && event.key === "3") chooseRating("mastered");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) {
    return (
      <div className="empty-card practice-empty">
        <span>∅</span><h1>No session to run.</h1>
        <p>Your current filters exclude every drill. Return to Browse and widen the selection.</p>
        <a className="primary-button" href="#/browse">Back to browse</a>
      </div>
    );
  }

  const state = getProgress(progress, current.id);
  return (
    <div className="practice-shell">
      <header className="practice-topbar">
        <div>
          <span className="eyebrow">Guided session</span>
          <h1>{session.length} drills · priority order</h1>
        </div>
        <div className="session-progress">
          <span>{index + 1} / {session.length}</span>
          <div><i style={{ width: `${((index + 1) / session.length) * 100}%` }} /></div>
        </div>
        <div className="shortcut-strip"><kbd>Space</kbd> reveal <kbd>1–3</kbd> rate <kbd>F</kbd> save</div>
      </header>

      <article className={`practice-card ${revealed ? "is-revealed" : ""}`}>
        <div className="practice-map"><TacticalMap lineup={current} /></div>
        <div className="practice-content">
          <div className="practice-kicker">
            <AgentBadge id={current.agentId} />
            <div><b>{getMap(current.mapId).name} · {current.site} site</b><span>{current.side} / {current.category}</span></div>
            <button className={`favorite-button large ${state.favorite ? "is-active" : ""}`} onClick={() => updateFavorite(current.id)} aria-label="Toggle favorite">★</button>
          </div>
          <h2>{current.title}</h2>
          <p className="practice-prompt">{current.summary}</p>
          {!revealed ? (
            <div className="recall-prompt">
              <span>RECALL</span>
              <h3>Where do you stand, and what is your aim reference?</h3>
              <p>Talk through the setup before revealing it. The route is more important than memorizing a pixel.</p>
              <button className="primary-button" onClick={() => setRevealed(true)}>Reveal setup <kbd>Space</kbd></button>
            </div>
          ) : (
            <div className="reveal-content">
              <LineupMedia lineup={current} compact />
              <ol className="steps-list compact">
                {current.steps.map((step, stepIndex) => (
                  <li key={step}><span>{String(stepIndex + 1).padStart(2, "0")}</span><p>{step}</p></li>
                ))}
              </ol>
              <div className="coach-note"><b>Coach note</b><p>{current.notes}</p></div>
              <div className="rating-row">
                <button onClick={() => chooseRating("again")}><kbd>1</kbd><b>Again</b><span>Needs another rep</span></button>
                <button onClick={() => chooseRating("learning")}><kbd>2</kbd><b>Learning</b><span>Close, keep it warm</span></button>
                <button className="success" onClick={() => chooseRating("mastered")}><kbd>3</kbd><b>Mastered</b><span>Reliable from memory</span></button>
              </div>
            </div>
          )}
        </div>
      </article>
      <div className="practice-nav">
        <button className="text-button" onClick={previous}>← Previous</button>
        <span>{current.ability} · difficulty {current.difficulty}/3</span>
        <button className="text-button" onClick={next}>Skip →</button>
      </div>
    </div>
  );
}

function ProgressView({
  lineups,
  progress,
  activity,
}: {
  lineups: Lineup[];
  progress: Record<string, LineupProgress>;
  activity: PracticeEvent[];
}) {
  const mastered = lineups.filter((lineup) => getProgress(progress, lineup.id).mastery === "mastered").length;
  const favorites = lineups.filter((lineup) => getProgress(progress, lineup.id).favorite).length;
  const practiced = Object.values(progress).reduce((sum, item) => sum + item.practiceCount, 0);
  const lastSeven = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - offset));
    const key = day.toISOString().slice(0, 10);
    return { key, label: day.toLocaleDateString(undefined, { weekday: "short" }), count: activity.filter((item) => item.practicedAt.startsWith(key)).length };
  });
  const maxDay = Math.max(1, ...lastSeven.map((day) => day.count));

  return (
    <>
      <header className="page-header">
        <div><span className="eyebrow">Practice record</span><h1>Your utility, at a glance.</h1><p>Every rating updates locally on this device.</p></div>
      </header>
      <section className="stat-grid">
        <div><span>Mastered</span><b>{mastered}<small> / {lineups.length}</small></b><i style={{ width: `${completionPercent(lineups, progress)}%` }} /></div>
        <div><span>Total reps</span><b>{practiced}</b><p>All guided ratings</p></div>
        <div><span>Saved</span><b>{favorites}</b><p>Favorite setups</p></div>
        <div><span>Coverage</span><b>{completionPercent(lineups, progress)}<small>%</small></b><p>Current library</p></div>
      </section>
      <div className="progress-layout">
        <section className="panel matrix-panel">
          <div className="panel-heading"><div><span className="eyebrow">Mastery matrix</span><h2>Agent × map coverage</h2></div><span>Percentage mastered</span></div>
          <div className="matrix" role="table" aria-label="Mastery by agent and map">
            <div className="matrix-corner" />
            {maps.map((map) => <div className="matrix-map" key={map.id}>{map.code}</div>)}
            {agents.map((agent) => (
              <div className="matrix-row" key={agent.id}>
                <div className="matrix-agent"><AgentBadge id={agent.id} small /><span>{agent.name}</span></div>
                {maps.map((map) => {
                  const cell = lineups.filter((lineup) => lineup.agentId === agent.id && lineup.mapId === map.id);
                  const value = completionPercent(cell, progress);
                  return <div className={`matrix-cell level-${Math.ceil(value / 25)}`} key={map.id}><b>{value}%</b><span>{cell.length} drills</span></div>;
                })}
              </div>
            ))}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">Last 7 days</span><h2>Practice rhythm</h2></div></div>
          <div className="activity-chart">
            {lastSeven.map((day) => (
              <div key={day.key}><b>{day.count}</b><i style={{ height: `${Math.max(8, (day.count / maxDay) * 100)}%` }} /><span>{day.label}</span></div>
            ))}
          </div>
          <div className="recent-list">
            <h3>Recent reps</h3>
            {activity.slice(-5).reverse().map((event) => {
              const lineup = lineups.find((item) => item.id === event.lineupId);
              if (!lineup) return null;
              return <div key={event.id}><AgentBadge id={lineup.agentId} small /><p><b>{lineup.title}</b><span>{new Date(event.practicedAt).toLocaleString()}</span></p><MasteryPill value={event.rating === "again" ? "learning" : event.rating} /></div>;
            })}
            {!activity.length && <p className="muted">Your first rated drill will appear here.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

const formDefaults = {
  title: "",
  mapId: "abyss" as MapId,
  agentId: "sage" as AgentId,
  ability: "",
  side: "Attack" as Side,
  site: "A",
  category: "Setup" as Category,
  difficulty: 2 as 1 | 2 | 3,
  startX: 20,
  startY: 75,
  targetX: 30,
  targetY: 25,
  summary: "",
  steps: "",
  notes: "",
  mediaUrl: "",
  sourceUrl: "",
};

function LibraryView({
  customLineups,
  addLineup,
  removeLineup,
  exportData,
  importData,
  resetProgress,
}: {
  customLineups: Lineup[];
  addLineup: (lineup: Lineup) => void;
  removeLineup: (id: string) => void;
  exportData: () => void;
  importData: (event: ChangeEvent<HTMLInputElement>) => void;
  resetProgress: () => void;
}) {
  const [form, setForm] = useState(formDefaults);
  const fileRef = useRef<HTMLInputElement>(null);
  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm({ ...form, [key]: value });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const lineup: Lineup = {
      id: `custom-${crypto.randomUUID()}`,
      mapId: form.mapId,
      agentId: form.agentId,
      ability: form.ability.trim(),
      title: form.title.trim(),
      summary: form.summary.trim(),
      side: form.side,
      site: form.site.trim(),
      category: form.category,
      difficulty: form.difficulty,
      tags: [form.ability, form.category, form.site].map((value) => value.toLowerCase()),
      start: { x: Number(form.startX), y: Number(form.startY) },
      target: { x: Number(form.targetX), y: Number(form.targetY) },
      steps: form.steps.split("\n").map((step) => step.trim()).filter(Boolean),
      notes: form.notes.trim(),
      mediaUrl: form.mediaUrl.trim() || undefined,
      creator: "Personal library",
      sourceUrl: form.sourceUrl.trim() || "https://playvalorant.com/",
      origin: "custom",
      updatedAt: new Date().toISOString(),
    };
    addLineup(lineup);
    setForm(formDefaults);
  };
  return (
    <>
      <header className="page-header">
        <div><span className="eyebrow">Personal library</span><h1>Turn discoveries into drills.</h1><p>Add your refined marker positions, notes, and external reference media.</p></div>
        <div className="header-actions">
          <button className="secondary-button" onClick={exportData}>Export backup</button>
          <button className="secondary-button" onClick={() => fileRef.current?.click()}>Import backup</button>
          <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={importData} />
        </div>
      </header>
      <div className="library-layout">
        <form className="panel lineup-form" onSubmit={submit}>
          <div className="panel-heading"><div><span className="eyebrow">New personal drill</span><h2>Setup details</h2></div><span>Stored on this device</span></div>
          <div className="form-grid">
            <label className="span-2"><span>Title</span><input required value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. B default slow from link" /></label>
            <label><span>Map</span><select value={form.mapId} onChange={(event) => setField("mapId", event.target.value as MapId)}>{maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}</select></label>
            <label><span>Agent</span><select value={form.agentId} onChange={(event) => setField("agentId", event.target.value as AgentId)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
            <label><span>Ability</span><input required value={form.ability} onChange={(event) => setField("ability", event.target.value)} placeholder="Slow Orb" /></label>
            <label><span>Side</span><select value={form.side} onChange={(event) => setField("side", event.target.value as Side)}><option>Attack</option><option>Defense</option><option>Either</option></select></label>
            <label><span>Site</span><input required value={form.site} onChange={(event) => setField("site", event.target.value)} /></label>
            <label><span>Type</span><select value={form.category} onChange={(event) => setField("category", event.target.value as Category)}><option>Setup</option><option>Entry</option><option>Post-plant</option><option>Retake</option><option>Info</option></select></label>
            <label className="span-2"><span>Scenario prompt</span><input required value={form.summary} onChange={(event) => setField("summary", event.target.value)} placeholder="What should this drill accomplish?" /></label>
            <fieldset className="coordinate-field span-2"><legend>Marker coordinates (0–100)</legend><label><span>Start X</span><input type="number" min="0" max="100" value={form.startX} onChange={(event) => setField("startX", Number(event.target.value))} /></label><label><span>Start Y</span><input type="number" min="0" max="100" value={form.startY} onChange={(event) => setField("startY", Number(event.target.value))} /></label><label><span>Target X</span><input type="number" min="0" max="100" value={form.targetX} onChange={(event) => setField("targetX", Number(event.target.value))} /></label><label><span>Target Y</span><input type="number" min="0" max="100" value={form.targetY} onChange={(event) => setField("targetY", Number(event.target.value))} /></label></fieldset>
            <label className="span-2"><span>Steps — one per line</span><textarea required rows={4} value={form.steps} onChange={(event) => setField("steps", event.target.value)} placeholder={"Clear the close corner\nAlign with the roof seam\nStanding throw, then swing"} /></label>
            <label className="span-2"><span>Coach note</span><textarea rows={2} value={form.notes} onChange={(event) => setField("notes", event.target.value)} /></label>
            <label><span>Media URL</span><input type="url" value={form.mediaUrl} onChange={(event) => setField("mediaUrl", event.target.value)} placeholder="https://…" /></label>
            <label><span>Original source URL</span><input type="url" value={form.sourceUrl} onChange={(event) => setField("sourceUrl", event.target.value)} placeholder="https://…" /></label>
          </div>
          <button className="primary-button full-button" type="submit">Add to personal library</button>
        </form>
        <section className="panel custom-list">
          <div className="panel-heading"><div><span className="eyebrow">Your additions</span><h2>{customLineups.length} custom drills</h2></div></div>
          {customLineups.map((lineup) => (
            <article key={lineup.id}><TacticalMap lineup={lineup} compact /><div><span>{getMap(lineup.mapId).name} · {getAgent(lineup.agentId).name}</span><h3>{lineup.title}</h3><p>{lineup.summary}</p></div><button className="icon-button danger" onClick={() => removeLineup(lineup.id)} aria-label={`Remove ${lineup.title}`}>×</button></article>
          ))}
          {!customLineups.length && <div className="empty-mini"><span>＋</span><h3>Your refined setups live here.</h3><p>Add one after testing it in a custom lobby.</p></div>}
          <div className="data-zone"><div><b>Device-local data</b><span>Export before clearing your browser or switching devices.</span></div><button className="text-button danger-text" onClick={resetProgress}>Reset all progress</button></div>
        </section>
      </div>
    </>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [state, setState] = useState<StoredState>(readState);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allLineups = useMemo(() => [...starterLineups, ...state.customLineups], [state.customLineups]);
  const filteredLineups = useMemo(
    () => allLineups.filter((lineup) => matchesFilters(lineup, state.filters, state.progress)),
    [allLineups, state.filters, state.progress],
  );
  const session = useMemo(
    () => prioritizeForPractice(filteredLineups, state.progress),
    [filteredLineups, state.progress],
  );
  const selected = allLineups.find((lineup) => lineup.id === selectedId);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "#/browse";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key === "/" && route === "browse" && !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".search-field input")?.focus();
      }
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [route]);

  const setFilters = (filters: Filters) => setState((current) => ({ ...current, filters }));
  const updateFavorite = (id: string) => setState((current) => {
    const previous = getProgress(current.progress, id);
    return { ...current, progress: { ...current.progress, [id]: { ...previous, favorite: !previous.favorite } } };
  });
  const rate = (id: string, rating: "again" | "learning" | "mastered") => setState((current) => {
    const now = new Date().toISOString();
    const event: PracticeEvent = { id: crypto.randomUUID(), lineupId: id, rating, practicedAt: now };
    return {
      ...current,
      progress: { ...current.progress, [id]: rateLineup(current.progress[id], rating, now) },
      activity: [...current.activity, event].slice(-1000),
    };
  });
  const addLineup = (lineup: Lineup) => setState((current) => ({ ...current, customLineups: [lineup, ...current.customLineups] }));
  const removeLineup = (id: string) => {
    if (!window.confirm("Remove this personal drill?")) return;
    setState((current) => ({ ...current, customLineups: current.customLineups.filter((item) => item.id !== id) }));
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lineup-desk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!validateStoredState(parsed)) throw new Error("Invalid backup");
        if (window.confirm("Replace this device's current Lineup Desk data with the imported backup?")) {
          setState({ ...parsed, filters: { ...defaultFilters, ...parsed.filters } });
        }
      } catch {
        window.alert("That file is not a valid Lineup Desk v1 backup.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };
  const resetProgress = () => {
    if (!window.confirm("Reset all practice history, mastery, favorites, and personal drills on this device?")) return;
    setState(emptyState());
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#/browse"><span className="brand-mark">LD</span><span><b>LINEUP</b><i>DESK</i></span></a>
        <nav aria-label="Primary navigation">
          <a className={route === "browse" ? "active" : ""} href="#/browse"><span>⌕</span>Browse</a>
          <a className={route === "practice" ? "active" : ""} href="#/practice"><span>▶</span>Practice</a>
          <a className={route === "progress" ? "active" : ""} href="#/progress"><span>▥</span>Progress</a>
          <a className={route === "library" ? "active" : ""} href="#/library"><span>＋</span>Library</a>
        </nav>
        <div className="pool-card">
          <span className="live-dot" />
          <div><b>Ranked pool</b><span>Patch {MAP_POOL.patch}</span></div>
          <small>{maps.length} maps</small>
        </div>
        <div className="sidebar-agents">
          <span>Your roster</span>
          <div>{agents.map((agent) => <AgentBadge id={agent.id} small key={agent.id} />)}</div>
        </div>
        <div className="sidebar-footer"><span>Local progress</span><b>{completionPercent(allLineups, state.progress)}%</b></div>
      </aside>

      <main className="main-content">
        <div className="top-strip">
          <span><i /> VERIFIED FOR PATCH {MAP_POOL.patch}</span>
          <a href={MAP_POOL.sourceUrl} target="_blank" rel="noreferrer">Pool source ↗</a>
        </div>
        <div className="content-wrap">
          {route === "browse" && <BrowseView lineups={allLineups} progress={state.progress} filters={state.filters} setFilters={setFilters} updateFavorite={updateFavorite} openLineup={setSelectedId} />}
          {route === "practice" && <PracticeView session={session} progress={state.progress} rate={rate} updateFavorite={updateFavorite} />}
          {route === "progress" && <ProgressView lineups={allLineups} progress={state.progress} activity={state.activity} />}
          {route === "library" && <LibraryView customLineups={state.customLineups} addLineup={addLineup} removeLineup={removeLineup} exportData={exportData} importData={importData} resetProgress={resetProgress} />}
        </div>
        <footer><p>Lineup Desk was created under Riot Games’ “Legal Jibber Jabber” policy using references owned by Riot Games. Riot Games does not endorse or sponsor this project.</p><span>Free fan project · Data stays in your browser</span></footer>
      </main>
      {selected && <DetailPanel lineup={selected} progress={getProgress(state.progress, selected.id)} onClose={() => setSelectedId(null)} onFavorite={() => updateFavorite(selected.id)} onPractice={() => { setState((current) => ({ ...current, filters: { ...defaultFilters, mapId: selected.mapId, agentId: selected.agentId, search: selected.title } })); setSelectedId(null); window.location.hash = "#/practice"; }} />}
    </div>
  );
}
