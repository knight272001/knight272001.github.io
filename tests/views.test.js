const assert = require("node:assert/strict");
const test = require("node:test");
const { counterUrl, parseViewCount, start } = require("../public/js/views.js");

function element(kind) {
  const slot = { textContent: "" };
  return {
    hidden: true,
    slot,
    getAttribute(name) {
      return name === "data-views" ? kind : null;
    },
    querySelector(selector) {
      return selector === "[data-views-count]" ? slot : null;
    },
  };
}

function documentWith(elements) {
  return {
    querySelectorAll() {
      return elements;
    },
  };
}

function response(ok, body) {
  return {
    ok,
    json() {
      return Promise.resolve(body);
    },
  };
}

test("view counts keep digits and drop thousands separators", () => {
  assert.equal(parseViewCount("1,234"), "1234");
  assert.equal(parseViewCount("1 234"), "1234");
  assert.equal(parseViewCount("  42 "), "42");
  assert.equal(parseViewCount("0"), "0");
  assert.equal(parseViewCount(""), null);
  assert.equal(parseViewCount("1.5"), null);
  assert.equal(parseViewCount("abc"), null);
  assert.equal(parseViewCount(12), null);
  assert.equal(parseViewCount(null), null);
});

test("counter urls follow the public GoatCounter paths", () => {
  assert.equal(
    counterUrl("/exclusives/four-beauties-screen-liquor/"),
    "https://silverrebel71.goatcounter.com/counter/%2Fexclusives%2Ffour-beauties-screen-liquor%2F.json"
  );
  assert.equal(counterUrl("TOTAL"), "https://silverrebel71.goatcounter.com/counter/TOTAL.json");
});

test("a failed or empty counter stays hidden", async () => {
  const page = element("page");
  const total = element("total");
  const calls = [];
  const fetchImpl = (url) => {
    calls.push(url);
    if (url.endsWith("TOTAL.json")) return Promise.resolve(response(false, { count: "9" }));
    return Promise.reject(new Error("offline"));
  };

  start(documentWith([page, total]), fetchImpl, { pathname: "/exclusives/x/" });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(page.hidden, true);
  assert.equal(page.slot.textContent, "");
  assert.equal(total.hidden, true);
  assert.equal(total.slot.textContent, "");
  assert.deepEqual(calls, [
    "https://silverrebel71.goatcounter.com/counter/%2Fexclusives%2Fx%2F.json",
    "https://silverrebel71.goatcounter.com/counter/TOTAL.json",
  ]);
});

test("a real count is shown and a missing count is not replaced with 1", async () => {
  const page = element("page");
  const fetchImpl = () => Promise.resolve(response(true, { count: "1,208" }));
  start(documentWith([page]), fetchImpl, { pathname: "/digests/2026-11-18/" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(page.hidden, false);
  assert.equal(page.slot.textContent, "1208");

  const empty = element("page");
  start(documentWith([empty]), () => Promise.resolve(response(true, {})), { pathname: "/x/" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(empty.hidden, true);
  assert.equal(empty.slot.textContent, "");
});
