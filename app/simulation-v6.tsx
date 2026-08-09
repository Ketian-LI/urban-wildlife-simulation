"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "urban-pigeon-collective-v6";
const LEGACY_STORAGE_KEY = "urban-pigeon-collective-v5";
const PRESENCE_STORAGE_KEY = "urban-pigeon-presence-id-v1";
const LANGUAGE_STORAGE_KEY = "urban-pigeon-language-v1";
const TUTORIAL_STORAGE_KEY = "urban-pigeon-tutorial-v2";
const PRESENCE_HEARTBEAT_MS = 15_000;
const PRESENCE_RETRY_MS = 5_000;
const CLOUD_SAVE_INTERVAL_MS = 5_000;
const INITIAL_ANIMALS = 15;
const MAX_ANIMALS = 30;
const GENERATION_MS = 28_000;
const FIRST_EVENT_MS = 36_000;
const FOOD_LIFETIME_MS = 7_200;
const DEATH_ANIMATION_MS = 1_400;
const TOTAL_PIGEON_COLORS = 4;

type Language = "en" | "zh";
type CloudSyncStatus = "local" | "loading" | "saving" | "saved" | "error";
type PillarKey = "vitality" | "foraging" | "habitat" | "coexistence";
type Species =
  | "pigeon"
  | "squirrel"
  | "swan"
  | "stray-cat"
  | "stray-dog"
  | "fox"
  | "hedgehog";
type FoodType =
  | "grain"
  | "nut"
  | "greens"
  | "fish"
  | "biscuit"
  | "meat"
  | "insect";
type Plumage = "grey" | "white" | "spotted" | "brown";
type Intent = "eager" | "curious" | "wary" | "refusing";
type EventId =
  | "feeding-crowd"
  | "leftovers"
  | "squirrel-cache"
  | "swan-fountain"
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
  hasAcceptedFood: boolean;
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

type EcosystemState = {
  version: 6;
  pigeons: AnimalAgent[];
  nextPigeonId: number;
  vitality: number;
  foraging: number;
  habitat: number;
  coexistence: number;
  generations: number;
  lastUpdated: number;
  nextGenerationAt: number;
  nextEventAt: number;
  activeEventId: EventId | null;
  lastEventId: EventId | null;
  endedBy: PillarKey | null;
  endedAt: number | null;
  favoriteId: number | null;
  collectedPlumages: Plumage[];
  discoveredSpecies: Species[];
  animalSpeciesUnlocked: boolean;
  firstSquirrelSeeded: boolean;
  feedingHistory: FeedRecord[];
  events: FieldNote[];
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

type PillarDeltas = Partial<Record<PillarKey, number>>;
type EventChoice = {
  label: Record<Language, string>;
  result: Record<Language, string>;
  deltas: PillarDeltas;
  policy?: Partial<Policies>;
  spawn?: Species;
};
type EventDefinition = {
  eyebrow: Record<Language, string>;
  title: Record<Language, string>;
  body: Record<Language, string>;
  left: EventChoice;
  right: EventChoice;
};

const pillarOrder: PillarKey[] = [
  "vitality",
  "foraging",
  "habitat",
  "coexistence",
];
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
const foodOrder: FoodType[] = [
  "grain",
  "nut",
  "greens",
  "fish",
  "biscuit",
  "meat",
  "insect",
];
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
  grain: { symbol: ".", names: { en: "Grain", zh: "谷粒" }, color: "#bc7f16" },
  nut: { symbol: "o", names: { en: "Nut", zh: "坚果" }, color: "#7b4f2c" },
  greens: { symbol: "*", names: { en: "Peas", zh: "豌豆" }, color: "#4f823f" },
  fish: { symbol: "><", names: { en: "Fish", zh: "小鱼" }, color: "#39758a" },
  biscuit: { symbol: "+", names: { en: "Biscuit", zh: "饼干" }, color: "#c28a3f" },
  meat: { symbol: "#", names: { en: "Meat", zh: "肉块" }, color: "#98453b" },
  insect: { symbol: "~", names: { en: "Insects", zh: "昆虫" }, color: "#4a3d32" },
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
    vitality: "Vitality",
    foraging: "Foraging",
    habitat: "Habitat",
    coexistence: "Coexistence",
  },
  zh: {
    vitality: "生命力",
    foraging: "觅食力",
    habitat: "栖息地",
    coexistence: "共处度",
  },
};

const uiCopy = {
  en: {
    brand: "Urban Wildlife Simulation",
    cycle: "City cycle",
    online: "Online",
    population: "Population",
    wildPark: "Wild park",
    cityPlaza: "Marble plaza",
    hostFavorite: "Host favorite",
    favoriteEmpty: "Feed an animal to form a bond",
    feeds: "feeds",
    protected: "Protected from natural loss",
    foodTray: "Choose food",
    fieldGuide: "Field journal",
    colors: "Pigeon colors",
    species: "Species observed",
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
    gameOverBody: "One of the four conditions needed for coexistence reached zero.",
    newCycle: "Begin a new city cycle",
    survived: "Cycles observed",
    tutorialTitle: "Observe, feed, then live with the result",
    tutorialSkip: "Skip",
    tutorialBack: "Previous",
    tutorialNext: "Next",
    tutorialFinish: "Enter the park",
    tutorialStep: "Step",
    collectivePressure: "Every click feeds; more visitors amplify collective pressure",
    throwAria: "Choose food, then click the plaza to throw it",
  },
  zh: {
    brand: "城市野生动物模拟",
    cycle: "城市周期",
    online: "当前在线",
    population: "动物数量",
    wildPark: "野生公园",
    cityPlaza: "大理石广场",
    hostFavorite: "最喜爱的动物",
    favoriteEmpty: "投喂动物以建立关系",
    feeds: "次投喂",
    protected: "不会自然消失",
    foodTray: "选择食物",
    fieldGuide: "观察日志",
    colors: "鸽子羽色",
    species: "已观察物种",
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
    gameOverBody: "维持共处所需的四项条件中，有一项降到了零。",
    newCycle: "开始新的城市周期",
    survived: "已观察周期",
    tutorialTitle: "观察、投喂，并面对之后的变化",
    tutorialSkip: "跳过",
    tutorialBack: "上一步",
    tutorialNext: "下一步",
    tutorialFinish: "进入公园",
    tutorialStep: "步骤",
    collectivePressure: "每次点击都会投食；在线人数越多，集体压力越明显",
    throwAria: "先选择食物，再点击广场投掷",
  },
} as const;

