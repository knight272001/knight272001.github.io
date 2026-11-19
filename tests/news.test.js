const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { loadNewsDays, newsGroups } = require("../lib/news");

function writeDay(dir, date, items) {
  fs.writeFileSync(
    path.join(dir, `${date}.json`),
    JSON.stringify({ date, items }),
    "utf8"
  );
}

test("today's file is forty links in four categories, newest day first", () => {
  const days = loadNewsDays();
  assert.equal(days[0].date, "2026-11-20");
  assert.equal(days[0].items.length, 40);
  assert.deepEqual(
    days[0].groups.map((group) => [group.category, group.items.length]),
    [
      ["政治", 10],
      ["經濟", 10],
      ["文化與社會", 10],
      ["科技", 10],
    ]
  );
  assert.equal(days[0].groups[0].items[0].title, "中美俄「三巨頭」峰會結束：發表和平宣言，承諾展開核對話");
  assert.equal(days[0].groups[0].items[0].source, "BBC 中文");
  assert.equal(days[0].groups[3].items[9].source, "南華早報");
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
