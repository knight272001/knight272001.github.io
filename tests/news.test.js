const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { loadNewsDays, newsGroups } = require("../lib/news");

const NEWS_DIR = path.join(__dirname, "..", "src", "_data", "news");

function writeDay(dir, date, items) {
  fs.writeFileSync(
    path.join(dir, `${date}.json`),
    JSON.stringify({ date, items }),
    "utf8"
  );
}

function newestDayOnDisk() {
  const name = fs
    .readdirSync(NEWS_DIR)
    .filter((entry) => /^\d{4}-\d{2}-\d{2}\.json$/.test(entry))
    .sort()
    .at(-1);
  const date = name.slice(0, -".json".length);
  const raw = JSON.parse(fs.readFileSync(path.join(NEWS_DIR, name), "utf8"));
  return { date, items: raw.items };
}

test("today's file is forty links in four categories, newest day first", () => {
  const days = loadNewsDays();
  const newest = newestDayOnDisk();
  assert.equal(days[0].date, newest.date);
  assert.equal(days[0].items.length, 40);
  const seen = [];
  const counts = new Map();
  for (const item of newest.items) {
    if (!counts.has(item.category)) seen.push(item.category);
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }
  assert.deepEqual(
    days[0].groups.map((group) => [group.category, group.items.length]),
    seen.map((category) => [category, counts.get(category)])
  );
  assert.deepEqual(
    [...counts.values()],
    [10, 10, 10, 10]
  );
  assert.equal(days[0].groups[0].items[0].title, newest.items[0].title);
  assert.equal(days[0].groups[0].items[0].source, newest.items[0].source);
  assert.equal(days[0].groups[3].items[9].source, newest.items[39].source);
});

test("groups follow first-seen category order and keep item order", () => {
  const groups = newsGroups([
    { category: "文化與社會", title: "一" },
    { category: "政治", title: "二" },
    { category: "文化與社會", title: "三" },
  ]);
  assert.deepEqual(
    groups.map((group) => [group.category, group.items.map((item) => item.title)]),
    [
      ["文化與社會", ["一", "三"]],
      ["政治", ["二"]],
    ]
  );
});

test("newer files sort ahead of older ones", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "news-"));
  const item = { category: "政治", title: "標題", source: "來源", url: "https://example.com/a" };
  writeDay(dir, "2026-01-02", [item]);
  writeDay(dir, "2026-11-19", [{ ...item, title: "新" }]);
  writeDay(dir, "2026-03-04", [{ ...item, title: "中" }]);
  assert.deepEqual(
    loadNewsDays(dir).map((day) => day.date),
    ["2026-11-19", "2026-03-04", "2026-01-02"]
  );
});

test("a file whose date does not match its name fails the build", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "news-"));
  fs.writeFileSync(
    path.join(dir, "2026-11-19.json"),
    JSON.stringify({
      date: "2026-11-18",
      items: [{ category: "政治", title: "標題", source: "來源", url: "https://example.com/a" }],
    }),
    "utf8"
  );
  assert.throws(() => loadNewsDays(dir), /2026-11-19/);
});
