# Azelle — local dummy setup

Updated 11 October 2026. Local testing is active while actual settings are awaited.

## Ready now

- Recovery email: MAIL_MODE=local saves private messages in server/.data/mail-outbox; no email is sent. Reset links use http://localhost:5173. The outbox is Git-ignored and has no public HTTP endpoint.
- Payments: dummy Cashfree/Razorpay adapters exercise mock states; no money is charged.
- Shipping: dummy Shiprocket/Delhivery adapters exercise serviceability, shipments and tracking; no actual shipment is booked.
- Analytics: dummy identifiers remain local; actual production collection still needs verification.
- Business: server/dummy-business.example.json holds supplied identity and clearly marked missing fields. It is a template, not a public data source.

Reference settings: server/.env.dummy.example. Existing database/session/admin settings were preserved. MAIL_MODE=local was added to local settings.

## Verified

| Check | Result |
|---|---|
| Recovery | Local outbox, hashed token, successful reset, single use, expiry and production guard passed. |
| Payments | Both adapters: unpaid/failed/paid and mock refund states passed. |
| Couriers | Both adapters: available/unavailable PIN, mock shipment and delivered tracking passed. |

The checks clean up their isolated QA records/messages. They do not verify the complete checkout/fulfilment journey or actual provider delivery.

Repeat with the local API and database running:

```text
npm run test:dummy
npm run test:dummy:commerce
```

Scripts require non-production mode and local MongoDB. Recovery requests are rate-limited; repeated runs can hit hourly limits. Use synthetic customer data with the local outbox.

## Replacing dummy settings

1. Keep secrets in private environment settings. Use server/.env.example as the actual-service reference; preserve working database/session settings.
2. Set MAIL_MODE=smtp, verified MAIL_FROM, SMTP settings and actual PUBLIC_SITE_URL. Verify actual delivery and failures.
3. Replace dummy partner settings with genuine sandbox credentials first; verify callbacks, webhooks, refunds and shipping before live settings.
4. Apply owner-verified missing business facts to disclosures/schema/invoices; never publish dummy values.
5. Configure actual domain/analytics and run [deployment checks](./pending-work.md).

Local email mode is disabled under NODE_ENV=production. Actual-service readiness remains pending.
