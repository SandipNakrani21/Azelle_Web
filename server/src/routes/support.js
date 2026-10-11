import { Router } from "express";
import { SupportRequest } from "../models/SupportRequest.js";
import { rateLimit } from "../middleware/rateLimit.js";
export const supportRouter = Router();
const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
supportRouter.post(
  "/",
  rateLimit({
    windowMs: 3600000,
    max: 8,
    message: "Too many requests. Please try later.",
  }),
  async (req, res, next) => {
    try {
      if (req.body?.website)
        return res
          .status(400)
          .json({ error: "Request could not be accepted." });
      const kind = clean(req.body?.kind, 10),
        name = clean(req.body?.name, 80),
        email = clean(req.body?.email, 120).toLowerCase();
      if (
        !["contact", "bulk", "gst"].includes(kind) ||
        name.length < 2 ||
        !/^\S+@\S+\.\S+$/.test(email)
      )
        return res
          .status(400)
          .json({ error: "Enter a name and valid email address." });
      const message = clean(req.body?.message, 3000);
      if (kind !== "gst" && message.length < 10)
        return res
          .status(400)
          .json({ error: "Include at least 10 characters in your message." });
      const details = Object.fromEntries(
        [
          "topic",
          "company",
          "occasion",
          "city",
          "date",
          "quantity",
          "gstin",
          "order",
          "business",
          "address",
        ].map((key) => [key, clean(req.body?.[key], 300)]),
      );
      if (
        kind === "gst" &&
        (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(
          details.gstin,
        ) ||
          !details.order ||
          !details.business ||
          !details.address)
      )
        return res.status(400).json({
          error: "Enter the order number, valid GSTIN and business details.",
        });
      if (
        kind === "bulk" &&
        (!Number.isInteger(Number(details.quantity)) ||
          Number(details.quantity) < 1 ||
          !details.city)
      )
        return res
          .status(400)
          .json({ error: "Enter a positive quantity and delivery city." });
      const request = await SupportRequest.create({
        kind,
        name,
        email,
        phone: clean(req.body?.phone, 30),
        message,
        details,
      });
      res.status(201).json({
        reference: request.id,
        message: "Your request has been received by Azelle customer support.",
      });
    } catch (error) {
      next(error);
    }
  },
);
