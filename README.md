# GRA Stay Manager V6 Static

No-build V6 version for Vercel. It has no package.json, no npm install, no node_modules and no build step.

## Upload
Upload these files/folders to GitHub root:
- api/
- app.js
- index.html
- style.css
- supabase_schema.sql
- README.md

Do not upload package.json, package-lock.json, node_modules, dist or vite.config.js.

## Vercel
Use the same environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Vercel will deploy as a static site plus one API function.
