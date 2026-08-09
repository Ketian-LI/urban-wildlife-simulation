"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v8";
const LEGACY_STORAGE_KEY = "urban-pigeon-collective-v7";
const PRESENCE_STORAGE_KEY = "urban-pigeon-presence-id-v1";
const LANGUAGE_STORAGE_KEY = "urban-pigeon-language-v1";
const TUTORIAL_STORAGE_KEY = "urban-pigeon-tutorial-v2";
const PRESENCE_HEARTBEAT_MS = 15_000;
const PRESENCE_RETRY_MS = 5_000;
const CLOUD_SAVE_INTERVAL_MS = 5_000;
const INITIAL_ANIMALS = 21;
const MAX_ANIMALS = 30;
const GENERATION_MS = 40_000;
const FOOD_LIFETIME_MS = 4_000;
const DEATH_ANIMATION_MS = 1_400;

type Language = "en" | "zh";
type CloudSyncStatus = "local" | "loading" | "saving" | "saved" | "error";
type PillarKey = "quantity" | "satiety" | "comfort" | "coexistence";
type LockablePillar = Exclude<PillarKey, "quantity">;
type EndReason = PillarKey | "species-loss" | "extreme-overflow";
type Species =
  | "pigeon"
  | "squirrel"
  | "swan"
  | "stray-cat"
  | "stray-dog"
  | "fox"
  | "hedgehog";
type FoodType = "food";
type Plumage = "grey" | "white" | "spotted" | "brown";
type Intent = "eager" | "curious" | "wary" | "refusing";
type EventId =
  | "feeding-crowd"
  | "leftovers"
  | "squirrel-cache"
  | "swan-fountain"
  | "cat-territory"
  | "dog-pack"
  | "fox-corridor"
  | "hedgehog-shrubs"
  | "favorite-example"
  | "quiet-foraging"
  | "sealed-bins"
  | "garden-maintenance"
  | "visitor-group"
  | "crisis-vitality"
  | "crisis-foraging"
  | "crisis-habitat"
  | "crisis-coexistence";

type AccountInfo = { displayName: string };

type AnimalAgent = {
  id: number;
  species: Species;
  plumage: Plumage;
  feedCount: number;
  boldness: number;
  appetite: number;
  nutrition: number;
  satietyUntil: number;
  x: number;
  y: number;
  caseMask: number;
  colorSeed: number;
  bornAt: number;
};

type FeedRecord = {
  id: number;
  at: number;
  food: FoodType;
  x: number;
  y: number;
  accepted: boolean | null;
  animalId: number | null;
  species: Species | null;
  favorite: boolean;
};

type FieldNote = {
  at: number;
  en: string;
  zh: string;
};

type Policies = {
  feedingZone: boolean;
  sealedBins: boolean;
  shrubs: boolean;
  fountain: boolean;
};

type SpeciesVital = {
  satiety: number;
  comfort: number;
  dangerTurns: number;
};

type OutcomeImpact = {
  at: number;
  en: string;
  zh: string;
  changes: Partial<Record<PillarKey, number>>;
  lockedPillar?: LockablePillar;
};

type EcosystemState = {
  version: 8;
  pigeons: AnimalAgent[];
  nextPigeonId: number;
  speciesVitals: Record<Species, SpeciesVital>;
  coexistence: number;
  generations: number;
  lastUpdated: number;
  nextGenerationAt: number;
  activeEventId: EventId | null;
  decisionQueue: Species[];
  lastEventId: EventId | null;
  eventSpecies: Species | null;
  endedBy: EndReason | null;
  endedAt: number | null;
  favoriteId: number | null;
  collectedPlumages: Plumage[];
  discoveredSpecies: Species[];
  animalSpeciesUnlocked: boolean;
  firstSquirrelSeeded: boolean;
  feedingHistory: FeedRecord[];
  successfulFeedings: number;
  decisionsMade: number;
  lockedPillar: LockablePillar | null;
  unlockAtGeneration: number | null;
  overflowedPillar: LockablePillar | null;
  events: FieldNote[];
  lastImpact: OutcomeImpact | null;
  policies: Policies;
};

type FoodParticle = {
  id: number;
  food: FoodType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  launchedAt: number;
  duration: number;
  arcHeight: number;
  acceptedBy: number | null;
  expiresAt: number;
};

type AnimalResponse = {
  foodId: number;
  animalId: number;
  x: number;
  y: number;
  phase: "noticing" | "approach" | "eating" | "landing" | "rejecting";
  intent: Intent;
  winner: boolean;
  delay: number;
};

type DeathEffect = {
  id: number;
  animal: AnimalAgent;
  x: number;
  y: number;
};

type LegacyPillarKey = "vitality" | "foraging" | "habitat";
type PillarDeltas = Partial<Record<Exclude<PillarKey, "quantity"> | LegacyPillarKey, number>>;
type EventChoice = {
  label: Record<Language, string>;
  result: Record<Language, string>;
  deltas: PillarDeltas;
  policy?: Partial<Policies>;
  spawn?: Species;
};
type EventDefinition = {
  species?: Species;
  eyebrow: Record<Language, string>;
  title: Record<Language, string>;
  body: Record<Language, string>;
  left: EventChoice;
  right: EventChoice;
};

const pillarOrder: PillarKey[] = [
  "quantity",
  "satiety",
  "comfort",
  "coexistence",
];
const pillarIcons: Record<PillarKey, string> = {
  quantity: "#",
  satiety: "●",
  comfort: "⌂",
  coexistence: "↔",
};
const pigeonLetters = "pigeon";
const plumageOrder: Plumage[] = ["grey", "white", "spotted", "brown"];
const speciesOrder: Species[] = [
  "pigeon",
  "squirrel",
  "swan",
  "stray-cat",
  "stray-dog",
  "fox",
  "hedgehog",
];

const speciesProfiles: Record<Species, {
  stableMin: number;
  idealMin: number;
  idealMax: number;
  satietyWeight: number;
  comfortWeight: number;
  coexistenceWeight: number;
  hungerDecay: number;
}> = {
  pigeon: { stableMin: 3, idealMin: 3, idealMax: 6, satietyWeight: 0.5, comfortWeight: 0.2, coexistenceWeight: 0.3, hungerDecay: 5 },
  squirrel: { stableMin: 2, idealMin: 2, idealMax: 4, satietyWeight: 0.35, comfortWeight: 0.4, coexistenceWeight: 0.25, hungerDecay: 4 },
  swan: { stableMin: 2, idealMin: 2, idealMax: 3, satietyWeight: 0.3, comfortWeight: 0.45, coexistenceWeight: 0.25, hungerDecay: 3 },
  "stray-cat": { stableMin: 1, idealMin: 1, idealMax: 3, satietyWeight: 0.45, comfortWeight: 0.2, coexistenceWeight: 0.35, hungerDecay: 5 },
  "stray-dog": { stableMin: 2, idealMin: 2, idealMax: 4, satietyWeight: 0.4, comfortWeight: 0.35, coexistenceWeight: 0.25, hungerDecay: 5 },
  fox: { stableMin: 1, idealMin: 1, idealMax: 3, satietyWeight: 0.3, comfortWeight: 0.3, coexistenceWeight: 0.4, hungerDecay: 4 },
  hedgehog: { stableMin: 1, idealMin: 1, idealMax: 3, satietyWeight: 0.3, comfortWeight: 0.5, coexistenceWeight: 0.2, hungerDecay: 3 },
};
const wildlifeRows: Partial<Record<Species, number>> = {
  squirrel: 0,
  swan: 1,
  "stray-cat": 2,
  "stray-dog": 3,
};
const extraRows: Partial<Record<Species, number>> = { fox: 0, hedgehog: 1 };

const foodData: Record<
  FoodType,
  { symbol: string; names: Record<Language, string>; color: string }
> = {
  food: { symbol: "•", names: { en: "Food", zh: "食物" }, color: "#b97819" },
};

const speciesNames: Record<Language, Record<Species, string>> = {
  en: {
    pigeon: "Pigeon",
    squirrel: "Squirrel",
    swan: "Swan",
    "stray-cat": "Stray cat",
    "stray-dog": "Stray dog",
    fox: "Fox",
    hedgehog: "Hedgehog",
  },
  zh: {
    pigeon: "鸽子",
    squirrel: "松鼠",
    swan: "天鹅",
    "stray-cat": "流浪猫",
    "stray-dog": "流浪狗",
    fox: "狐狸",
    hedgehog: "刺猬",
  },
};

const plumageNames: Record<Language, Record<Plumage, string>> = {
  en: { grey: "Grey", white: "White", spotted: "Spotted", brown: "Brown" },
  zh: { grey: "灰色", white: "白色", spotted: "斑点", brown: "棕色" },
};

const pillarNames: Record<Language, Record<PillarKey, string>> = {
  en: {
    quantity: "Quantity",
    satiety: "Satiety",
    comfort: "Comfort",
    coexistence: "Coexistence",
  },
  zh: {
    quantity: "数量",
    satiety: "饱食度",
    comfort: "舒适度",
    coexistence: "相处度",
  },
};

const endReasonNames: Record<Language, Record<EndReason, string>> = {
  en: { ...pillarNames.en, "species-loss": "Species loss", "extreme-overflow": "Extreme overflow" },
  zh: { ...pillarNames.zh, "species-loss": "物种消失", "extreme-overflow": "极端溢出" },
};

const uiCopy = {
  en: {
    brand: "Urban Wildlife Simulation",
    cycle: "City cycle",
    pressure: "Pressure",
    online: "Online",
    population: "Population",
    stableGroups: "Stable groups",
    sharedPlaza: "Shared plaza",
    hostFavorite: "Host favorite",
    favoriteEmpty: "Feed an animal to form a bond",
    feeds: "feeds",
    protected: "Protected from natural loss",
    feedAction: "Feed",
    decisionProgress: "Decision",
    latestChange: "Latest change",
    locked: "Locked",
    lockEffect: "Lock effect",
    extremeEvent: "Extreme event",
    overflowRisk: "Overflow risk",
    impactSlight: "Slight",
    impactNoticeable: "Noticeable",
    impactStrong: "Strong",
    impactSevere: "Severe",
    specialEffectCue: "This decision can lock one condition for two cycles",
    extremeEventCue: "All effects are amplified; exceeding 100 ends the cycle",
    fieldGuide: "Field journal",
    colors: "Pigeon colors",
    species: "Species survival",
    stableLine: "safe line",
    survival: "survival",
    atRisk: "at risk",
    stable: "stable",
    notes: "Recent causes",
    tutorial: "Tutorial",
    language: "Language",
    signIn: "Sign in with ChatGPT",
    signOut: "Sign out",
    savedLocal: "Saved on this device",
    loading: "Loading cloud save",
    saving: "Saving",
    saved: "Saved",
    syncError: "Cloud sync unavailable",
    eventChoice: "City decision",
    left: "Choose left option",
    right: "Choose right option",
    gameOver: "This city cycle has ended",
    gameOverBody: "A shared condition reached zero, or one species disappeared after its rescue window.",
    overflowBody: "An extreme event pushed one shared condition beyond 100.",
    newCycle: "Begin a new city cycle",
    survived: "Cycles observed",
    tutorialTitle: "Observe, feed, then live with the result",
    tutorialSkip: "Skip",
    tutorialBack: "Previous",
    tutorialNext: "Next",
    tutorialFinish: "Enter the park",
    tutorialStep: "Step",
    collectivePressure: "Shared feeding pressure",
    throwAria: "Click the shared plaza to throw food",
  },
  zh: {
    brand: "城市野生动物模拟",
    cycle: "城市周期",
    pressure: "压力",
    online: "当前在线",
    population: "动物数量",
    stableGroups: "稳定物种",
    sharedPlaza: "共享广场",
    hostFavorite: "最喜爱的动物",
    favoriteEmpty: "投喂动物以建立关系",
    feeds: "次投喂",
    protected: "不会自然消失",
    feedAction: "投喂",
    decisionProgress: "决策进度",
    latestChange: "最近变化",
    locked: "已锁定",
    lockEffect: "锁定效果",
    extremeEvent: "极端事件",
    overflowRisk: "溢出风险",
    impactSlight: "轻微",
    impactNoticeable: "明显",
    impactStrong: "强烈",
    impactSevere: "剧烈",
    specialEffectCue: "本次决策可能让一项数值锁定两个周期",
    extremeEventCue: "所有效果均被放大；任何数值超过 100 都会结束本轮",
    fieldGuide: "观察日志",
    colors: "鸽子羽色",
    species: "物种生存状态",
    stableLine: "安全线",
    survival: "生存值",
    atRisk: "危险",
    stable: "稳定",
    notes: "近期原因",
    tutorial: "教程",
    language: "语言",
    signIn: "使用 ChatGPT 登录",
    signOut: "退出登录",
    savedLocal: "保存在此设备",
    loading: "正在读取云端存档",
    saving: "正在保存",
    saved: "已保存",
    syncError: "云端同步暂不可用",
    eventChoice: "城市决策",
    left: "选择左侧方案",
    right: "选择右侧方案",
    gameOver: "本轮城市周期已经结束",
    gameOverBody: "某项共同条件降至零，或有物种在抢救期后消失。",
    overflowBody: "极端事件将一项共同数值推过了 100。",
    newCycle: "开始新的城市周期",
    survived: "已观察周期",
    tutorialTitle: "观察、投喂，并面对之后的变化",
    tutorialSkip: "跳过",
    tutorialBack: "上一步",
    tutorialNext: "下一步",
    tutorialFinish: "进入公园",
    tutorialStep: "步骤",
    collectivePressure: "共享投喂压力",
    throwAria: "点击共享广场投放食物",
  },
} as const;

