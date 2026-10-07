import assert from "node:assert/strict";
import test from "node:test";
import { buildQuoteText, dictionaries, formatMoney, previewLabel, resolveLocale } from "../app/i18n.ts";

test("public demo language overrides a saved choice, while invalid languages fall back safely", () => {
  assert.equal(resolveLocale("en", "ko"), "en");
  assert.equal(resolveLocale("ko", "en"), "ko");
  assert.equal(resolveLocale(undefined, "en"), "en");
  assert.equal(resolveLocale("fr", "en"), "en");
  assert.equal(resolveLocale("EN", "<script>"), "ko");
});

test("English covers every Korean dictionary entry without Korean fallback copy", () => {
  function compare(korean, english) {
    assert.deepEqual(Object.keys(english).sort(), Object.keys(korean).sort());
    for (const key of Object.keys(korean)) {
      if (typeof korean[key] === "object") compare(korean[key], english[key]);
      else {
        assert.equal(typeof english[key], "string");
        assert.ok(english[key].trim(), key);
        assert.doesNotMatch(english[key], /[가-힣]/, key);
      }
    }
  }
  compare(dictionaries.ko, dictionaries.en);
});

test("English quotes keep KRW amounts, selected dimensions, and the demo review limitation", () => {
  const quote = {
    boxType: "drawer", paper: "green", width: 300, depth: 180, height: 75,
    quantity: 1000, unit: 420, total: 619300,
  };
  const english = buildQuoteText("en", quote);
  assert.match(english, /Box: Drawer package/);
  assert.match(english, /Dimensions: 300 × 180 × 75 mm/);
  assert.match(english, /Material: Green board/);
  assert.match(english, /Quantity: 1,000 boxes/);
  assert.match(english, /Estimated unit price: 420 KRW/);
  assert.match(english, /Estimated total \(VAT included\): 619,300 KRW/);
  assert.match(english, /No currency conversion is applied/);
  assert.match(english, /Manufacturability and final pricing require a dieline review/);
  assert.doesNotMatch(english, /[가-힣]/);
  const korean = buildQuoteText("ko", quote);
  assert.match(korean, /박스: 서랍형 패키지/);
  assert.match(korean, /619,300원/);
  assert.equal(formatMoney(420, "en"), "420 KRW");
  assert.equal(formatMoney(420, "ko"), "420원");
});

test("canvas descriptions announce box size and fold state in the active language", () => {
  assert.equal(
    previewLabel("en", "mailer", [240, 160, 90], "folding", 0.37),
    "240 × 160 × 90 millimeter roll-end mailer box, 37% folded view",
  );
  assert.match(previewLabel("en", "shipping", [240, 160, 90], "open", 1), /corrugated shipping box, open view/);
  assert.match(previewLabel("ko", "drawer", [240, 160, 90], "closed", 1), /서랍형 패키지의 완성 상태/);
});
