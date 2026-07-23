"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v1";
const MAX_VISITOR_FOOD = 5;
const FOOD_REGEN_SECONDS = 16;
const GENERATION_SECONDS = 12;

type EcosystemState = {
  population: number;
  boldness: number;
  dependency: number;
  foraging: number;
  visitorFood: number;
  foodClock: number;
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
  "The flock begins with a mixed pattern: some birds wait at the edge, others test the path.",
  "Human food is present, but not yet reliable enough to dominate the population.",
  "Natural foraging remains the main source of resilience.",
];

const shyWordForms = ["Pigeon", "piGeon", "pigeoN", "pigeon", "pigEon", "pigeOn"];
const boldWordForms = ["PIGeon", "PiGeoN", "pIGeON", "PIGEon", "PIGEON"];
const featherPalettes = [
  ["#303737", "#727a79", "#315f5b", "#76566f", "#8d9492", "#3d4544"],
  ["#4a5050", "#8a9190", "#5c536e", "#28645f", "#6d7473", "#333938"],
  ["#252c2d", "#68706f", "#7b5a75", "#34716a", "#9ba09d", "#505756"],
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeInitialState(now = Date.now()): EcosystemState {
  return {
    population: 86,
    boldness: 0.34,
    dependency: 0.28,
    foraging: 0.76,
    visitorFood: MAX_VISITOR_FOOD,
    foodClock: 0,
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
  const boldDelta = after.boldness - before.boldness;
  const dependencyDelta = after.dependency - before.dependency;
  const foragingDelta = after.foraging - before.foraging;
  const populationDelta = after.population - before.population;

  if (populationDelta < -2) {
    return "Food became less predictable; the most dependent birds lost ground this cycle.";
  }

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

function advanceState(current: EcosystemState, now = Date.now()): EcosystemState {
  const elapsedSeconds = clamp((now - current.lastUpdated) / 1000, 0, 60 * 60 * 8);
  if (elapsedSeconds <= 0) {
    return { ...current, lastUpdated: now };
  }

  const next: EcosystemState = { ...current, events: [...current.events] };

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

  next.generationClock += elapsedSeconds;
  const cycles = Math.min(240, Math.floor(next.generationClock / GENERATION_SECONDS));
  next.generationClock -= cycles * GENERATION_SECONDS;

  if (cycles > 0) {
    const before = { ...next, events: [...next.events] };

    for (let index = 0; index < cycles; index += 1) {
      const humanFood = clamp(next.humanFoodSignal, 0, 1);
      const shortage = clamp(next.dependency - humanFood, 0, 1);
      const boldSurvival = 0.42 + humanFood * 0.38 - shortage * 0.18;
      const shySurvival = 0.51 + next.foraging * 0.16 - humanFood * 0.06;
      const traitShift = (boldSurvival - shySurvival) * 0.034;
      const growth =
        humanFood * 0.024 + next.foraging * 0.008 - shortage * 0.044 - 0.005;

      next.boldness = clamp(next.boldness + traitShift, 0.08, 0.92);
      next.dependency = clamp(
        next.dependency + humanFood * 0.025 + next.boldness * 0.006 - next.foraging * 0.01,
        0.05,
        0.95,
      );
      next.foraging = clamp(
        next.foraging - humanFood * 0.018 - next.dependency * 0.004 + (1 - humanFood) * 0.014,
        0.12,
        0.96,
      );
      next.population = Math.round(clamp(next.population * (1 + growth), 24, 180));
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
    return advanceState({
      ...makeInitialState(),
      ...parsed,
      events: Array.isArray(parsed.events) ? parsed.events.slice(0, 6) : initialEvents,
    });
  } catch {
    return makeInitialState();
  }
}

function feedState(current: EcosystemState) {
  const advanced = advanceState(current);

  if (advanced.visitorFood <= 0) {
    pushEvent(advanced, "The visitor has no food left; the flock returns to watching and foraging.");
    return advanced;
  }

  const next: EcosystemState = {
    ...advanced,
    visitorFood: advanced.visitorFood - 1,
    humanFoodSignal: clamp(advanced.humanFoodSignal + 0.28, 0, 1),
    boldness: clamp(advanced.boldness + 0.009, 0.08, 0.92),
    dependency: clamp(advanced.dependency + 0.007, 0.05, 0.95),
    foraging: clamp(advanced.foraging - 0.004, 0.12, 0.96),
    events: [...advanced.events],
  };

  pushEvent(next, "A pellet landed in the field; the closest bird reached it first.");
  return next;
}

function metricDetails(state: EcosystemState): Metric[] {
  return [
    {
      label: "Population",
      value: state.population.toString(),
      detail: `${Math.round(state.population * state.boldness)} bold / ${Math.round(
        state.population * (1 - state.boldness),
      )} shy`,
    },
    {
      label: "Boldness",
      value: formatPercent(state.boldness),
      detail: "approach tendency",
      percent: state.boldness,
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

function PigeonField({
  state,
  onThrow,
}: {
  state: EcosystemState;
  onThrow: () => void;
}) {
  const [particles, setParticles] = useState<FoodParticle[]>([]);
  const [claims, setClaims] = useState<FoodClaim[]>([]);
  const [frameTime, setFrameTime] = useState(0);
  const sequence = useRef(0);
  const timers = useRef<number[]>([]);
  const foodBudget = useRef(state.visitorFood);
  const pigeons = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => {
        const boldCutoff = Math.round(22 * state.boldness);
        const isBold = index < boldCutoff;
        const lane = index % 11;
        const centerPull = isBold ? 26 : 8;
        const edgeBias = lane < 5 ? -1 : 1;
        const x = isBold
          ? 50 + (lane - 5) * 3.5
          : 50 + edgeBias * (centerPull + (lane % 5) * 8);
        const y = isBold ? 62 + (index % 4) * 6 : 22 + (index % 5) * 7;
        const speed = isBold ? 2.8 + (index % 5) * 0.28 : 6.2 + (index % 6) * 0.35;
        const scale = isBold ? 0.94 + state.dependency * 0.38 : 0.78 + state.foraging * 0.15;
        const wordForms = isBold ? boldWordForms : shyWordForms;
        const word = wordForms[index % wordForms.length];
        const palette = featherPalettes[index % featherPalettes.length];
        const tilt = ((index % 5) - 2) * (isBold ? 0.7 : 1.25);

        return { id: index, isBold, x, y, speed, scale, word, palette, tilt };
      }),
    [state.boldness, state.dependency, state.foraging],
  );

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
    if (foodBudget.current <= 0) {
      return;
    }

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
    const particle: FoodParticle = {
      id: throwId,
      startX,
      startY,
      targetX,
      targetY,
      launchedAt: window.performance.now(),
      duration,
      arcHeight: clamp(10 + distance * 0.12, 14, 24),
      pigeonId: nearest.id,
    };

    setParticles((current) => [...current, particle]);
    setClaims((current) => [
      ...current.filter((claim) => claim.pigeonId !== nearest.id),
      {
        throwId,
        pigeonId: nearest.id,
        x: targetX,
        y: targetY,
      },
    ]);
    onThrow();

    const timer = window.setTimeout(() => {
      setParticles((current) => current.filter((item) => item.id !== throwId));
      setClaims((current) => current.filter((claim) => claim.throwId !== throwId));
    }, duration + 760);
    timers.current.push(timer);
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
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="feeding-zone" aria-hidden="true" />
      <div className="pigeon-layer">
        {pigeons.map((pigeon) => {
          const claim = claims.find((item) => item.pigeonId === pigeon.id);

          return (
            <div
              aria-label={`${pigeon.isBold ? "Bold" : "Shy"} pigeon represented by the word ${pigeon.word}`}
              className={`pigeon-word ${
                pigeon.isBold ? "pigeon-word-bold" : "pigeon-word-shy"
              } ${claim ? "pigeon-word-claiming" : ""}`}
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
            onThrow={() => setState((current) => feedState(current))}
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
