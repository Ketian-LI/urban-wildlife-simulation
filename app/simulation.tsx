"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v5";
const PRESENCE_STORAGE_KEY = "urban-pigeon-presence-id-v1";
const LANGUAGE_STORAGE_KEY = "urban-pigeon-language-v1";
const TUTORIAL_STORAGE_KEY = "urban-pigeon-tutorial-v1";
const PRESENCE_HEARTBEAT_MS = 15_000;
const PRESENCE_RETRY_MS = 5_000;
const MAX_FEED_COOLDOWN_MS = 3_000;
const INITIAL_PIGEONS = 30;
const MAX_PIGEONS = 50;
const TOTAL_COLOR_VARIETIES = 8;
const MIN_COLOR_VARIETIES = 7;
const GENERATION_SECONDS = 12;
const HUNGER_INTERVAL_SECONDS = 1;
const FEEDING_SAFETY_MS = 5000;
const SPLIT_ANIMATION_MS = 1800;
const PIGEON_DEATH_ANIMATION_MS = 1400;
const CITY_FOOD_DETECTION_RADIUS = 24;
const CLOUD_SAVE_INTERVAL_MS = 5_000;

type Plumage =
  | "grey"
  | "white"
  | "spotted"
  | "brown"
  | "blue-grey"
  | "charcoal"
  | "silver"
  | "rust";

type Language = "en" | "zh";
type CloudSyncStatus = "local" | "loading" | "saving" | "saved" | "error";
type AccountInfo = {
  displayName: string;
};

const uiCopy = {
  en: {
    brand: "Urban Pigeon Simulation",
    generation: "Generation",
    nextFeed: "Next feed",
    ready: "ready",
    wildPark: "Wild park",
    cityPlaza: "Marble city plaza",
    ecosystemVariables: "Ecosystem variables",
    recentChanges: "Recent ecosystem changes",
    recentNotes: "Recent field notes",
    hostFavorite: "Host favorite",
    favoriteFeeds: "feeds",
    favoriteProtected: "Protected from natural deaths",
    favoriteEmpty: "No favorite yet",
    signInWithChatGPT: "Sign in with ChatGPT",
    signOut: "Sign out",
    cloudSave: "Cloud save",
    syncLocal: "Saved on this device",
    syncLoading: "Loading cloud save",
    syncSaving: "Saving",
    syncSaved: "Saved",
    syncError: "Cloud sync unavailable",
    language: "Language",
    openTutorial: "Open tutorial",
    restartEyebrow: "Ecosystem restart required",
    restartTitle: "Genetic diversity is too low",
    varietiesRemain: "color varieties remain",
    restartDescription:
      "Fewer than seven feather colors remain. Restart the ecosystem to restore thirty pigeons spanning all eight colors.",
    restartAction: "Restart ecosystem",
    throwFoodAria: "Throw food into the animated illustrated pigeon population",
    tutorialEyebrow: "Field guide",
    tutorialTitle: "How this ecosystem works",
    tutorialSkip: "Skip",
    tutorialBack: "Previous",
    tutorialNext: "Next",
    tutorialFinish: "Enter the park",
    tutorialProgress: "Tutorial step",
  },
  zh: {
    brand: "城市鸽群模拟",
    generation: "世代",
    nextFeed: "下次喂食",
    ready: "可以喂食",
    wildPark: "野生公园",
    cityPlaza: "大理石城市广场",
    ecosystemVariables: "生态系统变量",
    recentChanges: "近期生态变化",
    recentNotes: "近期观察记录",
    hostFavorite: "主机最爱",
    favoriteFeeds: "次投喂",
    favoriteProtected: "不会自然死亡",
    favoriteEmpty: "尚未选出",
    signInWithChatGPT: "使用 ChatGPT 登录",
    signOut: "退出登录",
    cloudSave: "云端存档",
    syncLocal: "保存在此设备",
    syncLoading: "正在读取云端存档",
    syncSaving: "正在保存",
    syncSaved: "已保存",
    syncError: "云端同步暂不可用",
    language: "语言",
    openTutorial: "打开教程",
    restartEyebrow: "需要重新开始生态系统",
    restartTitle: "基因多样性过低",
    varietiesRemain: "种羽色仍然存在",
    restartDescription:
      "场上已经少于七种羽色。重新开始后，将恢复包含全部八种羽色的三十只鸽子。",
    restartAction: "重新开始",
    throwFoodAria: "点击场景，将食物投向动态鸽群",
    tutorialEyebrow: "观察指南",
    tutorialTitle: "这个生态系统如何运行",
    tutorialSkip: "跳过",
    tutorialBack: "上一步",
    tutorialNext: "下一步",
    tutorialFinish: "进入公园",
    tutorialProgress: "教程步骤",
  },
} as const;

const tutorialSteps = {
  en: [
    {
      title: "Throw a pellet",
      body: "Click anywhere in the scene. A dot is launched from the lower edge, and pigeons try it in nearest-first order.",
    },
    {
      title: "Watch bodies change",
      body: "Wild pigeons are slim. A pigeon that accepts food enters the city plaza, becomes fuller, and divides into a matching city pigeon.",
    },
    {
      title: "Protect color diversity",
      body: "The flock begins with eight feather colors. If fewer than seven remain, the simulation pauses and asks you to restart the ecosystem.",
    },
  ],
  zh: [
    {
      title: "投出一粒食物",
      body: "点击场景中的任意位置，食物点会从画面底边抛入。鸽子按照与食物的距离，由近到远依次尝试。",
    },
    {
      title: "观察体型变化",
      body: "野生鸽子较瘦。接受喂食后，它会进入城市广场、变得更饱满，并在原地分裂出一只相同的城市鸽子。",
    },
    {
      title: "保护颜色多样性",
      body: "鸽群最初拥有八种羽色。当场上少于七种羽色时，模拟会暂停并提示重新开始生态系统。",
    },
  ],
} as const;

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
  restartColorVarietyCount: number | null;
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

type PigeonDeathEffect = {
  id: number;
  pigeonId: number;
  plumage: Plumage;
  spriteIndex: number;
  zone: "inside" | "outside";
  word: string;
  palette: string[];
  x: number;
  y: number;
  scale: number;
  tilt: number;
};

const initialEvents = [
  "Thirty unfed birds begin in the wild park outside the marble city plaza.",
  "A feeding action protects the entire flock from hunger.",
  "After feeding stops, only city birds gradually die; wild birds remain safe outside.",
  "A bird that reaches a pellet divides into a matching pigeon at the same spot.",
  "The initial flock spans eight feather colors and varied letter casing at a shared wild body size.",
  "If fewer than seven color varieties remain, the ecosystem restarts with all eight colors.",
];

const pigeonLetters = "pigeon";
const plumageOrder: Plumage[] = [
  "grey",
  "white",
  "spotted",
  "brown",
  "blue-grey",
  "charcoal",
  "silver",
  "rust",
];
const featherPalettes: Record<Plumage, string[]> = {
  grey: ["#303737", "#727a79", "#315f5b", "#76566f", "#8d9492", "#3d4544"],
  white: ["#f8f7f0", "#dedfd9", "#f3f2ec", "#c9cfca", "#ffffff", "#d9dbd5"],
  spotted: ["#363c3c", "#f1f0e9", "#777d7a", "#292f30", "#e4e3dc", "#666c69"],
  brown: ["#563e34", "#8b6650", "#a57a5d", "#67483a", "#b18b6f", "#755445"],
  "blue-grey": ["#334650", "#5f7780", "#2f5d62", "#6f5a78", "#8ea2a8", "#43545c"],
  charcoal: ["#161b1d", "#343c3f", "#26343a", "#4a5960", "#23272a", "#5c6466"],
  silver: ["#c5ccca", "#9ea9aa", "#dce0dc", "#7e8c90", "#b6c0c2", "#eef0eb"],
  rust: ["#6e362c", "#a14f38", "#c16d4d", "#7f4a3b", "#d18a64", "#59352f"],
};