const tutorialSteps: Record<Language, { title: string; body: string }[]> = {
  en: [
    {
      title: "Choose food and place",
      body: "Select one of seven foods, then click the ground. Food is thrown from the lower edge; you choose the place, not the recipient.",
    },
    {
      title: "Read the animal",
      body: "Animals turn, lean, hesitate or retreat before deciding. The nearest animal tries first; refusal passes the chance to the next.",
    },
    {
      title: "Watch patterns become events",
      body: "The city remembers frequency, leftovers, food type and hotspots. Repeated patterns create decision cards with delayed consequences.",
    },
    {
      title: "Keep four conditions alive",
      body: "Vitality, foraging, habitat and coexistence must all remain above zero. There is no final victory, but any one reaching zero ends the current cycle.",
    },
  ],
  zh: [
    {
      title: "选择食物和位置",
      body: "先选择七种食物中的一种，再点击地面。食物从画面底部抛入；你决定位置，但不能指定哪只动物吃。",
    },
    {
      title: "观察动物的线索",
      body: "动物会先转头、前倾、犹豫或后退。距离最近的动物先尝试，拒绝后机会轮到下一只。",
    },
    {
      title: "让行为形成事件",
      body: "城市会记住投喂频率、残留、食物种类和热点。重复模式会形成带有延迟后果的城市事件。",
    },
    {
      title: "维持四项生存条件",
      body: "生命力、觅食力、栖息地和共处度都必须高于零。游戏没有固定通关，但任意一项归零都会结束本轮周期。",
    },
  ],
};

const preference: Record<Species, Record<FoodType, number>> = {
  pigeon: { grain: 0.96, nut: 0.46, greens: 0.58, fish: 0.08, biscuit: 0.22, meat: 0.08, insect: 0.38 },
  squirrel: { grain: 0.5, nut: 0.97, greens: 0.36, fish: 0.04, biscuit: 0.28, meat: 0.03, insect: 0.16 },
  swan: { grain: 0.48, nut: 0.08, greens: 0.97, fish: 0.12, biscuit: 0.1, meat: 0.03, insect: 0.22 },
  "stray-cat": { grain: 0.03, nut: 0.03, greens: 0.04, fish: 0.97, biscuit: 0.35, meat: 0.74, insect: 0.26 },
  "stray-dog": { grain: 0.08, nut: 0.06, greens: 0.1, fish: 0.52, biscuit: 0.97, meat: 0.78, insect: 0.08 },
  fox: { grain: 0.03, nut: 0.08, greens: 0.04, fish: 0.66, biscuit: 0.42, meat: 0.97, insect: 0.24 },
  hedgehog: { grain: 0.16, nut: 0.18, greens: 0.14, fish: 0.16, biscuit: 0.2, meat: 0.32, insect: 0.97 },
};

