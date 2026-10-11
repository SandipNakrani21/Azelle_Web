import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { commerce, isDummy } from "../server/src/commerce.config.js";
import { GATEWAYS } from "../server/src/integrations/payments/index.js";
import { MockPayment } from "../server/src/integrations/payments/mock.js";
import {
  SHIPPERS,
  defaultParcel,
} from "../server/src/integrations/shipping/index.js";
if (
  process.env.NODE_ENV === "production" ||
  !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(
    process.env.MONGODB_URI || "",
  )
)
  throw new Error("Only local dummy commerce may be tested here.");
for (const name of ["cashfree", "razorpay"])
  assert.equal(isDummy(commerce.payments[name]), true);
for (const name of ["shiprocket", "delhivery"])
  assert.equal(isDummy(commerce.shipping[name]), true);
const number = `QA-DUMMY-${randomUUID()}`;
const order = {
  number,
  total: 806.82,
  lines: [{ sizeId: "50", qty: 1 }],
  payment: { method: "online" },
  address: { pincode: "395004" },
  shipment: { lastStatus: "" },
};
await MockPayment.db.openUri(process.env.MONGODB_URI);
try {
  for (const name of ["cashfree", "razorpay"]) {
    const gateway = GATEWAYS[name];
    assert.equal(gateway.isMock, true);
    const result = await gateway.createPayment(order, {
      returnUrl: "http://localhost:5173/order/qa-dummy",
    });
    assert.equal(result.client.gateway, "mock");
    assert.ok(result.client.url.startsWith("/mock-payment/"));
    const id = result.gatewayOrderId;
    assert.equal((await gateway.fetchStatus(id)).paid, false);
    await MockPayment.updateOne(
      { gatewayOrderId: id },
      { $set: { status: "failed" } },
    );
    assert.equal((await gateway.fetchStatus(id)).failed, true);
    await MockPayment.updateOne(
      { gatewayOrderId: id },
      { $set: { status: "paid", paymentId: "qa-dummy-payment" } },
    );
    const paid = await gateway.fetchStatus(id);
    assert.equal(paid.paid, true);
    assert.equal(paid.amount, 806.82);
    assert.ok((await gateway.refund(order)).startsWith("rfnd_test_"));
  }
  for (const name of ["shiprocket", "delhivery"]) {
    const shipper = SHIPPERS[name];
    assert.equal(shipper.isMock, true);
    const parcel = defaultParcel(order);
    const options = await shipper.options(order, parcel);
    assert.equal(options.serviceable, true);
    assert.ok(options.couriers.length > 0);
    assert.equal(
      (
        await shipper.options(
          { ...order, address: { pincode: "999999" } },
          parcel,
        )
      ).serviceable,
      false,
    );
    const shipment = await shipper.createShipment(order, {
      courierId: options.couriers[0].id,
    });
    assert.ok(shipment.awb);
    assert.equal(shipment.trackingUrl, "");
    let state = { ...order, shipment: { lastStatus: "" } },
      last;
    for (let index = 0; index < 5; index++) {
      last = await shipper.track(state);
      state = { ...state, shipment: { lastStatus: last.text } };
    }
    assert.equal(last.status, "delivered");
    await shipper.cancel(order);
  }
  console.log(
    "Dummy commerce passed: both payment gateways, unpaid/failed/paid/refund states, both couriers, unavailable PIN, shipment and delivered tracking. No money charged or real shipment booked.",
  );
} finally {
  await MockPayment.deleteMany({ orderNumber: number });
  await MockPayment.db.close();
}
