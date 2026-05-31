# GRA Stay Manager V3

Mobile Airbnb / Booking room management system.

## Features

- Supabase email/password login
- Role permissions: Boss, Admin, Cleaner, Maintenance
- Add rooms, bookings, cleaning tasks, repairs, expenses
- WhatsApp link for guests
- Monthly occupancy dashboard
- Monthly income report
- Revenue trend chart
- Revenue by source
- CSV export
- Full JSON backup saved in Supabase and downloaded locally

## Deploy

1. Upload these files to GitHub. Do not upload `node_modules` or `dist`.
2. In Supabase SQL Editor, run `supabase_schema.sql`.
3. In Vercel, import the GitHub repository.
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## First user

The first signed-up user will automatically become `Boss`. Later users become `Admin` by default. Boss can change user roles in the Users tab.
