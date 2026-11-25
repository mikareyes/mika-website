# SEO + AEO log

What changed, why, and how we'll know if it worked. Newest first. Rules and
checks live in [`SEO.md`](../SEO.md); this file is the history.

Add an entry whenever a change affects how search engines or AI answer engines
find, read, or cite the site. Format:

```
## YYYY-MM-DD — Short title
- **What:** the change, with commit or PR.
- **Why:** the problem or bet.
- **Check:** where to look for impact, and when.
```

---

## 2026-11-25 — Exact-match answers for Search Console queries
- **What:** Added question-shaped H2s and `faq:` items that use the exact wording of queries each page already ranks for (Search Console, last 3 months). Covers the Meta Muse, AI poster, Claude-watches-YouTube, Claude memory, Grok bot, Polsia, flights, trading, AEO, AI email, design partnership and wedding timeline pages, plus a text version of the Can You Hear Me Now? rules (previously image-only). `updated` bumped on every edited guide so IndexNow resubmits them.
- **Why:** These pages get high impressions but low CTR (e.g. "can claude watch youtube videos" 1,413 impr / 2 clicks, "how to plan a wedding timeline" 9,394 impr / 0 clicks). Matching the query verbatim with an answer-first reply targets featured snippets, People Also Ask and AI answer citations.
- **Check:** Search Console → Performance, filter each query, compare CTR and position for the 28 days before vs. 4 and 8 weeks after 2026-11-25.

## 2026-11-19 — 11 keyword-led tool guides
- **What:** New `/ai` guides built on Keyword Planner and OpenSEO demand: `ai-tools-for-business`, `ai-marketing-tools`, `free-ai-tools`, `best-ai-apps`, `ai-search-engines`, `best-ai-voice-generator`, `speech-to-text-ai`, `ai-for-data-analytics`, `mcp-certification`, `what-is-open-source-ai`, `open-source-ai-agents`. All added to `public/llms-full.txt`. Each has an answer-first intro, question-shaped H2s, a 4-item `faq:` block and 3+ internal links, and the guides link to each other.
- **Why:** Target head terms with low keyword difficulty, e.g. "ai search engines" and "artificial intelligence search engine" (12.1K/mo, KD 13–15), "best ai apps" (18.1K, KD 30), "ai marketing tools" (3.6K, KD 2). "open source ai" was split into a model explainer and an agents/tools list because "open source ai agents" (9.9K, KD 35) has different intent. List guides carry a "verified November 2026, re-checked monthly" line.
- **Check:** Search Console → Performance for each slug at 4 and 8 weeks; OpenSEO rank tracking on the target keywords; AI visibility checks for "best AI apps for founders" and "AI search engines".

## 2026-10-20 — /press becomes a 3D shelf, archive grouped by volume
- **What:** `/press` opens on a WebGL bookshelf (`src/components/press/shelf/`, ported from ThreeUI's Complete Shelf). Clippings are grouped into six volumes in `src/lib/press/shelf-volumes.ts`. Below the shelf, an "Every clipping" section lists all 36 items as `PressCard` links under per-volume `h3`s. The page keeps one `h1` ("Press") and its canonical. The meta description now names Forbes 30 Under 30, Parallax/Phantom and the WSJ.
- **Why:** The 3D canvas is invisible to crawlers, so every `/press/<slug>` link stays in server-rendered HTML, now with topical grouping (volume headings) that gives answer engines context for each clipping.
- **Check:** `yarn verify:seo:site` passes on `/press`; Search Console → Pages shows no drop in indexed `/press/*` URLs over the next 4 weeks.

## 2026-09-29 — IndexNow on every production deploy
- **What:** `.github/workflows/indexnow.yml` + `scripts/indexnow-submit.mjs`. After each successful Vercel production deploy, new or changed sitemap URLs are pushed to IndexNow. Key file at `public/11632f18d629ff9b5ca9ede331235d25.txt`.
- **Why:** Bing feeds ChatGPT search, Copilot and DuckDuckGo. Pushing new guides instead of waiting for a recrawl should get them into AI answers faster.
- **Check:** Bing Webmaster Tools → IndexNow shows received URLs. Compare time-to-index on the next few guides against earlier ones.
- **Pending:** confirm the sitemap is submitted in Google Search Console and Bing Webmaster Tools, then run the workflow once with "Submit every sitemap URL".

## 2026-08-19 — Course + FAQ structured data, guides link to course
- **What:** `Course`/`Offer` and `FAQPage` JSON-LD on `/build-your-first-agent-101`; end-of-guide course CTA on `/ai/*` (392cf9e).
- **Why:** Make price, format and instructor machine-readable for search and answer engines.
- **Check:** Search Console → Enhancements; Rich Results Test on the course page.

## 2026-07-31 — "Mika Reyes" as site name
- **What:** `og:site_name` and `WebSite` structured data use "Mika Reyes" (b67e926).
- **Why:** Consistent site-name signal for Google's site-name display.

## 2026-07-28 — SEO policy + CI enforcement
- **What:** `SEO.md`; source checker in `yarn lint`; rendered sitemap/canonical/link audit in GitHub Actions. Removed `www.` links, Notion-export links and absolute internal links (f3fc096).
- **Why:** Stop SEO regressions from shipping silently.

## 2026-07-11 — AEO/SEO overhaul
- **What:** Canonicals on every indexable page, `llms-full.txt`, dynamic OG images for guides, blog, projects and press, descriptions and FAQ sections across `/ai` guides and blog posts, related-post links (3a02e70, 860e5ba, 9e11e4f, 4cbbb8b). Follows the 2026-07-07 audit in [`seo-aeo-audit-2026-07-07.html`](./seo-aeo-audit-2026-07-07.html).
- **Why:** Duplicate-URL risk, thin metadata, and pages AI engines couldn't cite cleanly.

## 2026-04-13 — llms.txt
- **What:** `public/llms.txt` (5472aeb).
- **Why:** Give AI crawlers a map of the site. Later extended to advertise the `/ai/<slug>.md` Markdown twins.
