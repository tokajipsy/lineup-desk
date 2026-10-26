import type { AgentId, Category, Lineup, MapId, Point, Side } from "./domain";

export const MAP_POOL = {
  patch: "13.08",
  verifiedAt: "2026-10-13",
  sourceUrl: "https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-08/",
};

export interface MapDefinition {
  id: MapId;
  name: string;
  code: string;
  secondarySite: string;
  locale: string;
  accent: string;
  starts: [Point, Point];
  targets: [Point, Point];
}

export const maps: MapDefinition[] = [
  { id: "abyss", name: "Abyss", code: "ABS", secondarySite: "B", locale: "Edge Complex", accent: "#8f8cff", starts: [{ x: 18, y: 70 }, { x: 76, y: 72 }], targets: [{ x: 28, y: 28 }, { x: 73, y: 29 }] },
  { id: "bind", name: "Bind", code: "BND", secondarySite: "B", locale: "Desert Lab", accent: "#f2a66d", starts: [{ x: 20, y: 76 }, { x: 79, y: 68 }], targets: [{ x: 27, y: 24 }, { x: 70, y: 30 }] },
  { id: "corrode", name: "Corrode", code: "CRD", secondarySite: "B", locale: "Flooded Bastion", accent: "#7dc0ad", starts: [{ x: 22, y: 72 }, { x: 74, y: 76 }], targets: [{ x: 31, y: 27 }, { x: 73, y: 25 }] },
  { id: "haven", name: "Haven", code: "HVN", secondarySite: "C", locale: "Mountain Monastery", accent: "#efca79", starts: [{ x: 18, y: 72 }, { x: 82, y: 66 }], targets: [{ x: 24, y: 24 }, { x: 78, y: 24 }] },
  { id: "lotus", name: "Lotus", code: "LTS", secondarySite: "C", locale: "Ancient Stepwell", accent: "#dc8fca", starts: [{ x: 22, y: 78 }, { x: 76, y: 73 }], targets: [{ x: 30, y: 25 }, { x: 75, y: 29 }] },
  { id: "sunset", name: "Sunset", code: "SUN", secondarySite: "B", locale: "City Block", accent: "#ff8c74", starts: [{ x: 20, y: 73 }, { x: 78, y: 76 }], targets: [{ x: 28, y: 26 }, { x: 69, y: 27 }] },
  { id: "summit", name: "Summit", code: "SMT", secondarySite: "B", locale: "Radiant Academy", accent: "#84b7e8", starts: [{ x: 24, y: 76 }, { x: 77, y: 72 }], targets: [{ x: 32, y: 24 }, { x: 70, y: 28 }] },
];

export const agents: Array<{
  id: AgentId;
  name: string;
  role: string;
  mark: string;
  color: string;
}> = [
  { id: "sage", name: "Sage", role: "Sentinel", mark: "SG", color: "#82e2ce" },
  { id: "clove", name: "Clove", role: "Controller", mark: "CL", color: "#d998ff" },
  { id: "fade", name: "Fade", role: "Initiator", mark: "FD", color: "#8aa0be" },
  { id: "neon", name: "Neon", role: "Duelist", mark: "NN", color: "#6fbfff" },
];

type DrillTemplate = {
  ability: string;
  title: (map: MapDefinition) => string;
  summary: (map: MapDefinition) => string;
  side: Side;
  site: (map: MapDefinition) => string;
  category: Category;
  difficulty: 1 | 2 | 3;
  tags: string[];
  steps: (map: MapDefinition) => string[];
  notes: string;
};