const plumageNames: Record<Language, Record<Plumage, string>> = {
  en: {
    grey: "grey",
    white: "white",
    spotted: "spotted",
    brown: "brown",
    "blue-grey": "blue-grey",
    charcoal: "charcoal",
    silver: "silver",
    rust: "rust",
  },
  zh: {
    grey: "灰色",
    white: "白色",
    spotted: "斑点",
    brown: "棕色",
    "blue-grey": "蓝灰色",
    charcoal: "炭黑色",
    silver: "银色",
    rust: "锈红色",
  },
};

const exactEventTranslations = new Map<string, string>([
  [
    "Thirty unfed birds begin in the wild park outside the marble city plaza.",
    "三十只尚未接受人类喂食的鸽子从城市圈外的野生公园开始。",
  ],
  [
    "A feeding action protects the entire flock from hunger.",
    "每次喂食动作都会让整群鸽子暂时免于饥饿。",
  ],
  [
    "After feeding stops, only city birds gradually die; wild birds remain safe outside.",
    "停止喂食后，只有城市鸽子会逐渐死亡；圈外的野生鸽子保持安全。",
  ],
  [
    "A bird that reaches a pellet divides into a matching pigeon at the same spot.",
    "吃到食物的鸽子会在原地分裂出一只相同的鸽子。",
  ],
  [
    "The initial flock spans eight feather colors and varied letter casing at a shared wild body size.",
    "初始鸽群包含八种羽色和不同的字母大小写，野生体型保持一致。",
  ],
  [
    "If fewer than seven color varieties remain, the ecosystem restarts with all eight colors.",
    "颜色种类少于七种时，生态系统会要求重启并恢复全部八种颜色。",
  ],
  [
    "Birds that approached people first were more likely to survive and reproduce.",
    "更早接近人类的鸽子更有可能存活并繁殖。",
  ],
  [
    "With fewer feeding cues, edge-foraging behavior recovered slightly.",
    "人类喂食信号减少后，边缘觅食能力略有恢复。",
  ],
  [
    "The flock's behavior shifted toward waiting near human paths.",
    "鸽群的行为逐渐转向在人类活动路径附近等待。",
  ],
  [
    "The flock adjusted quietly; small behavioral differences carried forward.",
    "鸽群安静地完成了一次调整，细微的行为差异被延续下来。",
  ],
]);

function translatedPlumage(plumage: string, language: Language) {
  if (language === "en") {
    return plumage;
  }

  return plumageOrder.includes(plumage as Plumage)
    ? plumageNames.zh[plumage as Plumage]
    : plumage;
}

function translatedRefreshSuffix(suffix: string) {
  const match = suffix.match(
    /^\s*(\d+) new wild (?:bird arrived|birds arrived) outside with a style inherited from the current flock\.$/,
  );
  return match
    ? ` 圈外补充了 ${match[1]} 只新野生鸽子，其样式继承自当前鸽群。`
    : "";
}

function translateEvent(event: string, language: Language) {
  if (language === "en") {
    return event;
  }

  const exact = exactEventTranslations.get(event);
  if (exact) {
    return exact;
  }

  let match = event.match(
    /^Genetic diversity is too low: only (\d+) color varieties remain\.$/,
  );
  if (match) {
    return `基因多样性过低：场上只剩 ${match[1]} 种羽色。`;
  }

  match = event.match(
    /^The ecosystem restarted after color diversity fell to (\d+) of (\d+) varieties\.$/,
  );
  if (match) {
    return `羽色多样性降至 ${match[1]}/${match[2]} 后，生态系统已重新开始。`;
  }

  match = event.match(
    /^One city bird died from hunger; (\d+) remain, while wild birds stayed safe\.(.*)$/,
  );
  if (match) {
    return `一只城市鸽子因饥饿死亡；场上还剩 ${match[1]} 只，野生鸽子未受影响。${translatedRefreshSuffix(
      match[2],
    )}`;
  }

  match = event.match(
    /^(\d+) city birds died during the feeding pause; wild birds outside were unaffected\.(.*)$/,
  );
  if (match) {
    return `停止喂食期间有 ${match[1]} 只城市鸽子死亡；圈外野生鸽子未受影响。${translatedRefreshSuffix(
      match[2],
    )}`;
  }

  const feedingTail = (tail: string) => {
    let tailMatch = tail.match(
      /^and divided into two; the field now holds (\d+) birds\.$/,
    );
    if (tailMatch) {
      return `并分裂成两只；场上现在共有 ${tailMatch[1]} 只鸽子。`;
    }

    tailMatch = tail.match(
      /^and divided\. At capacity, a randomly selected bird with (\d+) feeds was removed\.$/,
    );
    if (tailMatch) {
      return `并完成分裂。数量达到上限后，一只进食 ${tailMatch[1]} 次的候选鸽子被随机移除。`;
    }

    return tail;
  };

  match = event.match(/^The nearest ([a-z-]+) bird ate the pellet (.*)$/);
  if (match) {
    return `距离最近的${translatedPlumage(match[1], "zh")}鸽子吃到了食物，${feedingTail(
      match[2],
    )}`;
  }

  match = event.match(
    /^After (\d+) nearer (?:bird|birds) declined, the ([a-z-]+) bird ate the pellet (.*)$/,
  );
  if (match) {
    return `前面 ${match[1]} 只更近的鸽子拒绝后，${translatedPlumage(
      match[2],
      "zh",
    )}鸽子吃到了食物，${feedingTail(match[3])}`;
  }

  match = event.match(
    /^All (\d+) pigeons declined the pellet in nearest-first order; the closest was a ([a-z-]+) bird with (\d+)% boldness\.$/,
  );
  if (match) {
    return `按照由近到远的顺序，${match[1]} 只鸽子都拒绝了食物；最近的是一只大胆程度为 ${match[3]}% 的${translatedPlumage(
      match[2],
      "zh",
    )}鸽子。`;
  }

  match = event.match(
    /^A ([a-z-]+) pigeon died after direct human action in the (city plaza|wild park); (\d+) birds remain\.$/,
  );
  if (match) {
    const habitat = match[2] === "city plaza" ? "城市广场" : "野生公园";
    return `一只${translatedPlumage(
      match[1],
      "zh",
    )}鸽子因人类直接操作在${habitat}死亡；场上还剩 ${match[3]} 只。`;
  }

  return event;
}

