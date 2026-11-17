const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const { createRequire } = require("module");
const { formatDisplay, formatIso, formatRss } = require("../lib/dates");
const { createMarkdown } = require("../lib/markdown");
const { absoluteUrl, onlyPublic, readRaw, validatePost } = require("../lib/posts");

const root = path.join(__dirname, "..");
const requireFromEleventy = createRequire(require.resolve("@11ty/eleventy"));
const Nunjucks = requireFromEleventy("nunjucks");
const site = require("../src/_data/site");

function nunjucksEnv() {
  const environment = new Nunjucks.Environment(
    new Nunjucks.FileSystemLoader(path.join(root, "src/_includes")),
    { autoescape: true }
  );
  environment.addFilter("displayDate", formatDisplay);
  environment.addFilter("isoDate", formatIso);
  environment.addFilter("rssDate", formatRss);
  environment.addFilter("year", () => "2026");
  environment.addFilter("absoluteUrl", absoluteUrl);
  return environment;
}

function renderTemplate(rel, data) {
  const source = fs
    .readFileSync(path.join(root, rel), "utf8")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return nunjucksEnv().renderString(source, data);
}

function postData(extra = {}) {
  const fields = {
    title: "標題",
    excerpt: "短述",
    slug: "my-essay",
    date: "2026-11-15",
    tags: ["a"],
    ...extra,
  };
  return { ...fields, data: fields };
}

test("an image title becomes a captioned figure", () => {
  const md = createMarkdown();
  const html = md.render('![北港朝天宮](/assets/images/x.jpg "跟阿母在廟前。")\n');
  assert.match(
    html,
    /^<figure><img src="\/assets\/images\/x.jpg" alt="北港朝天宮" loading="lazy" decoding="async"><figcaption>跟阿母在廟前。<\/figcaption><\/figure>$/
  );
});

test("an image without a title stays a plain lazy image", () => {
  const md = createMarkdown();
  const html = md.render("![北港朝天宮](/assets/images/x.jpg)\n");
  assert.match(
    html,
    /^<p><img src="\/assets\/images\/x.jpg" alt="北港朝天宮" loading="lazy" decoding="async"><\/p>\n$/
  );
  assert.doesNotMatch(html, /<figure>|<figcaption>/);
});

test("captions and alt text keep their characters and escape markup", () => {
  const md = createMarkdown();
  const html = md.render('![a <b> "c"](/assets/images/x.jpg "說明 <i> & 引號")\n');
  assert.match(html, /alt="a &lt;b&gt; &quot;c&quot;"/);
  assert.match(html, /<figcaption>說明 &lt;i&gt; &amp; 引號<\/figcaption>/);
  assert.doesNotMatch(html, /<i>|<b>/);
});

test("a titled image beside other text is not pulled out of the paragraph", () => {
  const md = createMarkdown();
  const html = md.render('前文 ![北港](/assets/images/x.jpg "說明") 後文\n');
  assert.match(html, /^<p>前文 <figure><img [^>]+><figcaption>說明<\/figcaption><\/figure> 後文<\/p>\n$/);
});

test("reference-style images use the definition title as the caption", () => {
  const md = createMarkdown();
  const html = md.render('![北港][temple]\n\n[temple]: /assets/images/x.jpg "跟阿母在廟前。"\n');
  assert.match(html, /<figure><img src="\/assets\/images\/x.jpg" alt="北港" loading="lazy" decoding="async"><figcaption>跟阿母在廟前。<\/figcaption><\/figure>/);
});

test("raw html in the prose still passes through", () => {
  const md = createMarkdown();
  const html = md.render("段落\n\n<small>原刊於臉書</small>\n");
  assert.match(html, /<small>原刊於臉書<\/small>/);
});

