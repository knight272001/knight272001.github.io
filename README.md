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

`content/exclusives/members-sample.md` 是守這條規則的樣稿，網站上看不到。可以留著，也可以刪。

## 每日 Digest

新增 `content/digests/YYYY-MM-DD.md`。frontmatter 跟長文一樣，`slug` 用當天日期，例如 `2026-11-15`。日期不加引號也可以。

## 關於與訂閱

自我介紹在 `src/about.njk`。註解 `BIO:` 下面那段換成你自己的話。

訂閱表單接上之後，嵌在 `src/newsletter.njk` 註解 `NEWSLETTER_FORM:` 那一區。

網站上只用銀髮衝冠 / Silver Rebel 71，不要放戶籍姓名。

圖片放到 `assets/`，文章裡寫 `![說明](/assets/檔名.jpg)`。`assets` 會一起進網站。

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

## 樣稿

`content/exclusives/sample-layout.md` 和 `content/digests/2026-11-15.md` 是版面樣稿，標題都有「範例」。真文章來了就可以刪。
