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
  assert.match(html, /represented by PIGeon/);
  assert.match(html, /represented by piGeon/);
  assert.match(html, /represented by pigeoN/);
  assert.match(html, /Food remaining/);
  assert.match(html, />30\/50</);
  assert.match(html, /pigeon-word-white/);
  assert.match(html, /pigeon-word-spotted/);
  assert.match(html, /pigeon-word-brown/);
  assert.match(html, /Throw food into the animated typographic pigeon population/);
  assert.match(html, /food-reserve-dot food-reserve-dot-ready/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /pigeon-body|pigeon-head|>Feed</);
});

test("keeps the word-pigeon visual system in source", async () => {
  const [simulation, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/simulation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(simulation, /const shyWordForms/);
  assert.match(simulation, /const boldWordForms/);
  assert.match(simulation, /const featherPalettes/);
  assert.match(simulation, /const INITIAL_PIGEONS = 30/);
  assert.match(simulation, /const MAX_PIGEONS = 50/);
  assert.match(simulation, /feedPigeonState/);
  assert.match(simulation, /minimumFeedCount/);
  assert.match(simulation, /Math\.random/);
  assert.match(simulation, /function projectilePosition/);
  assert.match(simulation, /window\.requestAnimationFrame/);
  assert.match(simulation, /const nearest = pigeons\.reduce/);
  assert.match(simulation, /pigeon-letter-capital/);
  assert.match(css, /\.pigeon-word-label/);
  assert.match(css, /\.pigeon-letter-capital/);
  assert.match(css, /\.food-particle/);
  assert.match(css, /--field-sky/);
  assert.match(css, /\.pigeon-word-white/);
  assert.match(css, /\.pigeon-word-spotted/);
  assert.match(css, /\.pigeon-word-brown/);
  assert.match(css, /cubic-bezier/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /\.pigeon-body|\.pigeon-head|\.feed-button/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await access(new URL("../public/og.png", import.meta.url));
});