const tutorialSteps: Record<Language, { title: string; body: string }[]> = {
  en: [
    {
      title: "Click a place to feed",
      body: "There is one shared food. Click the plaza and it is thrown from the lower edge; you choose the place, not the recipient.",
    },
    {
      title: "Read the animal",
      body: "Animals turn, lean, hesitate or retreat before deciding. The nearest animal tries first; refusal passes the chance to the next.",
    },
    {
      title: "Feeding builds toward a decision",
      body: "Every two successful feedings trigger one species event. Before choosing, the icons reveal which conditions may change and only hint at the size of the impact.",
    },
    {
      title: "Keep four conditions alive",
      body: "All four conditions must remain above zero, but more is not always safer: marked extreme events end the cycle if a condition exceeds 100. Some decisions can also freeze one condition for two cycles.",
    },
  ],
  zh: [
    {
      title: "点击位置进行投喂",
      body: "现在只有一种通用食物。点击广场后，食物会从画面底部抛入；你决定位置，但不能指定哪只动物吃。",
    },
    {
      title: "观察动物的线索",
      body: "动物会先转头、前倾、犹豫或后退。距离最近的动物先尝试，拒绝后机会轮到下一只。",
    },
    {
      title: "投喂会逐步触发决策",
      body: "每两次成功投喂会触发一次对应物种事件。选择前只会提示可能受影响的数值和影响大小，不会透露增减方向。",
    },
    {
      title: "维持四项生存条件",
      body: "四项数值都必须高于零，但并非越高越安全：带标记的极端事件会在数值超过 100 时结束本轮，部分决策还会将一项数值冻结两个周期。",
    },
  ],
};

const feedingAcceptance: Record<Species, number> = {
  pigeon: 0.88,
  squirrel: 0.78,
  swan: 0.72,
  "stray-cat": 0.7,
  "stray-dog": 0.84,
  fox: 0.6,
  hedgehog: 0.64,
};

