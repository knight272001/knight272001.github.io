const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const { tickerModel, MAX_POSTS, MAX_TEXT } = require("../lib/xposts");

const root = path.join(__dirname, "..");

function post(partial) {
  return {
    id: "1",
    text: "你好",
    url: "https://x.com/knight272001/status/1",
    created_at: "2026-11-19T01:00:00Z",
    ...partial,
  };
}

function clockScript() {
  const layout = fs.readFileSync(path.join(root, "src/_includes/base.njk"), "utf8");
  const match = layout.match(/<script data-x-ticker-clock>([\s\S]*?)<\/script>/);
  assert.ok(match, "base layout should include the ticker clock script");
  return match[1];
}

function runClock(source, startIso, intl) {
  const state = { iso: startIso };
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(state.iso);
      else super(...args);
    }
  }
  const bar = { hidden: true };
  let intervalMs = 0;
  let tick = () => {};
  const runner = new Function(
    "document",
    "Intl",
    "Date",
    "setInterval",
    "Number",
    source
  );
  runner(
    {
      querySelector(selector) {
        assert.equal(selector, "[data-x-ticker]");
        return bar;
      },
    },
    intl || Intl,
    FakeDate,
    (fn, ms) => {
      tick = fn;
      intervalMs = ms;
      return 1;
    },
    Number
  );
  return {
    bar,
    intervalMs,
    tick,
    setIso(iso) {
      state.iso = iso;
    },
  };
}

test("xposts.json is an array of ticker entries", () => {
  const raw = fs.readFileSync(path.join(root, "src/_data/xposts.json"), "utf8");
  assert.doesNotMatch(raw, /LOCAL-TICKER-SAMPLE/);
  const posts = JSON.parse(raw);
  assert.ok(Array.isArray(posts));
  for (const item of posts) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.text, "string");
    assert.match(item.url, /^https?:\/\/\S+$/);
    assert.equal(Number.isFinite(Date.parse(item.created_at)), true);
  }
});

test("empty and invalid posts render nothing", () => {
  assert.deepEqual(tickerModel([]), { posts: [], segment: [], duration: 0 });
  assert.deepEqual(tickerModel(null).posts, []);
  assert.deepEqual(
    tickerModel([
      post({ url: "javascript:alert(1)" }),
      post({ text: "   " }),
      post({ created_at: "not-a-date" }),
      { id: "2", text: "缺網址", created_at: "2026-11-19T01:00:00Z" },
    ]).posts,
    []
  );
});

test("ticker keeps the newest ten, truncates to 120 characters, and collapses whitespace", () => {
  const items = [];
  for (let index = 0; index < 12; index += 1) {
    items.push(
      post({
        id: String(index),
        text: index === 3 ? `  第一行\n\n第二行 ${"字".repeat(130)}  ` : `第 ${index} 則`,
        created_at: `2026-11-19T${String(index).padStart(2, "0")}:00:00Z`,
      })
    );
  }

  const model = tickerModel(items);
  assert.equal(model.posts.length, MAX_POSTS);
  assert.deepEqual(
    model.posts.map((item) => item.id),
    ["11", "10", "9", "8", "7", "6", "5", "4", "3", "2"]
  );

  const long = model.posts.find((item) => item.id === "3");
  assert.equal(Array.from(long.text).length, MAX_TEXT + 1);
  assert.equal(long.text.endsWith("…"), true);
  assert.equal(long.text.includes("\n"), false);
  assert.equal(long.text.startsWith("第一行 第二行"), true);

  const exact = tickerModel([post({ text: "字".repeat(MAX_TEXT) })]);
  assert.equal(exact.posts[0].text, "字".repeat(MAX_TEXT));
});

test("truncation keeps a trailing emoji intact", () => {
  const emoji = "😀";
  const text = `${"a".repeat(119)}${emoji}zzzz`;
  const chars = Array.from(tickerModel([post({ text })]).posts[0].text);
  assert.equal(chars.length, MAX_TEXT + 1);
  assert.equal(chars[118], "a");
  assert.equal(chars[119], emoji);
  assert.equal(chars[120], "…");
});

test("short posts repeat so the marquee can loop, without repeating the accessible first item", () => {
  const model = tickerModel([
    post({ id: "new", text: "較新", created_at: "2026-11-19T02:00:00Z" }),
    post({ id: "old", text: "較舊", created_at: "2026-11-19T01:00:00Z" }),
  ]);
  assert.equal(model.posts[0].id, "new");
  assert.equal(model.segment[0].repeat, false);
  assert.equal(model.segment[0].text, "較新");
  assert.ok(model.segment.some((item) => item.repeat));
  assert.ok(model.duration >= 24);
});

test("ticker stays visible at every hour", () => {
  const source = clockScript();
  const layout = fs.readFileSync(path.join(root, "src/_includes/base.njk"), "utf8");
  assert.match(source, /bar\.hidden\s*=\s*false/);
  assert.doesNotMatch(source, /bar\.hidden\s*=\s*true/);
  assert.doesNotMatch(source, /5 \* 60|22 \* 60|Asia\/Taipei/);
  assert.doesNotMatch(layout, /class="x-ticker"[^>]*\shidden\b/);

  const cases = [
    "2026-11-18T16:00:00Z",
    "2026-11-18T20:59:00Z",
    "2026-11-18T21:00:00Z",
    "2026-11-19T01:28:00Z",
    "2026-11-19T13:59:00Z",
    "2026-11-19T14:00:00Z",
    "2026-11-19T15:30:00Z",
  ];

  for (const iso of cases) {
    const clock = runClock(source, iso);
    assert.equal(clock.bar.hidden, false, iso);
    assert.equal(clock.intervalMs, 0);
  }
});

test("the clock script does not hide the bar when the hour changes", () => {
  const source = clockScript();
  const clock = runClock(source, "2026-11-19T13:59:00Z");
  assert.equal(clock.bar.hidden, false);
  clock.setIso("2026-11-19T14:00:00Z");
  clock.tick();
  assert.equal(clock.bar.hidden, false);
  clock.setIso("2026-11-18T16:00:00Z");
  clock.tick();
  assert.equal(clock.bar.hidden, false);
});

test("a 12-hour Intl fallback still leaves the bar visible", () => {
  const source = clockScript();
  function intl(hour, minute, dayPeriod) {
    return {
      DateTimeFormat: function DateTimeFormat() {
        return {
          formatToParts() {
            return [
              { type: "hour", value: hour },
              { type: "minute", value: minute },
              { type: "dayPeriod", value: dayPeriod },
            ];
          },
        };
      },
    };
  }

  assert.equal(runClock(source, "2026-01-01T00:00:00Z", intl("4", "59", "AM")).bar.hidden, false);
  assert.equal(runClock(source, "2026-01-01T00:00:00Z", intl("5", "00", "AM")).bar.hidden, false);
  assert.equal(runClock(source, "2026-01-01T00:00:00Z", intl("1", "30", "PM")).bar.hidden, false);
  assert.equal(runClock(source, "2026-01-01T00:00:00Z", intl("9", "59", "PM")).bar.hidden, false);
  assert.equal(runClock(source, "2026-01-01T00:00:00Z", intl("10", "00", "PM")).bar.hidden, false);
  assert.equal(runClock(source, "2026-01-01T00:00:00Z", intl("12", "00", "AM")).bar.hidden, false);
});