test("cover and coverAlt are optional and checked when present", () => {
  assert.doesNotThrow(() => validatePost(postData()));
  assert.doesNotThrow(() =>
    validatePost(postData({ cover: "/assets/images/x.jpg", coverAlt: "說明" }))
  );
  assert.doesNotThrow(() => validatePost(postData({ cover: "https://cdn.example.com/a.jpg" })));
  assert.doesNotThrow(() => validatePost(postData({ cover: "http://cdn.example.com/a.jpg?x=1" })));

  assert.throws(() => validatePost(postData({ cover: "assets/images/x.jpg" })), /cover/);
  assert.throws(() => validatePost(postData({ cover: "//cdn.example.com/a.jpg" })), /cover/);
  assert.throws(() => validatePost(postData({ cover: "javascript:alert(1)" })), /cover/);
  assert.throws(() => validatePost(postData({ cover: " /assets/images/x.jpg" })), /cover/);
  assert.throws(() => validatePost(postData({ cover: "" })), /cover/);
  assert.throws(() => validatePost(postData({ cover: 1 })), /cover/);
  assert.throws(() => validatePost(postData({ coverAlt: "" })), /coverAlt/);
  assert.throws(() => validatePost(postData({ coverAlt: 2 })), /coverAlt/);
});

test("existing posts still validate", () => {
  for (const dir of ["exclusives", "digests"]) {
    for (const name of fs.readdirSync(path.join(root, "content", dir))) {
      if (!name.endsWith(".md")) continue;
      const file = path.join(root, "content", dir, name);
      assert.doesNotThrow(() => validatePost({ page: { inputPath: file } }), file);
    }
  }
});

test("absolute cover urls use the site origin", () => {
  const origin = "https://knight272001.github.io";
  assert.equal(absoluteUrl("/assets/images/x.jpg", origin), `${origin}/assets/images/x.jpg`);
  assert.equal(absoluteUrl("/assets/images/x.jpg", `${origin}/`), `${origin}/assets/images/x.jpg`);
  assert.equal(absoluteUrl("https://cdn.example.com/a.jpg", origin), "https://cdn.example.com/a.jpg");
  assert.equal(absoluteUrl("http://cdn.example.com/a.jpg", origin), "http://cdn.example.com/a.jpg");
});

test("public collections drop hidden covers", () => {
  const hidden = {
    date: "2026-11-20",
    inputPath: "content/exclusives/members-sample.md",
    url: false,
    data: {
      slug: "members-sample",
      members: true,
      cover: "/assets/images/members-only-cover.jpg",
      coverAlt: "會員限定封面不該公開",
    },
  };
  const visible = {
    date: "2026-11-10",
    inputPath: "content/exclusives/with-cover.md",
    url: "/exclusives/with-cover/",
    data: {
      slug: "with-cover",
      title: "有封面",
      excerpt: "封面短述",
      cover: "/assets/images/public-cover.jpg",
      coverAlt: "公開封面",
    },
  };
  const plain = {
    date: "2026-11-01",
    inputPath: "content/exclusives/plain.md",
    url: "/exclusives/plain/",
    data: { slug: "plain", title: "沒有封面", excerpt: "只有文字" },
  };

  const posts = onlyPublic([hidden, plain, visible]);
  assert.deepEqual(
    posts.map((item) => item.data.slug),
    ["with-cover", "plain"]
  );

  const html = renderTemplate("src/exclusives.njk", { collections: { publicExclusives: posts } });
  assert.match(html, /class="thumb"/);
  assert.match(html, /src="\/assets\/images\/public-cover.jpg"/);
  assert.match(html, /alt="公開封面"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /有封面/);
  assert.match(html, /沒有封面/);
  assert.equal((html.match(/class="thumb"/g) || []).length, 1);
  assert.equal(html.includes("members-only-cover"), false);
  assert.equal(html.includes("會員限定封面不該公開"), false);
});