const events: Record<EventId, EventDefinition> = {
  "feeding-crowd": {
    species: "pigeon",
    eyebrow: { en: "A pattern becomes public", zh: "投喂模式正在扩散" },
    title: { en: "A crowd gathers at the feeding hotspot", zh: "投喂热点周围聚集了人群" },
    body: { en: "Other visitors have started copying the concentrated feeding pattern they observed.", zh: "其他游客开始模仿他们看到的集中投喂方式。" },
    left: {
      label: { en: "Mark a feeding zone", zh: "划定投喂区" },
      result: { en: "The square became tidier, but feeding grew more predictable.", zh: "广场更加整洁，但投喂位置变得更加固定。" },
      deltas: { coexistence: 9, foraging: -6 },
      policy: { feedingZone: true },
    },
    right: {
      label: { en: "Disperse the crowd", zh: "疏散人群" },
      result: { en: "The hotspot weakened and animals spread out again.", zh: "热点减弱，动物重新分散。" },
      deltas: { coexistence: 3, foraging: 7, vitality: -2 },
      policy: { feedingZone: false },
    },
  },
  leftovers: {
    eyebrow: { en: "Uneaten food", zh: "未被吃掉的食物" },
    title: { en: "Cleaners report food across the marble", zh: "清洁人员发现广场上散落着食物" },
    body: { en: "Several recent throws were refused and remained on the ground.", zh: "最近有多次投食被拒绝，食物留在了地面上。" },
    left: {
      label: { en: "Schedule extra cleaning", zh: "增加清理班次" },
      result: { en: "Leftovers disappeared, along with some accidental food sources.", zh: "残留食物消失了，一些偶然食物来源也随之减少。" },
      deltas: { coexistence: 10, vitality: -3 },
    },
    right: {
      label: { en: "Leave the square alone", zh: "暂时不处理" },
      result: { en: "Animals kept investigating, while public tolerance fell.", zh: "动物继续调查残留食物，但公众容忍度下降。" },
      deltas: { vitality: 4, coexistence: -8 },
    },
  },
  "squirrel-cache": {
    species: "squirrel",
    eyebrow: { en: "Food changes space", zh: "食物改变了空间" },
    title: { en: "Squirrels are caching nuts beside the trees", zh: "松鼠开始在树边储藏坚果" },
    body: { en: "A repeated food route is becoming part of the park.", zh: "一条反复出现的食物路线正在成为公园的一部分。" },
    left: {
      label: { en: "Protect the cache", zh: "保护储藏点" },
      result: { en: "Tree-edge habitat became more active.", zh: "树林边缘的栖息活动增加了。" },
      deltas: { habitat: 8, coexistence: -2 },
    },
    right: {
      label: { en: "Clear the path", zh: "清理步道" },
      result: { en: "The path reopened and squirrels moved outward.", zh: "步道重新开放，松鼠向外围移动。" },
      deltas: { coexistence: 6, habitat: -5, foraging: 3 },
    },
  },
  "swan-fountain": {
    species: "swan",
    eyebrow: { en: "A new territory", zh: "新的领地" },
    title: { en: "A swan guards the fountain feeding area", zh: "一只天鹅开始守卫喷泉投喂区" },
    body: { en: "Other animals now avoid a route they previously used.", zh: "其他动物开始避开过去经常使用的路线。" },
    left: {
      label: { en: "Keep a water corridor", zh: "保留水域通道" },
      result: { en: "The fountain remained usable by several species.", zh: "多个物种仍然可以使用喷泉区域。" },
      deltas: { habitat: 7, coexistence: 2 },
      policy: { fountain: true },
    },
    right: {
      label: { en: "Close the fountain edge", zh: "封闭喷泉边缘" },
      result: { en: "Conflict fell, but water habitat contracted.", zh: "冲突减少了，但水域栖息空间缩小。" },
      deltas: { coexistence: 8, habitat: -8 },
      policy: { fountain: false },
      },
  },
  "cat-territory": {
    species: "stray-cat",
    eyebrow: { en: "A fed cat draws a boundary", zh: "被投喂的猫划出了边界" },
    title: { en: "The cat begins guarding this feeding place", zh: "流浪猫开始守住这个投喂位置" },
    body: { en: "A reliable meal helps this cat, but nearby animals now hesitate to cross its territory.", zh: "稳定食物帮助了这只猫，但附近动物开始犹豫是否穿过它的领地。" },
    left: {
      label: { en: "Keep one feeding station", zh: "保留固定投喂点" },
      result: { en: "The cat settled, while shared space became more tense.", zh: "流浪猫安定下来，但共享空间变得更加紧张。" },
      deltas: { satiety: 10, comfort: 5, coexistence: -8 },
    },
    right: {
      label: { en: "Move the next meal", zh: "移动下一次投喂" },
      result: { en: "The boundary softened and the cat kept searching.", zh: "领地边界减弱，流浪猫继续寻找食物。" },
      deltas: { satiety: 4, comfort: -2, coexistence: 7 },
    },
  },
  "dog-pack": {
    species: "stray-dog",
    eyebrow: { en: "One dog calls to the others", zh: "一只狗开始呼唤同伴" },
    title: { en: "The feeding place is becoming a meeting point", zh: "投喂位置正在变成流浪狗的集合点" },
    body: { en: "Dogs benefit from company, although a visible pack can worry other park users.", zh: "流浪狗需要同伴，但明显聚集的犬群也会让其他公园使用者担忧。" },
    left: {
      label: { en: "Let the pack gather", zh: "允许犬群聚集" },
      result: { en: "The dogs relaxed together and public tolerance fell.", zh: "流浪狗一起放松下来，但公众容忍度下降。" },
      deltas: { satiety: 8, comfort: 10, coexistence: -7 },
    },
    right: {
      label: { en: "Scatter treats along the path", zh: "沿步道分散食物" },
      result: { en: "The dogs moved as a loose group and conflict stayed low.", zh: "流浪狗以较松散的群体移动，冲突保持较低。" },
      deltas: { satiety: 5, comfort: 3, coexistence: 6 },
    },
  },
  "fox-corridor": {
    species: "fox",
    eyebrow: { en: "Night visitor", zh: "夜间访客" },
    title: { en: "A fox follows the smell of leftover food", zh: "一只狐狸循着残留食物的气味来到公园" },
    body: { en: "Smaller animals retreat while the park edge becomes more active.", zh: "小型动物暂时退开，公园边缘变得更加活跃。" },
    left: {
      label: { en: "Leave an edge corridor", zh: "保留边缘通道" },
      result: { en: "The fox entered the wider habitat network.", zh: "狐狸进入了更广阔的栖息网络。" },
      deltas: { habitat: 8, vitality: -3, coexistence: -2 },
      policy: { shrubs: true },
    },
    right: {
      label: { en: "Increase night lighting", zh: "增加夜间照明" },
      result: { en: "The fox withdrew and nocturnal habitat weakened.", zh: "狐狸退回外围，夜间栖息条件减弱。" },
      deltas: { coexistence: 6, habitat: -7 },
      policy: { shrubs: false },
    },
  },
  "hedgehog-shrubs": {
    species: "hedgehog",
    eyebrow: { en: "A quiet arrival", zh: "安静的新访客" },
    title: { en: "A hedgehog appears beneath the shrubs", zh: "一只刺猬出现在灌木下面" },
    body: { en: "Low disturbance and insect food have opened a small night route.", zh: "较低的干扰和昆虫食物形成了一条小型夜间路线。" },
    left: {
      label: { en: "Leave the shrubs uncut", zh: "保留灌木" },
      result: { en: "Shelter increased while the path narrowed.", zh: "庇护空间增加了，步道则变窄了一些。" },
      deltas: { habitat: 10, coexistence: -3 },
      policy: { shrubs: true },
    },
    right: {
      label: { en: "Restore the formal border", zh: "恢复整齐边界" },
      result: { en: "The square looked orderly and the night route disappeared.", zh: "广场更加整齐，夜间路线消失了。" },
      deltas: { coexistence: 7, habitat: -6 },
      policy: { shrubs: false },
    },
  },
  "favorite-example": {
    eyebrow: { en: "Animals copy animals", zh: "动物也会观察动物" },
    title: { en: "Others begin following your favorite", zh: "其他动物开始跟随你最喜爱的动物" },
    body: { en: "Repeated attention to one individual has become a cue for the group.", zh: "对一个个体的反复关注，已经成为群体能够识别的线索。" },
    left: {
      label: { en: "Keep feeding the leader", zh: "继续投喂领头个体" },
      result: { en: "Group vitality rose and independent foraging declined.", zh: "群体生命力上升，自主觅食能力下降。" },
      deltas: { vitality: 8, foraging: -8 },
    },
    right: {
      label: { en: "Move food away", zh: "把食物投向别处" },
      result: { en: "Attention spread across the plaza.", zh: "动物的注意力重新分散到广场各处。" },
      deltas: { foraging: 7, vitality: -2 },
    },
  },
  "quiet-foraging": {
    eyebrow: { en: "No feeding is also an action", zh: "不投喂也是一种行为" },
    title: { en: "Animals return to the park edges", zh: "动物重新回到公园边缘觅食" },
    body: { en: "With no recent throws, habitat quality is shaping behavior more strongly.", zh: "最近没有新的投食，栖息环境开始更明显地影响动物行为。" },
    left: {
      label: { en: "Keep observing", zh: "继续观察" },
      result: { en: "Independent foraging recovered.", zh: "自主觅食能力得到了恢复。" },
      deltas: { foraging: 10, vitality: -3 },
    },
    right: {
      label: { en: "Resume light feeding", zh: "恢复少量投喂" },
      result: { en: "Animals stayed visible near the plaza.", zh: "动物继续停留在广场附近。" },
      deltas: { vitality: 6, foraging: -4 },
    },
  },
  "sealed-bins": {
    eyebrow: { en: "Council notice", zh: "市政公告" },
    title: { en: "The council proposes sealed rubbish bins", zh: "市政部门计划更换封闭式垃圾桶" },
    body: { en: "Ambient human food would fall, changing which animals remain nearby.", zh: "环境中的人类剩余食物会减少，附近动物的组成也会改变。" },
    left: {
      label: { en: "Seal the bins", zh: "封闭垃圾桶" },
      result: { en: "The square grew cleaner and deliberate feeding became more influential.", zh: "广场变得更整洁，有意投喂的影响变得更明显。" },
      deltas: { coexistence: 9, vitality: -5, foraging: 5 },
      policy: { sealedBins: true },
    },
    right: {
      label: { en: "Keep current bins", zh: "保留现有垃圾桶" },
      result: { en: "More animals stayed, alongside more public friction.", zh: "更多动物留下，同时公众摩擦也增加了。" },
      deltas: { vitality: 7, coexistence: -6 },
      policy: { sealedBins: false },
    },
  },
  "garden-maintenance": {
    eyebrow: { en: "Park maintenance", zh: "公园维护" },
    title: { en: "Gardeners ask how closely to cut the shrubs", zh: "园丁询问应该把灌木修剪到什么程度" },
    body: { en: "A tidy border and a complex habitat cannot occupy exactly the same space.", zh: "整齐的边界和复杂的栖息环境无法占据完全相同的空间。" },
    left: {
      label: { en: "Leave dense shelter", zh: "保留茂密庇护" },
      result: { en: "Habitat complexity increased.", zh: "栖息环境的复杂度增加了。" },
      deltas: { habitat: 10, coexistence: -4 },
      policy: { shrubs: true },
    },
    right: {
      label: { en: "Cut a clear edge", zh: "修剪清晰边界" },
      result: { en: "Public space increased while shelter contracted.", zh: "公共活动空间增加，动物庇护空间减少。" },
      deltas: { coexistence: 8, habitat: -8 },
      policy: { shrubs: false },
    },
  },
  "visitor-group": {
    eyebrow: { en: "Weekend proposal", zh: "周末提议" },
    title: { en: "A visitor group wants to hold a feeding hour", zh: "一个游客团体希望举办集中投喂活动" },
    body: { en: "A short event could help visible individuals while changing group expectations.", zh: "短时间活动可能帮助眼前的个体，同时改变群体对人类的预期。" },
    left: {
      label: { en: "Allow the feeding hour", zh: "允许投喂活动" },
      result: { en: "Vitality rose and feeding expectations strengthened.", zh: "生命力上升，动物对投喂的预期也增强了。" },
      deltas: { vitality: 11, foraging: -9, coexistence: -3 },
    },
    right: {
      label: { en: "Run an observation hour", zh: "改为观察活动" },
      result: { en: "Visitors watched without adding food.", zh: "游客在不增加食物的情况下进行了观察。" },
      deltas: { foraging: 6, coexistence: 4, vitality: -2 },
    },
  },
  "crisis-vitality": {
    eyebrow: { en: "Vitality crisis", zh: "生命力危机" },
    title: { en: "The animal population is visibly weakening", zh: "动物群体明显变得虚弱" },
    body: { en: "Immediate help may preserve individuals while creating a stronger feeding pattern.", zh: "立即帮助可以维持个体，但也会形成更强的投喂模式。" },
    left: { label: { en: "Emergency feeding", zh: "紧急投喂" }, result: { en: "Vitality recovered at the cost of foraging.", zh: "生命力得到恢复，但觅食力下降。" }, deltas: { vitality: 18, foraging: -10 } },
    right: { label: { en: "Open a habitat refuge", zh: "开放栖息避难区" }, result: { en: "Recovery was slower but less dependent on food.", zh: "恢复较慢，但更少依赖投喂。" }, deltas: { vitality: 10, habitat: 7, coexistence: -4 } },
  },
  "crisis-foraging": {
    eyebrow: { en: "Foraging crisis", zh: "觅食力危机" },
    title: { en: "Animals now wait instead of searching", zh: "动物开始等待，而不是主动寻找食物" },
    body: { en: "The repeated feeding cue has become stronger than the park edge.", zh: "反复出现的投喂线索已经强于公园边缘的自然线索。" },
    left: { label: { en: "Pause public feeding", zh: "暂停公众投喂" }, result: { en: "Foraging recovered while vitality dipped.", zh: "觅食力恢复，但生命力短期下降。" }, deltas: { foraging: 18, vitality: -8, coexistence: 3 } },
    right: { label: { en: "Scatter natural food", zh: "分散自然食物" }, result: { en: "Animals searched more widely through the habitat.", zh: "动物开始在栖息地中进行更广泛的搜索。" }, deltas: { foraging: 12, habitat: -4, vitality: 4 } },
  },
  "crisis-habitat": {
    eyebrow: { en: "Habitat crisis", zh: "栖息地危机" },
    title: { en: "Shelter, water and quiet routes are disappearing", zh: "庇护、水源和安静路线正在消失" },
    body: { en: "The city can return space to habitat, but not without changing public use.", zh: "城市可以把空间还给栖息环境，但公众使用方式也会随之改变。" },
    left: { label: { en: "Restore green corridors", zh: "恢复绿色通道" }, result: { en: "Habitat recovered and public space narrowed.", zh: "栖息地得到恢复，公共空间有所缩小。" }, deltas: { habitat: 20, coexistence: -9 }, policy: { shrubs: true } },
    right: { label: { en: "Create a small refuge", zh: "建立小型避难区" }, result: { en: "A compact refuge prevented immediate collapse.", zh: "紧凑的避难区避免了立即崩溃。" }, deltas: { habitat: 12, vitality: 4, coexistence: -3 } },
  },
  "crisis-coexistence": {
    eyebrow: { en: "Coexistence crisis", zh: "共处危机" },
    title: { en: "Public tolerance is close to breaking", zh: "公众容忍度接近崩溃" },
    body: { en: "Complaints now threaten every animal using the square.", zh: "投诉开始威胁所有正在使用广场的动物。" },
    left: { label: { en: "Fund cleaning and signage", zh: "增加清理和标识" }, result: { en: "Tolerance recovered while resources shifted from habitat.", zh: "容忍度恢复，但栖息地资源被挪用。" }, deltas: { coexistence: 19, habitat: -8 }, policy: { feedingZone: true } },
    right: { label: { en: "Temporarily close the centre", zh: "暂时关闭中心区域" }, result: { en: "Conflict fell and animals returned to the edges.", zh: "冲突下降，动物回到外围区域。" }, deltas: { coexistence: 13, foraging: 7, vitality: -6 } },
  },
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function note(en: string, zh: string, at = Date.now()): FieldNote {
  return { at, en, zh };
}

function pushNote(state: EcosystemState, entry: FieldNote) {
  state.events = [...state.events, entry].slice(-18);
}

function wordFromCaseMask(caseMask: number) {
  return [...pigeonLetters]
    .map((letter, index) => (caseMask & (1 << index) ? letter.toUpperCase() : letter))
    .join("");
}

function positionFor(id: number, species: Species) {
  const sharedAnchors: Record<Species, { x: number; y: number }[]> = {
    pigeon: [{ x: 28, y: 37 }, { x: 64, y: 39 }, { x: 79, y: 56 }],
    squirrel: [{ x: 17, y: 44 }, { x: 12, y: 65 }, { x: 28, y: 76 }],
    swan: [{ x: 70, y: 34 }, { x: 84, y: 39 }, { x: 76, y: 48 }],
    "stray-cat": [{ x: 38, y: 36 }, { x: 62, y: 45 }, { x: 73, y: 68 }],
    "stray-dog": [{ x: 22, y: 51 }, { x: 37, y: 72 }, { x: 61, y: 79 }],
    fox: [{ x: 10, y: 58 }, { x: 86, y: 74 }, { x: 19, y: 82 }],
    hedgehog: [{ x: 31, y: 82 }, { x: 67, y: 84 }, { x: 88, y: 57 }],
  };
  const anchor = sharedAnchors[species][id % 3];
  const generationDrift = Math.floor(id / INITIAL_ANIMALS);
  return {
    x: clamp(anchor.x + ((generationDrift * 7 + id) % 5) - 2, 7, 93),
    y: clamp(anchor.y + ((generationDrift * 11 + id) % 5) - 2, 27, 89),
  };
}

function createAnimal(
  id: number,
  species: Species = "pigeon",
  now = Date.now(),
): AnimalAgent {
  const position = positionFor(id, species);
  return {
    id,
    species,
    plumage: plumageOrder[id % plumageOrder.length],
    feedCount: 0,
    boldness: clamp(0.24 + ((id * 47) % 58) / 100, 0.12, 0.9),
    appetite: 0.52 + ((id * 17) % 35) / 100,
    nutrition: 0,
    satietyUntil: 0,
    x: position.x,
    y: position.y,
    caseMask: (id * 37 + 9) % 64,
    colorSeed: (id * 53 + 11) % 997,
    bornAt: now,
  };
}

function makeSpeciesVitals(): Record<Species, SpeciesVital> {
  return {
    pigeon: { satiety: 76, comfort: 70, dangerTurns: 0 },
    squirrel: { satiety: 74, comfort: 74, dangerTurns: 0 },
    swan: { satiety: 73, comfort: 72, dangerTurns: 0 },
    "stray-cat": { satiety: 72, comfort: 69, dangerTurns: 0 },
    "stray-dog": { satiety: 74, comfort: 72, dangerTurns: 0 },
    fox: { satiety: 71, comfort: 69, dangerTurns: 0 },
    hedgehog: { satiety: 72, comfort: 74, dangerTurns: 0 },
  };
}

function speciesCount(state: Pick<EcosystemState, "pigeons">, species: Species) {
  return state.pigeons.filter((animal) => animal.species === species).length;
}

function weightedSpeciesMetric(state: EcosystemState, metric: "satiety" | "comfort") {
  if (state.pigeons.length === 0) return 0;
  const total = speciesOrder.reduce(
    (sum, species) => sum + state.speciesVitals[species][metric] * speciesCount(state, species),
    0,
  );
  return clamp(total / state.pigeons.length);
}

function pillarValue(state: EcosystemState, pillar: PillarKey) {
  if (pillar === "quantity") return state.pigeons.length;
  if (pillar === "satiety" || pillar === "comfort") return weightedSpeciesMetric(state, pillar);
  return state.coexistence;
}

function speciesSurvival(state: EcosystemState, species: Species) {
  const profile = speciesProfiles[species];
  const vital = state.speciesVitals[species];
  const count = speciesCount(state, species);
  const socialPenalty = Math.max(0, profile.stableMin - count) * 14;
  const crowdingPenalty = Math.max(0, count - profile.idealMax) * 9;
  return clamp(
    vital.satiety * profile.satietyWeight
      + vital.comfort * profile.comfortWeight
      + state.coexistence * profile.coexistenceWeight
      - socialPenalty
      - crowdingPenalty,
  );
}

function makeInitialState(now = Date.now(), carriedFavorite?: AnimalAgent): EcosystemState {
  const pigeons: AnimalAgent[] = [];
  for (const species of speciesOrder) {
    for (let index = 0; index < 3; index += 1) {
      pigeons.push(createAnimal(pigeons.length, species, now));
    }
  }
  const nextPigeonId = INITIAL_ANIMALS;
  let favoriteId: number | null = null;

  if (carriedFavorite) {
    const replaceIndex = pigeons.findIndex((animal) => animal.species === carriedFavorite.species);
    const replacement = pigeons[replaceIndex];
    const favoritePosition = positionFor(replacement.id, carriedFavorite.species);
    const favorite = {
      ...carriedFavorite,
      id: replacement.id,
      x: favoritePosition.x,
      y: favoritePosition.y,
      appetite: 0.6,
      nutrition: 0,
      satietyUntil: 0,
      bornAt: now,
    };
    pigeons[replaceIndex] = favorite;
    favoriteId = favorite.id;
  }

  return {
    version: 8,
    pigeons,
    nextPigeonId,
    speciesVitals: makeSpeciesVitals(),
    coexistence: 74,
    generations: 1,
    lastUpdated: now,
    nextGenerationAt: now + GENERATION_MS,
    activeEventId: null,
    decisionQueue: [],
    lastEventId: null,
    eventSpecies: null,
    endedBy: null,
    endedAt: null,
    favoriteId,
    collectedPlumages: [],
    discoveredSpecies: [...speciesOrder],
    animalSpeciesUnlocked: true,
    firstSquirrelSeeded: true,
    feedingHistory: [],
    successfulFeedings: 0,
    decisionsMade: 0,
    lockedPillar: null,
    unlockAtGeneration: null,
    overflowedPillar: null,
    events: [
      note(
        "Twenty-one animals begin together: three from each of the seven species.",
        "二十一只动物共同开始：七个物种各三只。",
        now,
      ),
    ],
    lastImpact: null,
    policies: { feedingZone: false, sealedBins: false, shrubs: true, fountain: true },
  };
}

function checkForEnd(state: EcosystemState, now = Date.now()) {
  if (state.endedBy) return state;
  const missingSpecies = speciesOrder.find((species) => speciesCount(state, species) === 0);
  const endedBy: EndReason | null = missingSpecies
    ? "species-loss"
    : pillarOrder.find((pillar) => pillarValue(state, pillar) <= 0) ?? null;
  if (!endedBy) return state;

  if (endedBy === "coexistence") state.coexistence = 0;
  state.endedBy = endedBy;
  state.endedAt = now;
  state.activeEventId = null;
  state.decisionQueue = [];
  pushNote(
    state,
    note(
      endedBy === "species-loss"
        ? "A species disappeared after its rescue window. This city cycle ended."
        : `${pillarNames.en[endedBy as PillarKey]} reached zero. This city cycle ended.`,
      endedBy === "species-loss"
        ? "一个物种在抢救期后消失，本轮城市周期结束。"
        : `${pillarNames.zh[endedBy as PillarKey]}降到了零，本轮城市周期结束。`,
      now,
    ),
  );
  return state;
}

function endFromOverflow(state: EcosystemState, pillar: LockablePillar, now: number) {
  state.endedBy = "extreme-overflow";
  state.endedAt = now;
  state.overflowedPillar = pillar;
  state.activeEventId = null;
  state.decisionQueue = [];
  pushNote(
    state,
    note(
      `${pillarNames.en[pillar]} exceeded 100 during an extreme event. This city cycle ended.`,
      `极端事件让${pillarNames.zh[pillar]}超过了 100，本轮城市周期结束。`,
      now,
    ),
  );
  return state;
}

function pillarLocked(state: EcosystemState, pillar: PillarKey) {
  return state.lockedPillar === pillar;
}

function applyDeltas(
  state: EcosystemState,
  deltas: PillarDeltas,
  targetSpecies?: Species,
  now = Date.now(),
  allowOverflow = false,
) {
  const satietyDelta = deltas.satiety ?? deltas.vitality ?? 0;
  const comfortDelta = deltas.comfort ?? (deltas.foraging ?? 0) + (deltas.habitat ?? 0);
  const coexistenceDelta = deltas.coexistence ?? 0;
  const targetShare = targetSpecies && state.pigeons.length > 0
    ? speciesCount(state, targetSpecies) / state.pigeons.length
    : 1;
  const projected: Record<LockablePillar, number> = {
    satiety: pillarValue(state, "satiety") + (pillarLocked(state, "satiety") ? 0 : satietyDelta * targetShare),
    comfort: pillarValue(state, "comfort") + (pillarLocked(state, "comfort") ? 0 : comfortDelta * targetShare),
    coexistence: state.coexistence + (pillarLocked(state, "coexistence") ? 0 : coexistenceDelta),
  };
  const overflowed = allowOverflow
    ? (["satiety", "comfort", "coexistence"] as LockablePillar[]).find((pillar) => projected[pillar] > 100)
    : undefined;
  const targets = targetSpecies ? [targetSpecies] : speciesOrder;
  for (const species of targets) {
    state.speciesVitals[species] = {
      ...state.speciesVitals[species],
      satiety: pillarLocked(state, "satiety")
        ? state.speciesVitals[species].satiety
        : clamp(state.speciesVitals[species].satiety + satietyDelta),
      comfort: pillarLocked(state, "comfort")
        ? state.speciesVitals[species].comfort
        : clamp(state.speciesVitals[species].comfort + comfortDelta),
    };
  }
  if (!pillarLocked(state, "coexistence")) state.coexistence = clamp(state.coexistence + coexistenceDelta);
  if (overflowed) return endFromOverflow(state, overflowed, now);
  return checkForEnd(state);
}

function normalizedDeltas(deltas: PillarDeltas) {
  const normalized: Partial<Record<PillarKey, number>> = {};
  const satiety = deltas.satiety ?? deltas.vitality;
  const comfort = deltas.comfort ?? (deltas.foraging ?? 0) + (deltas.habitat ?? 0);
  if (satiety) normalized.satiety = satiety;
  if (comfort) normalized.comfort = comfort;
  if (deltas.coexistence) normalized.coexistence = deltas.coexistence;
  return normalized;
}

function pressureLevel(generations: number) {
  return Math.min(6, 1 + Math.floor(Math.max(0, generations - 1) / 4));
}

function extremeDecision(generations: number, decisionsMade: number) {
  return pressureLevel(generations) >= 3 && (decisionsMade + 1) % 5 === 0;
}

function lockEffectDecision(generations: number, decisionsMade: number) {
  return pressureLevel(generations) >= 2 && (decisionsMade + generations + 1) % 4 === 0;
}

function eventChoiceDeltas(deltas: PillarDeltas, generations: number, decisionsMade: number) {
  const pressure = pressureLevel(generations);
  const negativeScale = 1 + (pressure - 1) * 0.14;
  const positiveScale = Math.max(0.74, 1 - (pressure - 1) * 0.05);
  const volatility = extremeDecision(generations, decisionsMade) ? 1.55 : 1;
  const scaled = Object.fromEntries(
    Object.entries(deltas).map(([pillar, value]) => [
      pillar,
      Math.round((value ?? 0) * ((value ?? 0) < 0 ? negativeScale : positiveScale) * volatility),
    ]),
  ) as PillarDeltas;
  const normalized = normalizedDeltas(scaled);

  if (!Object.values(normalized).some((value) => (value ?? 0) < 0)) {
    const cost = Math.round((3 + pressure) * volatility);
    if (!normalized.satiety) scaled.satiety = -cost;
    else if (!normalized.comfort) scaled.comfort = -cost;
    else if (!normalized.coexistence) scaled.coexistence = -cost;
    else scaled.comfort = -cost;
  }
  return scaled;
}

function strongestLockCandidate(deltas: PillarDeltas) {
  const normalized = normalizedDeltas(deltas);
  return (["satiety", "comfort", "coexistence"] as LockablePillar[])
    .filter((pillar) => normalized[pillar])
    .sort((left, right) => Math.abs(normalized[right] ?? 0) - Math.abs(normalized[left] ?? 0))[0] ?? null;
}

function recentFeeds(state: EcosystemState, now: number, windowMs: number) {
  return state.feedingHistory.filter((record) => now - record.at <= windowMs);
}

function chooseFeedingEvent(species: Species | null): EventId {
  if (!species) return "leftovers";
  const eventBySpecies: Record<Species, EventId> = {
    pigeon: "feeding-crowd",
    squirrel: "squirrel-cache",
    swan: "swan-fountain",
    "stray-cat": "cat-territory",
    "stray-dog": "dog-pack",
    fox: "fox-corridor",
    hedgehog: "hedgehog-shrubs",
  };
  return eventBySpecies[species];
}

function addAnimal(state: EcosystemState, species: Species) {
  if (state.pigeons.length >= MAX_ANIMALS) return null;
  const animal = createAnimal(state.nextPigeonId, species);
  state.nextPigeonId += 1;
  state.pigeons = [...state.pigeons, animal];
  if (!state.discoveredSpecies.includes(species)) {
    state.discoveredSpecies = [...state.discoveredSpecies, species];
  }
  return animal;
}

function createChild(state: EcosystemState, parent: AnimalAgent, now: number) {
  if (state.pigeons.length >= MAX_ANIMALS) return null;
  const child = createAnimal(state.nextPigeonId, parent.species, now);
  child.plumage = parent.plumage;
  child.boldness = clamp(parent.boldness + ((state.nextPigeonId % 5) - 2) * 0.02, 0.12, 0.92);
  child.caseMask = parent.caseMask;
  child.colorSeed = parent.colorSeed;
  child.x = clamp(parent.x + ((state.nextPigeonId % 3) - 1) * 3, 12, 88);
  child.y = clamp(parent.y + ((state.nextPigeonId % 2) * 2 - 1) * 2.5, 37, 88);
  state.nextPigeonId += 1;
  state.pigeons = [...state.pigeons, child];
  return child;
}

function runGeneration(state: EcosystemState, now: number) {
  state.generations += 1;
  const lockedThisCycle = state.lockedPillar;
  const pressure = pressureLevel(state.generations);
  const comfortStrain = Math.max(0, pressure - 2) * 0.65;
  if (lockedThisCycle !== "coexistence") {
    state.coexistence = clamp(state.coexistence - (0.7 + pressure * 0.45));
  }
  state.speciesVitals = Object.fromEntries(
    speciesOrder.map((species) => {
      const profile = speciesProfiles[species];
      const count = speciesCount(state, species);
      const current = state.speciesVitals[species];
      const socialComfort = count < profile.stableMin
        ? -6 * (profile.stableMin - count)
        : count > profile.idealMax
          ? -4 * (count - profile.idealMax)
          : 1;
      return [species, {
        ...current,
        satiety: lockedThisCycle === "satiety" ? current.satiety : clamp(current.satiety - profile.hungerDecay),
        comfort: lockedThisCycle === "comfort" ? current.comfort : clamp(current.comfort + socialComfort - comfortStrain),
      }];
    }),
  ) as Record<Species, SpeciesVital>;

  if ((state.generations - 1) % 4 === 0) {
    pushNote(
      state,
      note(
        `Urban pressure rose to level ${pressure}; future trade-offs will be harsher.`,
        `城市压力升至 ${pressure} 级，之后的选择代价会更高。`,
        now,
      ),
    );
  }

  for (const species of speciesOrder) {
    const profile = speciesProfiles[species];
    const count = speciesCount(state, species);
    const survival = speciesSurvival(state, species);
    const endangered = count < profile.stableMin || survival < 24;
    const dangerTurns = endangered
      ? state.speciesVitals[species].dangerTurns + 1
      : Math.max(0, state.speciesVitals[species].dangerTurns - 1);
    state.speciesVitals[species] = { ...state.speciesVitals[species], dangerTurns };

    if (dangerTurns >= 4) {
      const removable = state.pigeons
        .filter((animal) => animal.species === species && animal.id !== state.favoriteId)
        .sort((a, b) => a.feedCount - b.feedCount || b.appetite - a.appetite || a.id - b.id)[0];
      if (removable) {
        state.pigeons = state.pigeons.filter((animal) => animal.id !== removable.id);
        state.speciesVitals[species].dangerTurns = 0;
        pushNote(
          state,
          note(
            `A ${speciesNames.en[species].toLowerCase()} was lost after four cycles below its survival line.`,
            `一只${speciesNames.zh[species]}在连续四个周期低于生存线后消失了。`,
            now,
          ),
        );
      }
    }
  }

  if (state.pigeons.length < MAX_ANIMALS) {
    const candidates = speciesOrder.filter((species) => {
      const profile = speciesProfiles[species];
      const vital = state.speciesVitals[species];
      return speciesCount(state, species) < profile.idealMax
        && vital.satiety >= 64
        && vital.comfort >= 58
        && speciesSurvival(state, species) >= 56;
    });
    const species = candidates[(state.generations + state.nextPigeonId) % Math.max(1, candidates.length)];
    if (species) {
      const parent = state.pigeons
        .filter((animal) => animal.species === species)
        .sort((a, b) => b.feedCount - a.feedCount || a.id - b.id)[0];
      if (parent) {
        const child = createChild(state, parent, now);
        if (child) {
          if (lockedThisCycle !== "satiety") {
            state.speciesVitals[species].satiety = clamp(state.speciesVitals[species].satiety - 6);
          }
          state.lastImpact = {
            at: now,
            en: `A new ${speciesNames.en[species].toLowerCase()} joined the shared plaza.`,
            zh: `一只新的${speciesNames.zh[species]}加入了共享广场。`,
            changes: { quantity: 1, satiety: -6 },
          };
          pushNote(
            state,
            note(
              `Stable food, comfort and group size allowed a new ${speciesNames.en[species].toLowerCase()} to appear.`,
              `稳定的食物、舒适度和群体数量让一只新的${speciesNames.zh[species]}出现了。`,
              now,
            ),
          );
        }
      }
    }
  }

  if (state.lockedPillar && state.unlockAtGeneration && state.generations >= state.unlockAtGeneration) {
    const unlocked = state.lockedPillar;
    state.lockedPillar = null;
    state.unlockAtGeneration = null;
    pushNote(
      state,
      note(
        `${pillarNames.en[unlocked]} was released from its two-cycle lock.`,
        `${pillarNames.zh[unlocked]}结束了持续两个周期的锁定。`,
        now,
      ),
    );
  }

  checkForEnd(state, now);
}

function advanceState(current: EcosystemState, now = Date.now()) {
  if (current.endedBy) return current;
  const elapsed = clamp((now - current.lastUpdated) / 1000, 0, 6);
  const next: EcosystemState = {
    ...current,
    pigeons: current.pigeons.map((animal) => ({
      ...animal,
      appetite: clamp(animal.appetite + elapsed * 0.009, 0, 1),
    })),
    feedingHistory: current.feedingHistory.filter((record) => now - record.at <= 180_000),
    events: [...current.events],
    policies: { ...current.policies },
    speciesVitals: Object.fromEntries(speciesOrder.map((species) => [species, { ...current.speciesVitals[species] }])) as Record<Species, SpeciesVital>,
    lastUpdated: now,
  };

  const recent = recentFeeds(next, now, 22_000);
  if (recent.every((record) => record.accepted !== false) && !pillarLocked(next, "coexistence")) {
    next.coexistence = clamp(next.coexistence + elapsed * 0.014);
  }

  let generationGuard = 0;
  while (now >= next.nextGenerationAt && generationGuard < 3) {
    runGeneration(next, next.nextGenerationAt);
    next.nextGenerationAt += GENERATION_MS;
    generationGuard += 1;
  }

  return checkForEnd(next, now);
}

function recordThrowState(
  current: EcosystemState,
  record: FeedRecord,
  onlineCount: number,
) {
  if (current.endedBy) return current;
  const advanced = advanceState(current, record.at);
  const recent = recentFeeds(advanced, record.at, 15_000);
  const pressure = 1 + Math.max(0, onlineCount - 1) * 0.08;
  const burst = Math.max(0, recent.length - 6);
  const next: EcosystemState = {
    ...advanced,
    feedingHistory: [...advanced.feedingHistory, record].slice(-90),
    events: [...advanced.events],
  };
  if (burst > 0) {
    if (!pillarLocked(next, "coexistence")) {
      next.coexistence = clamp(next.coexistence - Math.min(0.45, burst * 0.06 * pressure));
    }
    for (const species of speciesOrder) {
      if (!pillarLocked(next, "comfort")) {
        next.speciesVitals[species].comfort = clamp(
          next.speciesVitals[species].comfort - Math.min(0.5, burst * 0.08 * pressure),
        );
      }
    }
  }
  return checkForEnd(next, record.at);
}

function strongestFavorite(animals: AnimalAgent[], currentFavorite: number | null) {
  return animals.reduce<number | null>((favoriteId, animal) => {
    if (animal.feedCount <= 0) return favoriteId;
    const favorite = animals.find((candidate) => candidate.id === favoriteId);
    if (!favorite || animal.feedCount > favorite.feedCount) return animal.id;
    if (animal.feedCount === favorite.feedCount && animal.id === currentFavorite) return animal.id;
    return favoriteId;
  }, currentFavorite);
}

function resolveFeedState(
  current: EcosystemState,
  outcome: {
    id: number;
    animalId: number | null;
    food: FoodType;
    x: number;
    y: number;
    declinedBefore: number;
  },
) {
  const now = Date.now();
  if (current.endedBy) return current;
  const advanced = advanceState(current, now);
  const next: EcosystemState = {
    ...advanced,
    pigeons: advanced.pigeons.map((animal) => ({ ...animal })),
    events: [...advanced.events],
    feedingHistory: advanced.feedingHistory.map((record) =>
      record.id === outcome.id
        ? { ...record, accepted: outcome.animalId !== null, animalId: outcome.animalId }
        : record,
    ),
  };

  if (outcome.animalId === null) {
    if (!pillarLocked(next, "coexistence")) next.coexistence = clamp(next.coexistence - 1);
    if (!next.activeEventId) next.eventSpecies = null;
    next.lastImpact = {
      at: now,
      en: "No nearby animal accepted the food.",
      zh: "附近没有动物接受这次食物。",
      changes: pillarLocked(next, "coexistence") ? {} : { coexistence: -1 },
    };
    pushNote(
      next,
      note(
        `${foodData[outcome.food].names.en} remained on the ground after every nearby animal declined.`,
        `附近动物依次拒绝后，${foodData[outcome.food].names.zh}留在了地面上。`,
        now,
      ),
    );
    return checkForEnd(next, now);
  }

  const index = next.pigeons.findIndex((animal) => animal.id === outcome.animalId);
  if (index < 0) return next;
  const animal = next.pigeons[index];
  const repetition = recentFeeds(next, now, 30_000).filter(
    (record) => Math.hypot(record.x - outcome.x, record.y - outcome.y) < 9,
  ).length;
  const position = {
    x: clamp(outcome.x + ((animal.id % 3) - 1) * 1.5, 9, 91),
    y: clamp(outcome.y + ((animal.id % 2) * 2 - 1) * 1.2, 30, 90),
  };
  next.pigeons[index] = {
    ...animal,
    feedCount: animal.feedCount + 1,
    boldness: clamp(animal.boldness + 0.012, 0.12, 0.96),
    appetite: 0.08,
    nutrition: clamp(animal.nutrition + 1, 0, 4),
    satietyUntil: now + 9_000 + (animal.id % 4) * 1_200,
    x: position.x,
    y: position.y,
  };
  next.feedingHistory = next.feedingHistory.map((record) =>
    record.id === outcome.id
      ? { ...record, species: animal.species, favorite: animal.id === next.favoriteId }
      : record,
  );
  next.speciesVitals[animal.species] = {
    ...next.speciesVitals[animal.species],
    satiety: pillarLocked(next, "satiety")
      ? next.speciesVitals[animal.species].satiety
      : clamp(next.speciesVitals[animal.species].satiety + 12),
    comfort: pillarLocked(next, "comfort")
      ? next.speciesVitals[animal.species].comfort
      : clamp(next.speciesVitals[animal.species].comfort + 3),
    dangerTurns: Math.max(0, next.speciesVitals[animal.species].dangerTurns - 1),
  };
  if (repetition >= 5 && !pillarLocked(next, "coexistence")) next.coexistence = clamp(next.coexistence - 0.28);

  if (animal.species === "pigeon" && !next.collectedPlumages.includes(animal.plumage)) {
    next.collectedPlumages = [...next.collectedPlumages, animal.plumage];
    pushNote(
      next,
      note(
        `${plumageNames.en[animal.plumage]} pigeon behavior was added to the field journal.`,
        `${plumageNames.zh[animal.plumage]}鸽子的行为被加入观察日志。`,
        now,
      ),
    );
  }

  next.favoriteId = strongestFavorite(next.pigeons, next.favoriteId);
  const acceptedFeedCount = next.successfulFeedings + 1;
  next.successfulFeedings = acceptedFeedCount;
  const triggersDecision = acceptedFeedCount % 2 === 0;
  if (triggersDecision) {
    if (next.activeEventId) next.decisionQueue = [...next.decisionQueue, animal.species];
    else {
      next.activeEventId = chooseFeedingEvent(animal.species);
      next.eventSpecies = animal.species;
    }
  } else if (!next.activeEventId) next.eventSpecies = null;
  next.lastImpact = {
    at: now,
    en: `${speciesNames.en[animal.species]} accepted the food.`,
    zh: `${speciesNames.zh[animal.species]}接受了食物。`,
    changes: {
      ...(pillarLocked(next, "satiety") ? {} : { satiety: 12 }),
      ...(pillarLocked(next, "comfort") ? {} : { comfort: 3 }),
    },
  };
  const declinedText = outcome.declinedBefore > 0
    ? ` after ${outcome.declinedBefore} nearer ${outcome.declinedBefore === 1 ? "animal" : "animals"} declined`
    : "";
  pushNote(
    next,
    note(
      `${speciesNames.en[animal.species]} accepted food${declinedText}${triggersDecision ? "; a city decision is ready" : ""}.`,
      `${outcome.declinedBefore > 0 ? `前面${outcome.declinedBefore}只更近的动物拒绝后，` : ""}${speciesNames.zh[animal.species]}接受了食物${triggersDecision ? "，并触发了城市决策" : ""}。`,
      now,
    ),
  );
  return checkForEnd(next, now);
}

function killAnimalState(current: EcosystemState, animalId: number) {
  if (current.endedBy) return current;
  const animal = current.pigeons.find((candidate) => candidate.id === animalId);
  if (!animal) return current;
  const next: EcosystemState = {
    ...current,
    pigeons: current.pigeons.filter((candidate) => candidate.id !== animalId),
    favoriteId: current.favoriteId === animalId ? null : current.favoriteId,
    events: [...current.events],
    speciesVitals: Object.fromEntries(speciesOrder.map((species) => [species, { ...current.speciesVitals[species] }])) as Record<Species, SpeciesVital>,
    coexistence: pillarLocked(current, "coexistence") ? current.coexistence : clamp(current.coexistence - 3),
    lastImpact: {
      at: Date.now(),
      en: `${speciesNames.en[animal.species]} was removed from the plaza.`,
      zh: `${speciesNames.zh[animal.species]}离开了广场。`,
      changes: {
        quantity: -1,
        ...(pillarLocked(current, "comfort") ? {} : { comfort: -10 }),
        ...(pillarLocked(current, "coexistence") ? {} : { coexistence: -3 }),
      },
    },
  };
  if (!pillarLocked(next, "comfort")) {
    next.speciesVitals[animal.species].comfort = clamp(next.speciesVitals[animal.species].comfort - 10);
  }
  pushNote(
    next,
    note(
      `Direct human action killed a ${speciesNames.en[animal.species].toLowerCase()}; nearby animals scattered.`,
      `直接的人类行为杀死了一只${speciesNames.zh[animal.species]}，附近动物随即散开。`,
    ),
  );
  return checkForEnd(next);
}

function applyEventChoiceState(current: EcosystemState, side: "left" | "right") {
  if (!current.activeEventId || current.endedBy) return current;
  const now = Date.now();
  const definition = events[current.activeEventId];
  const choice = definition[side];
  const appliedDeltas = eventChoiceDeltas(choice.deltas, current.generations, current.decisionsMade);
  const nextDecisionCount = current.decisionsMade + 1;
  const queuedSpecies = current.decisionQueue[0] ?? null;
  const next: EcosystemState = {
    ...current,
    pigeons: current.pigeons.map((animal) => ({ ...animal })),
    speciesVitals: Object.fromEntries(speciesOrder.map((species) => [species, { ...current.speciesVitals[species] }])) as Record<Species, SpeciesVital>,
    policies: { ...current.policies, ...choice.policy },
    events: [...current.events],
    activeEventId: queuedSpecies ? chooseFeedingEvent(queuedSpecies) : null,
    decisionQueue: current.decisionQueue.slice(1),
    lastEventId: current.activeEventId,
    eventSpecies: queuedSpecies,
    decisionsMade: nextDecisionCount,
    lastUpdated: now,
  };
  applyDeltas(
    next,
    appliedDeltas,
    definition.species ?? current.eventSpecies ?? undefined,
    now,
    extremeDecision(current.generations, current.decisionsMade),
  );
  const spawned = !next.endedBy && choice.spawn ? addAnimal(next, choice.spawn) : null;
  const actualChanges = normalizedDeltas(appliedDeltas);
  if (current.lockedPillar) delete actualChanges[current.lockedPillar];
  let newlyLocked: LockablePillar | null = null;
  if (!next.endedBy && !next.lockedPillar && lockEffectDecision(current.generations, current.decisionsMade)) {
    newlyLocked = strongestLockCandidate(appliedDeltas);
    if (newlyLocked) {
      next.lockedPillar = newlyLocked;
      next.unlockAtGeneration = next.generations + 2;
      pushNote(
        next,
        note(
          `${pillarNames.en[newlyLocked]} became locked for the next two city cycles.`,
          `${pillarNames.zh[newlyLocked]}将在接下来的两个城市周期内保持锁定。`,
          now,
        ),
      );
    }
  }
  next.lastImpact = {
    at: now,
    en: choice.result.en,
    zh: choice.result.zh,
    changes: { ...actualChanges, ...(spawned ? { quantity: 1 } : {}) },
    ...(newlyLocked ? { lockedPillar: newlyLocked } : {}),
  };
  pushNote(next, note(choice.result.en, choice.result.zh, now));
  return checkForEnd(next, now);
}

function restartAfterEnd(current: EcosystemState) {
  const favorite = current.pigeons.find((animal) => animal.id === current.favoriteId);
  const restarted = makeInitialState(Date.now(), favorite);
  restarted.collectedPlumages = [...current.collectedPlumages];
  restarted.discoveredSpecies = [...speciesOrder];
  pushNote(
    restarted,
    note(
      "A new city cycle began. The field journal and surviving favorite carried its memory forward.",
      "新的城市周期开始了。观察日志和仍然存活的最爱动物保留了过去的记忆。",
    ),
  );
  return restarted;
}

function isSpecies(value: unknown): value is Species {
  return typeof value === "string" && speciesOrder.includes(value as Species);
}

function isPlumage(value: unknown): value is Plumage {
  return typeof value === "string" && plumageOrder.includes(value as Plumage);
}

function isLockablePillar(value: unknown): value is LockablePillar {
  return value === "satiety" || value === "comfort" || value === "coexistence";
}

function restoreState(value: unknown): EcosystemState {
  const now = Date.now();
  if (!value || typeof value !== "object") return makeInitialState(now);
  const parsed = value as Partial<EcosystemState> & { version?: number };
  const rawAnimals = Array.isArray(parsed.pigeons) ? parsed.pigeons : [];
  const pigeons = rawAnimals.slice(0, MAX_ANIMALS).map((entry, index) => {
    const saved = entry as Partial<AnimalAgent>;
    const id = Number.isFinite(Number(saved.id)) ? Math.trunc(Number(saved.id)) : index;
    const species = isSpecies(saved.species) ? saved.species : "pigeon";
    const fallback = createAnimal(id, species, now);
    return {
      ...fallback,
      ...saved,
      id,
      species,
      plumage: isPlumage(saved.plumage) ? saved.plumage : fallback.plumage,
      feedCount: Math.max(0, Math.trunc(Number(saved.feedCount) || 0)),
      boldness: clamp(Number(saved.boldness) || fallback.boldness, 0.08, 0.97),
      appetite: clamp(Number(saved.appetite) || 0.6, 0, 1),
      nutrition: clamp(Number(saved.nutrition) || 0, 0, 4),
      satietyUntil: Number(saved.satietyUntil) || 0,
      x: clamp(Number(saved.x) || fallback.x, 4, 96),
      y: clamp(Number(saved.y) || fallback.y, 22, 94),
      caseMask: Math.max(0, Math.trunc(Number(saved.caseMask) || fallback.caseMask)) % 64,
      colorSeed: Math.max(0, Math.trunc(Number(saved.colorSeed) || fallback.colorSeed)),
      bornAt: Number(saved.bornAt) || now,
    } as AnimalAgent;
  });

  if (pigeons.length === 0) return makeInitialState(now);
  const favoriteCandidate = Number(parsed.favoriteId);
  const favorite = pigeons.find((animal) => animal.id === favoriteCandidate) ?? [...pigeons]
    .filter((animal) => animal.feedCount > 0)
    .sort((a, b) => b.feedCount - a.feedCount || a.id - b.id)[0];
  const collectedPlumages = Array.isArray(parsed.collectedPlumages)
    ? parsed.collectedPlumages.filter(isPlumage)
    : pigeons.filter((animal) => animal.species === "pigeon" && animal.feedCount > 0).map((animal) => animal.plumage);

  if (parsed.version !== 8) {
    const migrated = makeInitialState(now, favorite);
    migrated.collectedPlumages = [...new Set(collectedPlumages)];
    pushNote(
      migrated,
      note(
        "The shared-plaza rules began with three animals from each species; the host favorite kept its identity.",
        "共享广场规则已按每个物种三只重新开始，玩家最喜爱的动物保留了原有身份。",
        now,
      ),
    );
    return migrated;
  }

  const base = makeInitialState(now);
  const savedVitals = parsed.speciesVitals as Partial<Record<Species, Partial<SpeciesVital>>> | undefined;
  const speciesVitals = Object.fromEntries(speciesOrder.map((species) => {
    const fallback = base.speciesVitals[species];
    const saved = savedVitals?.[species];
    return [species, {
      satiety: clamp(finiteOr(saved?.satiety, fallback.satiety)),
      comfort: clamp(finiteOr(saved?.comfort, fallback.comfort)),
      dangerTurns: clamp(Math.trunc(finiteOr(saved?.dangerTurns, 0)), 0, 4),
    }];
  })) as Record<Species, SpeciesVital>;
  const favoriteId = favorite?.id ?? null;
  const generations = Math.max(1, Math.trunc(finiteOr(parsed.generations, 1)));
  const unlockAtGeneration = Math.max(0, Math.trunc(finiteOr(parsed.unlockAtGeneration, 0))) || null;
  const lockedPillar = isLockablePillar(parsed.lockedPillar) && unlockAtGeneration && unlockAtGeneration > generations
    ? parsed.lockedPillar
    : null;
  const validEndReasons: EndReason[] = [...pillarOrder, "species-loss", "extreme-overflow"];
  const restored: EcosystemState = {
    ...base,
    ...parsed,
    version: 8,
    pigeons,
    nextPigeonId: Math.max(...pigeons.map((animal) => animal.id), 0) + 1,
    speciesVitals,
    coexistence: clamp(finiteOr(parsed.coexistence, 74)),
    generations,
    favoriteId,
    collectedPlumages: [...new Set(collectedPlumages)],
    discoveredSpecies: [...speciesOrder],
    animalSpeciesUnlocked: true,
    firstSquirrelSeeded: true,
    feedingHistory: Array.isArray(parsed.feedingHistory)
      ? parsed.feedingHistory.slice(-90).map((record) => ({ ...(record as FeedRecord), food: "food" as const }))
      : [],
    successfulFeedings: Math.max(0, Math.trunc(finiteOr(parsed.successfulFeedings, 0))),
    decisionsMade: Math.max(0, Math.trunc(finiteOr(parsed.decisionsMade, 0))),
    lockedPillar,
    unlockAtGeneration: lockedPillar ? unlockAtGeneration : null,
    overflowedPillar: isLockablePillar(parsed.overflowedPillar) ? parsed.overflowedPillar : null,
    decisionQueue: Array.isArray(parsed.decisionQueue) ? parsed.decisionQueue.filter(isSpecies).slice(0, 8) : [],
    events: Array.isArray(parsed.events) ? parsed.events.slice(-18) as FieldNote[] : base.events,
    lastImpact: parsed.lastImpact && typeof parsed.lastImpact === "object" ? parsed.lastImpact : null,
    policies: parsed.policies ? { ...base.policies, ...parsed.policies } : base.policies,
    activeEventId: parsed.activeEventId && parsed.activeEventId in events ? parsed.activeEventId : null,
    lastEventId: parsed.lastEventId && parsed.lastEventId in events ? parsed.lastEventId : null,
    eventSpecies: isSpecies(parsed.eventSpecies) ? parsed.eventSpecies : null,
    endedBy: validEndReasons.includes(parsed.endedBy as EndReason) ? parsed.endedBy as EndReason : null,
    endedAt: Number(parsed.endedAt) || null,
    lastUpdated: now,
    nextGenerationAt: Math.max(now + 3_000, Number(parsed.nextGenerationAt) || now + GENERATION_MS),
  };
  return checkForEnd(restored, now);
}

function loadState() {
  if (typeof window === "undefined") return makeInitialState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return saved ? restoreState(JSON.parse(saved)) : makeInitialState();
  } catch {
    return makeInitialState();
  }
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

    const schedule = (delay: number) => {
      window.clearTimeout(heartbeatTimer);
      heartbeatTimer = window.setTimeout(() => void heartbeat(), delay);
    };
    async function heartbeat() {
      if (stopped || inFlight) return;
      inFlight = true;
      let delay = PRESENCE_HEARTBEAT_MS;
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("presence");
        const payload = (await response.json()) as { onlineCount?: unknown };
        const count = Number(payload.onlineCount);
        if (!stopped && Number.isFinite(count)) setOnlineCount(Math.max(1, Math.trunc(count)));
      } catch {
        delay = PRESENCE_RETRY_MS;
      } finally {
        inFlight = false;
        if (!stopped) schedule(delay);
      }
    }
    const onVisible = () => document.visibilityState === "visible" && void heartbeat();
    void heartbeat();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return onlineCount;
}

