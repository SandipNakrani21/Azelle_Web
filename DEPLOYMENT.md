# Deploying Azelle to Vercel

The storefront (Vite + React) is served as static files; the Node API (`server/`) runs as one Vercel
serverless function (`api/index.js`). Product data lives in **MongoDB Atlas** and admin image uploads in
**Vercel Blob**. The current product photos ship with the site in `public/uploads/`.

## 1. MongoDB Atlas (database)

1. Create a free account at <https://www.mongodb.com/cloud/atlas> and a free **M0** cluster.
2. **Database Access** → add a database user with a strong password.
3. **Network Access** → add `0.0.0.0/0` (Vercel functions use changing IP addresses).
4. **Connect → Drivers** → copy the connection string and add the database name, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/azelle?retryWrites=true&w=majority`

The first request to the deployed API loads the starter collection (`server/src/seed/products.json`)
into the empty database automatically.

## 2. GitHub

Create an empty repository on GitHub, then push this project:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 3. Vercel project

1. <https://vercel.com/new> → **Import** the GitHub repository. Vercel reads `vercel.json`
   (framework: Vite, output: `dist`, `/api/*` → the API function).
2. **Settings → Environment Variables** — add for Production (and Preview if you use it):

| Name | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection string (step 1) |
| `SESSION_SECRET` | A long random string (64+ characters) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | A strong admin password |

3. **Storage → Create → Blob** and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`
   automatically, so admin uploads are stored in Blob.
4. **Deploy** (or redeploy after adding variables).

## 4. Check

- `https://<your-domain>/` — storefront loads with products.
- `https://<your-domain>/api/products` — returns the product list.
- `https://<your-domain>/admin/login` — sign in, edit a product, upload an image.

## Local development (unchanged)

```bash
npm run dev:api   # API on http://localhost:4000 (local MongoDB)
npm run dev       # storefront on http://localhost:5173
```
