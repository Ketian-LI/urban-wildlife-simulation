import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", ...headers },
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

test("server-renders the illustrated flock", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Urban Pigeon Simulation<\/title>/i);
  assert.match(html, /animated illustrated pigeon population/);
  assert.match(html, /pigeon-word pigeon-word-bold/);
  assert.match(html, /represented by PiGeoN/);
  assert.match(html, /represented by pIgEon/);
  assert.match(html, /represented by PIGEON/);
  assert.match(html, /Online now/);
  assert.match(html, /feeding unrestricted/);
  assert.match(html, /only city birds gradually die; wild birds remain safe outside/);
  assert.match(html, />30\/50</);
  assert.match(html, /Marble city plaza/);
  assert.match(html, /Wild park/);
  assert.match(html, /30 wild/);
  assert.match(html, /pigeon-word-outside/);
  assert.match(html, /pigeon-bird-sprite/);
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
  assert.match(html, /Throw food into the animated illustrated pigeon population/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /Sign in with ChatGPT/);
  assert.match(html, /Saved on this device/);
  assert.match(html, /href="\/signin-with-chatgpt\?return_to=%2F"/);
  assert.match(html, /Open accessory collection/);
  assert.equal(
    [...html.matchAll(/data-accessory-id="[^"]+"/g)].length,
    1,
  );
  assert.match(html, /rare-accessory-spark/);
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

test("server-renders the signed-in cloud-save account", async () => {
  const response = await render({
    "oai-authenticated-user-email": "field-host@example.com",
  });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /field-host@example\.com/);
  assert.match(html, /Cloud save/);
  assert.match(html, /Loading cloud save/);
  assert.match(html, /href="\/signout-with-chatgpt\?return_to=%2F"/);
});