function projectilePosition(particle: FoodParticle, now: number) {
  const progress = clamp((now - particle.launchedAt) / particle.duration, 0, 1);
  const x = particle.startX + (particle.targetX - particle.startX) * progress;
  const linearY = particle.startY + (particle.targetY - particle.startY) * progress;
  const y = linearY - particle.arcHeight * 4 * progress * (1 - progress);
  return { x, y, landed: progress >= 1 };
}

function FoodParticleSprite({ particle }: { particle: FoodParticle }) {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const element = elementRef.current;
      if (!element) return;
      const position = projectilePosition(particle, now);
      element.style.setProperty("--food-x", `${position.x}%`);
      element.style.setProperty("--food-y", `${position.y}%`);
      element.classList.toggle("food-particle-landed", position.landed);
      if (now < particle.expiresAt) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [particle]);

  const initial = projectilePosition(particle, particle.launchedAt);
  return (
    <span
      className={`food-particle v6-food-${particle.food}`}
      data-food-id={particle.id}
      ref={elementRef}
      style={{
        "--food-x": `${initial.x}%`,
        "--food-y": `${initial.y}%`,
        "--food-color": foodData[particle.food].color,
      } as React.CSSProperties}
    >
      {foodData[particle.food].symbol}
    </span>
  );
}

