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

## Payments & shipping (Cashfree, Razorpay, Shiprocket, Delhivery)

All partner settings live in `server/src/commerce.config.js` (GST, shipping fee, COD limit, gateway order,
parcel sizes, pickup location). Keys go in environment variables only. A partner without keys is simply
switched off — checkout offers cash on delivery, and the admin can ship with "Manual".
**Admin → Settings** shows which partners are connected and which variables are still missing.

| Name | Where to get it |
| --- | --- |
| `PUBLIC_SITE_URL` | Your live URL, e.g. `https://azelle-web.vercel.app` (used for payment return links) |
| `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` | Cashfree dashboard → Developers → API keys |
| `CASHFREE_ENV` | `sandbox` for testing, `production` for real payments |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay dashboard → Account & Settings → API keys (`rzp_test_…` = test mode) |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you type when creating the Razorpay webhook |
| `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` | Shiprocket → Settings → API → create an **API user** (not your login) |
| `DELHIVERY_API_TOKEN` | Delhivery One → Settings → API setup |
| `DELHIVERY_ENV` | `staging` for testing, `production` for live shipments |
| `PICKUP_LOCATION_NAME` | Pickup location / warehouse name exactly as registered in Shiprocket and Delhivery |
| `PICKUP_PINCODE` | 6-digit PIN code of that pickup address (needed for courier rates) |

**Webhooks** (so payments confirm even if the customer closes the page):
- Cashfree → Developers → Webhooks → `https://<your-domain>/api/webhooks/cashfree` (payment events).
- Razorpay → Settings → Webhooks → `https://<your-domain>/api/webhooks/razorpay`, events
  `payment.captured` and `payment.failed`, with the same secret as `RAZORPAY_WEBHOOK_SECRET`.

**Order flow:** a paid (or COD) order shows as **Pending** to the customer. In **Admin → Orders** open it,
click **Accept order**, pick Shiprocket, Delhivery or Manual (with live courier rates), and the shipment is
booked — the customer then sees **Accepted**, and later **Shipped** / **Delivered** with the tracking link.

Test with sandbox / test keys first: a Cashfree sandbox or Razorpay test payment, and a Delhivery staging
shipment. Shiprocket has no sandbox — book one real test shipment and cancel it from the order page.

## Website analytics (Microsoft Clarity)

1. Sign in at <https://clarity.microsoft.com> → **New project** → your site URL.
2. **Settings → Overview**: copy the Project ID → `CLARITY_PROJECT_ID`.
3. **Settings → Data Export → Generate new API token** → `CLARITY_API_TOKEN`.
4. Redeploy. The store loads Clarity's script (never on /admin, and admin screens are masked).
   **Admin → Dashboard → Website analytics** shows visits, visitors, time on site, scroll depth,
   top pages, traffic sources, devices, countries, visitor-experience issues and your conversion
   rate (orders ÷ visits). Clarity allows 10 data exports a day, so the figures refresh every 3 hours;
   heatmaps and recordings open in Clarity itself.
5. Custom events sent to Clarity: `add_to_cart`, `begin_checkout`, `purchase_started`,
   `purchase_cod`, `purchase` (payment confirmed) and `review_submitted`.

Clarity records how visitors use the site (it masks typed text by default). Mention it in the
Privacy Policy (analytics cookies, Microsoft as processor).

## Admin users & roles (RBAC)

The `ADMIN_EMAIL` / `ADMIN_PASSWORD` account is the **Owner** — it always has full access and is the
only account that can't be locked out. In **Admin → Users & roles** the owner (or anyone with the
"Manage admin users and roles" permission) can add team members with their own email and password,
and choose their role. Four roles are created on first start — Manager, Order staff, Content editor
and Viewer — and can be edited, or new roles added with any mix of permissions. Every admin API route
checks the role on the server, and role changes or deactivation apply on the user's next click.

## 4. Check

- `https://<your-domain>/` — storefront loads with products.
- `https://<your-domain>/api/products` — returns the product list.
- `https://<your-domain>/admin/login` — sign in, edit a product, upload an image.

## Local development (unchanged)

```bash
npm run dev:api   # API on http://localhost:4000 (local MongoDB)
npm run dev       # storefront on http://localhost:5173
```
