# Host Little Recipe on GitHub Pages

GitHub Pages hosts the interface, saved recipe cards, search, checklists, and ingredient scaling. The URL importer runs in a separate Cloudflare Worker because recipe publishers usually block requests directly from another website, and GitHub Pages cannot run a server.

Recipe data stays in each visitor's browser. Moving from the existing private Site to GitHub Pages creates a separate recipe library; the browser does not transfer previously saved recipes between domains.

## 1. Create the repository

Create a GitHub repository named `little-recipe`, using `main` as the default branch. Upload the project source, including `.github/workflows/pages.yml`, `worker/`, `scripts/`, `tests/`, `package.json`, and `wrangler.jsonc`.

Do not upload `.git`, `.sites-runtime`, `.openai`, `dist`, `.DS_Store`, credentials, or environment files. The original `.openai` manifest belongs to the existing Sites deployment and is not needed for GitHub Pages. The GitHub build has no package dependencies and does not read that manifest.

For GitHub Free, use a public repository for GitHub Pages. Private repository support depends on your GitHub plan. GitHub Pages sites are typically publicly accessible.

## 2. Deploy the recipe importer

With Node.js installed, run:

```sh
node scripts/build-pages.mjs
```

In `wrangler.jsonc`, change `ALLOWED_ORIGIN` to your Pages origin, for example `https://YOUR-USERNAME.github.io`. Do not include the repository path or a trailing slash.

Deploy the generated `api/worker.js` to your Cloudflare account using the official Wrangler CLI:

```sh
npx wrangler deploy
```

This requires a Cloudflare account and login. Use the returned Worker URL, adding `/api/import` to the end. The Worker allows requests from the configured Pages origin and its own origin only. No GitHub or Cloudflare credentials belong in the HTML or repository.

## 3. Connect GitHub Pages

1. In your repository, open **Settings → Secrets and variables → Actions → Variables**.
2. Add a repository variable named **RECIPE_API_URL** containing the full import endpoint, for example `https://little-recipe-import.YOUR-SUBDOMAIN.workers.dev/api/import`.
3. Open **Settings → Pages** and select **GitHub Actions** as the source.
4. In **Actions**, run **Deploy Little Recipe to GitHub Pages**. Later pushes to `main` redeploy automatically.

The workflow builds `pages/index.html` and publishes only the `pages/` directory. Your normal project URL is `https://YOUR-USERNAME.github.io/little-recipe/`; the exact URL is also displayed by the workflow.

Without RECIPE_API_URL, the recipe box and scaling work, and URL importing displays a setup message. Full functionality requires the import service above.

## Local checks

```sh
node scripts/build-pages.mjs
node --test tests/pages.test.mjs
```

To build with your import service locally, set `RECIPE_API_URL` in the build environment. No saved recipes or credentials are included in generated Pages files.