function acceptanceProbability(
  animal: AnimalAgent,
  state: EcosystemState,
  now: number,
) {
  if (now < animal.satietyUntil) return 0.035;
  const appetite = 0.48 + animal.appetite * 0.52;
  const temperament = 0.58 + animal.boldness * 0.42;
  const familiarity = Math.min(0.16, animal.feedCount * 0.025);
  const bins = state.policies.sealedBins ? 0.035 : 0;
  return clamp(feedingAcceptance[animal.species] * appetite * temperament + familiarity + bins, 0.08, 0.97);
}

function intentFor(probability: number): Intent {
  if (probability >= 0.72) return "eager";
  if (probability >= 0.42) return "curious";
  if (probability >= 0.17) return "wary";
  return "refusing";
}

function detectionRadius(animal: AnimalAgent) {
  const base: Record<Species, number> = {
    pigeon: 25,
    squirrel: 23,
    swan: 22,
    "stray-cat": 24,
    "stray-dog": 31,
    fox: 32,
    hedgehog: 19,
  };
  return base[animal.species];
}

function preferredFollowTarget(animal: AnimalAgent, target: { x: number; y: number }) {
  if (animal.species === "swan") return { x: clamp(target.x, 67, 88), y: clamp(target.y, 34, 56) };
  if (animal.species === "fox") return { x: clamp(target.x + 5, 10, 91), y: clamp(target.y, 29, 83) };
  return { x: clamp(target.x, 9, 91), y: clamp(target.y, 30, 88) };
}

