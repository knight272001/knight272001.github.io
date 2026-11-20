const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { loadNewsDays } = require("../lib/news");

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
  assert.match(home, /\/digests\/2026-11-20\//);
  assert.match(home, /天冷了，心要定：SR71 的 11\/19 社群動態/);
  assert.match(digests, /\/digests\/2026-11-20\//);
  assert.match(digests, /天冷了，心要定：SR71 的 11\/19 社群動態/);
  assert.doesNotMatch(digests, /還沒有 Digest。/);
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
  const expected = [
    "https://knight272001.github.io/",
    "https://knight272001.github.io/about/",
    "https://knight272001.github.io/digests/",
    "https://knight272001.github.io/digests/2026-11-20/",
    "https://knight272001.github.io/exclusives/",
    "https://knight272001.github.io/exclusives/2026-11-17-screen-behind/",
    "https://knight272001.github.io/exclusives/beigang-chaotian-temple-with-mom/",
    "https://knight272001.github.io/exclusives/four-beauties-screen-liquor/",
    "https://knight272001.github.io/exclusives/national-day-gongxi-mp-training-center/",
    "https://knight272001.github.io/newsletter/",
    "https://knight272001.github.io/news/",
    ...loadNewsDays().map((day) => `https://knight272001.github.io/news/${day.date}/`),
  ].sort();
  assert.deepEqual(locs, expected);
});

