import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { announcementsApi, isDismissed, rememberDismissal, type Announcement } from "@/lib/announcements";

type AnnouncementValue = {
  /** Everything live right now, most important first. */
  items: Announcement[];
  /** The one to show as a first-visit popup, or null once it has been dismissed. */
  popup: Announcement | null;
  /** The "What's new" panel on the right edge. */
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  dismissPopup: () => void;
  /** Moves the popup aside into the ribbon without marking it read for as long. */
  minimisePopup: () => void;
  noteClick: (id: string) => void;
};

const AnnouncementContext = createContext<AnnouncementValue | null>(null);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [popup, setPopup] = useState<Announcement | null>(null);
  const [isPanelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void announcementsApi
      .list()
      .then(({ announcements }) => {
        if (cancelled) return;
        setItems(announcements);
        // First visit gets the popup; after that the ribbon keeps it one tap away.
        const first = announcements.find((a) => a.placement !== "ribbon" && !isDismissed(a));
        if (first) {
          setPopup(first);
          announcementsApi.count(first.id, "view");
        }
      })
      .catch(() => {
        // No announcements rather than a broken page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissPopup = useCallback(() => {
    setPopup((current) => {
      if (current) {
        rememberDismissal(current);
        announcementsApi.count(current.id, "dismiss");
      }
      return null;
    });
  }, []);

  const minimisePopup = useCallback(() => {
    setPopup((current) => {
      if (current) rememberDismissal(current);
      return null;
    });
  }, []);

  const value = useMemo<AnnouncementValue>(
    () => ({
      items,
      popup,
      isPanelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      dismissPopup,
      minimisePopup,
      noteClick: (id: string) => announcementsApi.count(id, "click"),
    }),
    [items, popup, isPanelOpen, dismissPopup, minimisePopup],
  );

  return <AnnouncementContext.Provider value={value}>{children}</AnnouncementContext.Provider>;
}

export function useAnnouncements(): AnnouncementValue {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error("useAnnouncements must be used inside <AnnouncementProvider>");
  return ctx;
}
