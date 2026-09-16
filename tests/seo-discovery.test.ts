import assert from "node:assert/strict";
import { buildLlmsTxt } from "../src/lib/llms-content";
import { PUBLIC_MARKETING_ROUTES } from "../src/lib/public-routes";
import { SITE_NAME, serializeJsonLd, siteNavigationJsonLd } from "../src/lib/seo";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}`);
    throw e;
  }
}

test("llms.txt includes brand and docs", () => {
  const body = buildLlmsTxt("standard");
  assert.ok(body.includes(SITE_NAME));
  assert.ok(body.includes("/docs"));
  assert.ok(body.includes("OpenAPI"));
});

test("llms-full.txt adds crawler hints", () => {
  const body = buildLlmsTxt("full");
  assert.ok(body.includes("sitemap.xml"));
  assert.ok(body.includes("For crawlers"));
});

test("public routes drive navigation JSON-LD", () => {
  const json = siteNavigationJsonLd(
    PUBLIC_MARKETING_ROUTES.map((r) => ({
      name: r.label,
      path: r.path,
      description: r.description,
    })),
  );
  const raw = serializeJsonLd(json);
  assert.ok(raw.includes('"@type":"ItemList"'));
  assert.ok(raw.includes('"Documentation"'));
});

console.log("seo-discovery tests passed");
