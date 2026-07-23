"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v4";
const INITIAL_PIGEONS = 30;
const MAX_PIGEONS = 50;
const GENERATION_SECONDS = 12;
const HUNGER_INTERVAL_SECONDS = 1;
const FEEDING_SAFETY_MS = 5000;
const SPLIT_ANIMATION_MS = 1800;
const CITY_FOOD_DETECTION_RADIUS = 24;

type Plumage = "grey" | "white" | "spotted" | "brown";

type PigeonAgent = {
  id: number;
  plumage: Plumage;
  feedCount: number;
  caseSeed: number;
  caseMask: number;
  colorSeed: number;
  sizeScale: number;
  boldness: number;
  hasAcceptedFood: boolean;
  protectedUntil: number;
  birthX: number;
  birthY: number;
  bornAt: number;
};

type EcosystemState = {
  pigeons: PigeonAgent[];
  nextPigeonId: number;
  dependency: number;
  foraging: number;
  hungerClock: number;
  feedingProtectedUntil: number;
  generationClock: number;
  humanFoodSignal: number;
  generations: number;
  lastUpdated: number;
  events: string[];
};

type Metric = {
  label: string;
  value: string;
  detail: string;
  percent?: number;
};

type FoodParticle = {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  launchedAt: number;
  duration: number;
  arcHeight: number;
  pigeonId: number;
};

type FoodClaim = {
  throwId: number;
  pigeonId: number;
  x: number;
  y: number;
  phase: "flying" | "landing";
  response: "recipient" | "observer";
  flightDuration: number;
};

const initialEvents = [
  "Thirty unfed birds begin outside the city circle.",
  "A feeding action protects the entire flock from hunger.",
  "After feeding stops, only city birds gradually die; wild birds remain safe outside.",
  "A bird that reaches a pellet divides into a new word-pigeon at the same spot.",
  "Every initial bird has a distinct casing, letter-color, and size combination.",
];

