# 銀髮衝冠｜Silver Rebel 71

個人網站，網址是 https://knight272001.github.io

推上 `main` 就會發佈。加一篇文章，就是加一個 Markdown 檔。

## 長文

新增 `content/exclusives/<slug>.md`。檔名跟 `slug` 一樣。

```yaml
---
title: '標題可以含有 "雙引號"'
date: 2026-11-15
slug: my-essay
excerpt: '列表和首頁用的短述。'
tags:
  - 某個標籤
---

正文從這裡開始。段落之間空一行。
```

`slug` 只用英數和連字號，網址會是 `/exclusives/my-essay/`。

標題或短述若要出現英文雙引號，整段用單引號包起來，像上面那樣。不要寫 `\"`。

### 會員限定

不想公開的文章，在 frontmatter 加這一行，`true` 不加引號：

```yaml
members: true
```

這種文章不會有頁面，也不會出現在列表、首頁、RSS、sitemap。長文和 Digest 都適用。

## 照片與封面

圖片放在 `assets/images/`。這個資料夾會跟網站一起發布。

照片若要附說明，把說明寫在網址後面的引號裡，並在圖的前後各空一行，讓它自己成一段：

```markdown
![北港朝天宮](/assets/images/beigang.jpg "跟阿母在廟前。")
```

方括號裡是替代文字，給讀不出圖片的人。引號裡是顯示在圖下的說明，純文字。畫面上是一張圖，下面一行較小的字。沒寫引號裡的說明，就只顯示圖片：

```markdown
![北港朝天宮](/assets/images/beigang.jpg)
```

文章要封面時，在 frontmatter 加上路徑和替代文字。封面會出現在文章開頭、長文列表、Digest 列表和首頁最新文章。分享到別的網站時，預覽圖也用這張。

```yaml
cover: /assets/images/beigang.jpg
coverAlt: 跟阿母在北港朝天宮前
```

`cover` 也可以寫成 `https://` 開頭的網址。兩個欄位都可以不寫。`members: true` 的文章不會把封面放到任何公開頁面。

整個網站若要一張預設的分享預覽圖，在 `src/_data/site.js` 加上 `ogImage`，值是站內路徑或完整網址。文章沒有封面、網站也沒有 `ogImage` 時，頁面就不放預覽圖。

## 每日 Digest

新增 `content/digests/YYYY-MM-DD.md`。frontmatter 跟長文一樣，`slug` 用當天日期，例如 `2026-11-15`。日期不加引號也可以。

## 關於與訂閱

自我介紹在 `src/about.njk`。註解 `BIO:` 下面那段換成你自己的話。

訂閱表單在 `src/_includes/subscribe.njk`，訂閱頁是 `src/newsletter.njk`。

網站上只用銀髮衝冠 / Silver Rebel 71，不要放戶籍姓名。照片和封面見上面「照片與封面」。

## X 貼文跑馬燈

`src/_data/xposts.json` 是一個陣列，給全站頁首下方的跑馬燈用。空陣列 `[]` 不會輸出這條列。有資料時，只在台北時間每天 05:00（含）到 22:00（不含）顯示；沒有 JavaScript 時維持隱藏。最多 10 則，新的在前，超過約 120 字會截斷。

```json
[
  {
    "id": "貼文編號",
    "text": "貼文內文",
    "url": "https://x.com/knight272001/status/貼文編號",
    "created_at": "2026-11-19T01:28:00Z"
  }
]
```

`id`、`text`、`url` 是字串。`url` 須以 `http://` 或 `https://` 開頭。`created_at` 是 UTC 的 ISO 8601。

## 今天的40則新聞

每天新增一個檔，路徑是 `src/_data/news/YYYY-MM-DD.json`。只新增，不改已經發布的舊檔。

```json
{
  "date": "2026-11-19",
  "items": [
    {
      "category": "政治",
      "title": "標題",
      "source": "來源",
      "url": "https://example.com/story"
    }
  ]
}
```

`date` 跟檔名同一天。`items` 照分類排好，同一類放在一起。頁面在 `/news/YYYY-MM-DD/`，`/news/` 顯示最新的一天，再加上更早日期的連結。首頁的「今天的40則新聞」連到最新那一天。這些頁面不進 RSS。

## 本地預覽

需要 Node.js 20 或更新的版本。

```bash
npm install
npm run dev
```

瀏覽器開終端機印出的本機網址。`npm test` 會建置，並確認會員文章沒有漏到公開頁。

## GitHub Pages

到倉庫的 Settings → Pages → Build and deployment，Source 選 **GitHub Actions**。

如果 Actions 沒在跑，到 Settings → Actions → General，允許這個倉庫執行 workflow。

第一次部署若停在 `github-pages` 環境等待核准，打開該次 Actions，按核准。

以後如果換網域，改 `src/_data/site.js` 的 `url`。RSS 和 sitemap 會跟著改。
