import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the typographic flock", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Urban Pigeon Simulation<\/title>/i);
  assert.match(html, /animated typographic pigeon population/);
  assert.match(html, /pigeon-word pigeon-word-bold/);
  assert.match(html, /represented by PiGeoN/);
  assert.match(html, /represented by pIgEon/);
  assert.match(html, /represented by PIGEON/);
  assert.match(html, /Online now/);
  assert.match(html, /feeding unrestricted/);
  assert.match(html, /only city birds gradually die; wild birds remain safe outside/);
  assert.match(html, />30\/50</);
  assert.match(html, /City circle/);
  assert.match(html, /30 outside/);
  assert.match(html, /pigeon-word-outside/);
  assert.match(html, /URBAN URBAN/);
  assert.match(html, /ONE/);
  assert.match(html, /WORLD/);
  assert.match(html, /TRADE/);
  assert.match(html, /CENTER/);
  assert.match(html, /TRANSIT TRANSIT/);
  assert.match(html, /pigeon-word-white/);
  assert.match(html, /pigeon-word-spotted/);
  assert.match(html, /pigeon-word-brown/);
  assert.match(html, /pigeon-word-blue-grey/);
  assert.match(html, /pigeon-word-charcoal/);
  assert.match(html, /pigeon-word-silver/);
  assert.match(html, /pigeon-word-rust/);
  assert.match(html, /8\/8 colors/);
  assert.match(html, /Throw food into the animated typographic pigeon population/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /pigeon-body|pigeon-head|>Feed</);

  const styleSignatures = [
    ...html.matchAll(/data-style-signature="([^"]+)"/g),
  ].map((match) => match[1]);
  const renderedWords = [
    ...html.matchAll(/represented by ([A-Za-z]+),/g),
  ].map((match) => match[1]);
  assert.equal(styleSignatures.length, 30);
  assert.equal(new Set(styleSignatures).size, 30);
  assert.equal(
    new Set(styleSignatures.map((signature) => signature.split(":")[0])).size,
    8,
  );
  assert.equal(new Set(renderedWords).size, 30);
  for (let letterIndex = 0; letterIndex < "pigeon".length; letterIndex += 1) {
    assert.equal(
      new Set(renderedWords.map((word) => word[letterIndex])).size,
      2,
    );
  }
});

