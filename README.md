# GRA Stay Manager V6 Fixed

Fixed V6 package for Vercel.

This version avoids npm network dependency issues:
- no external npm dependencies
- no package-lock.json
- no node_modules
- no Vite
- Vercel install command is skipped by vercel.json
- build only copies static files from public/ to dist/

Upload these files/folders to GitHub root:
- api/
- public/
- build.js
- package.json
- vercel.json
- supabase_schema.sql
- README.md

Do not upload old src/, old package-lock.json, node_modules, or dist.
