# Benchspace · Tinkerspace inventory

A React and Express inventory workspace backed by Supabase. Manage component records, photos, categories, stock levels, minimum-stock alerts, and recent stock activity. Export the current filtered inventory as a formatted Excel workbook or a CSV that Google Sheets can import.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set the Supabase project URL and publishable key.
3. Run `npm install`.
4. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
5. Run `npm run dev` and `npm run server` in separate terminals.

Vite serves the app at `http://localhost:5173` and proxies `/api` requests to Express on port 3001. The app uses no accounts or sign-in. Inventory and uploaded photos are stored in Supabase; there is no sample inventory. The SQL policy allows public reads and writes, so anyone who can access the site can manage or delete records. Use this setup only for a trusted/private workspace.

The Google Sheets export downloads a UTF-8 CSV file that can be opened or imported in Google Sheets. Excel export downloads a color-formatted `.xlsx` workbook.

## Component categories

Electronics; Power & Batteries; Microcontrollers & Boards; Sensors; Motors & Actuators; Networking & Communication; Accessories & Modules; Fasteners & Hardware; Tools; 3D Printing & Materials; Wires, Cables & Connectors; Consumables; Other.

If the database is already set up, rerun `supabase/schema.sql` to normalize existing category values.

## Component fields

Name, unique SKU, category, quantity and unit, low-stock threshold, description, and photo. Status is calculated from stock: zero means out of stock, at or below the threshold means low stock, otherwise in stock.
