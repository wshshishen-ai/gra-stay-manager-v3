# GRA Stay Manager V6.1

Optimized Vercel build:

- Supabase is bundled into the local app.js file.
- Runtime CDN module requests are removed.
- Supabase public configuration is generated at build time.
- The /api/config serverless cold start is removed.

Upload these files/folders to GitHub root:
- public/
- build.js
- package.json
- package-lock.json
- vercel.json
- supabase_schema.sql
- README.md

Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Environment Variables before deploying.

Do not upload node_modules or dist.