function feedClock() {
  return { motion: window.performance.now(), wall: Date.now() };
}

function acceptingAnimalIndex(
  animals: AnimalAgent[],
  probabilities: number[],
  reserved: Set<number>,
) {
  for (let index = 0; index < animals.length; index += 1) {
    if (!reserved.has(animals[index].id) && Math.random() < probabilities[index]) return index;
  }
  return -1;
}

function AnimalSprite({ animal }: { animal: AnimalAgent }) {
  const isPigeon = animal.species === "pigeon";
  const standardRow = wildlifeRows[animal.species];
  const extraRow = extraRows[animal.species];
  const className = [
    "v6-animal-sprite",
    isPigeon ? `pigeon-word-${animal.plumage}` : "wildlife-agent",
    standardRow !== undefined ? "v6-standard-wildlife" : "",
    extraRow !== undefined ? "v6-extra-wildlife" : "",
    "is-atlas-ready",
  ]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--motion-y": `${plumageOrder.indexOf(animal.plumage) * 33.333333}%`,
    "--wildlife-y": `${(standardRow ?? 0) * 33.333333}%`,
    "--extra-y": `${(extraRow ?? 0) * 100}%`,
  } as React.CSSProperties;

  if (isPigeon) return <span aria-hidden="true" className={`${className} pigeon-bird-sprite`} style={style} />;
  return <span aria-hidden="true" className={`${className} wildlife-bird-sprite`} style={style} />;
}

function animalAria(animal: AnimalAgent, language: Language, isFavorite: boolean) {
  const name = speciesNames[language][animal.species];
  const color = animal.species === "pigeon" ? plumageNames[language][animal.plumage] : "";
  if (language === "zh") {
    return `${color}${name}，已投喂${animal.feedCount}次，大胆程度${Math.round(animal.boldness * 100)}%${isFavorite ? "，最喜爱的动物" : ""}`;
  }
  return `${color ? `${color} ` : ""}${name}, fed ${animal.feedCount} times, boldness ${Math.round(animal.boldness * 100)}%${isFavorite ? ", host favorite" : ""}`;
}

function PillarIcon({ pillar }: { pillar: PillarKey }) {
  return <span aria-hidden="true" className={`pillar-icon pillar-icon-${pillar}`}>{pillarIcons[pillar]}</span>;
}

function impactMagnitude(value: number, language: Language) {
  const amount = Math.abs(value);
  if (amount <= 4) return { level: 1, label: uiCopy[language].impactSlight };
  if (amount <= 8) return { level: 2, label: uiCopy[language].impactNoticeable };
  if (amount <= 13) return { level: 3, label: uiCopy[language].impactStrong };
  return { level: 4, label: uiCopy[language].impactSevere };
}

function ImpactChips({ changes, language, lockedPillar = null, display = "exact" }: {
  changes: Partial<Record<PillarKey, number>>;
  language: Language;
  lockedPillar?: LockablePillar | null;
  display?: "exact" | "magnitude";
}) {
  return (
    <span className={`v8-impact-chips ${display === "magnitude" ? "is-preview" : "is-result"}`}>
      {pillarOrder.filter((pillar) => changes[pillar]).map((pillar) => {
        const value = changes[pillar] ?? 0;
        const magnitude = impactMagnitude(value, language);
        const locked = lockedPillar === pillar;
        return (
          <span
            aria-label={`${pillarNames[language][pillar]}, ${locked ? uiCopy[language].locked : display === "magnitude" ? magnitude.label : value}`}
            className={locked ? "is-locked" : display === "magnitude" ? "is-magnitude" : value > 0 ? "is-positive" : "is-negative"}
            key={pillar}
          >
            <PillarIcon pillar={pillar} />
            <small>{pillarNames[language][pillar]}</small>
            {locked ? <b>{uiCopy[language].locked}</b> : display === "magnitude" ? (
              <b className="v10-impact-magnitude">
                <span aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => <i className={index < magnitude.level ? "is-filled" : ""} key={index} />)}
                </span>
                {magnitude.label}
              </b>
            ) : <b>{value > 0 ? "+" : ""}{value}</b>}
          </span>
        );
      })}
    </span>
  );
}

function LatestImpact({ impact, language, now }: { impact: OutcomeImpact | null; language: Language; now: number }) {
  if (!impact || now - impact.at > 8_000) return null;
  return (
    <aside aria-live="polite" className="v8-impact-toast" role="status">
      <p>{uiCopy[language].latestChange}</p>
      <strong>{impact[language]}</strong>
      <ImpactChips changes={impact.changes} language={language} />
      {impact.lockedPillar ? (
        <span className="v9-lock-result"><PillarIcon pillar={impact.lockedPillar} />{pillarNames[language][impact.lockedPillar]} · {uiCopy[language].locked}</span>
      ) : null}
    </aside>
  );
}