const pigeonLetters = "pigeon";
const plumageOrder: Plumage[] = ["grey", "white", "spotted", "brown"];
const featherPalettes: Record<Plumage, string[]> = {
  grey: ["#303737", "#727a79", "#315f5b", "#76566f", "#8d9492", "#3d4544"],
  white: ["#f8f7f0", "#dedfd9", "#f3f2ec", "#c9cfca", "#ffffff", "#d9dbd5"],
  spotted: ["#363c3c", "#f1f0e9", "#777d7a", "#292f30", "#e4e3dc", "#666c69"],
  brown: ["#563e34", "#8b6650", "#a57a5d", "#67483a", "#b18b6f", "#755445"],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCaseMask(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : fallback;
  return Math.abs(Math.trunc(safeValue)) % (1 << pigeonLetters.length);
}

function wordFromCaseMask(caseMask: number) {
  const normalizedMask = normalizeCaseMask(caseMask);
  return [...pigeonLetters]
    .map((letter, letterIndex) =>
      normalizedMask & (1 << letterIndex) ? letter.toUpperCase() : letter,
    )
    .join("");
}

function pigeonStyleSignature(
  pigeon: Pick<PigeonAgent, "plumage" | "caseMask" | "colorSeed" | "sizeScale">,
) {
  return [
    pigeon.plumage,
    normalizeCaseMask(pigeon.caseMask),
    Math.abs(Math.trunc(pigeon.colorSeed)),
    Math.round(pigeon.sizeScale * 1000),
  ].join(":");
}

function pigeonLetterPalette(
  pigeon: Pick<PigeonAgent, "plumage" | "caseMask" | "colorSeed">,
) {
  const colors = [...featherPalettes[pigeon.plumage]];
  let seed =
    (Math.abs(Math.trunc(pigeon.colorSeed)) * 2654435761 +
      normalizeCaseMask(pigeon.caseMask) * 1013904223) >>>
    0;

  for (let index = colors.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [colors[index], colors[swapIndex]] = [colors[swapIndex], colors[index]];
  }

  return colors;
}

function averageBoldness(pigeons: PigeonAgent[]) {
  if (pigeons.length === 0) {
    return 0;
  }

  return pigeons.reduce((total, pigeon) => total + pigeon.boldness, 0) / pigeons.length;
}

function initialPigeonStyle(id: number) {
  return {
    plumage: plumageOrder[(id * 5) % plumageOrder.length],
    caseMask: (id * 37) % (1 << pigeonLetters.length),
    colorSeed: (id * 53 + 11) % 997,
    sizeScale: 0.74 + ((id * 7) % 13) * 0.035,
  };
}

function createOuterPigeon(
  id: number,
  style = initialPigeonStyle(id),
  boldness = clamp(0.16 + ((id * 37) % 61) / 100, 0.08, 0.92),
): PigeonAgent {
  return {
    id,
    plumage: style.plumage,
    feedCount: 0,
    caseSeed: (id * 17) % 97,
    caseMask: normalizeCaseMask(style.caseMask),
    colorSeed: Math.abs(Math.trunc(style.colorSeed)),
    sizeScale: clamp(style.sizeScale, 0.72, 1.18),
    boldness,
    hasAcceptedFood: false,
    protectedUntil: 0,
    birthX: 0,
    birthY: 0,
    bornAt: 0,
  };
}

function mutatePigeonStyle(
  template: PigeonAgent,
  id: number,
  existingPigeons: PigeonAgent[],
) {
  const occupiedStyles = new Set(existingPigeons.map(pigeonStyleSignature));

  for (let attempt = 0; attempt < 96; attempt += 1) {
    const candidate = {
      plumage: template.plumage,
      caseMask: normalizeCaseMask(template.caseMask),
      colorSeed: Math.abs(Math.trunc(template.colorSeed)),
      sizeScale: clamp(template.sizeScale, 0.72, 1.18),
    };
    const mutationType = (id + attempt) % 3;

    if (mutationType === 0) {
      const letterIndex = (id * 5 + attempt * 3) % pigeonLetters.length;
      candidate.caseMask ^= 1 << letterIndex;
    } else if (mutationType === 1) {
      candidate.colorSeed =
        (candidate.colorSeed + 17 + id * 7 + attempt * 11) % 1000003;
    } else {
      const step = 0.035 + ((id + attempt) % 3) * 0.012;
      const direction = (id + attempt) % 2 === 0 ? 1 : -1;
      const shifted = clamp(candidate.sizeScale + direction * step, 0.72, 1.18);
      candidate.sizeScale =
        Math.abs(shifted - template.sizeScale) > 0.001
          ? shifted
          : clamp(candidate.sizeScale - direction * step, 0.72, 1.18);
    }

    if (!occupiedStyles.has(pigeonStyleSignature(candidate))) {
      return candidate;
    }
  }

  return {
    plumage: template.plumage,
    caseMask: normalizeCaseMask(template.caseMask) ^ (1 << (id % pigeonLetters.length)),
    colorSeed: Math.abs(Math.trunc(template.colorSeed)) + id + 1,
    sizeScale: clamp(template.sizeScale, 0.72, 1.18),
  };
}

function createRefreshedOuterPigeon(
  id: number,
  pigeons: PigeonAgent[],
  random = Math.random,
) {
  if (pigeons.length === 0) {
    return createOuterPigeon(id);
  }

  const templateIndex = Math.min(
    pigeons.length - 1,
    Math.floor(random() * pigeons.length),
  );
  const template = pigeons[templateIndex];
  const style = mutatePigeonStyle(template, id, pigeons);
  const boldnessMutation = (((id * 29) % 9) - 4) * 0.008;

  return createOuterPigeon(
    id,
    style,
    clamp(template.boldness + boldnessMutation, 0.05, 0.95),
  );
}

function createInitialPigeons() {
  return Array.from({ length: INITIAL_PIGEONS }, (_, index) => createOuterPigeon(index));
}

function makeInitialState(now = Date.now()): EcosystemState {
  return {
    pigeons: createInitialPigeons(),
    nextPigeonId: INITIAL_PIGEONS,
    dependency: 0.28,
    foraging: 0.76,
    hungerClock: 0,
    feedingProtectedUntil: 0,
    generationClock: 0,
    humanFoodSignal: 0.2,
    generations: 0,
    lastUpdated: now,
    events: initialEvents,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function pushEvent(state: EcosystemState, message: string) {
  state.events = [message, ...state.events].slice(0, 6);
}

function generationEvent(before: EcosystemState, after: EcosystemState) {
  const boldDelta = averageBoldness(after.pigeons) - averageBoldness(before.pigeons);
  const dependencyDelta = after.dependency - before.dependency;
  const foragingDelta = after.foraging - before.foraging;

  if (boldDelta > 0.008 && dependencyDelta > 0.006) {
    return "Birds that approached people first were more likely to survive and reproduce.";
  }

  if (foragingDelta > 0.006) {
    return "With fewer feeding cues, edge-foraging behavior recovered slightly.";
  }

  if (dependencyDelta > 0.008) {
    return "The flock's behavior shifted toward waiting near human paths.";
  }

  return "The flock adjusted quietly; small behavioral differences carried forward.";
}

function replenishOuterPigeons(state: EcosystemState) {
  let refreshedCount = 0;

  while (state.pigeons.length < INITIAL_PIGEONS) {
    const refreshed = createRefreshedOuterPigeon(
      state.nextPigeonId,
      state.pigeons,
    );
    state.pigeons.push(refreshed);
    state.nextPigeonId += 1;
    refreshedCount += 1;
  }

  return refreshedCount;
}

function applyHungerDeaths(
  state: EcosystemState,
  elapsedSeconds: number,
  now: number,
) {
  state.hungerClock += elapsedSeconds;
  const deathCount = Math.min(
    240,
    Math.floor(state.hungerClock / HUNGER_INTERVAL_SECONDS),
  );

  if (deathCount <= 0) {
    return;
  }

  state.hungerClock -= deathCount * HUNGER_INTERVAL_SECONDS;
  let actualDeaths = 0;

  for (let index = 0; index < deathCount; index += 1) {
    const indexedPigeons = state.pigeons.map((pigeon, pigeonIndex) => ({
      pigeon,
      pigeonIndex,
    }));
    const eligible = indexedPigeons.filter(
      ({ pigeon }) =>
        pigeon.hasAcceptedFood &&
        (Number(pigeon.protectedUntil) || 0) <= now,
    );

    if (eligible.length === 0) {
      state.hungerClock = 0;
      break;
    }

    const minimumFeedCount = Math.min(
      ...eligible.map(({ pigeon }) => pigeon.feedCount),
    );
    const candidates = eligible.filter(
      ({ pigeon }) => pigeon.feedCount === minimumFeedCount,
    );
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    state.pigeons.splice(selected.pigeonIndex, 1);
    actualDeaths += 1;
  }

  const refreshedCount =
    actualDeaths > 0 ? replenishOuterPigeons(state) : 0;
  const refreshMessage =
    refreshedCount > 0
      ? ` ${refreshedCount} new wild ${
          refreshedCount === 1 ? "bird arrived" : "birds arrived"
        } outside with style inherited and varied from the current flock.`
      : "";

  if (actualDeaths === 1) {
    pushEvent(
      state,
      `One city bird died from hunger; ${state.pigeons.length} remain, while wild birds stayed safe.${refreshMessage}`,
    );
  } else if (actualDeaths > 0) {
    pushEvent(
      state,
      `${actualDeaths} city birds died during the feeding pause; wild birds outside were unaffected.${refreshMessage}`,
    );
  }
}

function advanceState(current: EcosystemState, now = Date.now()): EcosystemState {
  const elapsedSeconds = clamp((now - current.lastUpdated) / 1000, 0, 60 * 60 * 8);
  if (elapsedSeconds <= 0) {
    return { ...current, lastUpdated: now };
  }

  const next: EcosystemState = {
    ...current,
    pigeons: current.pigeons.map((pigeon) => ({ ...pigeon })),
    events: [...current.events],
  };

  const feedingProtectedUntil = Number(next.feedingProtectedUntil) || 0;
  if (now <= feedingProtectedUntil) {
    next.hungerClock = 0;
  } else {
    const hungerStart = Math.max(current.lastUpdated, feedingProtectedUntil);
    const hungerElapsedSeconds = clamp(
      (now - hungerStart) / 1000,
      0,
      elapsedSeconds,
    );
    applyHungerDeaths(next, hungerElapsedSeconds, now);
  }

  next.generationClock += elapsedSeconds;
  const cycles = Math.min(240, Math.floor(next.generationClock / GENERATION_SECONDS));
  next.generationClock -= cycles * GENERATION_SECONDS;

  if (cycles > 0) {
    const before = {
      ...next,
      pigeons: next.pigeons.map((pigeon) => ({ ...pigeon })),
      events: [...next.events],
    };

    for (let index = 0; index < cycles; index += 1) {
      const humanFood = clamp(next.humanFoodSignal, 0, 1);
      const shortage = clamp(next.dependency - humanFood, 0, 1);
      const boldSurvival = 0.42 + humanFood * 0.38 - shortage * 0.18;
      const shySurvival = 0.51 + next.foraging * 0.16 - humanFood * 0.06;
      const traitShift = (boldSurvival - shySurvival) * 0.034;
      next.pigeons = next.pigeons.map((pigeon) => ({
        ...pigeon,
        boldness: clamp(
          pigeon.boldness + traitShift + (pigeon.feedCount > 0 ? 0.001 : 0),
          0.05,
          0.95,
        ),
      }));
      const meanBoldness = averageBoldness(next.pigeons);

      next.dependency = clamp(
        next.dependency + humanFood * 0.025 + meanBoldness * 0.006 - next.foraging * 0.01,
        0.05,
        0.95,
      );
      next.foraging = clamp(
        next.foraging - humanFood * 0.018 - next.dependency * 0.004 + (1 - humanFood) * 0.014,
        0.12,
        0.96,
      );
      next.humanFoodSignal = clamp(next.humanFoodSignal * 0.88, 0, 1);
      next.generations += 1;
    }

    pushEvent(next, generationEvent(before, next));
  } else {
    next.humanFoodSignal = clamp(
      next.humanFoodSignal * Math.pow(0.985, elapsedSeconds),
      0,
      1,
    );
  }

  next.lastUpdated = now;
  return next;
}

function loadState() {
  if (typeof window === "undefined") {
    return makeInitialState();
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return makeInitialState();
    }

    const parsed = JSON.parse(saved) as Partial<EcosystemState>;
    const initial = makeInitialState();
    const pigeons =
      Array.isArray(parsed.pigeons) && parsed.pigeons.length > 0
        ? parsed.pigeons.slice(0, MAX_PIGEONS).map((pigeon, index) => {
            const savedPigeon = pigeon as Partial<PigeonAgent>;
            const numericId = Number(savedPigeon.id);
            const id = Number.isFinite(numericId) ? Math.trunc(numericId) : index;
            const fallback = createOuterPigeon(id);
            const numericCaseSeed = Number(savedPigeon.caseSeed);
            const caseSeed = Number.isFinite(numericCaseSeed)
              ? Math.abs(Math.trunc(numericCaseSeed))
              : fallback.caseSeed;
            const numericColorSeed = Number(savedPigeon.colorSeed);
            const numericSizeScale = Number(savedPigeon.sizeScale);
            const numericBoldness = Number(savedPigeon.boldness);
            const plumage = plumageOrder.includes(savedPigeon.plumage as Plumage)
              ? (savedPigeon.plumage as Plumage)
              : fallback.plumage;

            return {
              ...fallback,
              ...savedPigeon,
              id,
              plumage,
              feedCount: Math.max(0, Math.trunc(Number(savedPigeon.feedCount) || 0)),
              caseSeed,
              caseMask: normalizeCaseMask(
                savedPigeon.caseMask,
                id * 37 + caseSeed,
              ),
              colorSeed: Number.isFinite(numericColorSeed)
                ? Math.abs(Math.trunc(numericColorSeed))
                : (id * 53 + caseSeed * 11) % 997,
              sizeScale: Number.isFinite(numericSizeScale)
                ? clamp(numericSizeScale, 0.72, 1.18)
                : 0.74 + ((id * 7 + caseSeed) % 13) * 0.035,
              boldness: Number.isFinite(numericBoldness)
                ? clamp(numericBoldness, 0.05, 0.95)
                : fallback.boldness,
              hasAcceptedFood: Boolean(savedPigeon.hasAcceptedFood),
              protectedUntil: Number(savedPigeon.protectedUntil) || 0,
              birthX: Number(savedPigeon.birthX) || 0,
              birthY: Number(savedPigeon.birthY) || 0,
              bornAt: Number(savedPigeon.bornAt) || 0,
            };
          })
        : initial.pigeons;
    const nextPigeonId = Math.max(
      Number(parsed.nextPigeonId) || 0,
      ...pigeons.map((pigeon) => pigeon.id + 1),
    );

    return advanceState({
      ...initial,
      ...parsed,
      pigeons,
      nextPigeonId,
      events: Array.isArray(parsed.events) ? parsed.events.slice(0, 6) : initialEvents,
    });
  } catch {
    return makeInitialState();
  }
}

function protectFlockFromHunger(
  current: EcosystemState,
  now = Date.now(),
) {
  return advanceState(
    {
      ...current,
      feedingProtectedUntil: Math.max(
        Number(current.feedingProtectedUntil) || 0,
        now + FEEDING_SAFETY_MS,
      ),
    },
    now,
  );
}

function recordFeedActionState(
  current: EcosystemState,
  pigeonId: number,
  protectionDuration: number,
) {
  const actionAt = Date.now();
  const advanced = protectFlockFromHunger(current, actionAt);

  const next: EcosystemState = {
    ...advanced,
    pigeons: advanced.pigeons.map((pigeon) =>
      pigeon.id === pigeonId && protectionDuration > 0
        ? {
            ...pigeon,
            protectedUntil: Math.max(
              Number(pigeon.protectedUntil) || 0,
              actionAt + protectionDuration,
            ),
          }
        : pigeon,
    ),
    hungerClock: 0,
    events: [...advanced.events],
  };

  return next;
}

function feedPigeonState(
  current: EcosystemState,
  pigeonId: number,
  declinedBefore: number,
  birthX: number,
  birthY: number,
) {
  const bornAt = Date.now();
  const advanced = protectFlockFromHunger(current, bornAt);
  const parentIndex = advanced.pigeons.findIndex((pigeon) => pigeon.id === pigeonId);

  if (parentIndex < 0) {
    return advanced;
  }

  const pigeons = advanced.pigeons.map((pigeon) => ({ ...pigeon }));
  pigeons[parentIndex].feedCount += 1;
  pigeons[parentIndex].boldness = clamp(pigeons[parentIndex].boldness + 0.015, 0.05, 0.95);
  pigeons[parentIndex].hasAcceptedFood = true;
  pigeons[parentIndex].protectedUntil = 0;
  const parent = pigeons[parentIndex];
  const inheritedMutation = (((advanced.nextPigeonId * 29) % 9) - 4) * 0.008;
  const childStyle = mutatePigeonStyle(
    parent,
    advanced.nextPigeonId,
    pigeons,
  );
  const child: PigeonAgent = {
    ...createOuterPigeon(
      advanced.nextPigeonId,
      childStyle,
      clamp(parent.boldness + inheritedMutation, 0.05, 0.95),
    ),
    hasAcceptedFood: true,
    protectedUntil: bornAt + SPLIT_ANIMATION_MS + 100,
    birthX,
    birthY,
    bornAt,
  };
  pigeons.push(child);

  let removed: PigeonAgent | undefined;
  if (pigeons.length > MAX_PIGEONS) {
    const indexedPigeons = pigeons
      .map((pigeon, index) => ({ pigeon, index }))
      .filter(
        ({ pigeon }) => (Number(pigeon.protectedUntil) || 0) <= Date.now(),
      );
    const minimumFeedCount = Math.min(
      ...indexedPigeons.map(({ pigeon }) => pigeon.feedCount),
    );
    const candidates = indexedPigeons
      .filter(({ pigeon }) => pigeon.feedCount === minimumFeedCount);
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    [removed] = pigeons.splice(selected.index, 1);
  }

  const next: EcosystemState = {
    ...advanced,
    pigeons,
    nextPigeonId: advanced.nextPigeonId + 1,
    hungerClock: 0,
    humanFoodSignal: clamp(advanced.humanFoodSignal + 0.28, 0, 1),
    dependency: clamp(advanced.dependency + 0.007, 0.05, 0.95),
    foraging: clamp(advanced.foraging - 0.004, 0.12, 0.96),
    events: [...advanced.events],
  };
  const feedingLead =
    declinedBefore === 0
      ? `The nearest ${parent.plumage} bird ate the pellet`
      : `After ${declinedBefore} nearer ${
          declinedBefore === 1 ? "bird" : "birds"
        } declined, the ${parent.plumage} bird ate the pellet`;

  if (removed) {
    pushEvent(
      next,
      `${feedingLead} and divided. At capacity, a randomly selected bird with ${removed.feedCount} feeds was removed.`,
    );
  } else {
    pushEvent(
      next,
      `${feedingLead} and divided into two; the field now holds ${pigeons.length} birds.`,
    );
  }

  return next;
}

function rejectFoodState(
  current: EcosystemState,
  pigeonId: number,
  attemptedCount: number,
) {
  const advanced = protectFlockFromHunger(current);
  const pigeon = advanced.pigeons.find((candidate) => candidate.id === pigeonId);

  if (!pigeon) {
    return advanced;
  }

  const next = {
    ...advanced,
    events: [...advanced.events],
  };
  pushEvent(
    next,
    `All ${attemptedCount} pigeons declined the pellet in nearest-first order; the closest was a ${
      pigeon.plumage
    } bird with ${formatPercent(pigeon.boldness)} boldness.`,
  );
  return next;
}

function metricDetails(state: EcosystemState): Metric[] {
  const meanBoldness = averageBoldness(state.pigeons);
  const insideCount = state.pigeons.filter((pigeon) => pigeon.hasAcceptedFood).length;

  return [
    {
      label: "Population",
      value: `${state.pigeons.length}/${MAX_PIGEONS}`,
      detail: `${insideCount} inside / ${state.pigeons.length - insideCount} outside`,
      percent: state.pigeons.length / MAX_PIGEONS,
    },
    {
      label: "Boldness",
      value: formatPercent(meanBoldness),
      detail: "individual mean acceptance",
      percent: meanBoldness,
    },
    {
      label: "Dependency",
      value: formatPercent(state.dependency),
      detail: "reliance on people",
      percent: state.dependency,
    },
    {
      label: "Natural foraging",
      value: formatPercent(state.foraging),
      detail: "non-human food ability",
      percent: state.foraging,
    },
    {
      label: "Human food signal",
      value: formatPercent(state.humanFoodSignal),
      detail: "recent feeding pressure",
      percent: state.humanFoodSignal,
    },
    {
      label: "Feeding rate",
      value: "Every click",
      detail: "one pellet per click",
    },
  ];
}

function projectilePosition(particle: FoodParticle, now: number) {
  const progress = clamp((now - particle.launchedAt) / particle.duration, 0, 1);
  const x = particle.startX + (particle.targetX - particle.startX) * progress;
  const linearY = particle.startY + (particle.targetY - particle.startY) * progress;
  const y = linearY - particle.arcHeight * 4 * progress * (1 - progress);

  return { x, y, landed: progress >= 1 };
}

function pigeonVisuals(state: EcosystemState) {
  const now = Date.now();

  return state.pigeons.map((agent) => {
    const angle = ((agent.id * 137.508 + agent.caseSeed * 7) * Math.PI) / 180;
    const radialSeed = ((agent.id * 47 + agent.caseSeed * 19) % 101) / 100;
    const radius = agent.hasAcceptedFood
      ? 0.18 + radialSeed * 0.64
      : 1.08 + radialSeed * 0.34;
    const x = agent.hasAcceptedFood
      ? clamp(50 + Math.cos(angle) * 18 * radius, 34, 66)
      : clamp(50 + Math.cos(angle) * 33 * radius, 5, 95);
    const y = agent.hasAcceptedFood
      ? clamp(50 + Math.sin(angle) * 26 * radius, 28, 72)
      : clamp(50 + Math.sin(angle) * 38 * radius, 8, 88);
    const isBold = agent.boldness >= 0.5;
    const feedingAcceptance = agent.hasAcceptedFood ? 1 : agent.boldness;
    const word = wordFromCaseMask(agent.caseMask);
    const individualScale = clamp(agent.sizeScale, 0.72, 1.18);
    const isNewborn =
      Number(agent.bornAt) > 0 &&
      now - Number(agent.bornAt) < SPLIT_ANIMATION_MS;

    return {
      agent,
      id: agent.id,
      isBold,
      feedingAcceptance,
      zone: agent.hasAcceptedFood ? "inside" : "outside",
      x,
      y,
      birthX: Number(agent.birthX) || x,
      birthY: Number(agent.birthY) || y,
      isNewborn,
      speed: 6.4 + (agent.caseSeed % 7) * 0.42,
      scale: individualScale,
      word,
      palette: pigeonLetterPalette(agent),
      styleSignature: pigeonStyleSignature(agent),
      tilt: ((agent.caseSeed % 5) - 2) * 0.9,
    };
  });
}

type PigeonVisual = ReturnType<typeof pigeonVisuals>[number];

function selectFoodRecipient(
  pigeons: PigeonVisual[],
  targetX: number,
  targetY: number,
  random = Math.random,
) {
  const ranked = [...pigeons].sort((left, right) => {
    const leftDistance = Math.hypot(left.x - targetX, left.y - targetY);
    const rightDistance = Math.hypot(right.x - targetX, right.y - targetY);
    return leftDistance - rightDistance || left.id - right.id;
  });
  const recipientIndex = ranked.findIndex(
    (pigeon) => random() < pigeon.feedingAcceptance,
  );

  return {
    ranked,
    recipient: recipientIndex >= 0 ? ranked[recipientIndex] : undefined,
    declinedBefore: recipientIndex >= 0 ? recipientIndex : ranked.length,
  };
}

function cityPigeonsDetectingFood(
  pigeons: PigeonVisual[],
  targetX: number,
  targetY: number,
) {
  return pigeons.filter(
    (pigeon) =>
      pigeon.zone === "inside" &&
      Math.hypot(pigeon.x - targetX, pigeon.y - targetY) <=
        CITY_FOOD_DETECTION_RADIUS,
  );
}

function foodResponsePosition(
  pigeon: PigeonVisual,
  targetX: number,
  targetY: number,
  isRecipient: boolean,
) {
  if (isRecipient) {
    return { x: targetX, y: targetY };
  }

  const approachAngle = ((pigeon.id * 137.508) % 360) * (Math.PI / 180);
  const approachRadius = 3.2 + (pigeon.id % 3) * 0.8;
  return {
    x: clamp(targetX + Math.cos(approachAngle) * approachRadius, 4, 96),
    y: clamp(targetY + Math.sin(approachAngle) * approachRadius, 8, 90),
  };
}

function PigeonField({
  state,
  onThrow,
  onFoodClaimed,
  onFoodRejected,
}: {
  state: EcosystemState;
  onThrow: (pigeonId: number, protectionDuration: number) => void;
  onFoodClaimed: (
    pigeonId: number,
    declinedBefore: number,
    birthX: number,
    birthY: number,
  ) => void;
  onFoodRejected: (pigeonId: number, attemptedCount: number) => void;
}) {
  const [particles, setParticles] = useState<FoodParticle[]>([]);
  const [claims, setClaims] = useState<FoodClaim[]>([]);
  const [frameTime, setFrameTime] = useState(0);
  const sequence = useRef(0);
  const timers = useRef<number[]>([]);
  const pigeons = useMemo(
    () => pigeonVisuals(state),
    [state],
  );
  const cityPigeonCount = state.pigeons.filter(
    (pigeon) => pigeon.hasAcceptedFood,
  ).length;

  useEffect(() => {
    if (particles.length === 0) {
      return;
    }

    let animationFrame = 0;
    const tick = (now: number) => {
      setFrameTime(now);
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [particles.length]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const throwFood = (targetX: number, targetY: number) => {
    const launchedAt = window.performance.now();
    const { ranked, recipient, declinedBefore } = selectFoodRecipient(
      pigeons,
      targetX,
      targetY,
    );
    const nearest = ranked[0];
    if (!nearest) {
      return;
    }

    const startX = clamp(50 + (targetX - 50) * 0.16, 42, 58);
    const startY = 96;
    const distance = Math.hypot(targetX - startX, targetY - startY);
    const duration = clamp(620 + distance * 5.2, 700, 1080);
    const flightDuration = duration + 440;
    const throwId = sequence.current;
    sequence.current += 1;
    const accepted = Boolean(recipient);
    const targetPigeon = recipient ?? nearest;
    const disappearanceDelay = accepted ? flightDuration : duration + 760;
    const nearbyCityPigeons = cityPigeonsDetectingFood(
      pigeons,
      targetX,
      targetY,
    );
    const respondingPigeons = [
      ...(recipient ? [recipient] : []),
      ...nearbyCityPigeons.filter((pigeon) => pigeon.id !== recipient?.id),
    ];
    const respondingIds = new Set(
      respondingPigeons.map((pigeon) => pigeon.id),
    );
    const particle: FoodParticle = {
      id: throwId,
      startX,
      startY,
      targetX,
      targetY,
      launchedAt,
      duration,
      arcHeight: clamp(10 + distance * 0.12, 14, 24),
      pigeonId: targetPigeon.id,
    };

    setParticles((current) => [...current, particle]);
    if (respondingPigeons.length > 0) {
      setClaims((current) => [
        ...current.filter((claim) => !respondingIds.has(claim.pigeonId)),
        ...respondingPigeons.map((pigeon) => {
          const isRecipient = pigeon.id === recipient?.id;
          const response: FoodClaim["response"] = isRecipient
            ? "recipient"
            : "observer";
          const responsePosition = foodResponsePosition(
            pigeon,
            targetX,
            targetY,
            isRecipient,
          );

          return {
            throwId,
            pigeonId: pigeon.id,
            x: responsePosition.x,
            y: responsePosition.y,
            phase: "flying" as const,
            response,
            flightDuration: disappearanceDelay,
          };
        }),
      ]);
    }
    onThrow(targetPigeon.id, accepted ? flightDuration + 100 : 0);

    const resultTimer = window.setTimeout(() => {
      if (recipient) {
        onFoodClaimed(recipient.id, declinedBefore, targetX, targetY);
      } else {
        onFoodRejected(nearest.id, ranked.length);
      }
    }, flightDuration);

    const disappearanceTimer = window.setTimeout(() => {
      setParticles((current) => current.filter((item) => item.id !== throwId));
      setClaims((current) =>
        current.map((claim) =>
          claim.throwId === throwId ? { ...claim, phase: "landing" } : claim,
        ),
      );
    }, disappearanceDelay);

    const cleanupTimer = window.setTimeout(() => {
      setClaims((current) => current.filter((claim) => claim.throwId !== throwId));
    }, disappearanceDelay + 860);
    timers.current.push(resultTimer, disappearanceTimer, cleanupTimer);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    throwFood(
      clamp(((event.clientX - bounds.left) / bounds.width) * 100, 4, 96),
      clamp(((event.clientY - bounds.top) / bounds.height) * 100, 8, 90),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      throwFood(50, 54);
    }
  };

  return (
    <section
      aria-label="Throw food into the animated typographic pigeon population"
      className="ecosystem"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      role="button"
      tabIndex={0}
    >
      <div className="cityline" aria-hidden="true">
        <div className="city-building city-building-market">
          <span>MARKET</span>
          <span>FOOD STREET</span>
          <span>TRADE PEOPLE</span>
          <span>MARKET MARKET</span>
        </div>
        <div className="city-building city-building-urban">
          <span>URBAN</span>
          <span>HOME WORK</span>
          <span>CITY CITY</span>
          <span>LIGHT NIGHT</span>
          <span>STREET STREET</span>
          <span>URBAN URBAN</span>
        </div>
        <div className="city-building city-building-clock">
          <span>I</span>
          <span>TIME</span>
          <span>CITY</span>
          <span>CLOCK</span>
          <span>CITY</span>
        </div>
        <div className="city-building city-building-shard">
          <span>S</span>
          <span>SH</span>
          <span>SHA</span>
          <span>SHAR</span>
          <span>SHARD</span>
          <span>SHARD</span>
          <span>SHARD</span>
        </div>
        <div className="city-building city-building-housing">
          <span>HOUSING</span>
          <span>WINDOW WINDOW</span>
          <span>NEIGHBOR NEIGHBOR</span>
          <span>HOME HOME HOME</span>
          <span>HOUSING HOUSING</span>
        </div>
        <div className="city-building city-building-transit">
          <span>RAIL BUS WALK</span>
          <span>TRANSIT TRANSIT</span>
          <span>SIGNAL STREET</span>
        </div>
      </div>
      <div
        aria-label={`${cityPigeonCount} pigeons inside the city circle`}
        className="city-circle"
        role="status"
      >
        <span>City circle</span>
        <strong>{cityPigeonCount}</strong>
      </div>
      <div className="pigeon-layer">
        {pigeons.map((pigeon) => {
          const claim = claims.find((item) => item.pigeonId === pigeon.id);

          return (
            <div
              aria-label={`${pigeon.agent.plumage} pigeon represented by ${
                pigeon.word
              }, boldness ${formatPercent(
                pigeon.agent.boldness,
              )}, feeding acceptance ${formatPercent(
                pigeon.feedingAcceptance,
              )}, individual size ${Math.round(
                pigeon.scale * 100,
              )}%, style ${pigeon.styleSignature}, fed ${
                pigeon.agent.feedCount
              } times`}
              className={`pigeon-word ${
                pigeon.isBold ? "pigeon-word-bold" : "pigeon-word-shy"
              } pigeon-word-${pigeon.agent.plumage} pigeon-word-${pigeon.zone} ${
                claim
                  ? `pigeon-word-claiming pigeon-word-${claim.phase} pigeon-word-${claim.response}`
                  : ""
              } ${pigeon.isNewborn ? "pigeon-word-newborn" : ""}`}
              data-food-response={claim?.response}
              data-pigeon-id={pigeon.id}
              data-style-signature={pigeon.styleSignature}
              key={pigeon.id}
              role="img"
              style={
                {
                  "--x": `${pigeon.x}%`,
                  "--y": `${pigeon.y}%`,
                  "--birth-x": `${pigeon.birthX}%`,
                  "--birth-y": `${pigeon.birthY}%`,
                  "--claim-x": claim ? `${claim.x}%` : `${pigeon.x}%`,
                  "--claim-y": claim ? `${claim.y}%` : `${pigeon.y}%`,
                  "--speed": `${pigeon.speed}s`,
                  "--flight-duration": claim ? `${claim.flightDuration}ms` : "620ms",
                  "--scale": pigeon.scale.toFixed(2),
                  "--tilt": `${pigeon.tilt}deg`,
                  animationDelay:
                    claim || pigeon.isNewborn
                      ? "0s"
                      : `${-((pigeon.id % 7) * 0.43)}s`,
                } as React.CSSProperties
              }
            >
              <span aria-hidden="true" className="pigeon-word-label">
                {[...pigeon.word].map((letter, letterIndex) => (
                  <span
                    className={`pigeon-letter ${
                      letter === letter.toUpperCase() ? "pigeon-letter-capital" : ""
                    }`}
                    key={`${pigeon.id}-${letterIndex}`}
                    style={
                      {
                        "--letter-color": pigeon.palette[letterIndex],
                      } as React.CSSProperties
                    }
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="food-particle-layer">
        {particles.map((particle) => {
          const position = projectilePosition(
            particle,
            frameTime || particle.launchedAt,
          );

          return (
            <span
              className={`food-particle ${position.landed ? "food-particle-landed" : ""}`}
              data-food-id={particle.id}
              key={particle.id}
              style={
                {
                  "--food-x": `${position.x}%`,
                  "--food-y": `${position.y}%`,
                } as React.CSSProperties
              }
            >
              .
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function UrbanPigeonSimulation() {
  const [state, setState] = useState<EcosystemState>(() => makeInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => advanceState(current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hydrated]);

  const metrics = metricDetails(state);

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef0e9] text-[#1e2521]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="site-header">
          <div>
            <p className="eyebrow">Participatory research prototype</p>
            <h1>Urban Pigeon Simulation</h1>
          </div>
          <div className="generation-marker">
            <span>Observed generations</span>
            <strong>{state.generations}</strong>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Ecosystem variables">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {typeof metric.percent === "number" ? (
                <div className="meter" aria-hidden="true">
                  <i style={{ width: `${clamp(metric.percent, 0, 1) * 100}%` }} />
                </div>
              ) : null}
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <div className="content-grid">
          <PigeonField
            onFoodClaimed={(pigeonId, declinedBefore, birthX, birthY) =>
              setState((current) =>
                feedPigeonState(
                  current,
                  pigeonId,
                  declinedBefore,
                  birthX,
                  birthY,
                ),
              )
            }
            onFoodRejected={(pigeonId, attemptedCount) =>
              setState((current) =>
                rejectFoodState(current, pigeonId, attemptedCount),
              )
            }
            onThrow={(pigeonId, protectionDuration) =>
              setState((current) =>
                recordFeedActionState(current, pigeonId, protectionDuration),
              )
            }
            state={state}
          />

          <aside className="changes" aria-label="Recent ecosystem changes">
            <div>
              <p className="eyebrow">Recent ecosystem changes</p>
              <h2>Behavioral drift</h2>
            </div>
            <ol>
              {state.events.map((event, index) => (
                <li key={`${event}-${index}`}>{event}</li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}