const events: Record<EventId, EventDefinition> = {
  "feeding-crowd": {
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
    eyebrow: { en: "Food changes space", zh: "食物改变了空间" },
    title: { en: "Squirrels are caching nuts beside the trees", zh: "松鼠开始在树边储藏坚果" },
    body: { en: "A repeated food route is becoming part of the park.", zh: "一条反复出现的食物路线正在成为公园的一部分。" },
    left: {
      label: { en: "Protect the cache", zh: "保护储藏点" },
      result: { en: "Tree-edge habitat became more active.", zh: "树林边缘的栖息活动增加了。" },
      deltas: { habitat: 8, coexistence: -2 },
      spawn: "squirrel",
    },
    right: {
      label: { en: "Clear the path", zh: "清理步道" },
      result: { en: "The path reopened and squirrels moved outward.", zh: "步道重新开放，松鼠向外围移动。" },
      deltas: { coexistence: 6, habitat: -5, foraging: 3 },
    },
  },
  "swan-fountain": {
    eyebrow: { en: "A new territory", zh: "新的领地" },
    title: { en: "A swan guards the fountain feeding area", zh: "一只天鹅开始守卫喷泉投喂区" },
    body: { en: "Other animals now avoid a route they previously used.", zh: "其他动物开始避开过去经常使用的路线。" },
    left: {
      label: { en: "Keep a water corridor", zh: "保留水域通道" },
      result: { en: "The fountain remained usable by several species.", zh: "多个物种仍然可以使用喷泉区域。" },
      deltas: { habitat: 7, coexistence: 2 },
      policy: { fountain: true },
      spawn: "swan",
    },
    right: {
      label: { en: "Close the fountain edge", zh: "封闭喷泉边缘" },
      result: { en: "Conflict fell, but water habitat contracted.", zh: "冲突减少了，但水域栖息空间缩小。" },
      deltas: { coexistence: 8, habitat: -8 },
      policy: { fountain: false },
    },
  },
  "fox-corridor": {
    eyebrow: { en: "Night visitor", zh: "夜间访客" },
    title: { en: "A fox follows the smell of leftover food", zh: "一只狐狸循着残留食物的气味来到公园" },
    body: { en: "Smaller animals retreat while the park edge becomes more active.", zh: "小型动物暂时退开，公园边缘变得更加活跃。" },
    left: {
      label: { en: "Leave an edge corridor", zh: "保留边缘通道" },
      result: { en: "The fox entered the wider habitat network.", zh: "狐狸进入了更广阔的栖息网络。" },
      deltas: { habitat: 8, vitality: -3, coexistence: -2 },
      policy: { shrubs: true },
      spawn: "fox",
    },
    right: {
      label: { en: "Increase night lighting", zh: "增加夜间照明" },
      result: { en: "The fox withdrew and nocturnal habitat weakened.", zh: "狐狸退回外围，夜间栖息条件减弱。" },
      deltas: { coexistence: 6, habitat: -7 },
      policy: { shrubs: false },
    },
  },
  "hedgehog-shrubs": {
    eyebrow: { en: "A quiet arrival", zh: "安静的新访客" },
    title: { en: "A hedgehog appears beneath the shrubs", zh: "一只刺猬出现在灌木下面" },
    body: { en: "Low disturbance and insect food have opened a small night route.", zh: "较低的干扰和昆虫食物形成了一条小型夜间路线。" },
    left: {
      label: { en: "Leave the shrubs uncut", zh: "保留灌木" },
      result: { en: "Shelter increased while the path narrowed.", zh: "庇护空间增加了，步道则变窄了一些。" },
      deltas: { habitat: 10, coexistence: -3 },
      policy: { shrubs: true },
      spawn: "hedgehog",
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

function positionFor(id: number, zone: "inside" | "outside", species: Species) {
  if (species === "swan") {
    return zone === "inside"
      ? { x: 73 + (id % 5) * 2.4, y: 39 + (id % 3) * 3.2 }
      : { x: 82 + (id % 3) * 2, y: 31 + (id % 4) * 2.1 };
  }

  if (zone === "inside") {
    return {
      x: 23 + ((id * 37) % 55),
      y: 45 + ((id * 29) % 35),
    };
  }

  const lane = id % 4;
  if (lane === 0) return { x: 8 + ((id * 17) % 15), y: 42 + ((id * 13) % 38) };
  if (lane === 1) return { x: 78 + ((id * 19) % 14), y: 42 + ((id * 11) % 38) };
  if (lane === 2) return { x: 18 + ((id * 23) % 64), y: 27 + ((id * 7) % 9) };
  return { x: 16 + ((id * 31) % 68), y: 83 + ((id * 5) % 6) };
}

function createAnimal(
  id: number,
  species: Species = "pigeon",
  zone: "inside" | "outside" = "outside",
  now = Date.now(),
): AnimalAgent {
  const position = positionFor(id, zone, species);
  return {
    id,
    species,
    plumage: plumageOrder[id % plumageOrder.length],
    feedCount: 0,
    boldness: clamp(0.24 + ((id * 47) % 58) / 100, 0.12, 0.9),
    appetite: 0.52 + ((id * 17) % 35) / 100,
    nutrition: 0,
    satietyUntil: 0,
    hasAcceptedFood: zone === "inside",
    x: position.x,
    y: position.y,
    caseMask: (id * 37 + 9) % 64,
    colorSeed: (id * 53 + 11) % 997,
    bornAt: now,
  };
}

function makeInitialState(now = Date.now(), carriedFavorite?: AnimalAgent): EcosystemState {
  const pigeons = Array.from(
    { length: carriedFavorite ? INITIAL_ANIMALS - 1 : INITIAL_ANIMALS },
    (_, index) => createAnimal(index, "pigeon", "outside", now),
  );
  let nextPigeonId = pigeons.length;
  let favoriteId: number | null = null;

  if (carriedFavorite) {
    const favoritePosition = positionFor(nextPigeonId, "inside", carriedFavorite.species);
    const favorite = {
      ...carriedFavorite,
      id: nextPigeonId,
      x: favoritePosition.x,
      y: favoritePosition.y,
      hasAcceptedFood: true,
      appetite: 0.6,
      nutrition: 0,
      satietyUntil: 0,
      bornAt: now,
    };
    pigeons.push(favorite);
    favoriteId = favorite.id;
    nextPigeonId += 1;
  }

  return {
    version: 6,
    pigeons,
    nextPigeonId,
    vitality: 72,
    foraging: 66,
    habitat: 68,
    coexistence: 74,
    generations: 1,
    lastUpdated: now,
    nextGenerationAt: now + GENERATION_MS,
    nextEventAt: now + FIRST_EVENT_MS,
    activeEventId: null,
    lastEventId: null,
    endedBy: null,
    endedAt: null,
    favoriteId,
    collectedPlumages: [],
    discoveredSpecies: ["pigeon"],
    animalSpeciesUnlocked: false,
    firstSquirrelSeeded: false,
    feedingHistory: [],
    events: [
      note(
        "Fifteen animals begin a new city cycle. Every throw will become part of its history.",
        "十五只动物开始了新的城市周期。每一次投食都会成为这座城市历史的一部分。",
        now,
      ),
    ],
    policies: { feedingZone: false, sealedBins: false, shrubs: true, fountain: true },
  };
}

function checkForEnd(state: EcosystemState, now = Date.now()) {
  if (state.endedBy) return state;
  const endedBy = pillarOrder.find((pillar) => state[pillar] <= 0) ?? null;
  if (!endedBy) return state;

  state[endedBy] = 0;
  state.endedBy = endedBy;
  state.endedAt = now;
  state.activeEventId = null;
  pushNote(
    state,
    note(
      `${pillarNames.en[endedBy]} reached zero. This city cycle ended.`,
      `${pillarNames.zh[endedBy]}降到了零，本轮城市周期结束。`,
      now,
    ),
  );
  return state;
}

function applyDeltas(state: EcosystemState, deltas: PillarDeltas) {
  for (const pillar of pillarOrder) {
    if (typeof deltas[pillar] === "number") {
      state[pillar] = clamp(state[pillar] + (deltas[pillar] ?? 0));
    }
  }
  return checkForEnd(state);
}

function recentFeeds(state: EcosystemState, now: number, windowMs: number) {
  return state.feedingHistory.filter((record) => now - record.at <= windowMs);
}

function foodCount(records: FeedRecord[], food: FoodType) {
  return records.filter((record) => record.food === food).length;
}

function hotspotStrength(records: FeedRecord[]) {
  const cells = new Map<string, number>();
  for (const record of records) {
    const key = `${Math.round(record.x / 10)}:${Math.round(record.y / 10)}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...cells.values());
}

function chooseEvent(state: EcosystemState, now = Date.now()): EventId {
  const weakest = [...pillarOrder].sort((a, b) => state[a] - state[b])[0];
  if (state[weakest] <= 25) return `crisis-${weakest}` as EventId;

  const recent = recentFeeds(state, now, 55_000);
  const rejected = recent.filter((record) => record.accepted === false).length;
  const favoriteFeeds = recent.filter((record) => record.favorite && record.accepted).length;
  const contextual: EventId[] = [];

  if (hotspotStrength(recent) >= 5 || recent.length >= 10) contextual.push("feeding-crowd");
  if (rejected >= 3) contextual.push("leftovers");
  if (foodCount(recent, "nut") >= 3) contextual.push("squirrel-cache");
  if (foodCount(recent, "greens") >= 3) contextual.push("swan-fountain");
  if (foodCount(recent, "meat") >= 3) contextual.push("fox-corridor");
  if (foodCount(recent, "insect") >= 3) contextual.push("hedgehog-shrubs");
  if (favoriteFeeds >= 3) contextual.push("favorite-example");
  if (recent.length === 0 && state.habitat >= 50) contextual.push("quiet-foraging");

  const fallback: EventId[] = ["sealed-bins", "garden-maintenance", "visitor-group"];
  const pool = contextual.length > 0 ? contextual : fallback;
  const withoutRepeat = pool.filter((id) => id !== state.lastEventId);
  const candidates = withoutRepeat.length > 0 ? withoutRepeat : pool;
  return candidates[(state.generations * 7 + recent.length * 3) % candidates.length];
}

function weightedSpecies(state: EcosystemState, now = Date.now()) {
  const recent = recentFeeds(state, now, 120_000);
  const weights: Record<Species, number> = {
    pigeon: 1.2 + foodCount(recent, "grain") * 0.35,
    squirrel: 0.45 + foodCount(recent, "nut") * 0.8 + state.habitat / 130,
    swan: 0.3 + foodCount(recent, "greens") * 0.8 + (state.policies.fountain ? 0.9 : 0),
    "stray-cat": 0.4 + foodCount(recent, "fish") * 0.75 + state.coexistence / 210,
    "stray-dog": 0.4 + foodCount(recent, "biscuit") * 0.75 + state.coexistence / 210,
    fox: 0.12 + foodCount(recent, "meat") * 0.9 + (state.policies.shrubs ? state.habitat / 150 : 0),
    hedgehog: 0.12 + foodCount(recent, "insect") * 0.95 + (state.policies.shrubs ? state.habitat / 140 : 0),
  };
  const total = speciesOrder.reduce((sum, species) => sum + weights[species], 0);
  let cursor = ((state.nextPigeonId * 47 + state.generations * 19) % 997) / 997 * total;
  for (const species of speciesOrder) {
    cursor -= weights[species];
    if (cursor <= 0) return species;
  }
  return "pigeon";
}

function addAnimal(state: EcosystemState, species: Species, zone: "inside" | "outside" = "outside") {
  if (state.pigeons.length >= MAX_ANIMALS) return null;
  const animal = createAnimal(state.nextPigeonId, species, zone);
  state.nextPigeonId += 1;
  state.pigeons = [...state.pigeons, animal];
  if (!state.discoveredSpecies.includes(species)) {
    state.discoveredSpecies = [...state.discoveredSpecies, species];
  }
  return animal;
}

function createChild(state: EcosystemState, parent: AnimalAgent, now: number) {
  if (state.pigeons.length >= MAX_ANIMALS) return null;
  const child = createAnimal(state.nextPigeonId, parent.species, "inside", now);
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
  let changed = false;

  const readyParent = state.pigeons
    .filter((animal) => animal.nutrition >= 3)
    .sort((a, b) => b.nutrition - a.nutrition || a.id - b.id)[0];
  if (readyParent && state.pigeons.length < MAX_ANIMALS) {
    const parentIndex = state.pigeons.findIndex((animal) => animal.id === readyParent.id);
    const nextAnimals = state.pigeons.map((animal) => ({ ...animal }));
    nextAnimals[parentIndex].nutrition = Math.max(0, nextAnimals[parentIndex].nutrition - 3);
    state.pigeons = nextAnimals;
    const child = createChild(state, nextAnimals[parentIndex], now);
    if (child) {
      changed = true;
      pushNote(
        state,
        note(
          `After several successful feeds and a full city cycle, a new ${speciesNames.en[child.species].toLowerCase()} appeared beside its parent.`,
          `经过多次成功进食和一个完整城市周期，一只新的${speciesNames.zh[child.species]}出现在亲代旁边。`,
          now,
        ),
      );
    }
  }

  if (state.animalSpeciesUnlocked && state.pigeons.length < MAX_ANIMALS) {
    if (!state.firstSquirrelSeeded) {
      const squirrel = addAnimal(state, "squirrel", "outside");
      if (squirrel) {
        state.firstSquirrelSeeded = true;
        changed = true;
      }
    } else if ((state.generations + state.nextPigeonId) % 3 !== 0) {
      const species = weightedSpecies(state, now);
      const arrival = addAnimal(state, species, "outside");
      if (arrival) {
        changed = true;
        pushNote(
          state,
          note(
            `Recent food and habitat conditions attracted a ${speciesNames.en[species].toLowerCase()} to the park edge.`,
            `近期食物和栖息条件吸引了一只${speciesNames.zh[species]}来到公园边缘。`,
            now,
          ),
        );
      }
    }
  }

  if ((state.coexistence < 18 || state.habitat < 14) && state.pigeons.length > 4) {
    const removable = state.pigeons
      .filter((animal) => animal.id !== state.favoriteId)
      .sort((a, b) => a.feedCount - b.feedCount || a.id - b.id)[0];
    if (removable) {
      state.pigeons = state.pigeons.filter((animal) => animal.id !== removable.id);
      changed = true;
      pushNote(
        state,
        note(
          `A ${speciesNames.en[removable.species].toLowerCase()} migrated away as city conditions tightened.`,
          `城市条件收紧后，一只${speciesNames.zh[removable.species]}迁离了这里。`,
          now,
        ),
      );
    }
  }

  if (!changed && state.pigeons.length >= MAX_ANIMALS) {
    pushNote(
      state,
      note(
        "The city remained at its 30-animal capacity; no new birth or arrival could enter this cycle.",
        "城市仍然处于30只动物的承载上限，本周期没有新的出生或迁入。",
        now,
      ),
    );
  }
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
    lastUpdated: now,
  };

  const recent = recentFeeds(next, now, 22_000);
  if (recent.length === 0 && next.habitat >= 35) {
    next.foraging = clamp(next.foraging + elapsed * 0.045);
  }
  if (recent.every((record) => record.accepted !== false)) {
    next.coexistence = clamp(next.coexistence + elapsed * 0.014);
  }
  if (next.policies.shrubs && next.policies.fountain) {
    next.habitat = clamp(next.habitat + elapsed * 0.006);
  }

  let generationGuard = 0;
  while (now >= next.nextGenerationAt && generationGuard < 3) {
    runGeneration(next, next.nextGenerationAt);
    next.nextGenerationAt += GENERATION_MS;
    generationGuard += 1;
  }

  if (!next.activeEventId && now >= next.nextEventAt) {
    next.activeEventId = chooseEvent(next, now);
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
    next.foraging = clamp(next.foraging - Math.min(0.5, burst * 0.08 * pressure));
    next.coexistence = clamp(next.coexistence - Math.min(0.45, burst * 0.06 * pressure));
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
    next.coexistence = clamp(next.coexistence - 0.65);
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
  const suitability = preference[animal.species][outcome.food];
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
    nutrition: clamp(animal.nutrition + (suitability >= 0.7 ? 1 : 0.55), 0, 4),
    satietyUntil: now + 9_000 + (animal.id % 4) * 1_200,
    hasAcceptedFood: true,
    x: position.x,
    y: position.y,
  };
  next.feedingHistory = next.feedingHistory.map((record) =>
    record.id === outcome.id
      ? { ...record, species: animal.species, favorite: animal.id === next.favoriteId }
      : record,
  );
  next.vitality = clamp(next.vitality + 0.45 + suitability * 0.65);
  next.foraging = clamp(next.foraging - 0.18 - Math.min(0.55, repetition * 0.08));
  if (repetition >= 5) next.coexistence = clamp(next.coexistence - 0.28);

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

  if (!next.animalSpeciesUnlocked && next.collectedPlumages.length === TOTAL_PIGEON_COLORS) {
    next.animalSpeciesUnlocked = true;
    const squirrel = addAnimal(next, "squirrel", "outside");
    if (squirrel) {
      next.firstSquirrelSeeded = true;
      pushNote(
        next,
        note(
          "All four pigeon colors were observed. A squirrel entered first; future species now respond to food and habitat conditions.",
          "四种鸽子羽色都已被观察。松鼠率先进入，之后的物种将根据食物与栖息条件出现。",
          now,
        ),
      );
    }
  }

  next.favoriteId = strongestFavorite(next.pigeons, next.favoriteId);
  const declinedText = outcome.declinedBefore > 0
    ? ` after ${outcome.declinedBefore} nearer ${outcome.declinedBefore === 1 ? "animal" : "animals"} declined`
    : "";
  pushNote(
    next,
    note(
      `${speciesNames.en[animal.species]} accepted ${foodData[outcome.food].names.en.toLowerCase()}${declinedText}.`,
      `${outcome.declinedBefore > 0 ? `前面${outcome.declinedBefore}只更近的动物拒绝后，` : ""}${speciesNames.zh[animal.species]}接受了${foodData[outcome.food].names.zh}。`,
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
    vitality: clamp(current.vitality - 7),
    coexistence: clamp(current.coexistence - 3),
  };
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
  const next: EcosystemState = {
    ...current,
    pigeons: current.pigeons.map((animal) => ({ ...animal })),
    policies: { ...current.policies, ...choice.policy },
    events: [...current.events],
    activeEventId: null,
    lastEventId: current.activeEventId,
    nextEventAt: now + 52_000 + ((current.generations * 7) % 23) * 1_000,
    lastUpdated: now,
  };
  applyDeltas(next, choice.deltas);
  if (!next.endedBy && choice.spawn) addAnimal(next, choice.spawn, "outside");
  pushNote(next, note(choice.result.en, choice.result.zh, now));
  return checkForEnd(next, now);
}

function restartAfterEnd(current: EcosystemState) {
  const favorite = current.pigeons.find((animal) => animal.id === current.favoriteId);
  const restarted = makeInitialState(Date.now(), favorite);
  restarted.collectedPlumages = [...current.collectedPlumages];
  restarted.discoveredSpecies = [...current.discoveredSpecies];
  restarted.animalSpeciesUnlocked = current.animalSpeciesUnlocked;
  restarted.firstSquirrelSeeded = false;
  if (restarted.animalSpeciesUnlocked && !favorite) {
    const squirrel = addAnimal(restarted, "squirrel", "outside");
    restarted.firstSquirrelSeeded = Boolean(squirrel);
  }
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

function restoreState(value: unknown): EcosystemState {
  const now = Date.now();
  if (!value || typeof value !== "object") return makeInitialState(now);
  const parsed = value as Partial<EcosystemState> & { dependency?: number; foraging?: number };
  const rawAnimals = Array.isArray(parsed.pigeons) ? parsed.pigeons : [];
  const pigeons = rawAnimals.slice(0, MAX_ANIMALS).map((entry, index) => {
    const saved = entry as Partial<AnimalAgent>;
    const id = Number.isFinite(Number(saved.id)) ? Math.trunc(Number(saved.id)) : index;
    const species = isSpecies(saved.species) ? saved.species : "pigeon";
    const zone = saved.hasAcceptedFood ? "inside" : "outside";
    const fallback = createAnimal(id, species, zone, now);
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
  const isV6 = parsed.version === 6;
  const favoriteCandidate = Number(parsed.favoriteId);
  const fallbackFavorite = [...pigeons]
    .filter((animal) => animal.feedCount > 0)
    .sort((a, b) => b.feedCount - a.feedCount || a.id - b.id)[0]?.id ?? null;
  const favoriteId = pigeons.some((animal) => animal.id === favoriteCandidate)
    ? favoriteCandidate
    : fallbackFavorite;
  const collectedPlumages = Array.isArray(parsed.collectedPlumages)
    ? parsed.collectedPlumages.filter(isPlumage)
    : pigeons.filter((animal) => animal.species === "pigeon" && animal.feedCount > 0).map((animal) => animal.plumage);
  const discoveredSpecies = Array.isArray(parsed.discoveredSpecies)
    ? parsed.discoveredSpecies.filter(isSpecies)
    : [...new Set(pigeons.map((animal) => animal.species))];
  const base = makeInitialState(now);
  const restored: EcosystemState = {
    ...base,
    ...parsed,
    version: 6,
    pigeons,
    nextPigeonId: Math.max(...pigeons.map((animal) => animal.id), 0) + 1,
    vitality: clamp(isV6 ? finiteOr(parsed.vitality, 72) : 72),
    foraging: clamp(isV6 ? finiteOr(parsed.foraging, 66) : clamp(finiteOr(parsed.foraging, 0.66) * 100)),
    habitat: clamp(isV6 ? finiteOr(parsed.habitat, 68) : 68),
    coexistence: clamp(isV6 ? finiteOr(parsed.coexistence, 74) : 74),
    favoriteId,
    collectedPlumages: [...new Set(collectedPlumages)],
    discoveredSpecies: [...new Set(["pigeon" as Species, ...discoveredSpecies])],
    animalSpeciesUnlocked: Boolean(parsed.animalSpeciesUnlocked) || collectedPlumages.length >= TOTAL_PIGEON_COLORS,
    firstSquirrelSeeded: Boolean(parsed.firstSquirrelSeeded) || pigeons.some((animal) => animal.species === "squirrel"),
    feedingHistory: isV6 && Array.isArray(parsed.feedingHistory) ? parsed.feedingHistory.slice(-90) as FeedRecord[] : [],
    events: isV6 && Array.isArray(parsed.events) ? parsed.events.slice(-18) as FieldNote[] : base.events,
    policies: isV6 && parsed.policies ? { ...base.policies, ...parsed.policies } : base.policies,
    activeEventId: isV6 && parsed.activeEventId && parsed.activeEventId in events ? parsed.activeEventId : null,
    lastEventId: isV6 && parsed.lastEventId && parsed.lastEventId in events ? parsed.lastEventId : null,
    endedBy: isV6 && pillarOrder.includes(parsed.endedBy as PillarKey) ? parsed.endedBy as PillarKey : null,
    endedAt: isV6 ? Number(parsed.endedAt) || null : null,
    lastUpdated: now,
    nextGenerationAt: Math.max(now + 3_000, Number(parsed.nextGenerationAt) || now + GENERATION_MS),
    nextEventAt: Math.max(now + 3_000, Number(parsed.nextEventAt) || now + FIRST_EVENT_MS),
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

const atlasPromises = new Map<string, Promise<string>>();
function loadAtlas(path: string) {
  const existing = atlasPromises.get(path);
  if (existing) return existing;
  const promise = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return reject(new Error("atlas canvas unavailable"));
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const visited = new Uint8Array(canvas.width * canvas.height);
      const queue = new Int32Array(canvas.width * canvas.height);
      let start = 0;
      let end = 0;
      const enqueue = (index: number) => {
        if (visited[index]) return;
        const offset = index * 4;
        const r = pixels.data[offset];
        const g = pixels.data[offset + 1];
        const b = pixels.data[offset + 2];
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (Math.min(r, g, b) <= 224 || spread >= 25) return;
        visited[index] = 1;
        queue[end++] = index;
      };
      for (let x = 0; x < canvas.width; x += 1) {
        enqueue(x);
        enqueue((canvas.height - 1) * canvas.width + x);
      }
      for (let y = 1; y < canvas.height - 1; y += 1) {
        enqueue(y * canvas.width);
        enqueue(y * canvas.width + canvas.width - 1);
      }
      while (start < end) {
        const index = queue[start++];
        const x = index % canvas.width;
        const y = Math.floor(index / canvas.width);
        pixels.data[index * 4 + 3] = 0;
        if (x > 0) enqueue(index - 1);
        if (x + 1 < canvas.width) enqueue(index + 1);
        if (y > 0) enqueue(index - canvas.width);
        if (y + 1 < canvas.height) enqueue(index + canvas.width);
      }
      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("atlas load failed"));
    image.src = path;
  });
  atlasPromises.set(path, promise);
  return promise;
}

function acceptanceProbability(
  animal: AnimalAgent,
  food: FoodType,
  state: EcosystemState,
  now: number,
) {
  if (now < animal.satietyUntil) return 0.035;
  const suitable = preference[animal.species][food];
  const appetite = 0.48 + animal.appetite * 0.52;
  const temperament = 0.58 + animal.boldness * 0.42;
  const familiarity = Math.min(0.16, animal.feedCount * 0.025);
  const city = animal.hasAcceptedFood ? 0.07 : -0.05;
  const bins = state.policies.sealedBins ? 0.035 : 0;
  return clamp(suitable * appetite * temperament + familiarity + city + bins, 0.025, 0.97);
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
  return base[animal.species] * (animal.hasAcceptedFood ? 1 : 0.82);
}

function preferredFollowTarget(animal: AnimalAgent, target: { x: number; y: number }) {
  if (animal.species === "swan") return { x: clamp(target.x, 67, 88), y: clamp(target.y, 34, 56) };
  if (animal.species === "fox") return { x: clamp(target.x + 5, 10, 91), y: clamp(target.y, 29, 83) };
  return { x: clamp(target.x, 9, 91), y: clamp(target.y, 30, 88) };
}

function AnimalSprite({
  animal,
  phase = "idle",
  atlasReady,
}: {
  animal: AnimalAgent;
  phase?: AnimalResponse["phase"] | "idle";
  atlasReady: boolean;
}) {
  const isPigeon = animal.species === "pigeon";
  const standardRow = wildlifeRows[animal.species];
  const extraRow = extraRows[animal.species];
  const frameClass =
    phase === "approach"
      ? "pigeon-word-flying"
      : phase === "eating" || phase === "landing"
        ? "pigeon-word-landing"
        : "";
  const className = [
    "v6-animal-sprite",
    frameClass,
    isPigeon ? `pigeon-word-${animal.plumage}` : "wildlife-agent",
    standardRow !== undefined ? "v6-standard-wildlife" : "",
    extraRow !== undefined ? "v6-extra-wildlife" : "",
    atlasReady || isPigeon ? "is-atlas-ready" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--motion-y": `${plumageOrder.indexOf(animal.plumage) * 14.285714}%`,
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

function FoodTray({
  language,
  selected,
  onSelect,
}: {
  language: Language;
  selected: FoodType;
  onSelect: (food: FoodType) => void;
}) {
  const copy = uiCopy[language];
  return (
    <div
      aria-label={copy.foodTray}
      className="v6-food-tray"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      role="toolbar"
    >
      {foodOrder.map((food) => (
        <button
          aria-label={foodData[food].names[language]}
          aria-pressed={selected === food}
          className={selected === food ? "is-selected" : ""}
          key={food}
          onClick={() => onSelect(food)}
          style={{ "--food-color": foodData[food].color } as React.CSSProperties}
          title={foodData[food].names[language]}
          type="button"
        >
          <b aria-hidden="true">{foodData[food].symbol}</b>
          <span>{foodData[food].names[language]}</span>
        </button>
      ))}
    </div>
  );
}

function EventCard({
  eventId,
  language,
  onChoose,
}: {
  eventId: EventId;
  language: Language;
  onChoose: (side: "left" | "right") => void;
}) {
  const definition = events[eventId];
  const copy = uiCopy[language];
  const preview = (deltas: PillarDeltas) =>
    pillarOrder
      .filter((pillar) => deltas[pillar])
      .map((pillar) => `${pillarNames[language][pillar]} ${(deltas[pillar] ?? 0) > 0 ? "+" : "-"}`)
      .join(" · ");

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
      className="v6-event-card"
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
    >
      <p>{definition.eyebrow[language]}</p>
      <h2 id="city-event-title">{definition.title[language]}</h2>
      <span>{definition.body[language]}</span>
      <div>
        <button aria-label={copy.left} onClick={() => onChoose("left")} type="button">
          <i aria-hidden="true">←</i>
          <strong>{definition.left.label[language]}</strong>
          <small>{preview(definition.left.deltas)}</small>
        </button>
        <button aria-label={copy.right} onClick={() => onChoose("right")} type="button">
          <strong>{definition.right.label[language]}</strong>
          <i aria-hidden="true">→</i>
          <small>{preview(definition.right.deltas)}</small>
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
          <div className="v6-journal-species">
            {speciesOrder.map((species) => (
              <span className={state.discoveredSpecies.includes(species) ? "is-found" : ""} key={species}>
                {state.discoveredSpecies.includes(species) ? speciesNames[language][species] : "???"}
              </span>
            ))}
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
  const [selectedFood, setSelectedFood] = useState<FoodType>("grain");
  const [particles, setParticles] = useState<FoodParticle[]>([]);
  const [responses, setResponses] = useState<AnimalResponse[]>([]);
  const [deathEffects, setDeathEffects] = useState<DeathEffect[]>([]);
  const [frameTime, setFrameTime] = useState(0);
  const [wildlifeAtlas, setWildlifeAtlas] = useState<string | null>(null);
  const [extraAtlas, setExtraAtlas] = useState<string | null>(null);
  const [favoritePosition, setFavoritePosition] = useState<{ id: number; x: number; y: number } | null>(null);
  const sequence = useRef(1);
  const deathSequence = useRef(1);
  const timers = useRef<number[]>([]);
  const cursorTarget = useRef<{ x: number; y: number } | null>(null);
  const favorite = state.pigeons.find((animal) => animal.id === state.favoriteId);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadAtlas("/wildlife-motion-atlas.png"),
      loadAtlas("/fox-hedgehog-motion-atlas.png"),
    ]).then(([standard, extra]) => {
      if (active) {
        setWildlifeAtlas(standard);
        setExtraAtlas(extra);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    if (particles.length === 0) return;
    let frame = 0;
    const tick = (now: number) => {
      setFrameTime(now);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [particles.length]);

  const favoriteIsResponding = Boolean(
    favorite && responses.some((response) => response.animalId === favorite.id && response.phase !== "landing"),
  );
  useEffect(() => {
    if (!favorite) return;
    let frame = 0;
    const move = () => {
      const rawTarget = cursorTarget.current ?? { x: favorite.x, y: favorite.y };
      const target = preferredFollowTarget(favorite, rawTarget);
      const speed = favorite.species === "hedgehog" ? 0.018 : favorite.species === "swan" ? 0.03 : 0.045;
      if (!favoriteIsResponding) {
        setFavoritePosition((position) => {
          const current = position?.id === favorite.id ? position : { id: favorite.id, x: favorite.x, y: favorite.y };
          const next = { x: current.x + (target.x - current.x) * speed, y: current.y + (target.y - current.y) * speed };
          return Math.hypot(next.x - current.x, next.y - current.y) < 0.004
            ? current
            : { id: favorite.id, ...next };
        });
      }
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [favorite, favoriteIsResponding]);

  const displayPosition = (animal: AnimalAgent) => {
    const response = [...responses].reverse().find((item) => item.animalId === animal.id);
    if (response && response.phase !== "noticing" && response.phase !== "rejecting") return { x: response.x, y: response.y };
    if (animal.id === favorite?.id && favoritePosition?.id === animal.id) return favoritePosition;
    return { x: animal.x, y: animal.y };
  };

  const throwFood = (targetX: number, targetY: number) => {
    if (state.endedBy) return;
    const nowPerformance = window.performance.now();
    const now = Date.now();
    const id = now * 1_000 + sequence.current++;
    const startX = clamp(50 + (targetX - 50) * 0.16, 42, 58);
    const startY = 96;
    const distance = Math.hypot(targetX - startX, targetY - startY);
    const duration = clamp(620 + distance * 5.4, 700, 1080);
    const reserved = new Set(responses.filter((response) => response.winner && response.phase !== "landing").map((response) => response.animalId));
    const ranked = state.pigeons
      .map((animal) => ({ animal, position: displayPosition(animal) }))
      .map((entry) => ({ ...entry, distance: Math.hypot(entry.position.x - targetX, entry.position.y - targetY) }))
      .filter((entry) => entry.distance <= detectionRadius(entry.animal))
      .sort((left, right) => left.distance - right.distance || left.animal.id - right.animal.id);

    let winnerIndex = -1;
    const probabilities = ranked.map(({ animal }) => acceptanceProbability(animal, selectedFood, state, now));
    for (let index = 0; index < ranked.length; index += 1) {
      if (!reserved.has(ranked[index].animal.id) && Math.random() < probabilities[index]) {
        winnerIndex = index;
        break;
      }
    }
    const winner = winnerIndex >= 0 ? ranked[winnerIndex].animal : null;
    const attemptDelay = Math.max(0, winnerIndex) * 280;
    const eatDelay = duration + attemptDelay + 820;
    const expiresAt = nowPerformance + (winner ? eatDelay : FOOD_LIFETIME_MS);
    const particle: FoodParticle = {
      id,
      food: selectedFood,
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
    const responders: AnimalResponse[] = ranked
      .filter(({ animal }, index) => animal.hasAcceptedFood || index <= Math.max(winnerIndex, 1))
      .map(({ animal, position }, index) => {
        const angle = ((animal.id * 137.508) % 360) * Math.PI / 180;
        const isWinner = animal.id === winner?.id;
        const approaches = animal.hasAcceptedFood || isWinner;
        return {
          foodId: id,
          animalId: animal.id,
          x: isWinner ? targetX : approaches ? clamp(targetX + Math.cos(angle) * (3.4 + animal.id % 3), 5, 95) : clamp(position.x + (targetX - position.x) * 0.08, 5, 95),
          y: isWinner ? targetY : approaches ? clamp(targetY + Math.sin(angle) * (3.4 + animal.id % 3), 25, 92) : clamp(position.y + (targetY - position.y) * 0.08, 24, 93),
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
    onThrow({ id, at: now, food: selectedFood, x: targetX, y: targetY, accepted: null, animalId: null, species: null, favorite: false });

    const approachTimer = window.setTimeout(() => {
      setResponses((current) => current.map((response) =>
        response.foodId === id
          ? { ...response, phase: response.winner || state.pigeons.find((animal) => animal.id === response.animalId)?.hasAcceptedFood ? "approach" : "rejecting" }
          : response,
      ));
    }, duration + 80);

    const resolveTimer = window.setTimeout(() => {
      onResolve({ id, animalId: winner?.id ?? null, food: selectedFood, x: targetX, y: targetY, declinedBefore: winnerIndex >= 0 ? winnerIndex : ranked.length });
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
    const position = displayPosition(animal);
    const id = deathSequence.current++;
    setDeathEffects((current) => [...current, { id, animal, x: position.x, y: position.y }]);
    setResponses((current) => current.filter((response) => response.animalId !== animal.id));
    onKill(animal.id);
    const timer = window.setTimeout(() => setDeathEffects((current) => current.filter((effect) => effect.id !== id)), DEATH_ANIMATION_MS);
    timers.current.push(timer);
  };

  const favoriteResponse = favorite ? responses.find((response) => response.animalId === favorite.id) : undefined;
  const cityCount = state.pigeons.filter((animal) => animal.hasAcceptedFood).length;

  return (
    <section
      aria-label={copy.throwAria}
      className="ecosystem ecosystem-v6"
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
        "--wildlife-atlas": wildlifeAtlas ? `url("${wildlifeAtlas}")` : "none",
        "--extra-atlas": extraAtlas ? `url("${extraAtlas}")` : "none",
      } as React.CSSProperties}
      tabIndex={0}
    >
      <header className="scene-header">
        <h1>{copy.brand}</h1>
        <div className="scene-generation"><span>{copy.cycle}</span><strong>{String(state.generations).padStart(2, "0")}</strong></div>
      </header>

      <div className="online-marker" role="status">
        <span>{copy.online}</span><strong>{onlineCount}</strong><small>{copy.collectivePressure}</small>
      </div>
      <div className="city-circle" aria-hidden="true" />
      <div className="habitat-label habitat-label-wild"><span>{copy.wildPark}</span><strong>{state.pigeons.length - cityCount}</strong></div>
      <div className="habitat-label habitat-label-city"><span>{copy.cityPlaza}</span><strong>{cityCount}</strong></div>
      <div className="plaza-population" role="status"><span>{copy.population}</span><strong>{state.pigeons.length}/{MAX_ANIMALS}</strong></div>
      <div className="plaza-metrics">
        {pillarOrder.map((pillar, index) => (
          <div
            aria-label={`${pillarNames[language][pillar]} ${Math.round(state[pillar])}`}
            className={`plaza-metric plaza-metric-${index + 1} ${state[pillar] <= 25 ? "is-critical" : ""}`}
            key={pillar}
            role="status"
            style={{ "--metric-value": `${state[pillar]}%` } as React.CSSProperties}
          >
            <span>{pillarNames[language][pillar]}</span><strong>{Math.round(state[pillar])}</strong><i />
          </div>
        ))}
      </div>

      <div className="v6-animal-layer">
        {state.pigeons.map((animal) => {
          const response = [...responses].reverse().find((item) => item.animalId === animal.id);
          const position = displayPosition(animal);
          const isFavorite = animal.id === favorite?.id;
          const phase = response?.phase ?? "idle";
          return (
            <div
              aria-label={animalAria(animal, language, isFavorite)}
              className={`pigeon-word animal-agent animal-agent-${animal.species} ${animal.hasAcceptedFood ? "pigeon-word-inside" : "pigeon-word-outside"} ${animal.boldness >= 0.55 ? "pigeon-word-bold" : "pigeon-word-shy"} ${isFavorite ? "pigeon-word-host-favorite" : ""} v6-animal v6-intent-${response?.intent ?? "none"} v6-phase-${phase}`}
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
                "--claim-x": `${position.x}%`,
                "--claim-y": `${position.y}%`,
                "--tilt": `${((animal.id % 5) - 2) * 0.7}deg`,
                "--scale": 1,
                "--speed": `${6.8 + (animal.id % 5) * 0.35}s`,
                "--flight-duration": "850ms",
                "--response-delay": `${response?.delay ?? 0}ms`,
              } as React.CSSProperties}
              tabIndex={0}
            >
              <AnimalSprite animal={animal} atlasReady={Boolean(wildlifeAtlas && extraAtlas)} phase={phase} />
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
              <AnimalSprite animal={effect.animal} atlasReady={Boolean(wildlifeAtlas && extraAtlas)} />
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
        {particles.map((particle) => {
          const position = projectilePosition(particle, frameTime || particle.launchedAt);
          return (
            <span
              className={`food-particle v6-food-${particle.food} ${position.landed ? "food-particle-landed" : ""}`}
              data-food-id={particle.id}
              key={particle.id}
              style={{ "--food-x": `${position.x}%`, "--food-y": `${position.y}%`, "--food-color": foodData[particle.food].color } as React.CSSProperties}
            >
              {foodData[particle.food].symbol}
            </span>
          );
        })}
      </div>

      <div aria-hidden="true" className="feed-launcher"><b>{foodData[selectedFood].symbol}</b></div>
      <FoodTray language={language} onSelect={setSelectedFood} selected={selectedFood} />

      <div className={`v6-favorite-plaque ${favorite ? "has-favorite" : "is-empty"}`} data-host-favorite-id={favorite?.id} role="status">
        <div className="v6-favorite-portrait">
          {favorite ? <AnimalSprite animal={favorite} atlasReady={Boolean(wildlifeAtlas && extraAtlas)} phase={favoriteResponse?.phase ?? "idle"} /> : <span>♥</span>}
        </div>
        <span><small>{copy.hostFavorite}</small><strong>{favorite ? speciesNames[language][favorite.species] : copy.favoriteEmpty}</strong>{favorite ? <b>{favorite.feedCount} {copy.feeds}</b> : null}</span>
        {favorite ? <i aria-label={copy.protected}>♥</i> : null}
      </div>

      <FieldJournal language={language} state={state} />
      {state.activeEventId ? <EventCard eventId={state.activeEventId} language={language} onChoose={onEventChoice} /> : null}
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
            <p>{pillarNames[language][state.endedBy]} · 0</p>
            <h2>{copy.gameOver}</h2>
            <span>{copy.gameOverBody}</span>
            <div className="v6-end-pillars">
              {pillarOrder.map((pillar) => (
                <div className={pillar === state.endedBy ? "is-zero" : ""} key={pillar}>
                  <small>{pillarNames[language][pillar]}</small><strong>{Math.round(state[pillar])}</strong>
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