test("keeps the pigeon simulation visual system in source", async () => {
  const [
    simulation,
    css,
    layout,
    page,
    packageJson,
    presenceRoute,
    simulationStateRoute,
    databaseSchema,
    databaseIndex,
    hostingConfig,
  ] = await Promise.all([
    readFile(new URL("../app/simulation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/presence/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/simulation-state/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
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
  assert.match(simulation, /const MIN_COLOR_VARIETIES = 7/);
  assert.match(simulation, /const FEEDING_SAFETY_MS = 5000/);
  assert.match(simulation, /const SPLIT_ANIMATION_MS = 1800/);
  assert.match(simulation, /const CITY_FOOD_DETECTION_RADIUS = 24/);
  assert.match(simulation, /const CLOUD_SAVE_INTERVAL_MS = 5_000/);
  assert.match(simulation, /const ACCESSORY_SPAWN_CHANCE_PER_SECOND = 0\.004/);
  const accessoryCatalogSource = simulation.match(
    /const accessoryCatalog = \[([\s\S]*?)\] as const;/,
  )?.[1];
  assert.ok(accessoryCatalogSource);
  assert.equal([...accessoryCatalogSource.matchAll(/\bid: "/g)].length, 16);
  assert.match(accessoryCatalogSource, /id: "crown"/);
  assert.match(accessoryCatalogSource, /id: "red-leg-band"/);
  assert.match(accessoryCatalogSource, /id: "rainbow-streamer"/);
  assert.match(simulation, /function recordFeedActionState/);
  assert.match(simulation, /function protectFlockFromHunger/);
  assert.match(simulation, /const HUNGER_INTERVAL_SECONDS = 1/);
  assert.match(simulation, /boldness: number/);
  assert.match(simulation, /caseMask: number/);
  assert.match(simulation, /colorSeed: number/);
  assert.match(simulation, /sizeScale: number/);
  assert.match(simulation, /sizeScale: 1/);
  assert.doesNotMatch(simulation, /sizeScale: 0\.74/);
  assert.match(simulation, /hasAcceptedFood: boolean/);
  assert.match(simulation, /function averageBoldness/);
  assert.match(simulation, /function hostFavoritePigeon/);
  assert.match(simulation, /pigeon\.feedCount <= 0/);
  assert.match(simulation, /pigeon\.feedCount > favorite\.feedCount/);
  assert.match(
    simulation,
    /pigeon\.feedCount === favorite\.feedCount && pigeon\.id < favorite\.id/,
  );
  assert.match(simulation, /function createOuterPigeon/);
  assert.match(simulation, /function guaranteeAccessoryCarrier/);
  assert.match(simulation, /guaranteeAccessoryCarrier\(pigeons\)/);
  assert.match(simulation, /initialAccessorySeeded: boolean/);
  assert.match(simulation, /initialAccessorySeeded: true/);
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
  assert.match(
    simulation,
    /restarted\.unlockedAccessories = \[\.\.\.current\.unlockedAccessories\]/,
  );
  assert.match(
    simulation,
    /guaranteeAccessoryCarrier\(\s*restarted\.pigeons,\s*restarted\.unlockedAccessories/,
  );
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
  assert.match(simulation, /pigeon\.id !== favoriteId &&/);
  assert.match(simulation, /feedingProtectedUntil: number/);
  assert.match(simulation, /protectedUntil: number/);
  assert.match(simulation, /accepted \? flightDuration \+ 100 : 0/);
  assert.match(simulation, /feedPigeonState/);
  assert.match(simulation, /const carriedAccessory = pigeons\[parentIndex\]\.accessory/);
  assert.match(simulation, /pigeons\[parentIndex\]\.accessory = null/);
  assert.match(simulation, /Accessory unlocked:/);
  assert.match(simulation, /function equipFavoriteAccessoryState/);
  assert.match(simulation, /favoriteAccessory: accessoryId/);
  assert.match(simulation, /rejectFoodState/);
  assert.match(simulation, /function killPigeonState/);
  assert.match(
    simulation,
    /pigeons: current\.pigeons\.filter\(\(candidate\) => candidate\.id !== pigeonId\)/,
  );
  assert.match(simulation, /PIGEON_DEATH_ANIMATION_MS = 1400/);
  assert.match(simulation, /onContextMenu=\{\(event\) =>/);
  assert.match(simulation, /handlePigeonContextMenu\(event, pigeon\)/);
  assert.match(simulation, /const \[deathEffects, setDeathEffects\]/);
  assert.match(
    simulation,
    /className=\{`pigeon-death-effect pigeon-death-effect-\$\{effect\.zone\}`\}/,
  );
  assert.match(simulation, /className="pigeon-feather"/);
  assert.match(simulation, /Array\.from\(\{ length: 12 \}/);
  assert.match(simulation, /minimumFeedCount/);
  assert.match(
    simulation,
    /const removablePigeons = pigeons[\s\S]*?pigeon\.id !== favoriteId/,
  );
  assert.match(
    simulation,
    /unprotectedPigeons\.length > 0 \? unprotectedPigeons : removablePigeons/,
  );
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
  assert.match(
    simulation,
    /formatFeedCooldown\(\s*feedCooldownMs,\s*language,\s*\)/,
  );
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
  assert.match(simulation, /const uniformScale = 1/);
  assert.match(simulation, /scale: uniformScale/);
  assert.doesNotMatch(simulation, /individualScale/);
  assert.match(simulation, /palette: pigeonLetterPalette\(agent\)/);
  assert.match(simulation, /spriteIndex: plumageOrder\.indexOf\(agent\.plumage\)/);
  assert.match(simulation, /data-style-signature=\{pigeon\.styleSignature\}/);
  assert.match(simulation, /data-host-favorite-id=\{favoritePigeon\?\.id\}/);
  assert.match(simulation, /className="host-favorite-heart"/);
  assert.match(simulation, /pigeon-word-host-favorite/);
  assert.match(simulation, /copy\.favoriteProtected/);
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
  assert.match(simulation, /type Language = "en" \| "zh"/);
  assert.match(simulation, /const LANGUAGE_STORAGE_KEY/);
  assert.match(simulation, /const TUTORIAL_STORAGE_KEY/);
  assert.match(simulation, /function translateEvent/);
  assert.match(simulation, /function SceneControls/);
  assert.match(simulation, /function TutorialDialog/);
  assert.match(simulation, /className="language-switch tutorial-language-switch"/);
  assert.match(simulation, /onLanguageChange=\{changeLanguage\}/);
  assert.match(simulation, /role="group"/);
  assert.match(simulation, /role="dialog"/);
  assert.match(simulation, /aria-pressed=\{language === "zh"\}/);
  assert.match(simulation, /tutorialSteps\[language\]/);
  assert.match(simulation, /window\.localStorage\.setItem\(LANGUAGE_STORAGE_KEY/);
  assert.match(simulation, /document\.documentElement\.lang/);
  assert.match(simulation, /function AccountControl/);
  assert.match(simulation, /className="account-control account-sign-in"/);
  assert.match(simulation, /account-sync-\$\{syncStatus\}/);
  assert.match(simulation, /function restoreState/);
  assert.match(simulation, /unlockedAccessories\.filter\(isAccessoryId\)/);
  assert.match(simulation, /parsed\.initialAccessorySeeded !== true/);
  assert.match(simulation, /isAccessoryId\(parsed\.favoriteAccessory\)/);
  assert.match(simulation, /function maybeSpawnRareAccessory/);
  assert.match(simulation, /pigeon\.accessory !== null/);
  assert.match(simulation, /maybeSpawnRareAccessory\(next, elapsedSeconds\)/);
  assert.match(simulation, /fetch\("\/api\/simulation-state"/);
  assert.match(simulation, /method: "POST"/);
  assert.match(simulation, /window\.navigator\.sendBeacon/);
  assert.match(simulation, /CLOUD_SAVE_INTERVAL_MS/);
  assert.match(simulation, /少于七种羽色/);
  assert.match(simulation, /fewer than seven/);
  assert.match(simulation, /&lt; 7\/8/);
  assert.match(simulation, /birthX: number/);
  assert.match(simulation, /bornAt: number/);
  assert.match(simulation, /protectedUntil: bornAt \+ SPLIT_ANIMATION_MS \+ 100/);
  assert.match(simulation, /pigeon-word-newborn/);
  assert.match(simulation, /function PigeonAccessory/);
  assert.match(simulation, /function AccessoryWardrobe/);
  assert.match(simulation, /const closeOnOutsidePointer/);
  assert.match(simulation, /document\.addEventListener\("pointerdown"/);
  assert.match(simulation, /aria-expanded=\{isOpen\}/);
  assert.match(simulation, /className="accessory-trigger-chevron"/);
  assert.match(simulation, /setSelectedAccessory\(accessory\.id\)/);
  assert.match(simulation, /onPreview\(accessory\.id\)/);
  assert.match(simulation, /copy\.wardrobeEquip/);
  assert.match(simulation, /favoriteAccessoryPreview \?\? state\.favoriteAccessory/);
  assert.match(simulation, /data-accessory-id=\{accessoryId\}/);
  assert.match(simulation, /data-accessory-option=\{accessory\.id\}/);
  assert.match(simulation, /className="rare-accessory-spark"/);
  assert.match(simulation, /tutorial-accessory-row/);
  assert.doesNotMatch(simulation, /pigeon-feed-count|<sup/);
  assert.doesNotMatch(
    simulation,
    /MAX_VISITOR_FOOD|FOOD_REGEN_SECONDS|visitorFood|foodClock|foodBudget|food-reserve/,
  );
  assert.doesNotMatch(simulation, /shyWordForms|boldWordForms/);
  assert.match(css, /\.pigeon-word-label/);
  assert.match(css, /\.pigeon-bird-sprite/);
  assert.match(css, /url\("\/pigeon-motion-atlas\.webp"\)/);
  assert.doesNotMatch(
    css,
    /url\("\/pigeon-(?:idle|crouch|half-open|flight|downstroke|landing|settle)-atlas\.webp"\)/,
  );
  assert.match(css, /@keyframes pigeon-flight-sprite-frames/);
  assert.match(css, /@keyframes pigeon-landing-sprite-frames/);
  assert.match(css, /@keyframes pigeon-bird-dissolve/);
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
  assert.match(css, /--body-width: 1\.08/);
  assert.match(css, /--body-height: 1\.04/);
  assert.match(css, /\.pigeon-word-inside \.pigeon-word-label/);
  assert.match(css, /\.pigeon-word-inside\.pigeon-word-bold \.pigeon-word-label/);
  assert.match(css, /font-size: 1\.12rem/);
  assert.match(css, /font-size: 1\.2rem/);
  assert.match(css, /\.pigeon-word-outside/);
  assert.match(css, /--body-width: 0\.88/);
  assert.match(css, /\.pigeon-word-shy\s*\{\s*opacity: 1/);
  assert.match(css, /\.pigeon-word-outside\s*\{\s*opacity: 1/);
  assert.doesNotMatch(css, /\.pigeon-word-shy\s*\{\s*opacity: 0\./);
  assert.doesNotMatch(css, /\.pigeon-word-outside\s*\{\s*opacity: 0\./);
  assert.match(css, /transform: scaleX\(var\(--body-width\)\) scaleY\(var\(--body-height\)\)/);
  assert.match(css, /\.pigeon-word-newborn/);
  assert.match(css, /\.host-favorite-plaque/);
  assert.match(css, /\.host-favorite-portrait/);
  assert.match(css, /\.host-favorite-protection/);
  assert.match(css, /\.host-favorite-heart/);
  assert.match(css, /\.pigeon-word-host-favorite/);
  assert.match(css, /\.pigeon-accessory-crown/);
  assert.match(css, /\.pigeon-accessory-red-leg-band/);
  assert.match(css, /\.pigeon-accessory-rainbow-streamer/);
  assert.match(css, /\.rare-accessory-spark/);
  assert.match(css, /\.accessory-wardrobe-panel/);
  assert.match(css, /\.accessory-wardrobe\.is-open \.accessory-wardrobe-panel/);
  assert.match(css, /transform 200ms cubic-bezier/);
  assert.match(css, /visibility: hidden/);
  assert.match(css, /\.accessory-grid/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.accessory-option\.is-equipped/);
  assert.match(css, /\.accessory-option\.is-selected/);
  assert.match(css, /\.accessory-actions/);
  assert.match(css, /\.tutorial-visual-4/);
  assert.match(css, /\.account-control/);
  assert.match(css, /\.account-sign-in/);
  assert.match(css, /\.account-signed-in/);
  assert.match(css, /\.account-sync-error/);
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
  assert.match(css, /\.scene-controls/);
  assert.match(css, /\.language-switch/);
  assert.match(css, /\.tutorial-help-button/);
  assert.match(css, /\.tutorial-backdrop/);
  assert.match(css, /\.tutorial-dialog/);
  assert.match(css, /\.tutorial-visual/);
  assert.match(css, /\.tutorial-pigeon-city/);
  assert.match(css, /\.wild-park/);
  assert.match(css, /\.park-tree/);
  assert.match(css, /\.plaza-monument/);
  assert.match(css, /url\("\/equestrian-monument\.png"\)/);
  assert.match(css, /\.plaza-metric/);
  assert.match(css, /\.pigeon-death-effect/);
  assert.match(css, /@keyframes pigeon-letter-disperse/);
  assert.match(css, /@keyframes pigeon-feather-disperse/);
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
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /getChatGPTUser\(\)/);
  assert.match(page, /chatGPTSignInPath\("\/"\)/);
  assert.match(page, /chatGPTSignOutPath\("\/"\)/);
  assert.match(simulationStateRoute, /getChatGPTUser\(\)/);
  assert.match(simulationStateRoute, /ownerIdForEmail/);
  assert.match(simulationStateRoute, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(simulationStateRoute, /MAX_STATE_BYTES = 256_000/);
  assert.match(simulationStateRoute, /MAX_PIGEONS = 50/);
  assert.match(simulationStateRoute, /onConflictDoUpdate/);
  assert.match(databaseSchema, /presenceSessions/);
  assert.match(databaseSchema, /lastSeen: integer\("last_seen"\)/);
  assert.match(databaseSchema, /simulationSaves/);
  assert.match(databaseSchema, /ownerId: text\("owner_id"\)\.primaryKey\(\)/);
  assert.match(databaseIndex, /ensureSimulationSaveSchema/);
  assert.match(databaseIndex, /CREATE TABLE IF NOT EXISTS simulation_saves/);
  assert.equal(JSON.parse(hostingConfig).d1, "DB");

  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/equestrian-monument.png", import.meta.url));
  await access(new URL("../public/pigeon-motion-atlas.webp", import.meta.url));
  await access(new URL("../drizzle/0001_glossy_warbird.sql", import.meta.url));
});
