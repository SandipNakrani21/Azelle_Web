import type { ReactNode, SVGProps } from "react";

// Line icons for the admin panel (24×24, 1.7 stroke, currentColor).
type P = SVGProps<SVGSVGElement> & { size?: number };

const make = (paths: ReactNode) =>
  function Icon({ size = 19, ...props }: P) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {paths}
      </svg>
    );
  };

export const IconDashboard = make(<><rect x="3" y="3" width="7.5" height="9" rx="2" /><rect x="13.5" y="3" width="7.5" height="5.5" rx="2" /><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" /><rect x="3" y="15" width="7.5" height="6" rx="2" /></>);
export const IconSales = make(<><path d="M3 20h18" /><path d="M6 16v-5M10.5 16V8M15 16v-3M19.5 16V6" /></>);
export const IconClarity = make(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" /></>);
export const IconOrders = make(<><path d="M6 3h12l1.2 5H4.8z" /><path d="M4.8 8v11.5a1.5 1.5 0 0 0 1.5 1.5h11.4a1.5 1.5 0 0 0 1.5-1.5V8" /><path d="M9.5 12.5h5" /></>);
export const IconCustomers = make(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.5 3 5.2" /></>);
export const IconProducts = make(<><rect x="8" y="2.5" width="8" height="4" rx="1" /><path d="M9 6.5v2.5l-2.5 2v9.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V11L15 9V6.5" /><path d="M9 15h6" /></>);
export const IconReviews = make(<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />);
export const IconCoupons = make(<><path d="M3 8.5a2 2 0 0 0 0 4 2 2 0 0 1 0 4V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1.5a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M9 9.5h.01M15 14.5h.01M15.5 9 8.5 15" /></>);
export const IconUsers = make(<><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z" /><circle cx="12" cy="10.5" r="2.5" /><path d="M8 16.5c.9-1.7 2.3-2.5 4-2.5s3.1.8 4 2.5" /></>);
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconEdit = make(<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>);
export const IconTrash = make(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7" /><path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" /></>);
export const IconChevron = make(<path d="M9 6l6 6-6 6" />);
export const IconCollapse = make(<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M15 10l-2 2 2 2" /></>);
export const IconExpand = make(<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M13 10l2 2-2 2" /></>);
export const IconLogout = make(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></>);
export const IconStore = make(<><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9v10.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V9" /><path d="M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3" /></>);
export const IconRupee = make(<><path d="M7 4h10M7 8.5h10M7 4c4.5 0 6.5 1.8 6.5 4.5S11.5 13 7 13l7.5 7" /></>);
export const IconTrend = make(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>);
export const IconEye = make(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IconClock = make(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const IconBox = make(<><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></>);
export const IconRefresh = make(<><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>);
export const IconDownload = make(<><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 17.5v1.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5" /></>);
