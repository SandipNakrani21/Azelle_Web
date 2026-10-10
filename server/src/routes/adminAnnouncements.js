import mongoose from "mongoose";
import { Router } from "express";
import { Announcement, isLive } from "../models/Announcement.js";
import { istDate, sendCsv } from "../services/csv.js";

// Catalogue → Announcements: launches, offers and notices for the storefront.
export const adminAnnouncementsRouter = Router();

const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const invalid = (res, fields) => res.status(400).json({ error: "Please fix the highlighted fields.", fields });
const date = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function parse(body = {}, admin) {
  const fields = {};
  const title = text(body.title, 80);
  const message = text(body.message, 400);
  const ctaLabel = text(body.ctaLabel, 30);
  const ctaHref = text(body.ctaHref, 300);
  if (title.length < 3) fields.title = "Give the announcement a title.";
  if (message.length < 10) fields.message = "Write a short message (at least 10 characters).";
  if (ctaHref && !/^(\/|https:\/\/)/.test(ctaHref)) fields.ctaHref = "Use a path like /collection or a full https:// link.";
  if (ctaLabel && !ctaHref) fields.ctaHref = "Add where the button should go.";
  const startsAt = date(body.startsAt);
  const endsAt = date(body.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) fields.endsAt = "The end must come after the start.";

  return {
    fields,
    data: {
      eyebrow: text(body.eyebrow, 40),
      title,
      message,
      ctaLabel,
      ctaHref,
      placement: ["both", "popup", "ribbon"].includes(body.placement) ? body.placement : "both",
      tone: ["gradient", "light", "dark"].includes(body.tone) ? body.tone : "gradient",
      image: text(body.image, 300),
      active: body.active !== false,
      startsAt,
      endsAt,
      priority: Math.max(-100, Math.min(100, Number(body.priority) || 0)),
      dismissDays: Math.max(0, Math.min(365, Number(body.dismissDays ?? 7) || 0)),
      ...(admin ? { createdBy: text(admin.name, 60) } : {}),
    },
  };
}

const withState = (a) => ({ ...a.toJSON(), live: isLive(a) });

adminAnnouncementsRouter.get("/export", async (_req, res, next) => {
  try {
    const rows = await Announcement.find().sort({ priority: -1, createdAt: -1 });
    sendCsv(res, "announcements", rows, [
      { label: "Title", value: (a) => a.title },
      { label: "Message", value: (a) => a.message },
      { label: "Placement", value: (a) => a.placement },
      { label: "Status", value: (a) => (isLive(a) ? "Live" : a.active ? "Scheduled / ended" : "Paused") },
      { label: "Starts (IST)", value: (a) => istDate(a.startsAt) },
      { label: "Ends (IST)", value: (a) => istDate(a.endsAt) },
      { label: "Priority", value: (a) => a.priority },
      { label: "Views", value: (a) => a.views },
      { label: "Clicks", value: (a) => a.clicks },
      { label: "Dismissed", value: (a) => a.dismissals },
      { label: "Created by", value: (a) => a.createdBy },
      { label: "Created (IST)", value: (a) => istDate(a.createdAt) },
    ]);
  } catch (err) {
    next(err);
  }
});

adminAnnouncementsRouter.get("/", async (_req, res, next) => {
  try {
    const announcements = await Announcement.find().sort({ priority: -1, createdAt: -1 });
    res.json({ announcements: announcements.map(withState) });
  } catch (err) {
    next(err);
  }
});

adminAnnouncementsRouter.post("/", async (req, res, next) => {
  try {
    const { fields, data } = parse(req.body, req.admin);
    if (Object.keys(fields).length) return invalid(res, fields);
    const announcement = await Announcement.create(data);
    res.status(201).json({ announcement: withState(announcement) });
  } catch (err) {
    next(err);
  }
});

adminAnnouncementsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Announcement not found." });
    const { fields, data } = parse(req.body, null);
    if (Object.keys(fields).length) return invalid(res, fields);
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!announcement) return res.status(404).json({ error: "Announcement not found." });
    res.json({ announcement: withState(announcement) });
  } catch (err) {
    next(err);
  }
});

adminAnnouncementsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Announcement not found." });
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Announcement not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