const parkTrees = [
  { x: 3, y: 35, size: 0.9, tone: 0 },
  { x: 8, y: 31, size: 1.12, tone: 1 },
  { x: 14, y: 34, size: 0.78, tone: 2 },
  { x: 21, y: 30, size: 0.92, tone: 0 },
  { x: 28, y: 33, size: 0.72, tone: 1 },
  { x: 72, y: 32, size: 0.76, tone: 2 },
  { x: 79, y: 30, size: 0.96, tone: 0 },
  { x: 86, y: 34, size: 0.8, tone: 1 },
  { x: 92, y: 31, size: 1.08, tone: 2 },
  { x: 97, y: 37, size: 0.86, tone: 0 },
  { x: 3, y: 52, size: 1.04, tone: 2 },
  { x: 7, y: 67, size: 0.8, tone: 0 },
  { x: 4, y: 84, size: 1.15, tone: 1 },
  { x: 11, y: 91, size: 0.74, tone: 2 },
  { x: 19, y: 94, size: 0.92, tone: 0 },
  { x: 29, y: 92, size: 0.7, tone: 1 },
  { x: 71, y: 93, size: 0.72, tone: 2 },
  { x: 81, y: 92, size: 0.96, tone: 0 },
  { x: 90, y: 91, size: 0.76, tone: 1 },
  { x: 97, y: 84, size: 1.12, tone: 2 },
  { x: 94, y: 66, size: 0.82, tone: 0 },
  { x: 97, y: 50, size: 1.02, tone: 1 },
] as const;

const parkShrubs = [
  { x: 13, y: 39, size: 0.9 },
  { x: 25, y: 36, size: 0.72 },
  { x: 76, y: 37, size: 0.82 },
  { x: 88, y: 40, size: 0.68 },
  { x: 9, y: 75, size: 0.76 },
  { x: 16, y: 86, size: 0.92 },
  { x: 28, y: 88, size: 0.66 },
  { x: 73, y: 88, size: 0.72 },
  { x: 85, y: 86, size: 0.88 },
  { x: 91, y: 76, size: 0.7 },
] as const;

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
  pigeon: Pick<PigeonAgent, "plumage" | "caseMask" | "colorSeed">,
) {
  return [
    pigeon.plumage,
    normalizeCaseMask(pigeon.caseMask),
    Math.abs(Math.trunc(pigeon.colorSeed)),
  ].join(":");
}

