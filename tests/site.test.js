const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const site = path.join(root, "_site");

function read(rel) {
  return fs.readFileSync(path.join(site, rel), "utf8");
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function decode(html) {
  return html
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function luminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const left = luminance(a);
  const right = luminance(b);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

function variables(css, pattern) {
  const match = css.match(pattern);
  assert.ok(match, `missing CSS block ${pattern}`);
  const vars = {};
  for (const line of match[1].split("\n")) {
    const found = line.match(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/);
    if (found) vars[found[1]] = found[2].toLowerCase();
  }
  return vars;
}

test("build output exists", () => {
  assert.equal(fs.existsSync(path.join(site, "index.html")), true, "請先 npm run build");
});

test("public pages and feeds exist", () => {
  for (const rel of [
    "index.html",
    "exclusives/index.html",
    "exclusives/2026-11-17-screen-behind/index.html",
    "exclusives/beigang-chaotian-temple-with-mom/index.html",
    "exclusives/four-beauties-screen-liquor/index.html",
    "exclusives/national-day-gongxi-mp-training-center/index.html",
    "digests/index.html",
    "about/index.html",
    "newsletter/index.html",
    "feed.xml",
    "sitemap.xml",
    "robots.txt",
    "404.html",
    "css/site.css",
    "js/theme.js",
    "favicon.svg",
  ]) {
    assert.equal(fs.existsSync(path.join(site, rel)), true, rel);
  }
});

test("real posts render and the empty digest stays intact", () => {
  const exclusive = decode(read("exclusives/beigang-chaotian-temple-with-mom/index.html"));
  const home = decode(read("index.html"));
  const digests = decode(read("digests/index.html"));

  assert.match(exclusive, /春節前，帶老娘去北港朝天宮還願/);
  assert.match(exclusive, /2026年2月9日/);
  assert.match(exclusive, /datetime="2026-02-09"/);
  assert.match(home, /螢幕後面那本經/);
  assert.match(home, /還沒有 Digest。/);
  assert.match(digests, /class="empty"/);
  assert.match(digests, /還沒有 Digest。/);
  assert.doesNotMatch(home, /範例 Digest|範例文章|今天沒有新聞/);
  assert.doesNotMatch(digests, /範例/);
  assert.equal(fs.existsSync(path.join(site, "exclusives/sample-layout/index.html")), false);
  assert.equal(fs.existsSync(path.join(site, "digests/2026-11-15/index.html")), false);
});

test("members posts are absent from every public file", () => {
  const banned = [
    "公開網站不該出現這句",
    "會員限定，不應公開",
    "members-sample",
    "members-only-cover",
    "會員限定封面不該公開",
  ];
  assert.equal(fs.existsSync(path.join(site, "exclusives/members-sample/index.html")), false);

  for (const file of walk(site)) {
    const text = fs.readFileSync(file, "utf8");
    for (const phrase of banned) {
      assert.equal(text.includes(phrase), false, `${path.relative(site, file)} contains ${phrase}`);
    }
  }
});

test("sitemap lists only public urls", () => {
  const sitemap = read("sitemap.xml");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
  assert.deepEqual(locs, [
    "https://knight272001.github.io/",
    "https://knight272001.github.io/about/",
    "https://knight272001.github.io/digests/",
    "https://knight272001.github.io/exclusives/",
    "https://knight272001.github.io/exclusives/2026-11-17-screen-behind/",
    "https://knight272001.github.io/exclusives/beigang-chaotian-temple-with-mom/",
    "https://knight272001.github.io/exclusives/four-beauties-screen-liquor/",
    "https://knight272001.github.io/exclusives/national-day-gongxi-mp-training-center/",
    "https://knight272001.github.io/newsletter/",
  ]);
});

test("rss contains the public posts", () => {
  const feed = decode(read("feed.xml"));
  assert.match(feed, /^<\?xml/);
  assert.match(feed, /<rss /);
  assert.equal(feed.match(/<item>/g).length, 4);
  assert.doesNotMatch(feed, /範例 Digest|範例文章|今天沒有新聞|sample-layout|2026-11-15/);
  assert.match(feed, /春節前，帶老娘去北港朝天宮還願/);
  assert.match(feed, /中華民國生日快樂！想起林口公西的大操場/);
  assert.match(feed, /四大美人屏風酒/);
  assert.match(feed, /螢幕後面那本經/);
  assert.match(feed, /<link>https:\/\/knight272001\.github\.io\/exclusives\/2026-11-17-screen-behind\/<\/link>/);
  assert.match(feed, /<link>https:\/\/knight272001\.github\.io\/exclusives\/beigang-chaotian-temple-with-mom\/<\/link>/);
  assert.match(feed, /<link>https:\/\/knight272001\.github\.io\/exclusives\/national-day-gongxi-mp-training-center\/<\/link>/);
  assert.match(feed, /<link>https:\/\/knight272001\.github\.io\/exclusives\/four-beauties-screen-liquor\/<\/link>/);
});

test("beigang exclusive is public and listed", () => {
  const listing = decode(read("exclusives/index.html"));
  const post = read("exclusives/beigang-chaotian-temple-with-mom/index.html");
  assert.match(listing, /春節前，帶老娘去北港朝天宮還願/);
  assert.match(listing, /中華民國生日快樂！想起林口公西的大操場/);
  assert.match(listing, /四大美人屏風酒/);
  assert.doesNotMatch(listing, /範例文章/);
  assert.match(post, /datetime="2026-02-09"/);
  assert.match(post, /2026年2月9日/);
  assert.match(post, /<small>原刊於臉書，2026-02-09<\/small>/);
  assert.match(post, /誌之。/);
});

test("about and newsletter keep their embed markers", () => {
  const about = read("about/index.html");
  assert.match(about, /<h1>關於<\/h1>/);
  assert.match(about, /<!-- BIO: 在這裡換成真正的自我介紹。 -->/);
  assert.match(about, /我是 SR71，一個在公私部門做了三十多年的媒體人。/);
  assert.match(about, /「銀髮衝冠」這名字，原本是一罐髮蠟。/);
  assert.match(about, /<blockquote>\s*<p>不服老、不盲從，敢於思考、敢於創造。<\/p>\s*<\/blockquote>/);
  assert.doesNotMatch(about, /這頁還沒寫完/);
});

test("newsletter form posts to Kit", () => {
  const newsletter = read("newsletter/index.html");
  const home = read("index.html");
  const exclusive = read("exclusives/beigang-chaotian-temple-with-mom/index.html");
  const digests = read("digests/index.html");
  const form = /<form action="https:\/\/app\.kit\.com\/forms\/10194228\/subscriptions" method="post">[\s\S]*name="email_address"[\s\S]*type="email"[\s\S]*<\/form>/;

  assert.match(newsletter, form);
  assert.match(newsletter, /免費訂閱，新長文上線當天寄給你；隨時可以退訂。/);
  assert.match(newsletter, />訂閱</);
  assert.doesNotMatch(newsletter, /<!-- NEWSLETTER_FORM:/);
  assert.doesNotMatch(newsletter, /還沒接上服務/);

  assert.match(home, form);
  assert.match(home, /href="\/newsletter\/"/);

  assert.match(exclusive, form);
  assert.match(exclusive, /href="\/newsletter\/"/);
  assert.doesNotMatch(digests, /forms\/10194228/);
  assert.doesNotMatch(newsletter, /<script[^>]+kit\.com/i);
});

test("author name is SR71", () => {
  assert.match(read("index.html"), /<meta name="author" content="SR71">/);
  const feed = read("feed.xml");
  assert.match(feed, /<dc:creator>SR71<\/dc:creator>/);
});

test("home identity and navigation", () => {
  const home = read("index.html");
  assert.match(home, /<html lang="zh-Hant-TW">/);
  assert.match(home, /<title>銀髮衝冠｜Silver Rebel 71<\/title>/);
  assert.match(home, /不服老、不盲從，敢於思考、敢於創造。/);
  assert.match(home, /href="\/"[^>]*aria-current="page"/);
  assert.match(home, /rel="alternate" type="application\/rss\+xml"/);
  assert.doesNotMatch(home, /fonts\.googleapis|fontshare|typekit|cdn\.jsdelivr/i);
  assert.doesNotMatch(home, /<script[^>]+src="https?:/i);
});

test("section pages mark the current nav item", () => {
  const exclusive = read("exclusives/beigang-chaotian-temple-with-mom/index.html");
  assert.match(exclusive, /href="\/exclusives\/"[^>]*aria-current="page"/);
  assert.doesNotMatch(exclusive, /href="\/digests\/"[^>]*aria-current/);
});

test("404 and robots", () => {
  assert.match(read("404.html"), /noindex/);
  assert.match(read("404.html"), /找不到/);
  assert.match(read("robots.txt"), /Sitemap: https:\/\/knight272001\.github\.io\/sitemap\.xml/);
});

test("open graph title and description are on every page, without an image until a cover exists", () => {
  const home = read("index.html");
  const about = read("about/index.html");
  const post = read("exclusives/beigang-chaotian-temple-with-mom/index.html");
  const digests = read("digests/index.html");

  assert.match(home, /property="og:title" content="銀髮衝冠｜Silver Rebel 71"/);
  assert.match(home, /property="og:description" content="銀髮衝冠的長文和每日 Digest。不服老、不盲從，敢於思考、敢於創造。"/);
  assert.match(home, /property="og:type" content="website"/);
  assert.match(home, /name="twitter:card" content="summary"/);
  assert.doesNotMatch(home, /property="og:image"/);

  assert.match(about, /property="og:title" content="關於｜銀髮衝冠"/);
  assert.match(about, /property="og:description" content="關於銀髮衝冠。"/);
  assert.doesNotMatch(about, /property="og:image"/);

  assert.match(post, /property="og:type" content="article"/);
  assert.match(post, /property="og:title"/);
  assert.match(post, /property="og:description"/);
  assert.match(post, /name="twitter:card" content="summary"/);
  assert.doesNotMatch(post, /property="og:image"/);
  assert.doesNotMatch(digests, /property="og:image"/);
  assert.doesNotMatch(post, /class="post-cover"/);
  assert.match(read("exclusives/index.html"), /class="thumb"/);
  assert.doesNotMatch(digests, /class="thumb"/);
});

test("screen-behind exclusive is public with a cover and literal asterisks", () => {
  const post = decode(read("exclusives/2026-11-17-screen-behind/index.html"));
  const listing = decode(read("exclusives/index.html"));
  const home = decode(read("index.html"));
  const image = "https://knight272001.github.io/assets/images/trail-path.jpg";

  assert.match(post, /datetime="2026-11-17"/);
  assert.match(post, /2026年11月17日/);
  assert.match(post, /<figure class="post-cover">\s*<img src="\/assets\/images\/trail-path.jpg" alt="林間步道，幾位行人走在樹蔭下" decoding="async">/);
  assert.match(post, /<img src="\/assets\/images\/trail-path.jpg" alt="林間步道" loading="lazy" decoding="async">/);
  assert.doesNotMatch(post, /<figcaption>/);
  assert.match(post, /<p>\*{5} 以下這段文字摘自UDN STYLE之霍建華新劇報導，觀者自尋哦\*<\/p>/);
  assert.match(post, /<p>\*{3}我摘錄完了\*{3}<\/p>/);
  assert.doesNotMatch(post, /<hr/);
  assert.doesNotMatch(post, /<em>我摘錄完了<\/em>|<strong>我摘錄完了<\/strong>/);
  assert.match(post, /property="og:image" content="https:\/\/knight272001\.github\.io\/assets\/images\/trail-path\.jpg"/);
  assert.match(post, /property="og:image:alt" content="林間步道，幾位行人走在樹蔭下"/);
  assert.match(post, /name="twitter:card" content="summary_large_image"/);
  assert.match(post, new RegExp(`name="twitter:image" content="${image.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(post, /property="og:description" content="同學會檯面下的心情，社群上的光鮮亮麗，亂世裡顧好家人、做點公益，也便是了。"/);
  assert.match(listing, /螢幕後面那本經/);
  assert.match(listing, /src="\/assets\/images\/trail-path.jpg"/);
  assert.match(home, /src="\/assets\/images\/trail-path.jpg"/);
  assert.match(home, /href="\/exclusives\/2026-11-17-screen-behind\/"/);
});

test("photo captions and covers use the prose palette", () => {
  const css = read("css/site.css");
  assert.match(css, /\.prose figure \{/);
  assert.match(css, /\.prose figcaption \{[^}]*color:\s*var\(--ink-soft\)/);
  assert.match(css, /\.post-cover img \{[^}]*width:\s*100%/);
  assert.match(css, /\.thumb \{[^}]*width:\s*100%/);
  assert.match(css, /@media \(min-width: 800px\) \{[^}]*\.listing li:has\(\.thumb\)/);
});

test("text colors clear the contrast bar", () => {
  const css = read("css/site.css");
  const light = variables(css, /(?:^|\n):root \{\n([\s\S]*?)\n\}/);
  const dark = variables(css, /\n:root\[data-theme="dark"\] \{\n([\s\S]*?)\n\}/);
  const systemDark = variables(css, /\n  :root:not\(\[data-theme="light"\]\) \{\n([\s\S]*?)\n  \}/);
  assert.deepEqual(dark, systemDark);

  for (const [name, palette] of [
    ["light", light],
    ["dark", dark],
  ]) {
    const pairs = [
      ["ink on bg", palette.ink, palette.bg, 7],
      ["soft on bg", palette["ink-soft"], palette.bg, 4.5],
      ["accent text on bg", palette["accent-ink"], palette.bg, 4.5],
      ["seal text", palette["seal-ink"], palette.seal, 4.5],
      ["ink on selection", palette.ink, palette.mark, 4.5],
    ];
    for (const [label, foreground, background, minimum] of pairs) {
      const ratio = contrast(foreground, background);
      assert.ok(ratio >= minimum, `${name} ${label} ${ratio.toFixed(2)} < ${minimum}`);
    }
  }

  assert.match(css, /PingFang TC/);
  assert.match(css, /line-height:\s*1\.9/);
});
