# Draftbase example — Portfolio

A personal portfolio built with [Astro](https://astro.build) and
[Draftbase](https://draftbase.co). Content is fetched at build time and deployed to GitHub
Pages as static HTML — no server, no runtime API calls, nothing to pay for.

**This is the simplest example.** It uses one content query, media fields, and rich text.
For references and pagination see [example-blog](https://github.com/draftbase-co/example-blog).

## Quickstart

```bash
npm install
cp .env.example .env      # add your API keys
npm run seed              # creates the templates + sample content in your org
npm run dev
```

`npm run seed` is optional — if you already have `profile` and `project` templates, skip it.

## Content model

Seeded by `scripts/seed.mjs`. A template's **key** (`profile`, `project`) is what the
delivery API calls `templateId`.

**`profile`** — a single entry describing you.

| Field | Type | |
| --- | --- | --- |
| `name` | text | required |
| `headline` | text | required |
| `bio` | richText | rendered as markdown/MDX |
| `avatar` | media | |
| `email`, `githubUrl`, `linkedinUrl` | text | |

**`project`**

| Field | Type | |
| --- | --- | --- |
| `title` | text | required |
| `slug` | text | required, used as the URL |
| `summary` | text | max 200 chars |
| `body` | richText | |
| `cover` | media | |
| `liveUrl` | text | |
| `year` | number | sorts the list, newest first |
| `featured` | boolean | |

## How it works

- [`src/lib/draftbase.ts`](src/lib/draftbase.ts) creates the SDK client and exposes
  `getAll(templateId)`, which follows cursor pagination to the end.
- Pages call it in their frontmatter, so every request happens during `astro build`.
- `include: 1` resolves `media` fields into objects with a `url`, instead of raw asset ids.
- Rich text goes through `toHtml()` from `@draftbase/renderer` and is injected with
  `set:html`. Style it via the `.db-content` class.

> `react` is in `dependencies` even though this site ships no React. `@draftbase/renderer`
> exports `toHtml` and `MDXContent` from one entry point, so importing either one pulls the
> React import in at bundle time. No React reaches the browser — Astro renders this at build
> time and the output is plain HTML.

## Security — this repo is public

The delivery API key is **build-time only**:

- It is read through `import.meta.env.DRAFTBASE_API_KEY` in server code. Astro only exposes
  `PUBLIC_`-prefixed variables to the browser, so this one cannot end up in the bundle.
  **Do not rename it to `PUBLIC_DRAFTBASE_API_KEY`.**
- In CI it comes from the `DRAFTBASE_API_KEY` repository secret.
- Use a **delivery-scoped** key. It is read-only and only ever returns published entries.
- The **management** key (`DRAFTBASE_MANAGEMENT_API_KEY`) is only for `npm run seed`, and
  belongs in your local `.env` and nowhere else. It can write and delete content.
- `.env` is gitignored. Only `.env.example`, which holds no values, is committed.

Verify for yourself after a build: `grep -r "$(grep DRAFTBASE_API_KEY .env | cut -d= -f2)" dist/`
should find nothing.

## Deploying

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → add `DRAFTBASE_API_KEY` (delivery-scoped).
3. Optional: on the same page, add a repository **variable** `DRAFTBASE_ENVIRONMENT` if your
   content lives in an environment other than `production`.
4. Push to `main`.

If your repo isn't named `example-portfolio`, update `base` in
[`astro.config.mjs`](astro.config.mjs) to match — GitHub Pages serves project sites from a
subpath. On a custom domain, remove `base` entirely.

### Rebuild when content is published

Draftbase can call GitHub for you. Create a webhook pointing at:

```
POST https://api.github.com/repos/<owner>/example-portfolio/dispatches
{ "event_type": "draftbase-publish" }
```

with an `Authorization: Bearer <fine-grained PAT>` header, scoped to this repo with
**Contents: read and write**. That token lives in Draftbase's webhook config — never in this
repo.

## Not included

- **Contact form** — needs a server. Use a `mailto:` link or an external form service.
- **Draft previews** — need a running server; static builds only ever see published entries.