function pigeonColorVarietyCount(pigeons: PigeonAgent[]) {
  return new Set(pigeons.map((pigeon) => pigeon.plumage)).size;
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

function hostFavoritePigeon(pigeons: PigeonAgent[]) {
  return pigeons.reduce<PigeonAgent | undefined>((favorite, pigeon) => {
    if (pigeon.feedCount <= 0) {
      return favorite;
    }

    if (
      !favorite ||
      pigeon.feedCount > favorite.feedCount ||
      (pigeon.feedCount === favorite.feedCount && pigeon.id < favorite.id)
    ) {
      return pigeon;
    }

    return favorite;
  }, undefined);
}

function initialPigeonStyle(id: number) {
  return {
    plumage: plumageOrder[(id * 5) % plumageOrder.length],
    caseMask: (id * 37) % (1 << pigeonLetters.length),
    colorSeed: (id * 53 + 11) % 997,
    sizeScale: 1,
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
    sizeScale: 1,
    boldness,
    hasAcceptedFood: false,
    protectedUntil: 0,
    birthX: 0,
    birthY: 0,
    bornAt: 0,
  };
}

function inheritedPigeonStyle(template: PigeonAgent) {
  return {
    plumage: template.plumage,
    caseMask: normalizeCaseMask(template.caseMask),
    colorSeed: Math.abs(Math.trunc(template.colorSeed)),
    sizeScale: 1,
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
  const style = inheritedPigeonStyle(template);
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
    restartColorVarietyCount: null,
  };
}

function markRestartRequiredIfColorVarietyTooLow(state: EcosystemState) {
  const colorVarietyCount = pigeonColorVarietyCount(state.pigeons);
  if (colorVarietyCount >= MIN_COLOR_VARIETIES) {
    return state.restartColorVarietyCount === null
      ? state
      : { ...state, restartColorVarietyCount: null };
  }

  if (state.restartColorVarietyCount === colorVarietyCount) {
    return state;
  }

  return {
    ...state,
    restartColorVarietyCount: colorVarietyCount,
    events: [
      `Genetic diversity is too low: only ${colorVarietyCount} color varieties remain.`,
      ...state.events,
    ].slice(0, 6),
  };
}

function restartEcosystemState(
  current: EcosystemState,
  now = Date.now(),
) {
  const colorVarietyCount =
    current.restartColorVarietyCount ??
    pigeonColorVarietyCount(current.pigeons);
  const restarted = makeInitialState(now);
  restarted.events = [
    `The ecosystem restarted after color diversity fell to ${colorVarietyCount} of ${TOTAL_COLOR_VARIETIES} varieties.`,
    ...initialEvents,
  ].slice(0, 6);
  return restarted;
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
    const favoriteId = hostFavoritePigeon(state.pigeons)?.id;
    const indexedPigeons = state.pigeons.map((pigeon, pigeonIndex) => ({
      pigeon,
      pigeonIndex,
    }));
    const eligible = indexedPigeons.filter(
      ({ pigeon }) =>
        pigeon.hasAcceptedFood &&
        pigeon.id !== favoriteId &&
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
        } outside with a style inherited from the current flock.`
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
  const diversityChecked = markRestartRequiredIfColorVarietyTooLow(current);
  if (diversityChecked.restartColorVarietyCount !== null) {
    return { ...diversityChecked, lastUpdated: now };
  }

  const elapsedSeconds = clamp(
    (now - diversityChecked.lastUpdated) / 1000,
    0,
    60 * 60 * 8,
  );
  if (elapsedSeconds <= 0) {
    return { ...diversityChecked, lastUpdated: now };
  }

  const next: EcosystemState = {
    ...diversityChecked,
    pigeons: diversityChecked.pigeons.map((pigeon) => ({ ...pigeon })),
    events: [...diversityChecked.events],
  };

  const feedingProtectedUntil = Number(next.feedingProtectedUntil) || 0;
  if (now <= feedingProtectedUntil) {
    next.hungerClock = 0;
  } else {
    const hungerStart = Math.max(
      diversityChecked.lastUpdated,
      feedingProtectedUntil,
    );
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
  return markRestartRequiredIfColorVarietyTooLow(next);
}

function restoreState(savedState: unknown) {
  try {
    if (!savedState || typeof savedState !== "object") {
      return makeInitialState();
    }

    const parsed = savedState as Partial<EcosystemState>;
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
              sizeScale: 1,
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
      restartColorVarietyCount:
        parsed.restartColorVarietyCount !== null &&
        typeof parsed.restartColorVarietyCount !== "undefined" &&
        Number.isFinite(Number(parsed.restartColorVarietyCount))
          ? Math.max(0, Math.trunc(Number(parsed.restartColorVarietyCount)))
          : null,
    });
  } catch {
    return makeInitialState();
  }
}

function loadState() {
  if (typeof window === "undefined") {
    return makeInitialState();
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? restoreState(JSON.parse(saved)) : makeInitialState();
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
  const childStyle = inheritedPigeonStyle(parent);
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
    const favoriteId = hostFavoritePigeon(pigeons)?.id;
    const removablePigeons = pigeons
      .map((pigeon, index) => ({ pigeon, index }))
      .filter(({ pigeon }) => pigeon.id !== favoriteId);
    const unprotectedPigeons = removablePigeons.filter(
      ({ pigeon }) => (Number(pigeon.protectedUntil) || 0) <= Date.now(),
    );
    const indexedPigeons =
      unprotectedPigeons.length > 0 ? unprotectedPigeons : removablePigeons;
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

  return markRestartRequiredIfColorVarietyTooLow(next);
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

function killPigeonState(current: EcosystemState, pigeonId: number) {
  const pigeon = current.pigeons.find((candidate) => candidate.id === pigeonId);
  if (!pigeon) {
    return current;
  }

  const next: EcosystemState = {
    ...current,
    pigeons: current.pigeons.filter((candidate) => candidate.id !== pigeonId),
    events: [...current.events],
  };
  const habitat = pigeon.hasAcceptedFood ? "city plaza" : "wild park";
  pushEvent(
    next,
    `A ${pigeon.plumage} pigeon died after direct human action in the ${habitat}; ${next.pigeons.length} birds remain.`,
  );
  return markRestartRequiredIfColorVarietyTooLow(next);
}

function feedCooldownMsForOnlineCount(onlineCount: number) {
  const visitorCount = Math.max(1, Math.trunc(onlineCount));

  if (visitorCount === 1) {
    return 0;
  }

  if (visitorCount === 2) {
    return 500;
  }

  return Math.min(MAX_FEED_COOLDOWN_MS, visitorCount * 200);
}

function formatFeedCooldown(cooldownMs: number, language: Language) {
  const seconds = cooldownMs / 1000;
  const value = seconds.toFixed(Number.isInteger(seconds) ? 0 : 1);
  return language === "zh" ? `${value} 秒` : `${value}s`;
}

function useOnlinePresence() {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let heartbeatTimer = 0;
    let sessionId = "";

    try {
      sessionId = window.localStorage.getItem(PRESENCE_STORAGE_KEY) ?? "";
      if (!/^[a-zA-Z0-9_-]{16,128}$/.test(sessionId)) {
        sessionId = window.crypto.randomUUID();
        window.localStorage.setItem(PRESENCE_STORAGE_KEY, sessionId);
      }
    } catch {
      sessionId = window.crypto.randomUUID();
    }

    const scheduleHeartbeat = (delay: number) => {
      window.clearTimeout(heartbeatTimer);
      heartbeatTimer = window.setTimeout(() => {
        void heartbeat();
      }, delay);
    };

    async function heartbeat() {
      if (stopped || inFlight) {
        return;
      }

      window.clearTimeout(heartbeatTimer);
      inFlight = true;
      let nextDelay = PRESENCE_HEARTBEAT_MS;

      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Presence heartbeat failed.");
        }

        const payload = (await response.json()) as { onlineCount?: unknown };
        const nextOnlineCount = Number(payload.onlineCount);
        if (!stopped && Number.isFinite(nextOnlineCount)) {
          setOnlineCount(Math.max(1, Math.trunc(nextOnlineCount)));
        }
      } catch {
        nextDelay = PRESENCE_RETRY_MS;
      } finally {
        inFlight = false;
        if (!stopped) {
          scheduleHeartbeat(nextDelay);
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void heartbeat();
      }
    };

    void heartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearTimeout(heartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return onlineCount;
}

function metricDetails(
  state: EcosystemState,
  onlineCount: number,
  feedCooldownMs: number,
  language: Language,
): Metric[] {
  const meanBoldness = averageBoldness(state.pigeons);
  const insideCount = state.pigeons.filter((pigeon) => pigeon.hasAcceptedFood).length;
  const colorVarietyCount = pigeonColorVarietyCount(state.pigeons);

  return [
    {
      label: language === "zh" ? "数量" : "Population",
      value: `${state.pigeons.length}/${MAX_PIGEONS}`,
      detail:
        language === "zh"
          ? `城市 ${insideCount} / 野外 ${
              state.pigeons.length - insideCount
            } / 羽色 ${colorVarietyCount}/${TOTAL_COLOR_VARIETIES}`
          : `${insideCount} city / ${
              state.pigeons.length - insideCount
            } wild / ${colorVarietyCount}/${TOTAL_COLOR_VARIETIES} colors`,
      percent: state.pigeons.length / MAX_PIGEONS,
    },
    {
      label: language === "zh" ? "大胆程度" : "Boldness",
      value: formatPercent(meanBoldness),
      detail: language === "zh" ? "个体平均接受概率" : "individual mean acceptance",
      percent: meanBoldness,
    },
    {
      label: language === "zh" ? "依赖程度" : "Dependency",
      value: formatPercent(state.dependency),
      detail: language === "zh" ? "对人类的依赖" : "reliance on people",
      percent: state.dependency,
    },
    {
      label: language === "zh" ? "觅食能力" : "Foraging",
      value: formatPercent(state.foraging),
      detail: language === "zh" ? "寻找非人类食物的能力" : "non-human food ability",
      percent: state.foraging,
    },
    {
      label: language === "zh" ? "人类食物" : "Human food",
      value: formatPercent(state.humanFoodSignal),
      detail: language === "zh" ? "近期喂食压力" : "recent feeding pressure",
      percent: state.humanFoodSignal,
    },
    {
      label: language === "zh" ? "当前在线" : "Online now",
      value: `${onlineCount}`,
      detail:
        feedCooldownMs === 0
          ? language === "zh"
            ? "喂食不受限制"
            : "feeding unrestricted"
          : language === "zh"
            ? `每位访客每 ${formatFeedCooldown(feedCooldownMs, language)} 可喂食一次`
            : `feeding every ${formatFeedCooldown(
                feedCooldownMs,
                language,
              )} per visitor`,
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
      ? 0.22 + radialSeed * 0.72
      : 1.02 + radialSeed * 0.2;
    const x = agent.hasAcceptedFood
      ? clamp(50 + Math.cos(angle) * 28 * radius, 22, 78)
      : clamp(50 + Math.cos(angle) * 45 * radius, 4, 96);
    const y = agent.hasAcceptedFood
      ? clamp(65 + Math.sin(angle) * 22 * radius, 43, 86)
      : clamp(64 + Math.sin(angle) * 31 * radius, 30, 95);
    const isBold = agent.boldness >= 0.5;
    const feedingAcceptance = agent.hasAcceptedFood ? 1 : agent.boldness;
    const word = wordFromCaseMask(agent.caseMask);
    const uniformScale = 1;
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
      scale: uniformScale,
      spriteIndex: plumageOrder.indexOf(agent.plumage),
      word,
      palette: pigeonLetterPalette(agent),
      styleSignature: pigeonStyleSignature(agent),
      tilt: ((agent.caseSeed % 5) - 2) * 0.9,
    };
  });
}

type PigeonVisual = ReturnType<typeof pigeonVisuals>[number];

function pigeonAriaLabel(
  pigeon: PigeonVisual,
  language: Language,
  isHostFavorite = false,
) {
  const boldness = formatPercent(pigeon.agent.boldness);
  const acceptance = formatPercent(pigeon.feedingAcceptance);
  const plumage = translatedPlumage(pigeon.agent.plumage, language);
  const favoriteDescription = isHostFavorite
    ? language === "zh"
      ? "，主机最常投喂的鸽子，不会自然死亡"
      : ", host favorite, protected from natural deaths"
    : "";

  if (language === "zh") {
    return `${plumage}鸽子，文字基因为 ${pigeon.word}，大胆程度 ${boldness}，接受喂食概率 ${acceptance}，${
      pigeon.zone === "inside" ? "饱满的城市体型" : "较瘦的野外体型"
    }，样式 ${pigeon.styleSignature}，已进食 ${pigeon.agent.feedCount} 次${favoriteDescription}`;
  }

  return `${plumage} pigeon represented by ${
    pigeon.word
  }, boldness ${boldness}, feeding acceptance ${acceptance}, ${
    pigeon.zone === "inside" ? "fed city body" : "slim wild body"
  }, style ${pigeon.styleSignature}, fed ${pigeon.agent.feedCount} times${favoriteDescription}`;
}

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
  metrics,
  generations,
  feedCooldownMs,
  language,
  onThrow,
  onFoodClaimed,
  onFoodRejected,
  onPigeonKilled,
}: {
  state: EcosystemState;
  metrics: Metric[];
  generations: number;
  feedCooldownMs: number;
  language: Language;
  onThrow: (pigeonId: number, protectionDuration: number) => void;
  onFoodClaimed: (
    pigeonId: number,
    declinedBefore: number,
    birthX: number,
    birthY: number,
  ) => void;
  onFoodRejected: (pigeonId: number, attemptedCount: number) => void;
  onPigeonKilled: (pigeonId: number) => void;
}) {
  const copy = uiCopy[language];
  const [particles, setParticles] = useState<FoodParticle[]>([]);
  const [claims, setClaims] = useState<FoodClaim[]>([]);
  const [deathEffects, setDeathEffects] = useState<PigeonDeathEffect[]>([]);
  const [frameTime, setFrameTime] = useState(0);
  const [lastThrowAt, setLastThrowAt] = useState(0);
  const sequence = useRef(0);
  const deathSequence = useRef(0);
  const timers = useRef<number[]>([]);
  const pigeons = useMemo(
    () => pigeonVisuals(state),
    [state],
  );
  const favoriteAgent = hostFavoritePigeon(state.pigeons);
  const favoritePigeon = favoriteAgent
    ? pigeons.find((pigeon) => pigeon.id === favoriteAgent.id)
    : undefined;
  const cityPigeonCount = state.pigeons.filter(
    (pigeon) => pigeon.hasAcceptedFood,
  ).length;
  const wildPigeonCount = state.pigeons.length - cityPigeonCount;
  const populationMetric = metrics[0];
  const habitatMetrics = metrics.slice(1, 5);
  const onlineMetric = metrics[5];
  const cooldownUntil =
    feedCooldownMs > 0 && lastThrowAt > 0
      ? lastThrowAt + feedCooldownMs
      : 0;
  const cooldownRemainingMs = Math.max(0, cooldownUntil - frameTime);

  useEffect(() => {
    if (
      particles.length === 0 &&
      cooldownUntil <= window.performance.now()
    ) {
      return;
    }

    let animationFrame = 0;
    const tick = (now: number) => {
      setFrameTime(now);
      if (particles.length > 0 || now < cooldownUntil) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [cooldownUntil, particles.length]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const throwFood = (targetX: number, targetY: number) => {
    const launchedAt = window.performance.now();
    const nextAllowedAt = lastThrowAt + feedCooldownMs;
    setFrameTime(launchedAt);

    if (feedCooldownMs > 0 && lastThrowAt > 0 && launchedAt < nextAllowedAt) {
      return;
    }

    setLastThrowAt(launchedAt);
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

  const handlePigeonContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    pigeon: PigeonVisual,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      deathEffects.some(
        (effect) => effect.pigeonId === pigeon.id,
      )
    ) {
      return;
    }

    const effectId = deathSequence.current;
    deathSequence.current += 1;
    setDeathEffects((current) => [
      ...current,
      {
        id: effectId,
        pigeonId: pigeon.id,
        plumage: pigeon.agent.plumage,
        spriteIndex: pigeon.spriteIndex,
        zone: pigeon.zone,
        word: pigeon.word,
        palette: pigeon.palette,
        x: pigeon.x,
        y: pigeon.y,
        scale: pigeon.scale,
        tilt: pigeon.tilt,
      },
    ]);
    setClaims((current) =>
      current.filter((claim) => claim.pigeonId !== pigeon.id),
    );
    onPigeonKilled(pigeon.id);

    const cleanupTimer = window.setTimeout(() => {
      setDeathEffects((current) =>
        current.filter((effect) => effect.id !== effectId),
      );
    }, PIGEON_DEATH_ANIMATION_MS);
    timers.current.push(cleanupTimer);
  };

  return (
    <section
      aria-label={copy.throwFoodAria}
      className="ecosystem"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      role="button"
      tabIndex={0}
    >
      <header className="scene-header">
        <h1>{copy.brand}</h1>
        <div className="scene-generation">
          <span>{copy.generation}</span>
          <strong>{String(generations).padStart(2, "0")}</strong>
        </div>
      </header>
      {feedCooldownMs > 0 ? (
        <div
          aria-live="polite"
          className={`feed-cooldown-status ${
            cooldownRemainingMs > 0 ? "is-cooling" : ""
          }`}
          role="status"
        >
          <span>{copy.nextFeed}</span>
          <strong>
            {cooldownRemainingMs > 0
              ? `${(Math.ceil(cooldownRemainingMs / 100) / 10).toFixed(1)}s`
              : copy.ready}
          </strong>
        </div>
      ) : null}
      <div className="sky-language" aria-hidden="true">
        <span>AIR AIR AIR</span>
        <span>WEATHER WEATHER</span>
        <span>SKY ABOVE CITY</span>
      </div>
      <div className="cityline" aria-hidden="true">
        <div className="city-building city-building-waterfront">
          <span>PORT FERRY</span>
          <span>MARKET STREET</span>
          <span>DOCK DOCK DOCK</span>
        </div>
        <div className="city-building city-building-one-world">
          <span>I</span>
          <span>ONE</span>
          <span>WORLD</span>
          <span>TRADE</span>
          <span>CENTER</span>
          <span>WINDOW WINDOW</span>
          <span>CITY CITY CITY</span>
          <span>STREET STREET</span>
        </div>
        <div className="city-building city-building-west-office">
          <span>WORK WORK</span>
          <span>OFFICE OFFICE</span>
          <span>WINDOW WINDOW</span>
          <span>AVENUE AVENUE</span>
        </div>
        <div className="city-building city-building-glass-tower">
          <span>LIGHT</span>
          <span>GLASS GLASS</span>
          <span>PEOPLE PEOPLE</span>
          <span>WORK HOME</span>
          <span>WINDOW WINDOW</span>
          <span>URBAN URBAN</span>
        </div>
        <div className="city-building city-building-stepped-tower">
          <span>ROOF</span>
          <span>CITY CITY</span>
          <span>TOWER TOWER</span>
          <span>WINDOW WINDOW</span>
          <span>STREET STREET</span>
          <span>NEIGHBOR NEIGHBOR</span>
          <span>HOME WORK HOME</span>
        </div>
        <div className="city-building city-building-mid-block">
          <span>BLOCK BLOCK</span>
          <span>TRADE TRADE</span>
          <span>HOME OFFICE</span>
          <span>CITY CITY CITY</span>
        </div>
        <div className="city-building city-building-civic">
          <span>PUBLIC PUBLIC</span>
          <span>LIBRARY COURT</span>
          <span>PEOPLE PEOPLE</span>
          <span>STREET STREET</span>
        </div>
        <div className="city-building city-building-green-roof">
          <span>^</span>
          <span>PARK PARK</span>
          <span>ROOF ROOF</span>
          <span>WINDOW WINDOW</span>
          <span>URBAN URBAN</span>
          <span>TRANSIT TRANSIT</span>
        </div>
        <div className="city-building city-building-art-deco">
          <span>I</span>
          <span>TIME</span>
          <span>CITY</span>
          <span>CLOCK</span>
          <span>LIGHT LIGHT</span>
          <span>STREET STREET</span>
        </div>
        <div className="city-building city-building-east-office">
          <span>OFFICE OFFICE</span>
          <span>WINDOW WINDOW</span>
          <span>WORK WORK WORK</span>
          <span>AVENUE AVENUE</span>
          <span>CITY CITY CITY</span>
        </div>
        <div className="city-building city-building-ribbed">
          <span>||||||||</span>
          <span>HOUSING</span>
          <span>HOME HOME</span>
          <span>NEIGHBOR</span>
          <span>RAIL BUS WALK</span>
        </div>
        <div className="city-building city-building-waterfront city-building-waterfront-east">
          <span>PIER PIER</span>
          <span>FERRY FERRY</span>
          <span>RIVER CITY</span>
        </div>
      </div>
      <div className="wild-park" aria-hidden="true">
        <div className="wild-path wild-path-west" />
        <div className="wild-path wild-path-east" />
        {parkTrees.map((tree, index) => (
          <i
            className={`park-tree park-tree-tone-${tree.tone}`}
            key={`tree-${index}`}
            style={
              {
                "--tree-x": `${tree.x}%`,
                "--tree-y": `${tree.y}%`,
                "--tree-scale": tree.size,
              } as React.CSSProperties
            }
          />
        ))}
        {parkShrubs.map((shrub, index) => (
          <i
            className="park-shrub"
            key={`shrub-${index}`}
            style={
              {
                "--shrub-x": `${shrub.x}%`,
                "--shrub-y": `${shrub.y}%`,
                "--shrub-scale": shrub.size,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="plaza-monument" aria-hidden="true" />
      <div
        aria-label={
          language === "zh"
            ? `大理石城市广场内有 ${cityPigeonCount} 只鸽子`
            : `${cityPigeonCount} pigeons inside the marble city plaza`
        }
        className="city-circle"
        role="status"
      >
        <span className="sr-only">{copy.cityPlaza}</span>
      </div>
      <div className="habitat-label habitat-label-wild">
        <span>{copy.wildPark}</span>
        <strong>{wildPigeonCount}</strong>
      </div>
      <div className="habitat-label habitat-label-city">
        <span>{copy.cityPlaza}</span>
        <strong>{cityPigeonCount}</strong>
      </div>
      <div className="online-marker" role="status">
        <span>{onlineMetric.label}</span>
        <strong>{onlineMetric.value}</strong>
        <small>{onlineMetric.detail}</small>
      </div>
      <div className="plaza-population" role="status">
        <span>{populationMetric.label}</span>
        <strong>{populationMetric.value}</strong>
        <small>{populationMetric.detail}</small>
      </div>
      <div
        aria-label={
          favoritePigeon
            ? `${copy.hostFavorite}: ${translatedPlumage(
                favoritePigeon.agent.plumage,
                language,
              )}, ${favoritePigeon.agent.feedCount} ${copy.favoriteFeeds}. ${copy.favoriteProtected}`
            : `${copy.hostFavorite}: ${copy.favoriteEmpty}`
        }
        className={`host-favorite-plaque ${
          favoritePigeon ? "has-favorite" : "is-empty"
        }`}
        data-host-favorite-id={favoritePigeon?.id}
        role="status"
      >
        <span
          aria-hidden="true"
          className={`host-favorite-portrait ${
            favoritePigeon
              ? `pigeon-word-${favoritePigeon.agent.plumage}`
              : ""
          }`}
        >
          {favoritePigeon ? (
            <span
              className="pigeon-bird-sprite"
              style={
                {
                  "--motion-y": `${favoritePigeon.spriteIndex * 14.285714}%`,
                } as React.CSSProperties
              }
            />
          ) : (
            <b>♥</b>
          )}
        </span>
        <span className="host-favorite-copy">
          <span>
            <i aria-hidden="true">♥</i>
            {copy.hostFavorite}
          </span>
          <strong>
            {favoritePigeon?.agent.feedCount ?? 0}
            <small>{copy.favoriteFeeds}</small>
          </strong>
          {!favoritePigeon ? <small>{copy.favoriteEmpty}</small> : null}
        </span>
        <span
          aria-label={copy.favoriteProtected}
          className="host-favorite-protection"
          role="img"
        >
          ∞
        </span>
      </div>
      <div className="plaza-metrics" aria-label={copy.ecosystemVariables}>
        {habitatMetrics.map((metric, index) => (
          <div
            className={`plaza-metric plaza-metric-${index + 1}`}
            key={metric.label}
            style={
              {
                "--metric-value": `${clamp(metric.percent ?? 0, 0, 1) * 100}%`,
              } as React.CSSProperties
            }
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <i aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="plaza-events" aria-label={copy.recentChanges}>
        <span>{copy.recentNotes}</span>
        {state.events.slice(0, 4).map((event, index) => (
          <i
            key={`${event}-${index}`}
            title={translateEvent(event, language)}
          >
            {translateEvent(event, language)}
          </i>
        ))}
      </div>
      <div className="pigeon-layer">
        {pigeons.map((pigeon) => {
          const claim = claims.find((item) => item.pigeonId === pigeon.id);
          const isHostFavorite = pigeon.id === favoritePigeon?.id;

          return (
            <div
              aria-label={pigeonAriaLabel(
                pigeon,
                language,
                isHostFavorite,
              )}
              className={`pigeon-word ${
                pigeon.isBold ? "pigeon-word-bold" : "pigeon-word-shy"
              } pigeon-word-${pigeon.agent.plumage} pigeon-word-${pigeon.zone} ${
                claim
                  ? `pigeon-word-claiming pigeon-word-${claim.phase} pigeon-word-${claim.response}`
                  : ""
              } ${pigeon.isNewborn ? "pigeon-word-newborn" : ""} ${
                isHostFavorite ? "pigeon-word-host-favorite" : ""
              }`}
              data-food-response={claim?.response}
              data-pigeon-id={pigeon.id}
              data-style-signature={pigeon.styleSignature}
              key={pigeon.id}
              onContextMenu={(event) =>
                handlePigeonContextMenu(event, pigeon)
              }
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
                  "--motion-y": `${pigeon.spriteIndex * 14.285714}%`,
                  "--scale": pigeon.scale.toFixed(2),
                  "--tilt": `${pigeon.tilt}deg`,
                  animationDelay:
                    claim || pigeon.isNewborn
                      ? "0s"
                      : `${-((pigeon.id % 7) * 0.43)}s`,
                } as React.CSSProperties
              }
            >
              <span aria-hidden="true" className="pigeon-bird-sprite" />
              {isHostFavorite ? (
                <span aria-hidden="true" className="host-favorite-heart">
                  ♥
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className="pigeon-word-label pigeon-word-label-source"
              >
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
      <div aria-hidden="true" className="pigeon-death-layer">
        {deathEffects.map((effect) => (
          <div
            className={`pigeon-death-effect pigeon-death-effect-${effect.zone}`}
            data-pigeon-death-id={effect.pigeonId}
            key={effect.id}
            style={
              {
                "--death-x": `${effect.x}%`,
                "--death-y": `${effect.y}%`,
                "--death-scale": effect.scale,
                "--death-tilt": `${effect.tilt}deg`,
                "--motion-y": `${effect.spriteIndex * 14.285714}%`,
              } as React.CSSProperties
            }
          >
            <span
              aria-hidden="true"
              className={`pigeon-death-bird pigeon-death-bird-${effect.plumage}`}
            />
            <span className="pigeon-death-word">
              {[...effect.word].map((letter, letterIndex) => {
                const letterAngle =
                  ((effect.pigeonId * 41 + letterIndex * 61) * Math.PI) / 180;
                const letterDistance = 18 + letterIndex * 3;

                return (
                  <i
                    key={`${effect.id}-letter-${letterIndex}`}
                    style={
                      {
                        "--death-letter-color": effect.palette[letterIndex],
                        "--letter-dx": `${Math.cos(letterAngle) * letterDistance}px`,
                        "--letter-dy": `${
                          Math.sin(letterAngle) * letterDistance - 18
                        }px`,
                        "--letter-rotation": `${(letterIndex - 2.5) * 18}deg`,
                        "--letter-delay": `${letterIndex * 28}ms`,
                      } as React.CSSProperties
                    }
                  >
                    {letter}
                  </i>
                );
              })}
            </span>
            {Array.from({ length: 12 }, (_, featherIndex) => {
              const featherAngle =
                ((effect.pigeonId * 29 + featherIndex * 137.508) * Math.PI) /
                180;
              const featherDistance = 34 + (featherIndex % 4) * 12;

              return (
                <i
                  className="pigeon-feather"
                  key={`${effect.id}-feather-${featherIndex}`}
                  style={
                    {
                      "--feather-color":
                        effect.palette[featherIndex % effect.palette.length],
                      "--feather-dx": `${
                        Math.cos(featherAngle) * featherDistance
                      }px`,
                      "--feather-dy": `${
                        Math.sin(featherAngle) * featherDistance - 28
                      }px`,
                      "--feather-rotation": `${
                        (featherIndex * 47) % 240 - 120
                      }deg`,
                      "--feather-delay": `${(featherIndex % 5) * 36}ms`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
        ))}
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
      <div aria-hidden="true" className="feed-launcher">
        {Array.from({ length: 11 }, (_, pelletIndex) => (
          <i key={`launcher-pellet-${pelletIndex}`} />
        ))}
      </div>
    </section>
  );
}

function SceneControls({
  language,
  onLanguageChange,
  onOpenTutorial,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onOpenTutorial: () => void;
}) {
  const copy = uiCopy[language];

  return (
    <nav
      aria-label={language === "zh" ? "场景设置" : "Scene settings"}
      className="scene-controls"
    >
      <div
        aria-label={copy.language}
        className="language-switch"
        role="group"
      >
        <button
          aria-pressed={language === "zh"}
          onClick={() => onLanguageChange("zh")}
          type="button"
        >
          中文
        </button>
        <button
          aria-pressed={language === "en"}
          onClick={() => onLanguageChange("en")}
          type="button"
        >
          EN
        </button>
      </div>
      <button
        aria-label={copy.openTutorial}
        className="tutorial-help-button"
        onClick={onOpenTutorial}
        title={copy.openTutorial}
        type="button"
      >
        ?
      </button>
    </nav>
  );
}

function AccountControl({
  account,
  language,
  signInPath,
  signOutPath,
  syncStatus,
}: {
  account: AccountInfo | null;
  language: Language;
  signInPath: string;
  signOutPath: string;
  syncStatus: CloudSyncStatus;
}) {
  const copy = uiCopy[language];
  const statusCopy: Record<CloudSyncStatus, string> = {
    local: copy.syncLocal,
    loading: copy.syncLoading,
    saving: copy.syncSaving,
    saved: copy.syncSaved,
    error: copy.syncError,
  };

  if (!account) {
    return (
      <a
        aria-label={`${copy.signInWithChatGPT}. ${copy.syncLocal}`}
        className="account-control account-sign-in"
        href={signInPath}
      >
        <span aria-hidden="true" className="account-cloud-icon">
          ☁
        </span>
        <span>
          <strong>{copy.signInWithChatGPT}</strong>
          <small>{copy.syncLocal}</small>
        </span>
      </a>
    );
  }

  return (
    <div
      aria-label={`${copy.cloudSave}: ${statusCopy[syncStatus]}`}
      className={`account-control account-signed-in account-sync-${syncStatus}`}
      role="status"
    >
      <span aria-hidden="true" className="account-avatar">
        {account.displayName.trim().charAt(0).toUpperCase() || "U"}
      </span>
      <span className="account-identity">
        <strong>{account.displayName}</strong>
        <small>{statusCopy[syncStatus]}</small>
      </span>
      <a
        aria-label={copy.signOut}
        className="account-sign-out"
        href={signOutPath}
        title={copy.signOut}
      >
        ↪
      </a>
    </div>
  );
}

function TutorialDialog({
  language,
  step,
  primaryButtonRef,
  onBack,
  onClose,
  onLanguageChange,
  onNext,
}: {
  language: Language;
  step: number;
  primaryButtonRef: React.RefObject<HTMLButtonElement | null>;
  onBack: () => void;
  onClose: () => void;
  onLanguageChange: (language: Language) => void;
  onNext: () => void;
}) {
  const copy = uiCopy[language];
  const steps = tutorialSteps[language];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="tutorial-backdrop">
      <section
        aria-describedby="tutorial-dialog-description"
        aria-labelledby="tutorial-dialog-title"
        aria-modal="true"
        className="tutorial-dialog"
        role="dialog"
      >
        <div className="tutorial-heading">
          <div>
            <p className="eyebrow">{copy.tutorialEyebrow}</p>
            <h2 id="tutorial-dialog-title">{copy.tutorialTitle}</h2>
          </div>
          <div className="tutorial-heading-tools">
            <div
              aria-label={copy.language}
              className="language-switch tutorial-language-switch"
              role="group"
            >
              <button
                aria-pressed={language === "zh"}
                onClick={() => onLanguageChange("zh")}
                type="button"
              >
                中文
              </button>
              <button
                aria-pressed={language === "en"}
                onClick={() => onLanguageChange("en")}
                type="button"
              >
                EN
              </button>
            </div>
            <span aria-live="polite" className="tutorial-step-count">
              {copy.tutorialProgress} {step + 1}/{steps.length}
            </span>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={`tutorial-visual tutorial-visual-${step + 1}`}
        >
          {step === 0 ? (
            <>
              <i className="tutorial-pigeon tutorial-pigeon-wild" />
              <i className="tutorial-flight-path" />
              <b className="tutorial-pellet">.</b>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <div>
                <i className="tutorial-pigeon tutorial-pigeon-wild" />
                <span>{copy.wildPark}</span>
              </div>
              <b>→</b>
              <div>
                <i className="tutorial-pigeon tutorial-pigeon-city" />
                <span>{copy.cityPlaza}</span>
              </div>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <div className="tutorial-color-row">
                {plumageOrder.map((plumage) => (
                  <i
                    key={plumage}
                    style={
                      {
                        "--tutorial-color": featherPalettes[plumage][1],
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              <strong>&lt; 7/8</strong>
            </>
          ) : null}
        </div>

        <div className="tutorial-copy">
          <h3>{current.title}</h3>
          <p id="tutorial-dialog-description">{current.body}</p>
        </div>

        <div className="tutorial-actions">
          <button
            className="tutorial-skip-button"
            onClick={onClose}
            type="button"
          >
            {copy.tutorialSkip}
          </button>
          <div>
            {step > 0 ? (
              <button
                aria-label={copy.tutorialBack}
                className="tutorial-back-button"
                onClick={onBack}
                title={copy.tutorialBack}
                type="button"
              >
                ←
              </button>
            ) : null}
            <button
              className="tutorial-next-button"
              onClick={onNext}
              ref={primaryButtonRef}
              type="button"
            >
              {isLast ? copy.tutorialFinish : copy.tutorialNext}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function UrbanPigeonSimulation({
  account,
  signInPath,
  signOutPath,
}: {
  account: AccountInfo | null;
  signInPath: string;
  signOutPath: string;
}) {
  const [state, setState] = useState<EcosystemState>(() => makeInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [cloudReady, setCloudReady] = useState(account === null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(
    account ? "loading" : "local",
  );
  const restartButtonRef = useRef<HTMLButtonElement>(null);
  const tutorialPrimaryButtonRef = useRef<HTMLButtonElement>(null);
  const latestStateRef = useRef(state);
  const lastCloudSaveRef = useRef("");
  const onlineCount = useOnlinePresence();
  const feedCooldownMs = feedCooldownMsForOnlineCount(onlineCount);
  const copy = uiCopy[language];

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      setState(loadState());
      try {
        const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const preferredLanguage =
          storedLanguage === "zh" || storedLanguage === "en"
            ? storedLanguage
            : window.navigator.language.toLowerCase().startsWith("zh")
              ? "zh"
              : "en";
        setLanguage(preferredLanguage);
        setTutorialOpen(
          window.localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "seen",
        );
      } catch {
        setLanguage(
          window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en",
        );
        setTutorialOpen(true);
      }
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(hydrationFrame);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [hydrated, language]);

  useEffect(() => {
    if (!hydrated || !account) {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/simulation-state", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Cloud save could not be loaded.");
        }

        return (await response.json()) as { state?: unknown };
      })
      .then((payload) => {
        if (payload.state) {
          const restored = restoreState(payload.state);
          lastCloudSaveRef.current = JSON.stringify(restored);
          setState(restored);
        }
        setCloudReady(true);
        setCloudSyncStatus("saved");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setCloudSyncStatus("error");
      });

    return () => controller.abort();
  }, [account, hydrated]);

  useEffect(() => {
    if (!hydrated || !account || !cloudReady) {
      return;
    }

    let active = true;
    const persistCloudState = async () => {
      const snapshot = latestStateRef.current;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastCloudSaveRef.current) {
        if (active) {
          setCloudSyncStatus("saved");
        }
        return;
      }

      if (active) {
        setCloudSyncStatus("saving");
      }

      try {
        const response = await fetch("/api/simulation-state", {
          body: JSON.stringify({ state: snapshot }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("Cloud save could not be written.");
        }
        lastCloudSaveRef.current = serialized;
        if (active) {
          setCloudSyncStatus("saved");
        }
      } catch {
        if (active) {
          setCloudSyncStatus("error");
        }
      }
    };
    const persistBeforeLeaving = () => {
      const serialized = JSON.stringify(latestStateRef.current);
      if (
        serialized !== lastCloudSaveRef.current &&
        typeof window.navigator.sendBeacon === "function"
      ) {
        window.navigator.sendBeacon(
          "/api/simulation-state",
          new Blob([`{"state":${serialized}}`], {
            type: "application/json",
          }),
        );
      }
    };

    void persistCloudState();
    const timer = window.setInterval(
      () => void persistCloudState(),
      CLOUD_SAVE_INTERVAL_MS,
    );
    window.addEventListener("pagehide", persistBeforeLeaving);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("pagehide", persistBeforeLeaving);
    };
  }, [account, cloudReady, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => advanceState(current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    if (state.restartColorVarietyCount !== null) {
      restartButtonRef.current?.focus();
    }
  }, [state.restartColorVarietyCount]);

  useEffect(() => {
    if (tutorialOpen && state.restartColorVarietyCount === null) {
      tutorialPrimaryButtonRef.current?.focus();
    }
  }, [state.restartColorVarietyCount, tutorialOpen, tutorialStep]);

  const closeTutorial = () => {
    setTutorialOpen(false);
    setTutorialStep(0);
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "seen");
  };
  const advanceTutorial = () => {
    if (tutorialStep >= tutorialSteps[language].length - 1) {
      closeTutorial();
      return;
    }
    setTutorialStep((current) => current + 1);
  };
  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
  };
  const openTutorial = () => {
    setTutorialStep(0);
    setTutorialOpen(true);
  };
  const metrics = metricDetails(
    state,
    onlineCount,
    feedCooldownMs,
    language,
  );
  const modalOpen =
    state.restartColorVarietyCount !== null || tutorialOpen;

  return (
    <>
      <main
        aria-hidden={modalOpen ? true : undefined}
        className="min-h-screen overflow-hidden bg-[#e8eee6] text-[#1e2521]"
      >
        <div className="simulation-stage">
          <div className="content-grid">
            <AccountControl
              account={account}
              language={language}
              signInPath={signInPath}
              signOutPath={signOutPath}
              syncStatus={cloudSyncStatus}
            />
            <SceneControls
              language={language}
              onLanguageChange={changeLanguage}
              onOpenTutorial={openTutorial}
            />
            <PigeonField
              feedCooldownMs={feedCooldownMs}
              generations={state.generations}
              language={language}
              metrics={metrics}
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
              onPigeonKilled={(pigeonId) =>
                setState((current) =>
                  killPigeonState(current, pigeonId),
                )
              }
              state={state}
            />
          </div>
        </div>
      </main>

      {state.restartColorVarietyCount !== null ? (
        <div className="restart-dialog-backdrop">
          <section
            aria-describedby="restart-dialog-description"
            aria-labelledby="restart-dialog-title"
            aria-modal="true"
            className="restart-dialog"
            role="alertdialog"
          >
            <p className="eyebrow">{copy.restartEyebrow}</p>
            <h2 id="restart-dialog-title">{copy.restartTitle}</h2>
            <div className="restart-diversity-readout">
              <strong>{state.restartColorVarietyCount}/8</strong>
              <span>{copy.varietiesRemain}</span>
            </div>
            <p id="restart-dialog-description">{copy.restartDescription}</p>
            <button
              onClick={() => {
                setTutorialOpen(false);
                setState((current) => restartEcosystemState(current));
              }}
              ref={restartButtonRef}
              type="button"
            >
              {copy.restartAction}
            </button>
          </section>
        </div>
      ) : null}
      {tutorialOpen && state.restartColorVarietyCount === null ? (
        <TutorialDialog
          language={language}
          onBack={() =>
            setTutorialStep((current) => Math.max(0, current - 1))
          }
          onClose={closeTutorial}
          onLanguageChange={changeLanguage}
          onNext={advanceTutorial}
          primaryButtonRef={tutorialPrimaryButtonRef}
          step={tutorialStep}
        />
      ) : null}
    </>
  );
}
