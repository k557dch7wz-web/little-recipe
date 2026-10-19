# Little Recipe

A calm recipe box with ingredient scaling, cooking checklists, and saved photo cards.

This repository is configured to publish through GitHub Pages. See [GITHUB-PAGES.md](GITHUB-PAGES.md) for deployment and connecting the recipe URL importer.

Recipes stay in your current browser. URL importing requires the separate Cloudflare Worker included in the source.

## Build and check

Requires Node.js 24. No packages need installing.

```sh
node scripts/build-pages.mjs
node --test tests/pages.test.mjs
```

Edit `worker/index.html` for the interface, `worker/recipe.js` for ingredient calculations and extraction, and `worker/server.js` for the import service.
