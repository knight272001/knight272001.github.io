const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { formatDisplay, formatIso, formatRss } = require("../lib/dates");
const { membersState, onlyPublic, publicSlug, readRaw, validatePost } = require("../lib/posts");

const root = path.join(__dirname, "..");

test("single-quoted front matter keeps double quotes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "silver-rebel-"));
  const file = path.join(dir, "quoted.md");
  fs.writeFileSync(
    file,
    [
      "---",
      "title: '「標題」\"雙引號\" 要原樣留著'",
      "date: 2026-11-15",
      "slug: quoted",
      "excerpt: '短述裡的 \"雙引號\" 也要留著。'",
      "tags:",
      "  - a",
      "---",
      "",
      "正文",
      "",
    ].join("\n")
  );
  const raw = fs.readFileSync(file, "utf8");
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
  assert.match(front, /title:\s*'[^'\n]*"[^'\n]*'/);
  assert.doesNotMatch(front, /\\"/);

  const data = readRaw(file);
  assert.equal(data.title, "「標題」\"雙引號\" 要原樣留著");
  assert.equal(data.excerpt, "短述裡的 \"雙引號\" 也要留著。");
});

test("digest title also keeps double quotes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "silver-rebel-"));
  const file = path.join(dir, "2026-11-15.md");
  fs.writeFileSync(
    file,
    [
      "---",
      "title: '「Digest」\"今天沒有新聞\"'",
      "date: 2026-11-15",
      "slug: 2026-11-15",
      "excerpt: '短記'",
      "tags:",
      "  - a",
      "---",
      "",
      "正文",
      "",
    ].join("\n")
  );
  const data = readRaw(file);
  assert.equal(data.title, "「Digest」\"今天沒有新聞\"");
  assert.equal(publicSlug({ page: { inputPath: file } }), "2026-11-15");
});

test("members flag in a file is boolean true and can be newer than a public post", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "silver-rebel-"));
  const hiddenFile = path.join(dir, "hidden.md");
  const visibleFile = path.join(dir, "visible.md");
  fs.writeFileSync(
    hiddenFile,
    [
      "---",
      "title: '會員限定'",
      "date: 2026-11-16",
      "slug: hidden",
      "excerpt: '不公開'",
      "tags:",
      "  - a",
      "members: true",
      "---",
      "",
      "正文",
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    visibleFile,
    [
      "---",
      "title: '公開'",
      "date: 2026-11-15",
      "slug: visible",
      "excerpt: '公開'",
      "tags:",
      "  - a",
      "---",
      "",
      "正文",
      "",
    ].join("\n")
  );
  const hidden = readRaw(hiddenFile);
  const visible = readRaw(visibleFile);
  assert.equal(hidden.members, true);
  assert.equal(visible.members, undefined);
  assert.ok(new Date(hidden.date) > new Date(visible.date));
});

test("members flag only accepts real booleans", () => {
  assert.equal(membersState(undefined, "x"), "public");
  assert.equal(membersState(false, "x"), "public");
  assert.equal(membersState(true, "x"), "hidden");
  assert.throws(() => membersState("true", "x"), /members/);
});

test("public collections drop hidden posts and sort newest first", () => {
  const items = [
    { date: "2026-11-01", inputPath: "old.md", url: "/old/", data: { slug: "old" } },
    {
      date: "2026-11-20",
      inputPath: "hid.md",
      url: false,
      data: { slug: "hid", members: true },
    },
    {
      date: "2026-11-10",
      inputPath: "mid.md",
      url: "/mid/",
      data: { slug: "mid", members: false },
    },
    { date: "2026-11-05", inputPath: "gone.md", url: false, data: { slug: "gone" } },
  ];

  assert.deepEqual(
    onlyPublic(items).map((item) => item.data.slug),
    ["mid", "old"]
  );
});

test("duplicate slugs fail the build", () => {
  const items = [
    { date: "2026-11-02", inputPath: "a.md", url: "/a/", data: { slug: "same" } },
    { date: "2026-11-03", inputPath: "b.md", url: "/b/", data: { slug: "same" } },
  ];
  assert.throws(() => onlyPublic(items, { unique: true }), /slug/);
});

test("a file without date is rejected even if a date was injected", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "silver-rebel-"));
  const file = path.join(dir, "missing-date.md");
  fs.writeFileSync(
    file,
    "---\ntitle: 'x'\nslug: missing-date\nexcerpt: 'y'\ntags:\n  - a\n---\n\nbody\n"
  );
  assert.throws(
    () =>
      validatePost({
        title: "x",
        date: new Date("2026-11-15T00:00:00Z"),
        slug: "missing-date",
        excerpt: "y",
        tags: ["a"],
        page: { inputPath: file },
      }),
    /date|frontmatter/
  );
});

test("dates stay on the calendar day written in the file", () => {
  assert.equal(formatDisplay("2026-11-15"), "2026年11月15日");
  assert.equal(formatDisplay(new Date("2026-11-15T00:00:00.000Z")), "2026年11月15日");
  assert.equal(formatIso(new Date("2026-11-15T00:00:00.000Z")), "2026-11-15");
  assert.match(formatRss("2026-11-15"), /15 Nov 2026/);
});
