# GRA Stay Manager V5

Mobile Airbnb / Booking room management system.

## V5 Updates

- Date display changed to: weekday abbreviation, DD-MMM-YYYY, e.g. `Tue, 26-May-2026`.
- Edit Booking now includes Payment Status options: Paid, Partial, Unpaid.
- Add Booking defaults to Paid, because guests normally pay before check-in.
- Home page now shows Room Status at the top.
- Occupancy dashboard title now shows the selected month, e.g. `May Occupancy Dashboard`, and clarifies the monthly percentage.

## Previous V4 Updates

- Edit existing bookings from room cards and finance booking records.
- Bottom navigation order: Home, Rooms, Add, Reports, Cleaning, Repairs, Finance, Users.
- Smaller mobile header for better screen space.

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
2. Keep the same Vercel Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel will automatically deploy after GitHub commit.

## Database

No database structure change is required from V4 to V5. Your existing Supabase data will remain.