test("a cover renders under the post header and in the share tags", () => {
  const post = renderTemplate("src/_includes/post.njk", {
    title: "有封面",
    date: "2026-11-10",
    kicker: "長文",
    kickerEn: "Exclusive",
    tags: ["測試"],
    kind: "exclusive",
    section: "exclusives",
    backLabel: "全部長文",
    cover: "/assets/images/public-cover.jpg",
    coverAlt: "公開封面",
    content: "<p>正文</p>",
  });
  assert.match(
    post,
    /<\/header>\s*<figure class="post-cover">\s*<img src="\/assets\/images\/public-cover.jpg" alt="公開封面" decoding="async">\s*<\/figure>\s*<div class="prose">/
  );

  const page = renderTemplate("src/_includes/base.njk", {
    site,
    page: { url: "/exclusives/with-cover/" },
    title: "有封面",
    excerpt: "封面短述",
    kind: "exclusive",
    date: "2026-11-10",
    cover: "/assets/images/public-cover.jpg",
    coverAlt: "公開封面",
    content: post,
  });
  const image = "https://knight272001.github.io/assets/images/public-cover.jpg";
  assert.match(page, /property="og:type" content="article"/);
  assert.match(page, /property="og:title" content="有封面｜銀髮衝冠"/);
  assert.match(page, /property="og:description" content="封面短述"/);
  assert.match(page, new RegExp(`property="og:image" content="${image}"`));
  assert.match(page, /property="og:image:alt" content="公開封面"/);
  assert.match(page, /name="twitter:card" content="summary_large_image"/);
  assert.match(page, new RegExp(`name="twitter:image" content="${image}"`));
  assert.equal(page.includes("members-only-cover"), false);
});

test("pages without a cover omit og:image unless the site has a default", () => {
  const bare = renderTemplate("src/_includes/base.njk", {
    site,
    page: { url: "/about/" },
    pageTitle: "關於",
    description: "關於銀髮衝冠。",
    content: "<p>關於</p>",
  });
  assert.match(bare, /property="og:title" content="關於｜銀髮衝冠"/);
  assert.match(bare, /property="og:description" content="關於銀髮衝冠。"/);
  assert.match(bare, /property="og:type" content="website"/);
  assert.match(bare, /name="twitter:card" content="summary"/);
  assert.doesNotMatch(bare, /property="og:image"/);
  assert.equal(site.ogImage, undefined);

  const fallback = renderTemplate("src/_includes/base.njk", {
    site: { ...site, ogImage: "/assets/images/og.jpg", ogImageAlt: "銀髮衝冠" },
    page: { url: "/" },
    content: "<p>首頁</p>",
  });
  assert.match(
    fallback,
    /property="og:image" content="https:\/\/knight272001\.github\.io\/assets\/images\/og\.jpg"/
  );
  assert.match(fallback, /property="og:image:alt" content="銀髮衝冠"/);
  assert.match(fallback, /name="twitter:card" content="summary_large_image"/);

  const external = renderTemplate("src/_includes/base.njk", {
    site,
    page: { url: "/exclusives/remote/" },
    title: "外連封面",
    excerpt: "用別的網址",
    kind: "exclusive",
    date: "2026-11-12",
    cover: "https://cdn.example.com/a.jpg?x=1&y=2",
    coverAlt: "外連",
    content: "<p>正文</p>",
  });
  assert.match(
    external,
    /property="og:image" content="https:\/\/cdn\.example\.com\/a\.jpg\?x=1&amp;y=2"/
  );
});

test("the homepage shows a thumbnail only for the post that has a cover", () => {
  const exclusive = {
    url: "/exclusives/with-cover/",
    date: "2026-11-10",
    data: {
      title: "有封面",
      excerpt: "封面短述",
      cover: "/assets/images/public-cover.jpg",
      coverAlt: "公開封面",
    },
  };
  const digest = {
    url: "/digests/2026-11-15/",
    date: "2026-11-15",
    data: { title: "沒有封面", excerpt: "只有文字" },
  };
  const html = renderTemplate("src/index.njk", {
    site,
    collections: { publicExclusives: [exclusive], publicDigests: [digest] },
  });
  assert.match(html, /src="\/assets\/images\/public-cover.jpg"/);
  assert.equal((html.match(/class="thumb"/g) || []).length, 1);
  assert.match(html, /沒有封面/);
});

test("the hidden sample cover is real front matter and stays members-only", () => {
  const file = path.join(root, "content/exclusives/members-sample.md");
  const data = readRaw(file);
  assert.equal(data.members, true);
  assert.equal(data.cover, "/assets/images/members-only-cover.jpg");
  assert.equal(data.coverAlt, "會員限定封面不該公開");
  assert.doesNotThrow(() => validatePost({ page: { inputPath: file } }));
  const body = fs.readFileSync(file, "utf8").split(/\r?\n---\r?\n/).slice(1).join("\n---\n");
  assert.match(body, /公開網站不該出現這句/);
  assert.doesNotMatch(body, /cover:/);
});