const templates: Record<AgentId, [DrillTemplate, DrillTemplate]> = {
  sage: [
    {
      ability: "Barrier Orb",
      title: (map) => `${map.name} A split wall`,
      summary: () => "Create a safe plant pocket and a new off-angle for the site hit.",
      side: "Attack",
      site: () => "A",
      category: "Setup",
      difficulty: 2,
      tags: ["wall", "plant", "entry"],
      steps: (map) => [
        `Clear the close corner from ${map.name} A approach before equipping Barrier Orb.`,
        "Rotate the wall so one segment seals the strongest defender swing.",
        "Place from cover, then rehearse the plant and one elevated peek before resetting.",
      ],
      notes: "Practice the placement from both a full stop and after a short strafe. Treat the marker as the rehearsal zone, then refine it in a custom lobby.",
    },
    {
      ability: "Slow Orb",
      title: (map) => `${map.name} ${map.secondarySite} retake slow`,
      summary: (map) => `Delay the ${map.secondarySite} post-plant swing while your team retakes space.`,
      side: "Defense",
      site: (map) => map.secondarySite,
      category: "Retake",
      difficulty: 1,
      tags: ["slow", "retake", "delay"],
      steps: (map) => [
        `Set at the safe ${map.secondarySite} retake staging point.`,
        "Aim above the marked lane and use a standing throw.",
        "Swing on the slow audio with a teammate; do not isolate the duel.",
      ],
      notes: "The purpose is timing, not pixel perfection. Repeat until the orb lands before the first defender swing window.",
    },
  ],
  clove: [
    {
      ability: "Ruse",
      title: (map) => `${map.name} A two-smoke entry`,
      summary: () => "Cut the anchor and rotation sightlines for a compact site execute.",
      side: "Attack",
      site: () => "A",
      category: "Entry",
      difficulty: 1,
      tags: ["smoke", "execute", "timing"],
      steps: (map) => [
        `Open Ruse from the ${map.name} A staging point.`,
        "Place the first smoke flush with the anchor choke and the second on the rotation lane.",
        "Deploy as your entry crosses the final cover, preserving one edge for your team to clear.",
      ],
      notes: "Avoid smokes that bulge onto site and give defenders free pockets. The target marker represents the center of the critical smoke.",
    },
    {
      ability: "Meddle",
      title: (map) => `${map.name} ${map.secondarySite} decay clear`,
      summary: (map) => `Pressure the common ${map.secondarySite} hold before the retake swing.`,
      side: "Defense",
      site: (map) => map.secondarySite,
      category: "Retake",
      difficulty: 2,
      tags: ["decay", "clear", "retake"],
      steps: (map) => [
        `Reach the marked ${map.secondarySite} retake start without exposing to the long angle.`,
        "Set the crosshair on the roof or wall reference nearest the target marker.",
        "Throw Meddle, count one beat, then clear with your first teammate.",
      ],
      notes: "Confirm the projectile clears nearby geometry. Pair the decay with coordinated damage instead of using it as a solo cue.",
    },
  ],
  fade: [
    {
      ability: "Haunt",
      title: (map) => `${map.name} A site reveal`,
      summary: () => "Land Haunt high enough to scan the anchor and back-site rotation path.",
      side: "Attack",
      site: () => "A",
      category: "Info",
      difficulty: 2,
      tags: ["reveal", "entry", "roof"],
      steps: (map) => [
        `Stand on the marked ${map.name} A approach seam.`,
        "Align the center of the Haunt reticle with the highest stable skyline reference.",
        "Use a full throw and swing only after the eye opens so defenders must choose between it and you.",
      ],
      notes: "If the eye can be destroyed from a single safe angle, vary the timing or move the landing point during the next repetition.",
    },
    {
      ability: "Seize",
      title: (map) => `${map.name} ${map.secondarySite} plant trap`,
      summary: (map) => `Catch the default ${map.secondarySite} post-plant pocket for a coordinated retake.`,
      side: "Defense",
      site: (map) => map.secondarySite,
      category: "Retake",
      difficulty: 2,
      tags: ["seize", "post-plant", "combo"],
      steps: (map) => [
        `Hold the safe ${map.secondarySite} retake line shown by the start marker.`,
        "Aim at the target marker's nearest skyline corner and use a full throw.",
        "Call the landing before release so a teammate can layer damage into Seize.",
      ],
      notes: "Rehearse one utility combo after the solo throw. A successful rep traps the default pocket without exposing you first.",
    },
  ],
  neon: [
    {
      ability: "Fast Lane",
      title: (map) => `${map.name} A fast lane`,
      summary: () => "Create a clean runway that blocks the two most dangerous entry angles.",
      side: "Attack",
      site: () => "A",
      category: "Entry",
      difficulty: 1,
      tags: ["wall", "route", "entry"],
      steps: (map) => [
        `Start from the ${map.name} A staging marker with High Gear ready.`,
        "Aim through the intended plant lane so both Fast Lane walls finish on useful cover.",
        "Cast, sprint the route, and stop at the target marker before clearing back site.",
      ],
      notes: "A good lane removes crossfire without hiding close corners. Repeat the route until you arrive with enough energy to slide or disengage.",
    },
    {
      ability: "Relay Bolt",
      title: (map) => `${map.name} ${map.secondarySite} double stun`,
      summary: (map) => `Bounce a Relay Bolt to disrupt the ${map.secondarySite} anchor and nearby trade position.`,
      side: "Either",
      site: (map) => map.secondarySite,
      category: "Setup",
      difficulty: 3,
      tags: ["stun", "bounce", "clear"],
      steps: (map) => [
        `Set on the marked ${map.secondarySite} approach without crossing the defender sightline.`,
        "Aim at the wall reference nearest the target and verify the second pulse reaches the trade pocket.",
        "Release, wait for the first pulse, then clear with a slide only if the path is confirmed.",
      ],
      notes: "This is a geometry rehearsal. Adjust the wall reference in a custom lobby and save your refined notes as a personal drill.",
    },
  ],
};

const officialAgentPage = (agentId: AgentId) =>
  `https://playvalorant.com/en-us/agents/${agentId}/`;

export const starterLineups: Lineup[] = maps.flatMap((map) =>
  agents.flatMap((agent) =>
    templates[agent.id].map((template, index): Lineup => ({
      id: `starter-${map.id}-${agent.id}-${index + 1}`,
      mapId: map.id,
      agentId: agent.id,
      ability: template.ability,
      title: template.title(map),
      summary: template.summary(map),
      side: template.side,
      site: template.site(map),
      category: template.category,
      difficulty: template.difficulty,
      tags: template.tags,
      start: map.starts[index],
      target: map.targets[index],
      steps: template.steps(map),
      notes: template.notes,
      creator: "Lineup Desk training desk",
      sourceUrl: officialAgentPage(agent.id),
      origin: "starter",
      updatedAt: MAP_POOL.verifiedAt,
    })),
  ),
);

export const getMap = (id: MapId) => maps.find((map) => map.id === id)!;
export const getAgent = (id: AgentId) => agents.find((agent) => agent.id === id)!;