function EventCard({
  eventId,
  generations,
  decisionsMade,
  lockedPillar,
  language,
  onChoose,
}: {
  eventId: EventId;
  generations: number;
  decisionsMade: number;
  lockedPillar: LockablePillar | null;
  language: Language;
  onChoose: (side: "left" | "right") => void;
}) {
  const definition = events[eventId];
  const copy = uiCopy[language];
  const extreme = extremeDecision(generations, decisionsMade);
  const lockEffect = lockEffectDecision(generations, decisionsMade) && !lockedPillar;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onChoose("left");
      if (event.key === "ArrowRight") onChoose("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChoose]);

  return (
    <aside
      aria-labelledby="city-event-title"
      className={`v6-event-card ${extreme ? "is-extreme-event" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
    >
      <p>{definition.eyebrow[language]}</p>
      <h2 id="city-event-title">{definition.title[language]}</h2>
      <span>{definition.body[language]}</span>
      {extreme || lockEffect ? (
        <div className="v9-event-flags" role="status">
          {extreme ? <b><i aria-hidden="true">!</i><span>{copy.extremeEvent}<small>{copy.extremeEventCue}</small></span></b> : null}
          {lockEffect ? <b><i aria-hidden="true">▣</i><span>{copy.lockEffect}<small>{copy.specialEffectCue}</small></span></b> : null}
        </div>
      ) : null}
      <div>
        <button aria-label={copy.left} onClick={() => onChoose("left")} type="button">
          <i aria-hidden="true">←</i>
          <strong>{definition.left.label[language]}</strong>
          <ImpactChips changes={normalizedDeltas(eventChoiceDeltas(definition.left.deltas, generations, decisionsMade))} display="magnitude" language={language} lockedPillar={lockedPillar} />
        </button>
        <button aria-label={copy.right} onClick={() => onChoose("right")} type="button">
          <strong>{definition.right.label[language]}</strong>
          <i aria-hidden="true">→</i>
          <ImpactChips changes={normalizedDeltas(eventChoiceDeltas(definition.right.deltas, generations, decisionsMade))} display="magnitude" language={language} lockedPillar={lockedPillar} />
        </button>
      </div>
    </aside>
  );
}

function FieldJournal({ state, language }: { state: EcosystemState; language: Language }) {
  const [open, setOpen] = useState(false);
  const copy = uiCopy[language];
  return (
    <aside
      className={`v6-journal ${open ? "is-open" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        aria-expanded={open}
        aria-label={copy.fieldGuide}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true">▤</span>
        <b>{copy.fieldGuide}</b>
        <small>{state.discoveredSpecies.length}/7</small>
      </button>
      {open ? (
        <section>
          <header>
            <h2>{copy.fieldGuide}</h2>
            <button aria-label="Close" onClick={() => setOpen(false)} type="button">×</button>
          </header>
          <h3>{copy.colors}</h3>
          <div className="v6-journal-colors">
            {plumageOrder.map((plumage) => (
              <span className={state.collectedPlumages.includes(plumage) ? "is-found" : ""} key={plumage}>
                <i className={`pigeon-color-${plumage}`} />
                {state.collectedPlumages.includes(plumage) ? plumageNames[language][plumage] : "???"}
              </span>
            ))}
          </div>
          <h3>{copy.species}</h3>
          <div className="v7-species-status">
            {speciesOrder.map((species) => {
              const count = speciesCount(state, species);
              const profile = speciesProfiles[species];
              const survival = Math.round(speciesSurvival(state, species));
              const danger = state.speciesVitals[species].dangerTurns > 0 || count < profile.stableMin || survival < 30;
              return (
                <div className={danger ? "is-at-risk" : "is-stable"} key={species}>
                  <span><strong>{speciesNames[language][species]}</strong><small>{danger ? copy.atRisk : copy.stable}</small></span>
                  <b>{count}<i>/ {profile.stableMin} {copy.stableLine}</i></b>
                  <em><i style={{ width: `${survival}%` }} /><small>{copy.survival} {survival}</small></em>
                </div>
              );
            })}
          </div>
          <h3>{copy.notes}</h3>
          <ol>
            {[...state.events].slice(-5).reverse().map((entry, index) => (
              <li key={`${entry.at}-${index}`}>{entry[language]}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </aside>
  );
}

function TutorialDialog({
  language,
  step,
  onLanguageChange,
  onBack,
  onNext,
  onClose,
}: {
  language: Language;
  step: number;
  onLanguageChange: (language: Language) => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const copy = uiCopy[language];
  const current = tutorialSteps[language][step];
  const last = step === tutorialSteps[language].length - 1;
  return (
    <div className="v6-modal-backdrop">
      <section aria-modal="true" className="v6-tutorial" role="dialog">
        <header>
          <div>
            <p>{copy.tutorial}</p>
            <h2>{copy.tutorialTitle}</h2>
          </div>
          <div aria-label={copy.language} className="v6-language" role="group">
            <button aria-pressed={language === "en"} onClick={() => onLanguageChange("en")} type="button">EN</button>
            <button aria-pressed={language === "zh"} onClick={() => onLanguageChange("zh")} type="button">中文</button>
          </div>
        </header>
        <div className={`v6-tutorial-visual step-${step + 1}`} aria-hidden="true">
          {step === 0 ? <><b>.</b><i className="v6-arc" /><span className="v6-target" /></> : null}
          {step === 1 ? <><span className="v6-cue eager" /><span className="v6-cue curious" /><span className="v6-cue wary" /></> : null}
          {step === 2 ? <><span className="v6-mini-card" /><i>→</i><span className="v6-mini-meters" /></> : null}
          {step === 3 ? pillarOrder.map((pillar) => <span className={`pillar-${pillar}`} key={pillar}>{pillarNames[language][pillar]}</span>) : null}
        </div>
        <div className="v6-tutorial-copy">
          <small>{copy.tutorialStep} {step + 1}/{tutorialSteps[language].length}</small>
          <h3>{current.title}</h3>
          <p>{current.body}</p>
        </div>
        <footer>
          <button className="is-quiet" onClick={onClose} type="button">{copy.tutorialSkip}</button>
          <span>
            <button disabled={step === 0} onClick={onBack} type="button">←</button>
            <button onClick={onNext} type="button">{last ? copy.tutorialFinish : copy.tutorialNext}</button>
          </span>
        </footer>
      </section>
    </div>
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
  const status: Record<CloudSyncStatus, string> = {
    local: copy.savedLocal,
    loading: copy.loading,
    saving: copy.saving,
    saved: copy.saved,
    error: copy.syncError,
  };
  if (!account) {
    return (
      <a className="account-control account-sign-in" href={signInPath}>
        <span aria-hidden="true" className="account-cloud-icon">☁</span>
        <span><strong>{copy.signIn}</strong><small>{copy.savedLocal}</small></span>
      </a>
    );
  }
  return (
    <div className={`account-control account-signed-in account-sync-${syncStatus}`} role="status">
      <span className="account-avatar">{account.displayName.trim().charAt(0).toUpperCase() || "U"}</span>
      <span className="account-identity"><strong>{account.displayName}</strong><small>{status[syncStatus]}</small></span>
      <a aria-label={copy.signOut} className="account-sign-out" href={signOutPath}>↪</a>
    </div>
  );
}

function SceneControls({
  language,
  onLanguageChange,
  onTutorial,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onTutorial: () => void;
}) {
  return (
    <div className="scene-controls v6-scene-controls" onPointerDown={(event) => event.stopPropagation()}>
      <div className="language-switch" role="group">
        <button aria-pressed={language === "en"} onClick={() => onLanguageChange("en")} type="button">EN</button>
        <button aria-pressed={language === "zh"} onClick={() => onLanguageChange("zh")} type="button">中文</button>
      </div>
      <button className="tutorial-help-button" onClick={onTutorial} title={uiCopy[language].tutorial} type="button">?</button>
    </div>
  );
}

function SimulationScene({
  state,
  language,
  onlineCount,
  onThrow,
  onResolve,
  onKill,
  onEventChoice,
}: {
  state: EcosystemState;
  language: Language;
  onlineCount: number;
  onThrow: (record: FeedRecord) => void;
  onResolve: (outcome: { id: number; animalId: number | null; food: FoodType; x: number; y: number; declinedBefore: number }) => void;
  onKill: (animalId: number) => void;
  onEventChoice: (side: "left" | "right") => void;
}) {
  const copy = uiCopy[language];
  const food: FoodType = "food";
  const [particles, setParticles] = useState<FoodParticle[]>([]);
  const [responses, setResponses] = useState<AnimalResponse[]>([]);
  const [deathEffects, setDeathEffects] = useState<DeathEffect[]>([]);
  const sequence = useRef(1);
  const deathSequence = useRef(1);
  const timers = useRef<number[]>([]);
  const cursorTarget = useRef<{ x: number; y: number } | null>(null);
  const favoritePositionRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const animalLayerRef = useRef<HTMLDivElement>(null);
  const favorite = state.pigeons.find((animal) => animal.id === state.favoriteId);
  const favoriteAgentRef = useRef(favorite);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => { favoriteAgentRef.current = favorite; }, [favorite]);

  const favoriteIsResponding = Boolean(
    favorite && responses.some((response) => response.animalId === favorite.id && response.phase !== "landing"),
  );
  useEffect(() => {
    const initialFavorite = favoriteAgentRef.current;
    if (!initialFavorite) {
      favoritePositionRef.current = null;
      return;
    }
    if (favoritePositionRef.current?.id !== initialFavorite.id) {
      favoritePositionRef.current = { id: initialFavorite.id, x: initialFavorite.x, y: initialFavorite.y };
    }
    let frame = 0;
    const move = () => {
      const currentFavorite = favoriteAgentRef.current;
      const current = favoritePositionRef.current;
      if (!currentFavorite || !current || current.id !== currentFavorite.id) return;
      const rawTarget = cursorTarget.current ?? { x: currentFavorite.x, y: currentFavorite.y };
      const target = preferredFollowTarget(currentFavorite, rawTarget);
      const speed = currentFavorite.species === "hedgehog" ? 0.018 : currentFavorite.species === "swan" ? 0.03 : 0.045;
      if (!favoriteIsResponding) {
        const next = { id: current.id, x: current.x + (target.x - current.x) * speed, y: current.y + (target.y - current.y) * speed };
        if (Math.hypot(next.x - current.x, next.y - current.y) >= 0.004) {
          favoritePositionRef.current = next;
          const element = animalLayerRef.current?.querySelector<HTMLElement>(`[data-animal-id="${currentFavorite.id}"]`);
          element?.style.setProperty("--x", `${next.x}%`);
          element?.style.setProperty("--y", `${next.y}%`);
          element?.style.setProperty("--claim-x", `${next.x}%`);
          element?.style.setProperty("--claim-y", `${next.y}%`);
        }
      }
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [favorite?.id, favoriteIsResponding]);

  const displayPosition = (animal: AnimalAgent) => {
    const response = [...responses].reverse().find((item) => item.animalId === animal.id);
    if (response && response.phase !== "noticing" && response.phase !== "rejecting") return { x: response.x, y: response.y };
    return { x: animal.x, y: animal.y };
  };

  const interactionPosition = (animal: AnimalAgent) => {
    if (animal.id === favorite?.id && favoritePositionRef.current?.id === animal.id) return favoritePositionRef.current;
    return displayPosition(animal);
  };

  const throwFood = (targetX: number, targetY: number) => {
    if (state.endedBy || state.activeEventId) return;
    const clock = feedClock();
    const nowPerformance = clock.motion;
    const now = clock.wall;
    const id = now * 1_000 + sequence.current++;
    const startX = clamp(50 + (targetX - 50) * 0.16, 42, 58);
    const startY = 96;
    const distance = Math.hypot(targetX - startX, targetY - startY);
    const duration = clamp(620 + distance * 5.4, 700, 1080);
    const reserved = new Set(responses.filter((response) => response.winner && response.phase !== "landing").map((response) => response.animalId));
    const ranked = state.pigeons
      .map((animal) => ({ animal, position: interactionPosition(animal) }))
      .map((entry) => ({ ...entry, distance: Math.hypot(entry.position.x - targetX, entry.position.y - targetY) }))
      .filter((entry) => entry.distance <= detectionRadius(entry.animal))
      .sort((left, right) => left.distance - right.distance || left.animal.id - right.animal.id);

    const probabilities = ranked.map(({ animal }) => acceptanceProbability(animal, state, now));
    const winnerIndex = acceptingAnimalIndex(ranked.map(({ animal }) => animal), probabilities, reserved);
    const winner = winnerIndex >= 0 ? ranked[winnerIndex].animal : null;
    const attemptDelay = Math.max(0, winnerIndex) * 280;
    const eatDelay = duration + attemptDelay + 820;
    const expiresAt = nowPerformance + (winner ? eatDelay : FOOD_LIFETIME_MS);
    const particle: FoodParticle = {
      id,
      food,
      startX,
      startY,
      targetX,
      targetY,
      launchedAt: nowPerformance,
      duration,
      arcHeight: clamp(10 + distance * 0.13, 14, 25),
      acceptedBy: winner?.id ?? null,
      expiresAt,
    };
    const responseLimit = winnerIndex >= 0 ? Math.max(winnerIndex + 1, Math.min(3, ranked.length)) : Math.min(3, ranked.length);
    const responders: AnimalResponse[] = ranked
      .slice(0, responseLimit)
      .map(({ animal }, index) => {
        const angle = ((animal.id * 137.508) % 360) * Math.PI / 180;
        const isWinner = animal.id === winner?.id;
        return {
          foodId: id,
          animalId: animal.id,
          x: isWinner ? targetX : clamp(targetX + Math.cos(angle) * (3.4 + animal.id % 3), 5, 95),
          y: isWinner ? targetY : clamp(targetY + Math.sin(angle) * (3.4 + animal.id % 3), 25, 92),
          phase: "noticing" as const,
          intent: intentFor(probabilities[index]),
          winner: isWinner,
          delay: Math.min(index, Math.max(0, winnerIndex)) * 280,
        };
      });

    setParticles((current) => [...current, particle]);
    setResponses((current) => [
      ...current.filter((response) => !responders.some((item) => item.animalId === response.animalId)),
      ...responders,
    ]);
    onThrow({ id, at: now, food, x: targetX, y: targetY, accepted: null, animalId: null, species: null, favorite: false });

    const approachTimer = window.setTimeout(() => {
      setResponses((current) => current.map((response) =>
        response.foodId === id
          ? { ...response, phase: "approach" }
          : response,
      ));
    }, 160);

    const resolveTimer = window.setTimeout(() => {
      onResolve({ id, animalId: winner?.id ?? null, food, x: targetX, y: targetY, declinedBefore: winnerIndex >= 0 ? winnerIndex : ranked.length });
      if (winner) {
        setResponses((current) => current.map((response) => response.foodId === id ? { ...response, phase: response.winner ? "eating" : "landing" } : response));
      } else {
        setResponses((current) => current.map((response) => response.foodId === id ? { ...response, phase: "landing" } : response));
      }
      setParticles((current) => current.filter((item) => item.id !== id));
    }, winner ? eatDelay : FOOD_LIFETIME_MS);
    const cleanupTimer = window.setTimeout(() => {
      setResponses((current) => current.filter((response) => response.foodId !== id));
    }, (winner ? eatDelay : FOOD_LIFETIME_MS) + 950);
    timers.current.push(approachTimer, resolveTimer, cleanupTimer);
  };

  const pointerPosition = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 4, 96),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 8, 92),
    };
  };
  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, [role='dialog']")) return;
    const position = pointerPosition(event);
    throwFood(position.x, position.y);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    cursorTarget.current = pointerPosition(event);
  };
  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>, animal: AnimalAgent) => {
    event.preventDefault();
    event.stopPropagation();
    if (deathEffects.some((effect) => effect.animal.id === animal.id)) return;
    const position = interactionPosition(animal);
    const id = deathSequence.current++;
    setDeathEffects((current) => [...current, { id, animal, x: position.x, y: position.y }]);
    setResponses((current) => current.filter((response) => response.animalId !== animal.id));
    onKill(animal.id);
    const timer = window.setTimeout(() => setDeathEffects((current) => current.filter((effect) => effect.id !== id)), DEATH_ANIMATION_MS);
    timers.current.push(timer);
  };

  const stableSpeciesCount = speciesOrder.filter((species) => {
    const profile = speciesProfiles[species];
    return speciesCount(state, species) >= profile.stableMin && speciesSurvival(state, species) >= 30;
  }).length;

  return (
    <section
      aria-label={copy.throwAria}
      className="ecosystem ecosystem-v6 ecosystem-v7 ecosystem-v8"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          throwFood(50, 58);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerLeave={() => { cursorTarget.current = null; }}
      onPointerMove={onPointerMove}
      role="application"
      style={{
        "--wildlife-atlas": "url('/wildlife-motion-atlas-transparent.webp')",
        "--swan-atlas": "url('/swan-motion-atlas-clean.png')",
        "--cat-atlas": "url('/cat-motion-atlas-aligned.png')",
        "--dog-atlas": "url('/dog-motion-atlas-aligned.png')",
        "--extra-atlas": "url('/fox-hedgehog-motion-atlas-transparent.webp')",
      } as React.CSSProperties}
      tabIndex={0}
    >
      <header className="scene-header">
        <h1>{copy.brand}</h1>
        <div className="scene-generation">
          <span>{copy.cycle}</span><strong>{String(state.generations).padStart(2, "0")}</strong>
          <small>{copy.pressure} {pressureLevel(state.generations)}/6</small>
        </div>
      </header>

      <div className="online-marker" role="status">
        <span>{copy.online}</span><strong>{onlineCount}</strong><small>{copy.collectivePressure}</small>
      </div>
      <div className="city-circle" aria-hidden="true" />
      <div className="plaza-population" role="status"><span>{copy.sharedPlaza} · {copy.stableGroups}</span><strong>{stableSpeciesCount}/7</strong></div>
      <div className="plaza-metrics">
        {pillarOrder.map((pillar, index) => {
          const value = pillarValue(state, pillar);
          const display = pillar === "quantity" ? `${state.pigeons.length}/${MAX_ANIMALS}` : Math.round(value);
          const percentage = pillar === "quantity" ? state.pigeons.length / MAX_ANIMALS * 100 : value;
          const critical = pillar === "quantity" ? stableSpeciesCount < speciesOrder.length : value <= 25;
          const highRisk = pillar !== "quantity" && value >= 85;
          const locked = state.lockedPillar === pillar;
          const lockRemaining = locked && state.unlockAtGeneration
            ? Math.max(1, state.unlockAtGeneration - state.generations)
            : 0;
          return (
            <div
              aria-label={`${pillarNames[language][pillar]} ${display}${locked ? `, ${copy.locked} ${lockRemaining}` : highRisk ? `, ${copy.overflowRisk}` : ""}`}
              className={`plaza-metric plaza-metric-${index + 1} ${critical ? "is-critical" : ""} ${highRisk ? "is-high-risk" : ""} ${locked ? "is-locked" : ""}`}
              key={pillar}
              role="status"
              style={{ "--metric-value": `${percentage}%` } as React.CSSProperties}
            >
              <PillarIcon pillar={pillar} />
              <span><small>{pillarNames[language][pillar]}</small><strong>{display}</strong></span>
              <i><b /></i>
              {locked ? <em className="v9-metric-lock"><span aria-hidden="true">▣</span>{copy.locked} {lockRemaining}</em> : null}
              {highRisk && !locked ? <em className="v9-metric-risk"><span aria-hidden="true">!</span>{copy.overflowRisk}</em> : null}
            </div>
          );
        })}
      </div>

      <div className="v6-animal-layer" ref={animalLayerRef}>
        {state.pigeons.map((animal) => {
          const response = [...responses].reverse().find((item) => item.animalId === animal.id);
          const position = displayPosition(animal);
          const isFavorite = animal.id === favorite?.id;
          const phase = response?.phase ?? "idle";
          return (
            <div
              aria-label={animalAria(animal, language, isFavorite)}
              className={`pigeon-word animal-agent animal-agent-${animal.species} pigeon-word-shared ${animal.boldness >= 0.55 ? "pigeon-word-bold" : "pigeon-word-shy"} ${isFavorite ? "pigeon-word-host-favorite" : ""} v6-animal v6-intent-${response?.intent ?? "none"} v6-phase-${phase}`}
              data-animal-id={animal.id}
              data-food-intent={response?.intent}
              data-species={animal.species}
              key={animal.id}
              onContextMenu={(event) => onContextMenu(event, animal)}
              onKeyDown={(event) => {
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  event.stopPropagation();
                  onKill(animal.id);
                }
              }}
              style={{
                "--x": `${position.x}%`,
                "--y": `${position.y}%`,
                "--claim-x": isFavorite && !response ? undefined : `${position.x}%`,
                "--claim-y": isFavorite && !response ? undefined : `${position.y}%`,
                "--tilt": `${((animal.id % 5) - 2) * 0.7}deg`,
                "--scale": 1,
                "--speed": `${6.8 + (animal.id % 5) * 0.35}s`,
                "--flight-duration": "850ms",
                "--response-delay": `${response?.delay ?? 0}ms`,
              } as React.CSSProperties}
              tabIndex={0}
            >
              <AnimalSprite animal={animal} />
              {isFavorite ? <span aria-hidden="true" className="host-favorite-heart">♥</span> : null}
              <span className="sr-only">{animal.species === "pigeon" ? wordFromCaseMask(animal.caseMask) : speciesNames.en[animal.species]}</span>
            </div>
          );
        })}
      </div>

      <div aria-hidden="true" className="pigeon-death-layer">
        {deathEffects.map((effect) => {
          const isPigeon = effect.animal.species === "pigeon";
          return (
            <div
              className={`pigeon-death-effect ${isPigeon ? "" : "wildlife-death-effect"} animal-agent-${effect.animal.species}`}
              key={effect.id}
              style={{
                "--death-x": `${effect.x}%`,
                "--death-y": `${effect.y}%`,
                "--death-scale": 1,
                "--death-tilt": "0deg",
              } as React.CSSProperties}
            >
              <AnimalSprite animal={effect.animal} />
              {Array.from({ length: 12 }, (_, index) => (
                <i
                  className="pigeon-feather"
                  key={index}
                  style={{
                    "--feather-color": effect.animal.species === "pigeon" ? ["#5f6664", "#dee0db", "#765242", "#315f5b"][index % 4] : "#7b644d",
                    "--feather-dx": `${Math.cos(index * 2.4) * (28 + index * 2)}px`,
                    "--feather-dy": `${Math.sin(index * 2.4) * (28 + index * 2) - 24}px`,
                    "--feather-rotation": `${index * 37 - 120}deg`,
                    "--feather-delay": `${(index % 5) * 36}ms`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div aria-hidden="true" className="food-particle-layer">
        {particles.map((particle) => <FoodParticleSprite key={particle.id} particle={particle} />)}
      </div>

      <div aria-label={`${copy.feedAction}: ${copy.decisionProgress}`} className="feed-launcher v8-feed-launcher" role="status">
        <b aria-hidden="true">{foodData.food.symbol}</b>
        <span>{copy.feedAction}</span>
        <small>{copy.decisionProgress} {state.activeEventId ? 2 : state.successfulFeedings % 2}/2{state.decisionQueue.length ? ` +${state.decisionQueue.length}` : ""}</small>
      </div>

      <div className={`v6-favorite-plaque ${favorite ? "has-favorite" : "is-empty"}`} data-host-favorite-id={favorite?.id} role="status">
        <div className="v6-favorite-portrait">
          {favorite ? <AnimalSprite animal={favorite} /> : <span>♥</span>}
        </div>
        <span><small>{copy.hostFavorite}</small><strong>{favorite ? speciesNames[language][favorite.species] : copy.favoriteEmpty}</strong>{favorite ? <b>{favorite.feedCount} {copy.feeds}</b> : null}</span>
        {favorite ? <i aria-label={copy.protected}>♥</i> : null}
      </div>

      <FieldJournal language={language} state={state} />
      <LatestImpact impact={state.lastImpact} language={language} now={state.lastUpdated} />
      {state.activeEventId ? (
        <EventCard
          decisionsMade={state.decisionsMade}
          eventId={state.activeEventId}
          generations={state.generations}
          language={language}
          lockedPillar={state.lockedPillar}
          onChoose={onEventChoice}
        />
      ) : null}
    </section>
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
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(account ? "loading" : "local");
  const latestStateRef = useRef(state);
  const lastCloudSaveRef = useRef("");
  const onlineCount = useOnlinePresence();
  const copy = uiCopy[language];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setState(loadState());
      try {
        const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const preferred = storedLanguage === "zh" || storedLanguage === "en"
          ? storedLanguage
          : window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
        setLanguage(preferred);
        setTutorialOpen(window.localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "seen");
      } catch {
        setLanguage(window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en");
        setTutorialOpen(true);
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    latestStateRef.current = state;
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [hydrated, language]);

  useEffect(() => {
    if (!hydrated || !account) return;
    const controller = new AbortController();
    void fetch("/api/simulation-state", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("cloud load failed");
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
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCloudReady(true);
        setCloudSyncStatus("error");
      });
    return () => controller.abort();
  }, [account, hydrated]);

  useEffect(() => {
    if (!hydrated || !account || !cloudReady) return;
    let active = true;
    const persist = async () => {
      const snapshot = latestStateRef.current;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastCloudSaveRef.current) {
        if (active) setCloudSyncStatus("saved");
        return;
      }
      if (active) setCloudSyncStatus("saving");
      try {
        const response = await fetch("/api/simulation-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: snapshot }),
        });
        if (!response.ok) throw new Error("cloud save failed");
        lastCloudSaveRef.current = serialized;
        if (active) setCloudSyncStatus("saved");
      } catch {
        if (active) setCloudSyncStatus("error");
      }
    };
    const beforeLeave = () => {
      const serialized = JSON.stringify(latestStateRef.current);
      if (serialized !== lastCloudSaveRef.current && typeof window.navigator.sendBeacon === "function") {
        window.navigator.sendBeacon(
          "/api/simulation-state",
          new Blob([`{"state":${serialized}}`], { type: "application/json" }),
        );
      }
    };
    void persist();
    const timer = window.setInterval(() => void persist(), CLOUD_SAVE_INTERVAL_MS);
    window.addEventListener("pagehide", beforeLeave);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("pagehide", beforeLeave);
    };
  }, [account, cloudReady, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => setState((current) => advanceState(current)), 1_000);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  const closeTutorial = () => {
    setTutorialOpen(false);
    setTutorialStep(0);
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "seen");
  };
  const nextTutorial = () => {
    if (tutorialStep >= tutorialSteps[language].length - 1) closeTutorial();
    else setTutorialStep((step) => step + 1);
  };
  const modalOpen = tutorialOpen || Boolean(state.endedBy);
  const endedPillar = state.endedBy === "extreme-overflow" ? state.overflowedPillar : state.endedBy;

  return (
    <>
      <main aria-hidden={modalOpen ? true : undefined} className="min-h-screen overflow-hidden bg-[#5f8d50] text-[#1e2521]">
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
              onLanguageChange={setLanguage}
              onTutorial={() => { setTutorialStep(0); setTutorialOpen(true); }}
            />
            <SimulationScene
              language={language}
              onEventChoice={(side) => setState((current) => applyEventChoiceState(current, side))}
              onKill={(animalId) => setState((current) => killAnimalState(current, animalId))}
              onResolve={(outcome) => setState((current) => resolveFeedState(current, outcome))}
              onThrow={(record) => setState((current) => recordThrowState(current, record, onlineCount))}
              onlineCount={onlineCount}
              state={state}
            />
          </div>
        </div>
      </main>

      {tutorialOpen && !state.endedBy ? (
        <TutorialDialog
          language={language}
          onBack={() => setTutorialStep((step) => Math.max(0, step - 1))}
          onClose={closeTutorial}
          onLanguageChange={setLanguage}
          onNext={nextTutorial}
          step={tutorialStep}
        />
      ) : null}

      {state.endedBy ? (
        <div className="v6-modal-backdrop">
          <section aria-modal="true" className="v6-game-over" role="alertdialog">
            <p>{endReasonNames[language][state.endedBy]}</p>
            <h2>{copy.gameOver}</h2>
            <span>{state.endedBy === "extreme-overflow" ? copy.overflowBody : copy.gameOverBody}</span>
            <div className="v6-end-pillars">
              {pillarOrder.map((pillar) => (
                <div className={pillar === endedPillar ? state.endedBy === "extreme-overflow" ? "is-overflow" : "is-zero" : ""} key={pillar}>
                  <small>{pillarNames[language][pillar]}</small>
                  <strong>{pillar === endedPillar && state.endedBy === "extreme-overflow" ? "100+" : pillar === "quantity" ? `${state.pigeons.length}/${MAX_ANIMALS}` : Math.round(pillarValue(state, pillar))}</strong>
                </div>
              ))}
            </div>
            <ol>
              {[...state.events].slice(-3).reverse().map((entry, index) => <li key={`${entry.at}-${index}`}>{entry[language]}</li>)}
            </ol>
            <footer><span>{copy.survived} {state.generations}</span><button onClick={() => setState((current) => restartAfterEnd(current))} type="button">{copy.newCycle}</button></footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
