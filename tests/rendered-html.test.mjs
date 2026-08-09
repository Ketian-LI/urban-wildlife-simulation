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
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the endless urban wildlife scene", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Urban Wildlife Simulation<\/title>/i);
  assert.match(html, /Urban Wildlife Simulation/);
  assert.match(html, /City cycle/);
  assert.match(html, />Online</);
  assert.match(html, /15<!-- -->\/<!-- -->30/);
  assert.match(html, /Vitality/);
  assert.match(html, /Foraging/);
  assert.match(html, /Habitat/);
  assert.match(html, /Coexistence/);
  assert.match(html, /Choose food/);
  assert.match(html, /Grain/);
  assert.match(html, /Nut/);
  assert.match(html, /Peas/);
  assert.match(html, /Fish/);
  assert.match(html, /Biscuit/);
  assert.match(html, /Meat/);
  assert.match(html, /Insects/);
  assert.match(html, /Host favorite/);
  assert.match(html, /Field journal/);
  assert.match(html, /Sign in with ChatGPT/);
  assert.match(html, /href="\/signin-with-chatgpt\?return_to=%2F"/);
  assert.match(html, /animal-agent-pigeon/);
  assert.equal([...html.matchAll(/data-animal-id="\d+"/g)].length, 15);
  assert.doesNotMatch(html, /accessory|wardrobe|outfit/i);
  assert.doesNotMatch(html, /feed cooldown|genetic diversity|<sup/i);
});

test("server-renders the signed-in cloud-save account", async () => {
  const response = await render({
    "oai-authenticated-user-email": "field-host@example.com",
  });
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /field-host@example\.com/);
  assert.match(html, /Loading cloud save/);
  assert.match(html, /href="\/signout-with-chatgpt\?return_to=%2F"/);
});

test("keeps the revised feeding, event, and loss systems in source", async () => {
  const [simulation, css, layout, page, presenceRoute, stateRoute, schema, database, hosting] = await Promise.all([
    readFile(new URL("../app/simulation-v6.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/presence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/simulation-state/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(simulation, /const INITIAL_ANIMALS = 15/);
  assert.match(simulation, /const MAX_ANIMALS = 30/);
  assert.match(simulation, /const STORAGE_KEY = "urban-pigeon-collective-v6"/);
  assert.match(simulation, /type Species =[\s\S]*?"pigeon"[\s\S]*?"squirrel"[\s\S]*?"swan"[\s\S]*?"stray-cat"[\s\S]*?"stray-dog"[\s\S]*?"fox"[\s\S]*?"hedgehog"/);
  assert.match(simulation, /type FoodType =[\s\S]*?"grain"[\s\S]*?"nut"[\s\S]*?"greens"[\s\S]*?"fish"[\s\S]*?"biscuit"[\s\S]*?"meat"[\s\S]*?"insect"/);
  assert.match(simulation, /const pillarOrder: PillarKey\[\] = \[[\s\S]*?"vitality"[\s\S]*?"foraging"[\s\S]*?"habitat"[\s\S]*?"coexistence"[\s\S]*?\]/);
  assert.match(simulation, /function acceptanceProbability/);
  assert.match(simulation, /\.sort\(\(left, right\) => left\.distance - right\.distance \|\| left\.animal\.id - right\.animal\.id\)/);
  assert.match(simulation, /let winnerIndex = -1/);
  assert.match(simulation, /FOOD_LIFETIME_MS = 7_200/);
  assert.match(simulation, /function projectilePosition/);
  assert.match(simulation, /phase: "noticing"/);
  assert.match(simulation, /\? "approach" : "rejecting"/);
  assert.match(simulation, /phase: "landing"/);
  assert.match(simulation, /nutrition >= 3/);
  assert.match(simulation, /function runGeneration/);
  assert.match(simulation, /const absentSpecies = speciesOrder\.filter/);
  assert.match(simulation, /state\.pigeons\.length >= MAX_ANIMALS/);
  assert.match(simulation, /animal\.id !== state\.favoriteId/);
  assert.match(simulation, /a lightly fed \$\{speciesNames\.en\[migrant\.species\]/);
  assert.match(simulation, /const endedBy = pillarOrder\.find\(\(pillar\) => state\[pillar\] <= 0\)/);
  assert.match(simulation, /role="alertdialog"/);
  assert.match(simulation, /function chooseEvent/);
  assert.match(simulation, /feedingHistory\.filter/);
  assert.match(simulation, /activeEventId/);
  assert.match(simulation, /favoritePosition/);
  assert.match(simulation, /cursorTarget/);
  assert.match(simulation, /onContextMenu=\{\(event\) => onContextMenu\(event, animal\)\}/);
  assert.match(simulation, /className="pigeon-feather"/);
  assert.match(simulation, /fetch\("\/api\/presence"/);
  assert.match(simulation, /fetch\("\/api\/simulation-state"/);
  assert.match(simulation, /CLOUD_SAVE_INTERVAL_MS/);
  assert.doesNotMatch(simulation, /ACCESSORY|WARDROBE|OUTFIT/i);
  assert.doesNotMatch(simulation, /FEED_COOLDOWN|lastThrowAt|HUNGER_INTERVAL|SPLIT_ANIMATION/i);
  assert.doesNotMatch(simulation, /genetic diversity|restartColorVariety/i);

  assert.match(css, /\.ecosystem-v6/);
  assert.match(css, /\.v6-food-tray/);
  assert.match(css, /\.v6-event-card/);
  assert.match(css, /\.v6-game-over/);
  assert.match(css, /\.v6-animal-sprite/);
  assert.match(css, /--extra-atlas/);
  assert.match(css, /opacity: 1/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.match(page, /from "\.\/simulation-v6"/);
  assert.match(presenceRoute, /const ACTIVE_WINDOW_MS = 45_000/);
  assert.match(presenceRoute, /heartbeatMs: 15_000/);
  assert.match(stateRoute, /MAX_ANIMALS = 30/);
  assert.match(stateRoute, /onConflictDoUpdate/);
  assert.match(schema, /simulationSaves/);
  assert.match(database, /ensureSimulationSaveSchema/);
  assert.equal(JSON.parse(hosting).d1, "DB");

  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/equestrian-monument.png", import.meta.url));
  await access(new URL("../public/pigeon-motion-atlas.webp", import.meta.url));
  await access(new URL("../public/wildlife-motion-atlas.png", import.meta.url));
  await access(new URL("../public/fox-hedgehog-motion-atlas.png", import.meta.url));
});
