import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(path = "/", cookie = "") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", cookie },
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

test("server-renders the FORMBOX workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>FORMBOX — 3D 박스 실시간 견적 \| FORMBOX<\/title>/i,
  );
  assert.match(html, /FORMBOX/);
  assert.match(html, /박스 형태/);
  assert.match(html, /사양 설정/);
  assert.match(html, /예상 견적/);
  assert.match(html, /<html[^>]*lang="ko"/);
  assert.match(html, /aria-label="언어 선택"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("server-renders English demo links before hydration, overriding a saved Korean choice", async () => {
  const response = await render("/?lang=en", "formbox-locale=ko");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="en"/);
  assert.match(html, /<title>FORMBOX — 3D Box Configurator &amp; Instant Estimates \| FORMBOX<\/title>/);
  assert.match(html, /property="og:locale" content="en_US"/);
  assert.match(html, /Box style/);
  assert.match(html, /Internal dimensions/);
  assert.match(html, /Roll-end mailer/);
  assert.match(html, /Estimated cost/);
  assert.match(html, /VAT incl\.[\s\S]*KRW/);
  assert.match(html, /aria-label="Choose language"/);
  assert.match(html, /aria-label="Switch to English" aria-pressed="true"/);
  assert.doesNotMatch(html, /모든 변경사항 저장됨|제작 가능한 사양이에요/);
});

test("uses the persisted language and lets an explicit Korean link override it", async () => {
  const english = await (await render("/", "formbox-locale=en")).text();
  assert.match(english, /<html[^>]*lang="en"/);
  assert.match(english, /Box style/);
  const korean = await (await render("/?lang=ko", "formbox-locale=en")).text();
  assert.match(korean, /<html[^>]*lang="ko"/);
  assert.match(korean, /박스 형태/);
  const fallback = await (await render("/?lang=fr", "formbox-locale=invalid")).text();
  assert.match(fallback, /<html[^>]*lang="ko"/);
  assert.match(fallback, /박스 형태/);
});

test("ships product metadata, SUIT, and no starter preview", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<BoxStudio initialLocale=\{await getPageLocale\(props\)\} \/>/);
  assert.match(layout, /lang=\{locale\}/);
  assert.match(css, /SUIT Variable/);
  assert.match(packageJson, /"three"/);
  assert.match(packageJson, /"reicon-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});

test("connects box selection to one shared dieline blueprint", async () => {
  const [studio, preview, templates] = await Promise.all([
    readFile(new URL("../app/BoxStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/BoxPreview.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/box-model/templates.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(studio, /boxType=\{boxType\}/);
  assert.doesNotMatch(studio, /viewMode === "dieline" \?/);
  assert.match(preview, /ShapeGeometry/);
  assert.match(preview, /OrthographicCamera/);
  assert.match(preview, /DoubleSide/);
  assert.match(preview, /createBoxBlueprint/);
  assert.match(templates, /mailerBlueprint/);
  assert.match(templates, /shippingBlueprint/);
  assert.match(templates, /drawerBlueprint/);
  assert.doesNotMatch(preview, /EdgesGeometry/);
  assert.doesNotMatch(preview, /new THREE\.BoxGeometry/);
});

test("keeps named open poses constrained and exposes direct fold control", async () => {
  const [studio, preview, templates, layout, css, dictionary] = await Promise.all([
    readFile(new URL("../app/BoxStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/BoxPreview.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/box-model/templates.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/box-model/dieline-layout.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/i18n.ts", import.meta.url), "utf8"),
  ]);

  assert.match(studio, /type="range"/);
  assert.match(dictionary, /0427 계열/);
  assert.match(studio, /nextProgress === 1 \? "closed" : "folding"/);
  assert.match(studio, /t\.openStatus\[boxType\]/);
  assert.match(dictionary, /몸체 완성 · 뚜껑 열림/);
  assert.match(dictionary, /Body assembled · Lid open/);
  assert.match(templates, /id: "lid-hinge"/);
  assert.match(templates, /inner-return-hook/);
  assert.match(templates, /front-left-lock-wing/);
  assert.match(templates, /tuck-left-ear/);
  assert.match(templates, /tuck-right-ear/);
  assert.match(templates, /openAngle: 0/);
  assert.match(preview, /joint\.openAngle \?\? joint\.angle/);
  assert.match(preview, /currentMode === "folding"/);
  assert.doesNotMatch(preview, /openProgress/);
  assert.doesNotMatch(preview, /flatZoom/);
  assert.match(preview, /frameFlat/);
  assert.match(layout, /createFlatLayout/);
  assert.match(css, /\.fold-progress-control/);
});
