# GRA Stay Manager V6.1 Clean

Mobile Airbnb / Booking room management system.

## V6 updates

- Room Status shows Check-in, Check-out, Qty nights, Unit price, Total, Paid and Unpaid.
- Add/Edit Booking supports Unit Price -> Total and Total -> Unit Price auto calculation.
- Prevents saving conflicting bookings for the same room and shows booked date periods.
- Finance Summary shows monthly received, yearly received, daily supplies, cleaning, repairs, net income, occupancy, room nights, average unit price, and expense ratio.

## Important deployment note

This clean V6.1 package intentionally does **not** include `package-lock.json`, `node_modules`, or `dist`.
This avoids Vercel npm install timeout issues caused by internal lockfile registry URLs.

## Vercel environment variables

Keep the same variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Upload to GitHub

Upload only:

- `src/`
- `README.md`
- `index.html`
- `package.json`
- `.npmrc`
- `supabase_schema.sql`
- `vite.config.js`

Do not upload:

- `package-lock.json`
- `node_modules/`
- `dist/`