test("keeps the word-pigeon visual system in source", async () => {
  const [
    simulation,
    css,
    layout,
    packageJson,
    presenceRoute,
    databaseSchema,
    hostingConfig,
  ] = await Promise.all([
    readFile(new URL("../app/simulation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/presence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(simulation, /const pigeonLetters = "pigeon"/);
  assert.match(simulation, /function wordFromCaseMask/);
  assert.match(simulation, /1 << letterIndex/);
  assert.match(simulation, /const featherPalettes/);
  assert.match(simulation, /const INITIAL_PIGEONS = 30/);
  assert.match(simulation, /const MAX_PIGEONS = 50/);
  assert.match(simulation, /const STORAGE_KEY = "urban-pigeon-collective-v5"/);
  assert.match(simulation, /const TOTAL_COLOR_VARIETIES = 8/);
  assert.match(simulation, /const MIN_COLOR_VARIETIES = 4/);
  assert.match(simulation, /const FEEDING_SAFETY_MS = 5000/);
  assert.match(simulation, /const SPLIT_ANIMATION_MS = 1800/);
  assert.match(simulation, /const CITY_FOOD_DETECTION_RADIUS = 24/);
  assert.match(simulation, /function recordFeedActionState/);
  assert.match(simulation, /function protectFlockFromHunger/);
  assert.match(simulation, /const HUNGER_INTERVAL_SECONDS = 1/);
  assert.match(simulation, /boldness: number/);
  assert.match(simulation, /caseMask: number/);
  assert.match(simulation, /colorSeed: number/);
  assert.match(simulation, /sizeScale: number/);
  assert.match(simulation, /hasAcceptedFood: boolean/);
  assert.match(simulation, /function averageBoldness/);
  assert.match(simulation, /function createOuterPigeon/);
  assert.match(simulation, /function inheritedPigeonStyle/);
  assert.match(simulation, /const childStyle = inheritedPigeonStyle\(parent\)/);
  assert.match(simulation, /const style = inheritedPigeonStyle\(template\)/);
  assert.doesNotMatch(simulation, /mutatePigeonStyle/);
  assert.match(simulation, /function pigeonColorVarietyCount/);
  assert.match(simulation, /new Set\(pigeons\.map\(\(pigeon\) => pigeon\.plumage\)\)\.size/);
  assert.match(simulation, /restartColorVarietyCount: number \| null/);
  assert.match(simulation, /function markRestartRequiredIfColorVarietyTooLow/);
  assert.match(simulation, /colorVarietyCount >= MIN_COLOR_VARIETIES/);
  assert.match(simulation, /function restartEcosystemState/);
  assert.match(simulation, /Genetic diversity is too low/);
  assert.match(simulation, /role="alertdialog"/);
  assert.match(simulation, /Restart ecosystem/);
  assert.match(simulation, /restartButtonRef\.current\?\.focus\(\)/);
  assert.match(simulation, /return markRestartRequiredIfColorVarietyTooLow\(next\)/);
  assert.match(simulation, /function createRefreshedOuterPigeon/);
  assert.match(simulation, /function replenishOuterPigeons/);
  assert.match(simulation, /while \(state\.pigeons\.length < INITIAL_PIGEONS\)/);
  assert.match(simulation, /const template = pigeons\[templateIndex\]/);
  assert.match(simulation, /function applyHungerDeaths/);
  assert.match(simulation, /pigeon\.hasAcceptedFood &&/);
  assert.match(simulation, /feedingProtectedUntil: number/);
  assert.match(simulation, /protectedUntil: number/);
  assert.match(simulation, /accepted \? flightDuration \+ 100 : 0/);
  assert.match(simulation, /feedPigeonState/);
  assert.match(simulation, /rejectFoodState/);
  assert.match(simulation, /minimumFeedCount/);
  assert.match(simulation, /function selectFoodRecipient/);
  assert.match(simulation, /function cityPigeonsDetectingFood/);
  assert.match(simulation, /pigeon\.zone === "inside"/);
  assert.match(simulation, /CITY_FOOD_DETECTION_RADIUS/);
  assert.match(simulation, /function foodResponsePosition/);
  assert.match(simulation, /response: "recipient" \| "observer"/);
  assert.match(simulation, /const response: FoodClaim\["response"\]/);
  assert.match(simulation, /const ranked = \[\.\.\.pigeons\]\.sort/);
  assert.match(simulation, /leftDistance - rightDistance \|\| left\.id - right\.id/);
  assert.match(simulation, /const feedingAcceptance = agent\.hasAcceptedFood \? 1 : agent\.boldness/);
  assert.match(simulation, /random\(\) < pigeon\.feedingAcceptance/);
  assert.match(simulation, /feeding acceptance/);
  assert.match(simulation, /declinedBefore/);
  assert.match(simulation, /function feedCooldownMsForOnlineCount/);
  assert.match(simulation, /visitorCount === 1/);
  assert.match(simulation, /visitorCount === 2[\s\S]*?return 500/);
  assert.match(simulation, /visitorCount \* 200/);
  assert.match(simulation, /const MAX_FEED_COOLDOWN_MS = 3_000/);
  assert.match(simulation, /const PRESENCE_HEARTBEAT_MS = 15_000/);
  assert.match(simulation, /window\.crypto\.randomUUID\(\)/);
  assert.match(simulation, /fetch\("\/api\/presence"/);
  assert.match(simulation, /feeding unrestricted/);
  assert.match(simulation, /feeding every \$\{formatFeedCooldown\(feedCooldownMs\)\} per visitor/);
  assert.match(simulation, /const \[lastThrowAt, setLastThrowAt\]/);
  assert.match(simulation, /launchedAt < nextAllowedAt/);
  assert.match(simulation, /feedCooldownMs=\{feedCooldownMs\}/);
  assert.match(simulation, /individual mean acceptance/);
  assert.match(simulation, /\$\{colorVarietyCount\}\/\$\{TOTAL_COLOR_VARIETIES\} colors/);
  assert.match(simulation, /pigeons\[parentIndex\]\.hasAcceptedFood = true/);
  assert.match(
    simulation,
    /const child: PigeonAgent = \{[\s\S]*?hasAcceptedFood: true,[\s\S]*?protectedUntil:/,
  );
  assert.match(simulation, /hungerClock: 0/);
  assert.match(simulation, /function projectilePosition/);
  assert.match(simulation, /agent\.id \* 137\.508/);
  assert.match(simulation, /const radialSeed/);
  assert.match(simulation, /scale: individualScale/);
  assert.match(simulation, /palette: pigeonLetterPalette\(agent\)/);
  assert.match(simulation, /data-style-signature=\{pigeon\.styleSignature\}/);
  assert.match(simulation, /speed: 6\.4/);
  assert.doesNotMatch(simulation, /const groupIndex|const densityScale/);
  assert.match(simulation, /phase: "flying"/);
  assert.match(simulation, /phase: "landing"/);
  assert.match(simulation, /const disappearanceDelay = accepted \? flightDuration : duration \+ 760/);
  assert.match(simulation, /disappearanceDelay \+ 860/);
  assert.match(simulation, /data-food-response=\{claim\?\.response\}/);
  assert.match(simulation, /window\.requestAnimationFrame/);
  assert.doesNotMatch(simulation, /const nearest = pigeons\.reduce/);
  assert.match(simulation, /pigeon-letter-capital/);
  assert.match(simulation, /data-food-id=\{particle\.id\}/);
  assert.match(simulation, /birthX: number/);
  assert.match(simulation, /bornAt: number/);
  assert.match(simulation, /protectedUntil: bornAt \+ SPLIT_ANIMATION_MS \+ 100/);
  assert.match(simulation, /pigeon-word-newborn/);
  assert.doesNotMatch(simulation, /pigeon-feed-count|<sup/);
  assert.doesNotMatch(
    simulation,
    /MAX_VISITOR_FOOD|FOOD_REGEN_SECONDS|visitorFood|foodClock|foodBudget|food-reserve/,
  );
  assert.doesNotMatch(simulation, /shyWordForms|boldWordForms/);
  assert.match(css, /\.pigeon-word-label/);
  assert.match(css, /\.pigeon-letter-capital/);
  assert.match(css, /\.food-particle/);
  assert.match(css, /@keyframes pigeon-flight/);
  assert.match(css, /@keyframes pigeon-landing/);
  assert.match(css, /@keyframes pigeon-split-birth/);
  assert.match(css, /@keyframes idle-sway/);
  assert.doesNotMatch(css, /cautious-drift|approach-drift/);
  assert.match(css, /\.pigeon-word-flying/);
  assert.match(css, /\.pigeon-word-landing/);
  assert.match(css, /\.city-circle/);
  assert.match(css, /\.city-building-one-world/);
  assert.match(css, /\.city-building-stepped-tower/);
  assert.match(css, /\.city-building-art-deco/);
  assert.match(css, /\.city-building-waterfront-east/);
  assert.match(css, /grid-template-columns/);
  assert.match(css, /clip-path: polygon/);
  assert.match(css, /\.pigeon-word-inside/);
  assert.match(css, /\.pigeon-word-inside \.pigeon-word-label/);
  assert.match(css, /\.pigeon-word-inside\.pigeon-word-bold \.pigeon-word-label/);
  assert.match(css, /font-size: 1\.12rem/);
  assert.match(css, /font-size: 1\.2rem/);
  assert.match(css, /\.pigeon-word-outside/);
  assert.match(css, /\.pigeon-word-newborn/);
  assert.match(css, /--field-sky/);
  assert.match(css, /\.pigeon-word-white/);
  assert.match(css, /\.pigeon-word-spotted/);
  assert.match(css, /\.pigeon-word-brown/);
  assert.match(css, /\.pigeon-word-blue-grey/);
  assert.match(css, /\.pigeon-word-charcoal/);
  assert.match(css, /\.pigeon-word-silver/);
  assert.match(css, /\.pigeon-word-rust/);
  assert.match(css, /\.restart-dialog-backdrop/);
  assert.match(css, /\.restart-dialog/);
  assert.match(css, /\.restart-diversity-readout/);
  assert.match(css, /\.feed-cooldown-status/);
  assert.match(css, /\.feed-cooldown-status\.is-cooling/);
  assert.match(css, /cubic-bezier/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /\.ecosystem-empty|\.food-reserve/);
  assert.doesNotMatch(css, /\.pigeon-feed-count/);
  assert.doesNotMatch(css, /\.pigeon-body|\.pigeon-head|\.feed-button/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(presenceRoute, /const ACTIVE_WINDOW_MS = 45_000/);
  assert.match(presenceRoute, /heartbeatMs: 15_000/);
  assert.match(presenceRoute, /\.onConflictDoUpdate/);
  assert.match(presenceRoute, /Cache-Control": "no-store"/);
  assert.match(databaseSchema, /presenceSessions/);
  assert.match(databaseSchema, /lastSeen: integer\("last_seen"\)/);
  assert.equal(JSON.parse(hostingConfig).d1, "DB");

  await access(new URL("../public/og.png", import.meta.url));
});
