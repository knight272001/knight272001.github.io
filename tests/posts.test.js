const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { formatDisplay, formatIso, formatRss } = require("../lib/dates");
const { membersState, onlyPublic, publicSlug, readRaw, validatePost } = require("../lib/posts");

const root = path.join(__dirname, "..");

test("single-quoted front matter keeps double quotes", () => {
  const file = path.join(root, "content/exclusives/sample-layout.md");
  const raw = fs.readFileSync(file, "utf8");
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
  assert.match(front, /title:\s*'[^'\n]*"[^'\n]*'/);
  assert.doesNotMatch(front, /\\"/);

  const data = readRaw(file);
  assert.equal(data.title, "「範例文章」\"銀髮衝冠\" 只是版面樣稿");
  assert.equal(data.excerpt, "樣稿，不是真文章。標題裡的 \"雙引號\" 要原樣留著。");
});

test("digest title also keeps double quotes", () => {
  const file = path.join(root, "content/digests/2026-11-15.md");
  const data = readRaw(file);
  assert.equal(data.title, "「範例 Digest」\"今天沒有新聞\"");
  assert.equal(publicSlug({ page: { inputPath: file } }), "2026-11-15");
});

test("members sample is boolean true and newer than the public exclusive", () => {
  const hidden = readRaw(path.join(root, "content/exclusives/members-sample.md"));
  const visible = readRaw(path.join(root, "content/exclusives/sample-layout.md"));
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
