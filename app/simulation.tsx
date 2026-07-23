"use client";

import { useEffect, useMemo, useState } from "react";

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

  pushEvent(next, "A small feeding event favored birds already close to the visitor.");
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

function PigeonField({ state }: { state: EcosystemState }) {
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

  return (
    <section className="ecosystem" aria-label="Animated typographic pigeon population">
      <div className="cityline" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="feeding-zone" aria-hidden="true" />
      <div className="pigeon-layer">
        {pigeons.map((pigeon) => (
          <div
            aria-label={`${pigeon.isBold ? "Bold" : "Shy"} pigeon represented by the word ${pigeon.word}`}
            className={`pigeon-word ${
              pigeon.isBold ? "pigeon-word-bold" : "pigeon-word-shy"
            }`}
            key={pigeon.id}
            role="img"
            style={
              {
                "--x": `${pigeon.x}%`,
                "--y": `${pigeon.y}%`,
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

        <section className="interaction-band">
          <div className="research-note">
            <p>
              Visitors make one small intervention. Repeated feeding changes which traits
              carry into the next flock.
            </p>
          </div>
          <button
            className="feed-button"
            disabled={state.visitorFood <= 0}
            onClick={() => setState((current) => feedState(current))}
            type="button"
          >
            Feed
          </button>
        </section>

        <div className="content-grid">
          <PigeonField state={state} />

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
