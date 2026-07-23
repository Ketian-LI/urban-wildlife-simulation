"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v4";
const INITIAL_PIGEONS = 30;
const MAX_PIGEONS = 50;
const GENERATION_SECONDS = 12;
const THROW_COOLDOWN_MS = 1000;
const HUNGER_INTERVAL_SECONDS = 1;
const FEEDING_SAFETY_MS = 5000;
const SPLIT_ANIMATION_MS = 1800;

type Plumage = "grey" | "white" | "spotted" | "brown";

type PigeonAgent = {
  id: number;
  plumage: Plumage;
  feedCount: number;
  caseSeed: number;
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
  flightDuration: number;
};

const initialEvents = [
  "Thirty unfed birds begin outside the city circle.",
  "A feeding action protects the entire flock from hunger.",
  "After feeding stops, only city birds gradually die; wild birds remain safe outside.",
  "A bird that reaches a pellet divides into a new word-pigeon at the same spot.",
];

const shyWordForms = ["Pigeon", "piGeon", "pigeoN", "pigeon", "pigEon", "pigeOn"];
const boldWordForms = ["PIGeon", "PiGeoN", "pIGeON", "PIGEon", "PIGEON"];
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

function averageBoldness(pigeons: PigeonAgent[]) {
  if (pigeons.length === 0) {
    return 0;
  }

  return pigeons.reduce((total, pigeon) => total + pigeon.boldness, 0) / pigeons.length;
}

function createOuterPigeon(id: number): PigeonAgent {
  return {
    id,
    plumage: plumageOrder[(id * 5) % plumageOrder.length],
    feedCount: 0,
    caseSeed: (id * 17) % 97,
    boldness: clamp(0.16 + ((id * 37) % 61) / 100, 0.08, 0.92),
    hasAcceptedFood: false,
    protectedUntil: 0,
    birthX: 0,
    birthY: 0,
    bornAt: 0,
  };
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

  if (actualDeaths === 1) {
    pushEvent(
      state,
      `One city bird died from hunger; ${state.pigeons.length} remain, while wild birds stayed safe.`,
    );
  } else if (actualDeaths > 0) {
    pushEvent(
      state,
      `${actualDeaths} city birds died during the feeding pause; wild birds outside were unaffected.`,
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
        ? parsed.pigeons.slice(0, MAX_PIGEONS).map((pigeon) => ({
            ...pigeon,
            birthX: Number(pigeon.birthX) || 0,
            birthY: Number(pigeon.birthY) || 0,
            bornAt: Number(pigeon.bornAt) || 0,
          }))
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
  const child: PigeonAgent = {
    id: advanced.nextPigeonId,
    plumage: parent.plumage,
    feedCount: 0,
    caseSeed: (parent.caseSeed + advanced.nextPigeonId * 13) % 97,
    boldness: clamp(parent.boldness + inheritedMutation, 0.05, 0.95),
    hasAcceptedFood: false,
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
      value: "1/sec",
      detail: "no total limit",
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
    const wordForms = isBold ? boldWordForms : shyWordForms;
    const word = wordForms[(agent.caseSeed + agent.feedCount) % wordForms.length];
    const individualScale = 0.82 + (agent.caseSeed % 7) * 0.018;
    const isNewborn =
      Number(agent.bornAt) > 0 &&
      now - Number(agent.bornAt) < SPLIT_ANIMATION_MS;

    return {
      agent,
      id: agent.id,
      isBold,
      zone: agent.hasAcceptedFood ? "inside" : "outside",
      x,
      y,
      birthX: Number(agent.birthX) || x,
      birthY: Number(agent.birthY) || y,
      isNewborn,
      speed: 6.4 + (agent.caseSeed % 7) * 0.42,
      scale: individualScale,
      word,
      palette: featherPalettes[agent.plumage],
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
    (pigeon) => random() < pigeon.agent.boldness,
  );

  return {
    ranked,
    recipient: recipientIndex >= 0 ? ranked[recipientIndex] : undefined,
    declinedBefore: recipientIndex >= 0 ? recipientIndex : ranked.length,
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
  const lastThrowAt = useRef(-Infinity);
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
    if (launchedAt - lastThrowAt.current < THROW_COOLDOWN_MS) {
      return;
    }

    lastThrowAt.current = launchedAt;
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
    if (recipient) {
      setClaims((current) => [
        ...current.filter((claim) => claim.pigeonId !== recipient.id),
        {
          throwId,
          pigeonId: recipient.id,
          x: targetX,
          y: targetY,
          phase: "flying",
          flightDuration,
        },
      ]);
    }
    onThrow(targetPigeon.id, accepted ? flightDuration + 100 : 0);

    const claimTimer = window.setTimeout(() => {
      if (recipient) {
        setParticles((current) => current.filter((item) => item.id !== throwId));
        setClaims((current) =>
          current.map((claim) =>
            claim.throwId === throwId ? { ...claim, phase: "landing" } : claim,
          ),
        );
        onFoodClaimed(recipient.id, declinedBefore, targetX, targetY);
      } else {
        onFoodRejected(nearest.id, ranked.length);
      }
    }, flightDuration);
    const cleanupTimer = window.setTimeout(() => {
      setParticles((current) => current.filter((item) => item.id !== throwId));
      setClaims((current) => current.filter((claim) => claim.throwId !== throwId));
    }, accepted ? flightDuration + 860 : duration + 760);
    timers.current.push(claimTimer, cleanupTimer);
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
              }, boldness ${formatPercent(pigeon.agent.boldness)}, fed ${
                pigeon.agent.feedCount
              } times`}
              className={`pigeon-word ${
                pigeon.isBold ? "pigeon-word-bold" : "pigeon-word-shy"
              } pigeon-word-${pigeon.agent.plumage} pigeon-word-${pigeon.zone} ${
                claim ? `pigeon-word-claiming pigeon-word-${claim.phase}` : ""
              } ${pigeon.isNewborn ? "pigeon-word-newborn" : ""}`}
              data-pigeon-id={pigeon.id}
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
