const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const src = path.join(__dirname, 'public');
const dist = path.join(__dirname, 'dist');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

fs.copyFileSync(path.join(src, 'index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(src, 'style.css'), path.join(dist, 'style.css'));
fs.writeFileSync(
  path.join(dist, 'config.js'),
  `window.__APP_CONFIG__=${JSON.stringify({ supabaseUrl, supabaseAnonKey })};\n`
);

esbuild.buildSync({
  entryPoints: [path.join(src, 'app.js')],
  outfile: path.join(dist, 'app.js'),
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2020']
});

console.log('Optimized static build completed.');
