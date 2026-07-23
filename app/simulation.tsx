"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v4";
const INITIAL_PIGEONS = 30;
const MAX_PIGEONS = 50;
const MAX_VISITOR_FOOD = 5;
const FOOD_REGEN_SECONDS = 16;
const GENERATION_SECONDS = 12;
const THROW_COOLDOWN_MS = 1000;
const HUNGER_INTERVAL_SECONDS = 1;

type Plumage = "grey" | "white" | "spotted" | "brown";

type PigeonAgent = {
  id: number;
  plumage: Plumage;
  feedCount: number;
  caseSeed: number;
  boldness: number;
  hasAcceptedFood: boolean;
};

type EcosystemState = {
  pigeons: PigeonAgent[];
  nextPigeonId: number;
  dependency: number;
  foraging: number;
  visitorFood: number;
  foodClock: number;
  hungerClock: number;
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
};

const initialEvents = [
  "Thirty unfed birds begin outside the city circle.",
  "Without a feeding action, one bird dies from hunger every second.",
  "A bird that reaches a pellet divides, carrying its plumage into a new individual.",
  "At the 30-bird floor, each hunger death is replaced outside the circle.",
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
    visitorFood: MAX_VISITOR_FOOD,
    foodClock: 0,
    hungerClock: 0,
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

function applyHungerDeaths(state: EcosystemState, elapsedSeconds: number) {
  state.hungerClock += elapsedSeconds;
  const deathCount = Math.min(
    240,
    Math.floor(state.hungerClock / HUNGER_INTERVAL_SECONDS),
  );

  if (deathCount <= 0) {
    return;
  }

  state.hungerClock -= deathCount * HUNGER_INTERVAL_SECONDS;
  let refreshed = 0;
  let actualDeaths = 0;

  for (let index = 0; index < deathCount; index += 1) {
    if (state.pigeons.length === 0) {
      break;
    }

    const minimumFeedCount = Math.min(...state.pigeons.map((pigeon) => pigeon.feedCount));
    const candidates = state.pigeons
      .map((pigeon, pigeonIndex) => ({ pigeon, pigeonIndex }))
      .filter(({ pigeon }) => pigeon.feedCount === minimumFeedCount);
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    state.pigeons.splice(selected.pigeonIndex, 1);
    actualDeaths += 1;

    if (state.pigeons.length < INITIAL_PIGEONS) {
      state.pigeons.push(createOuterPigeon(state.nextPigeonId));
      state.nextPigeonId += 1;
      refreshed += 1;
    }
  }

  if (actualDeaths === 1 && refreshed === 0) {
    pushEvent(
      state,
      `One bird died from hunger; ${state.pigeons.length} remain in the field.`,
    );
  } else if (actualDeaths === 1) {
    pushEvent(
      state,
      "One bird died from hunger and a new unfed bird arrived outside the city circle.",
    );
  } else if (actualDeaths > 0) {
    pushEvent(
      state,
      `${actualDeaths} birds died during the feeding pause; ${refreshed} new birds arrived outside the city circle.`,
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

  if (next.visitorFood < MAX_VISITOR_FOOD) {
    const foodSeconds = next.foodClock + elapsedSeconds;
    const gained = Math.min(
      MAX_VISITOR_FOOD - next.visitorFood,
      Math.floor(foodSeconds / FOOD_REGEN_SECONDS),
    );
    next.visitorFood += gained;
    next.foodClock =
      next.visitorFood >= MAX_VISITOR_FOOD
        ? 0
        : foodSeconds - gained * FOOD_REGEN_SECONDS;
  } else {
    next.foodClock = 0;
  }

  applyHungerDeaths(next, elapsedSeconds);

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
        ? parsed.pigeons.slice(0, MAX_PIGEONS)
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

function reserveFoodState(current: EcosystemState) {
  const advanced = advanceState(current);

  if (advanced.visitorFood <= 0) {
    pushEvent(advanced, "The visitor has no food left; the flock returns to watching and foraging.");
    return advanced;
  }

  const next: EcosystemState = {
    ...advanced,
    visitorFood: advanced.visitorFood - 1,
    hungerClock: 0,
    events: [...advanced.events],
  };

  return next;
}

function feedPigeonState(current: EcosystemState, pigeonId: number) {
  const advanced = advanceState(current);
  const parentIndex = advanced.pigeons.findIndex((pigeon) => pigeon.id === pigeonId);

  if (parentIndex < 0) {
    return advanced;
  }

  const pigeons = advanced.pigeons.map((pigeon) => ({ ...pigeon }));
  pigeons[parentIndex].feedCount += 1;
  pigeons[parentIndex].boldness = clamp(pigeons[parentIndex].boldness + 0.015, 0.05, 0.95);
  pigeons[parentIndex].hasAcceptedFood = true;
  const parent = pigeons[parentIndex];
  const inheritedMutation = (((advanced.nextPigeonId * 29) % 9) - 4) * 0.008;
  const child: PigeonAgent = {
    id: advanced.nextPigeonId,
    plumage: parent.plumage,
    feedCount: 0,
    caseSeed: (parent.caseSeed + advanced.nextPigeonId * 13) % 97,
    boldness: clamp(parent.boldness + inheritedMutation, 0.05, 0.95),
    hasAcceptedFood: false,
  };
  pigeons.push(child);

  let removed: PigeonAgent | undefined;
  if (pigeons.length > MAX_PIGEONS) {
    const minimumFeedCount = Math.min(...pigeons.map((pigeon) => pigeon.feedCount));
    const candidates = pigeons
      .map((pigeon, index) => ({ pigeon, index }))
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

  if (removed) {
    pushEvent(
      next,
      `The fed ${parent.plumage} bird divided. At capacity, a randomly selected bird with ${removed.feedCount} feeds was removed.`,
    );
  } else {
    pushEvent(
      next,
      `The fed ${parent.plumage} bird divided into two; the field now holds ${pigeons.length} birds.`,
    );
  }

  return next;
}

function rejectFoodState(current: EcosystemState, pigeonId: number) {
  const advanced = advanceState(current);
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
    `The nearby ${pigeon.plumage} bird declined human food (boldness ${formatPercent(
      pigeon.boldness,
    )}).`,
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
      label: "Food remaining",
      value: `${state.visitorFood}/${MAX_VISITOR_FOOD}`,
      detail:
        state.visitorFood >= MAX_VISITOR_FOOD
          ? "fully regenerated"
          : `next unit in ${Math.ceil(FOOD_REGEN_SECONDS - state.foodClock)}s`,
      percent: state.visitorFood / MAX_VISITOR_FOOD,
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
  const count = state.pigeons.length;
  const insideCount = state.pigeons.filter((agent) => agent.hasAcceptedFood).length;
  const outsideCount = count - insideCount;
  let insideIndex = 0;
  let outsideIndex = 0;

  return state.pigeons.map((agent) => {
    const groupIndex = agent.hasAcceptedFood ? insideIndex : outsideIndex;
    const groupCount = agent.hasAcceptedFood ? insideCount : outsideCount;
    if (agent.hasAcceptedFood) {
      insideIndex += 1;
    } else {
      outsideIndex += 1;
    }

    const angle = ((groupIndex * 137.508 + agent.caseSeed * 7) * Math.PI) / 180;
    const density = Math.sqrt((groupIndex + 0.5) / Math.max(1, groupCount));
    const radius = agent.hasAcceptedFood ? 0.15 + density * 0.7 : 1.05 + density * 0.4;
    const x = agent.hasAcceptedFood
      ? clamp(50 + Math.cos(angle) * 18 * radius, 34, 66)
      : clamp(50 + Math.cos(angle) * 33 * radius, 5, 95);
    const y = agent.hasAcceptedFood
      ? clamp(50 + Math.sin(angle) * 26 * radius, 28, 72)
      : clamp(50 + Math.sin(angle) * 38 * radius, 8, 88);
    const isBold = agent.boldness >= 0.5;
    const wordForms = isBold ? boldWordForms : shyWordForms;
    const word = wordForms[(agent.caseSeed + agent.feedCount) % wordForms.length];
    const densityScale = count > 42 ? 0.76 : count > 35 ? 0.82 : 0.9;

    return {
      agent,
      id: agent.id,
      isBold,
      zone: agent.hasAcceptedFood ? "inside" : "outside",
      x,
      y,
      speed: isBold
        ? 2.7 + (agent.caseSeed % 5) * 0.24
        : 5.7 + (agent.caseSeed % 6) * 0.32,
      scale: densityScale + (isBold ? state.dependency * 0.2 : state.foraging * 0.08),
      word,
      palette: featherPalettes[agent.plumage],
      tilt: ((agent.caseSeed % 5) - 2) * (isBold ? 0.7 : 1.15),
    };
  });
}

function PigeonField({
  state,
  onThrow,
  onFoodClaimed,
  onFoodRejected,
}: {
  state: EcosystemState;
  onThrow: () => void;
  onFoodClaimed: (pigeonId: number) => void;
  onFoodRejected: (pigeonId: number) => void;
}) {
  const [particles, setParticles] = useState<FoodParticle[]>([]);
  const [claims, setClaims] = useState<FoodClaim[]>([]);
  const [frameTime, setFrameTime] = useState(0);
  const sequence = useRef(0);
  const timers = useRef<number[]>([]);
  const foodBudget = useRef(state.visitorFood);
  const lastThrowAt = useRef(-Infinity);
  const pigeons = useMemo(
    () => pigeonVisuals(state),
    [state],
  );
  const cityPigeonCount = state.pigeons.filter(
    (pigeon) => pigeon.hasAcceptedFood,
  ).length;

  useEffect(() => {
    foodBudget.current = state.visitorFood;
  }, [state.visitorFood]);

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
    if (
      foodBudget.current <= 0 ||
      launchedAt - lastThrowAt.current < THROW_COOLDOWN_MS
    ) {
      return;
    }

    lastThrowAt.current = launchedAt;
    foodBudget.current -= 1;
    const nearest = pigeons.reduce((closest, pigeon) => {
      const distance = Math.hypot(pigeon.x - targetX, pigeon.y - targetY);
      const closestDistance = Math.hypot(closest.x - targetX, closest.y - targetY);
      return distance < closestDistance ? pigeon : closest;
    });
    const startX = clamp(50 + (targetX - 50) * 0.16, 42, 58);
    const startY = 96;
    const distance = Math.hypot(targetX - startX, targetY - startY);
    const duration = clamp(620 + distance * 5.2, 700, 1080);
    const throwId = sequence.current;
    sequence.current += 1;
    const accepted = Math.random() < nearest.agent.boldness;
    const particle: FoodParticle = {
      id: throwId,
      startX,
      startY,
      targetX,
      targetY,
      launchedAt,
      duration,
      arcHeight: clamp(10 + distance * 0.12, 14, 24),
      pigeonId: nearest.id,
    };

    setParticles((current) => [...current, particle]);
    if (accepted) {
      setClaims((current) => [
        ...current.filter((claim) => claim.pigeonId !== nearest.id),
        {
          throwId,
          pigeonId: nearest.id,
          x: targetX,
          y: targetY,
        },
      ]);
    }
    onThrow();

    const claimTimer = window.setTimeout(() => {
      if (accepted) {
        onFoodClaimed(nearest.id);
      } else {
        onFoodRejected(nearest.id);
      }
    }, duration + 440);
    const cleanupTimer = window.setTimeout(() => {
      setParticles((current) => current.filter((item) => item.id !== throwId));
      setClaims((current) => current.filter((claim) => claim.throwId !== throwId));
    }, duration + 760);
    timers.current.push(claimTimer, cleanupTimer);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || foodBudget.current <= 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    throwFood(
      clamp(((event.clientX - bounds.left) / bounds.width) * 100, 4, 96),
      clamp(((event.clientY - bounds.top) / bounds.height) * 100, 8, 90),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if ((event.key === "Enter" || event.key === " ") && foodBudget.current > 0) {
      event.preventDefault();
      throwFood(50, 54);
    }
  };

  return (
    <section
      aria-disabled={state.visitorFood <= 0}
      aria-label="Throw food into the animated typographic pigeon population"
      className={`ecosystem ${state.visitorFood <= 0 ? "ecosystem-empty" : ""}`}
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
                claim ? "pigeon-word-claiming" : ""
              }`}
              key={pigeon.id}
              role="img"
              style={
                {
                  "--x": `${pigeon.x}%`,
                  "--y": `${pigeon.y}%`,
                  "--claim-x": claim ? `${claim.x}%` : `${pigeon.x}%`,
                  "--claim-y": claim ? `${claim.y}%` : `${pigeon.y}%`,
                  "--speed": `${pigeon.speed}s`,
                  "--scale": pigeon.scale.toFixed(2),
                  "--tilt": `${pigeon.tilt}deg`,
                  animationDelay: `${-((pigeon.id % 7) * 0.43)}s`,
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
                {pigeon.agent.feedCount > 0 ? (
                  <sup className="pigeon-feed-count">{pigeon.agent.feedCount}</sup>
                ) : null}
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
      <div
        aria-label={`${state.visitorFood} food pellets ready at the field edge`}
        className="food-reserve"
        role="status"
      >
        {Array.from({ length: MAX_VISITOR_FOOD }, (_, index) => (
          <span
            aria-hidden="true"
            className={`food-reserve-dot ${
              index < state.visitorFood ? "food-reserve-dot-ready" : ""
            }`}
            key={index}
          >
            .
          </span>
        ))}
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
            onFoodClaimed={(pigeonId) =>
              setState((current) => feedPigeonState(current, pigeonId))
            }
            onFoodRejected={(pigeonId) =>
              setState((current) => rejectFoodState(current, pigeonId))
            }
            onThrow={() => setState((current) => reserveFoodState(current))}
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