test("rss contains the public posts", () => {
  const feed = decode(read("feed.xml"));
  assert.match(feed, /^<\?xml/);
  assert.match(feed, /<rss /);
  assert.equal(feed.match(/<item>/g).length, 5);
  assert.doesNotMatch(feed, /範例 Digest|範例文章|今天沒有新聞|sample-layout|2026-11-15/);
  assert.match(feed, /天冷了，心要定：SR71 的 11\/19 社群動態/);
  assert.match(feed, /<link>https:\/\/knight272001\.github\.io\/digests\/2026-11-20\/<\/link>/);
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

test("goatcounter is loaded once and counts stay hidden until fetched", () => {
  const home = read("index.html");
  const post = read("exclusives/four-beauties-screen-liquor/index.html");
  const about = read("about/index.html");
  const script = /<script data-goatcounter="https:\/\/silverrebel71\.goatcounter\.com\/count" async src="\/\/gc\.zgo\.at\/count\.js"><\/script>/g;

  assert.equal(home.match(script).length, 1);
  assert.equal(post.match(script).length, 1);
  assert.equal(about.match(script).length, 1);
  assert.match(home, /data-views="total"[^>]*>全站累計瀏覽 <span data-views-count><\/span> 次/);
  assert.match(home, /hidden/);
  assert.doesNotMatch(home, /本文閱讀/);
  assert.match(post, /data-views="page"[^>]*>本文閱讀 <span data-views-count><\/span> 次/);
  assert.doesNotMatch(about, /本文閱讀|全站累計瀏覽/);
  assert.doesNotMatch(post, /本文閱讀 1 次/);
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

test("four beauties post shows the bottle photo after the porcelain description", () => {
  const post = read("exclusives/four-beauties-screen-liquor/index.html");
  const bottle = "想像一下，就是四片白瓷方瓶，上面彩繪了西施、王昭君、貂蟬、楊貴妃四位美女，裝滿了陳年極品高粱，簡單說，這組酒的空酒瓶就被出價 NTD 1800～2000。";
  const next = "愛朋友的老爸，有一天終於決定為了朋友們，犧牲自己珍愛的四大美人。";
  const figure = '<figure><img src="/assets/images/four-beauties-bottles.jpg" alt="四大美人屏風酒的四支瓷瓶" loading="lazy" decoding="async"><figcaption>四大美人屏風酒空瓶可以賣到1500元台幣，別亂丟了喔！</figcaption></figure>';
  const body = post.slice(post.indexOf('<div class="prose">'));
  const atBottle = body.indexOf(bottle);
  const atFigure = body.indexOf(figure);
  const atNext = body.indexOf(next);
  assert.ok(atBottle >= 0 && atFigure > atBottle && atNext > atFigure);
  assert.match(post, /Jimmy/);
  assert.match(post, /王子/);
  assert.equal(fs.existsSync(path.join(site, "assets/images/four-beauties-bottles.jpg")), true);
});

test("photo captions and covers use the prose palette", () => {
  const css = read("css/site.css");
  assert.match(css, /\.prose figure \{/);
  assert.match(css, /\.prose figcaption \{[^}]*color:\s*var\(--ink-soft\)/);
  assert.match(css, /\.prose figcaption \{[^}]*text-align:\s*center/);
  assert.match(css, /\.prose figure img \{[^}]*max-width:\s*100%/);
  assert.match(css, /\.post-cover img \{[^}]*width:\s*100%/);
  assert.match(css, /\.thumb \{[^}]*width:\s*100%/);
  assert.match(css, /@media \(min-width: 800px\) \{[^}]*\.listing li:has\(\.thumb\)/);
});

test("x ticker follows xposts.json and stays out of feeds", () => {
  const { tickerModel } = require("../lib/xposts");
  const posts = JSON.parse(fs.readFileSync(path.join(root, "src/_data/xposts.json"), "utf8"));
  const model = tickerModel(posts);
  const pages = [
    "index.html",
    "about/index.html",
    "404.html",
    "newsletter/index.html",
    "digests/index.html",
    "exclusives/index.html",
    "exclusives/beigang-chaotian-temple-with-mom/index.html",
  ];
  const css = read("css/site.css");

  assert.match(css, /\.x-ticker\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
  assert.match(css, /@keyframes x-ticker-scroll/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation:\s*none/);

  if (model.posts.length === 0) {
    for (const rel of pages) assert.doesNotMatch(read(rel), /data-x-ticker|x-ticker-label|X 最新/);
    for (const rel of ["feed.xml", "sitemap.xml", "robots.txt"]) {
      assert.doesNotMatch(read(rel), /data-x-ticker|x-ticker/);
    }
    return;
  }

  const href = model.posts[0].url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const text = model.posts[0].text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const rel of pages) {
    const html = read(rel);
    assert.match(html, /class="x-ticker"[^>]*\shidden\b/);
    assert.match(html, /id="x-ticker-label">X 最新</);
    assert.match(html, new RegExp(`href="${href}" target="_blank" rel="noopener"`));
    assert.match(html, new RegExp(`>${text}<`));
    assert.match(html, /<script data-x-ticker-clock>/);
    assert.match(html, /timeZone:\s*"Asia\/Taipei"/);
    assert.match(html, /setInterval\(sync,\s*60000\)/);
    assert.doesNotMatch(html, /platform\.twitter|widgets\.js|platform\.x\.com/i);
    assert.doesNotMatch(html, /LOCAL-TICKER-SAMPLE/);
  }

  for (const rel of ["feed.xml", "sitemap.xml", "robots.txt"]) {
    const textFile = read(rel);
    assert.doesNotMatch(textFile, /data-x-ticker|x-ticker-label|x-ticker-clock/);
    assert.doesNotMatch(textFile, new RegExp(text));
  }
});

test("daily news pages list every link and stay out of rss", () => {
  const days = loadNewsDays();
  const newest = days[0];
  const home = read("index.html");
  const day = decode(read(`news/${newest.date}/index.html`));
  const index = decode(read("news/index.html"));
  const feed = read("feed.xml");

  assert.match(home, new RegExp(`<a href="/news/${newest.date}/">今天的40則新聞</a>`));
  assert.match(home, /<a href="mailto:douglaswang101@gmail.com">寫信給我<\/a>/);
  assert.match(home, /src="\/assets\/video\/cat-on-grass\.mp4"/);
  assert.match(home, /class="x-ticker"/);
  assert.match(home, /data-goatcounter="https:\/\/silverrebel71\.goatcounter\.com\/count"/);
  assert.match(home, /data-views="total"/);
  assert.match(home, /最新長文/);

  assert.match(day, new RegExp(`<title>${newest.date} 今天的40則新聞｜銀髮衝冠</title>`));
  assert.match(day, new RegExp(`<h1>${newest.date} 今天的40則新聞</h1>`));
  assert.match(day, /<a href="\/">回首頁<\/a>/);
  assert.deepEqual(
    [...day.matchAll(/<h2>([^<]+)<\/h2>/g)].map((match) => match[1]),
    newest.groups.map((group) => group.category)
  );

  const sections = [...day.matchAll(/<section class="news-group">([\s\S]*?)<\/section>/g)];
  assert.equal(sections.length, newest.groups.length);
  sections.forEach((section, index) => {
    const group = newest.groups[index];
    const items = [...section[1].matchAll(/<li>\s*<a href="([^"]+)" target="_blank" rel="noopener">([^<]+)<\/a>\s*<small>([^<]+)<\/small>\s*<\/li>/g)];
    assert.equal(items.length, group.items.length);
    group.items.forEach((item, itemIndex) => {
      assert.equal(items[itemIndex][1], item.url);
      assert.equal(items[itemIndex][2], item.title);
      assert.equal(items[itemIndex][3], item.source);
    });
  });
  const newsLinkCount = (html) => {
    const groups = [...html.matchAll(/<section class="news-group">([\s\S]*?)<\/section>/g)];
    return groups.reduce(
      (sum, group) => sum + (group[1].match(/target="_blank" rel="noopener"/g) || []).length,
      0
    );
  };
  assert.equal(newsLinkCount(day), newest.items.length);
  assert.equal(newsLinkCount(index), newest.items.length);
  const earlier = index.match(/class="news-archive"/g);
  if (days.length > 1) {
    assert.equal(earlier.length, 1);
    days.slice(1).forEach((archiveDay) => {
      assert.match(index, new RegExp(`href="/news/${archiveDay.date}/"`));
    });
  } else {
    assert.equal(earlier, null);
  }

  assert.equal(feed.match(/<item>/g).length, 5);
  assert.doesNotMatch(feed, /\/news\/|今天的40則新聞/);
  assert.equal(fs.existsSync(path.join(site, `news/${newest.date}/index.html`)), true);
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
