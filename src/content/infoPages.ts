// Content for the Information and Our House pages (/pages/:slug), written for an Indian D2C perfume brand.
//
// ⚠ Before launch:
//  1. Replace every [bracketed] value in COMPANY with Azelle's registered business details.
//  2. Confirm timelines (dispatch, delivery, refunds, response times) match how Azelle actually operates.
//  3. Have the legal pages (Terms, Privacy, Refund & Return, Shipping, GST) reviewed by a lawyer / CA.
//     They follow current Indian law in good faith but are not legal advice.

export const COMPANY = {
  brand: "Azelle Fragrances",
  legalName: "[Registered business name]",
  address: "[Registered office address, City, State – PIN code]",
  gstin: "[GSTIN]",
  email: "[customer care email]",
  phone: "[customer care phone / WhatsApp number]",
  hours: "Monday to Saturday, 10:00 am – 7:00 pm IST",
  grievanceOfficer: "[Grievance Officer name]",
  grievanceEmail: "[grievance officer email]",
  jurisdiction: "[City]",
};

export const LAST_UPDATED = "14 September 2026";

export type InfoBlock = string | { list: string[] } | { note: string };
export type InfoSection = { id: string; heading: string; blocks: InfoBlock[] };
export type IconKey = "truck" | "clock" | "check" | "gift" | "award" | "flag" | "rabbit" | "droplet" | "mail";
export type InfoHighlight = { icon: IconKey; title: string; text: string };
export type InfoFormKind = "contact" | "bulk" | "gst" | "tracking";

export type InfoPageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  /** Legal pages show a "Last updated" date and an "On this page" menu. */
  legal?: boolean;
  highlights?: InfoHighlight[];
  showContact?: boolean;
  form?: InfoFormKind;
  /** Show the form above the sections (contact, tracking) instead of below them. */
  formFirst?: boolean;
  sections: InfoSection[];
};

const grievanceBlock = (): InfoBlock[] => [
  "If you have a complaint about a product, an order or how we handle your information, please contact our Grievance Officer:",
  {
    list: [
      `Name: ${COMPANY.grievanceOfficer}`,
      `Email: ${COMPANY.grievanceEmail}`,
      `Address: ${COMPANY.legalName}, ${COMPANY.address}`,
      `Hours: ${COMPANY.hours}`,
    ],
  },
  "We acknowledge every complaint within 48 hours and aim to resolve it within one month of receiving it, as required under the Consumer Protection (E-Commerce) Rules, 2020.",
];

export const INFO_PAGES: Record<string, InfoPageContent> = {
  // ─────────────────────────────────────────── Information ──
  "terms-and-conditions": {
    eyebrow: "Information",
    title: "Terms & Conditions",
    intro: "The terms that apply when you use this website and buy from Azelle Fragrances. Please read them carefully before placing an order.",
    legal: true,
    sections: [
      {
        id: "about",
        heading: "About these terms",
        blocks: [
          `This website is owned and operated by ${COMPANY.legalName} ("Azelle", "we", "us" or "our"), with its registered office at ${COMPANY.address}. These Terms & Conditions govern your access to the website and every purchase you make from us.`,
          "By browsing the website or placing an order, you agree to these terms together with our Privacy Policy, Shipping Policy and Refund & Return Policy. If you do not agree, please do not use the website.",
          "This document is an electronic record under the Information Technology Act, 2000 and the rules made under it, and does not require a physical or digital signature.",
        ],
      },
      {
        id: "eligibility",
        heading: "Eligibility and your account",
        blocks: [
          "You must be at least 18 years old and competent to enter into a contract under the Indian Contract Act, 1872 to place an order. If you are under 18, you may use the website only with the involvement of a parent or guardian.",
          {
            list: [
              "Provide accurate and complete details, including your name, phone number and delivery address.",
              "Keep your login details confidential — you are responsible for activity on your account.",
              "Tell us immediately if you suspect unauthorised use of your account.",
            ],
          },
        ],
      },
      {
        id: "products",
        heading: "Products and descriptions",
        blocks: [
          "We describe every fragrance as accurately as we can. Fragrance is personal: how a perfume smells, projects and lasts varies with skin chemistry, climate and application. Product photos are for illustration, and colours and packaging may vary slightly between batches.",
          "Our perfumes are cosmetic products under the Drugs and Cosmetics Act, 1940 and the Cosmetics Rules, 2020. Each pack carries its ingredient list, batch number and manufacturing details, along with the declarations required under the Legal Metrology (Packaged Commodities) Rules, 2011 — net quantity, Maximum Retail Price (MRP), month and year of manufacture, and consumer care contact.",
          { note: "Perfumes are for external use only. Please patch test before first use and stop using the product if irritation occurs." },
        ],
      },
      {
        id: "pricing",
        heading: "Prices and payment",
        blocks: [
          "All prices are in Indian Rupees (₹) and are inclusive of all taxes, including GST. The price you pay will never be more than the MRP printed on the pack.",
          {
            list: [
              "Payments are processed securely by RBI-authorised payment partners using UPI, debit and credit cards, net banking and wallets.",
              "We do not see or store your full card details. Saved cards, where offered, are tokenised by the payment partner as required by the Reserve Bank of India.",
              "Cash on Delivery, where available for your pin code, is shown at checkout along with any applicable conditions.",
            ],
          },
          "If a product is listed at an incorrect price because of a genuine error, we will contact you before dispatch. You can then confirm the order at the correct price or cancel it for a full refund.",
        ],
      },
      {
        id: "orders",
        heading: "Orders and cancellation",
        blocks: [
          "After you place an order you will receive an order confirmation by email and/or SMS. This confirms we have received your order; the order is accepted when it is dispatched.",
          {
            list: [
              "You can cancel an order free of charge at any time before it is dispatched by contacting us with your order number.",
              "We may cancel an order if a product is out of stock, if there is a pricing or listing error, if the delivery pin code is not serviceable, or if we suspect fraudulent activity. In every such case you receive a full refund.",
              "We do not charge cancellation fees.",
            ],
          },
          "Delivery, returns and refunds are covered in detail in our Shipping Policy and Refund & Return Policy, which form part of these terms.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "Trademarks and content",
        blocks: [
          `"Azelle", the Azelle logo, product names, bottle and label designs, photographs and all website content are the property of ${COMPANY.legalName} and are protected under the Trade Marks Act, 1999 and the Copyright Act, 1957. You may not copy, reproduce or use them without our written permission.`,
          "Where we mention another fragrance, brand or style, it is only to describe a scent profile for comparison. Azelle is not affiliated with, endorsed by or sponsored by the owners of those brands, and all third-party trademarks belong to their respective owners.",
        ],
      },
      {
        id: "acceptable-use",
        heading: "Using the website responsibly",
        blocks: [
          {
            list: [
              "Do not use the website for any unlawful purpose or in a way that could damage, disable or impair it.",
              "Do not attempt to gain unauthorised access to our systems, or collect data from the website using bots or scrapers.",
              "Do not place orders for resale without a written reseller or bulk agreement with us.",
              "Reviews and content you submit must be genuine, based on your own experience, and must not be offensive or misleading. We may moderate or remove content that breaks these rules.",
            ],
          },
        ],
      },
      {
        id: "liability",
        heading: "Limitation of liability",
        blocks: [
          "To the fullest extent permitted by law, our total liability for any claim relating to a product is limited to the amount you paid for that product. We are not liable for indirect or consequential losses.",
          "Nothing in these terms limits your rights as a consumer under the Consumer Protection Act, 2019, or our liability where it cannot be limited by law.",
          "We are not responsible for delays or failures caused by events beyond our reasonable control, such as natural disasters, epidemics, strikes, government orders or disruptions to courier networks.",
        ],
      },
      {
        id: "disputes",
        heading: "Governing law and disputes",
        blocks: [
          `These terms are governed by the laws of India. Subject to your rights under consumer protection law, the courts at ${COMPANY.jurisdiction} have jurisdiction over any dispute.`,
          "We always try to resolve concerns directly first. You may also approach the National Consumer Helpline by calling 1915 or visiting consumerhelpline.gov.in, or file a complaint with the appropriate Consumer Commission.",
        ],
      },
      { id: "grievance", heading: "Grievance Officer", blocks: grievanceBlock() },
      {
        id: "changes",
        heading: "Changes to these terms",
        blocks: [
          "We may update these terms from time to time. Changes apply to orders placed after the updated terms are published on this page. The date at the top of this page shows when they were last updated.",
        ],
      },
    ],
  },

  "privacy-policy": {
    eyebrow: "Information",
    title: "Privacy Policy",
    intro: "How Azelle Fragrances collects, uses, shares and protects your personal data — and the choices and rights you have.",
    legal: true,
    sections: [
      {
        id: "scope",
        heading: "Who we are",
        blocks: [
          `${COMPANY.legalName} ("Azelle", "we", "us") operates this website and is the Data Fiduciary for the personal data you share with us. This policy explains how we process that data in line with the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.`,
          "By using the website or giving us your information, you consent to it being processed as described in this policy.",
        ],
      },
      {
        id: "data-we-collect",
        heading: "Information we collect",
        blocks: [
          {
            list: [
              "Contact and identity details — name, email address and mobile number.",
              "Delivery and billing addresses, and your GSTIN and business name if you request a GST invoice.",
              "Order details — products purchased, order value, payment status and delivery history.",
              "Account details — login email and an encrypted password.",
              "Messages you send us, including support requests, reviews and bulk order enquiries.",
              "Technical data — IP address, device and browser type, pages viewed and cookie identifiers.",
            ],
          },
          { note: "We do not collect or store your full card number, CVV or UPI PIN. Payments are handled entirely by our RBI-authorised payment partners." },
        ],
      },
      {
        id: "how-we-use",
        heading: "How we use your information",
        blocks: [
          {
            list: [
              "To process, pack, ship and deliver your orders, and to handle cancellations, returns and refunds.",
              "To send order updates and delivery notifications by email, SMS or WhatsApp.",
              "To issue tax invoices and meet our accounting and GST obligations.",
              "To respond to your questions, complaints and requests.",
              "To prevent fraud and keep the website secure.",
              "To understand how the website is used and improve it.",
              "To send offers and new launch announcements — only if you have opted in. You can unsubscribe at any time.",
            ],
          },
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        blocks: [
          "We never sell your personal data. We share only what is necessary with trusted partners who process it on our behalf and are bound to protect it:",
          {
            list: [
              "Courier and logistics partners — your name, delivery address and phone number, to deliver your order.",
              "Payment gateways and banks — to process payments and refunds.",
              "Email, SMS and WhatsApp service providers — to send order updates and messages you have agreed to receive.",
              "Cloud hosting, analytics and IT service providers — to run and improve the website.",
              "Our accountants, auditors and legal advisers — where required.",
              "Government, tax or law enforcement authorities — only when required by law.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "Essential cookies keep your cart and login working. With your permission, we also use analytics cookies to understand how visitors use the website. You can clear or block cookies in your browser settings, but some features, such as your cart, may not work without essential cookies.",
        ],
      },
      {
        id: "security",
        heading: "How we protect your data",
        blocks: [
          "We use reasonable security practices to protect your data, including encrypted connections (HTTPS), encrypted passwords, restricted staff access and regular reviews of our systems and partners. No online system is completely secure, so please keep your account password private.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        blocks: [
          "We keep your personal data only for as long as it is needed for the purposes above. Order and invoice records are retained for the period required under the Central Goods and Services Tax Act, 2017 and other applicable laws. When data is no longer required, we delete or anonymise it.",
        ],
      },
      {
        id: "your-rights",
        heading: "Your rights",
        blocks: [
          "Under the Digital Personal Data Protection Act, 2023, you have the right to:",
          {
            list: [
              "Access a summary of the personal data we hold about you and how it is processed.",
              "Correct, complete or update inaccurate or incomplete data.",
              "Request erasure of your data where it is no longer needed, unless we must keep it by law.",
              "Withdraw your consent at any time — as easily as you gave it.",
              "Nominate a person to exercise these rights on your behalf in the event of death or incapacity.",
              "Have your grievances addressed by us, and if unresolved, complain to the Data Protection Board of India.",
            ],
          },
          `To exercise any of these rights, email ${COMPANY.grievanceEmail} from your registered email address.`,
        ],
      },
      {
        id: "marketing",
        heading: "Marketing messages",
        blocks: [
          "We send promotional emails, SMS or WhatsApp messages only with your consent. Every email includes an unsubscribe link, and you can opt out of SMS or WhatsApp updates by replying STOP or contacting us. We respect Do Not Disturb (DND) preferences under TRAI's Telecom Commercial Communications Customer Preference Regulations, 2018. Order and delivery updates are service messages and will still be sent.",
        ],
      },
      {
        id: "children",
        heading: "Children's data",
        blocks: [
          "Our website and products are intended for adults. We do not knowingly collect personal data from anyone under 18 without verifiable consent from a parent or lawful guardian, as required by the Digital Personal Data Protection Act, 2023.",
        ],
      },
      { id: "grievance", heading: "Grievance Officer", blocks: grievanceBlock() },
      {
        id: "changes",
        heading: "Changes to this policy",
        blocks: ["We may update this policy to reflect changes in law or in how we work. The latest version will always be on this page, with the date it was last updated."],
      },
    ],
  },

  "refund-and-return": {
    eyebrow: "Information",
    title: "Refund & Return Policy",
    intro: "Perfume is a personal-care product, so we can't accept returns of opened bottles. If anything is wrong with your order, we'll put it right quickly.",
    legal: true,
    highlights: [
      { icon: "clock", title: "Report within 48 hours", text: "Of delivery, with an unboxing video" },
      { icon: "gift", title: "Free replacement", text: "For damaged, leaking or wrong items" },
      { icon: "check", title: "Refund in 5–7 days", text: "To your original payment method" },
    ],
    sections: [
      {
        id: "approach",
        heading: "Our approach",
        blocks: [
          "For hygiene and safety reasons, perfumes that have been opened, sprayed or had their seal removed cannot be returned for a change of mind or fragrance preference. This does not affect your rights under the Consumer Protection Act, 2019 — if a product is defective, damaged or not as described, you are always entitled to a replacement or refund.",
        ],
      },
      {
        id: "eligible",
        heading: "What you can return or replace",
        blocks: [
          {
            list: [
              "A bottle that arrived broken, cracked or leaking.",
              "The wrong product or wrong size.",
              "Missing items from your order.",
              "A defective spray pump or atomiser.",
              "A pack with a tampered or missing seal on delivery.",
            ],
          },
        ],
      },
      {
        id: "not-eligible",
        heading: "What we can't accept",
        blocks: [
          {
            list: [
              "Opened or used perfumes returned because you don't like the fragrance.",
              "Products damaged after delivery through misuse, heat or improper storage.",
              "Free samples, gifts and promotional items.",
              "Requests raised after 48 hours of delivery for transit damage or missing items (manufacturing defects are reviewed case by case).",
            ],
          },
          { note: "Not sure which fragrance to choose? Start with our 30 ml size, or contact us for personal recommendations before you buy." },
        ],
      },
      {
        id: "how-to-request",
        heading: "How to raise a request",
        blocks: [
          {
            list: [
              `Contact us within 48 hours of delivery at ${COMPANY.email} or on WhatsApp at ${COMPANY.phone}.`,
              "Share your order number, a clear unboxing video that starts with the sealed parcel, and photos of the outer box, shipping label and product.",
              "We reply within 48 hours and, once approved, arrange a free reverse pickup. If pickup isn't available at your pin code, we'll share return instructions and reimburse reasonable courier charges.",
            ],
          },
        ],
      },
      {
        id: "resolution",
        heading: "Replacement or refund",
        blocks: [
          "Returned items are inspected within 2–3 business days of reaching us. Once your request is approved, we ship a free replacement or process a refund — whichever you prefer, subject to stock availability.",
          {
            list: [
              "Prepaid orders: refunded to the original payment method within 5–7 business days of approval. Your bank may take a few additional days to reflect it.",
              "Cash on Delivery orders: refunded by bank transfer or UPI to the account details you share, within 5–7 business days of approval.",
            ],
          },
        ],
      },
      {
        id: "cancellations",
        heading: "Cancellations and undelivered orders",
        blocks: [
          {
            list: [
              "Cancel any time before dispatch for a full refund — there are no cancellation charges.",
              "If a shipment is lost in transit or returned to us undelivered, you receive a full refund or a free re-shipment.",
              "Refusing a Cash on Delivery order without reason may lead to Cash on Delivery being unavailable for future orders.",
            ],
          },
        ],
      },
      {
        id: "help",
        heading: "Need to escalate?",
        blocks: [
          ...grievanceBlock(),
          "You may also contact the National Consumer Helpline on 1915 or at consumerhelpline.gov.in.",
        ],
      },
    ],
  },

  "shipping-policy": {
    eyebrow: "Information",
    title: "Shipping Policy",
    intro: "Free shipping across India on every order, packed securely so your perfume arrives in perfect condition.",
    legal: true,
    highlights: [
      { icon: "truck", title: "Free shipping", text: "On every order, no minimum" },
      { icon: "clock", title: "Dispatch in 24–48 hours", text: "Monday to Saturday" },
      { icon: "check", title: "Delivery in 3–7 days", text: "Across most of India" },
    ],
    sections: [
      {
        id: "where",
        heading: "Where we deliver",
        blocks: [
          "We deliver to serviceable pin codes across India. Enter your pin code at checkout to confirm delivery is available. We do not ship outside India at the moment.",
        ],
      },
      {
        id: "charges",
        heading: "Shipping charges",
        blocks: [
          "Shipping is free on every order, with no minimum order value. There are no hidden charges — the total you see at checkout is the total you pay. If Cash on Delivery is available for your pin code, any conditions are shown at checkout before you place the order.",
        ],
      },
      {
        id: "dispatch",
        heading: "Dispatch times",
        blocks: [
          {
            list: [
              "Orders are dispatched within 24–48 hours of being placed, Monday to Saturday.",
              "Orders placed on Sundays or public holidays are dispatched on the next working day.",
              "During sales and festive periods, dispatch may take an extra 1–2 days. We'll let you know if there's a delay.",
            ],
          },
        ],
      },
      {
        id: "delivery",
        heading: "Delivery timelines",
        blocks: [
          "Delivery times are counted in business days from dispatch:",
          {
            list: [
              "Metro cities: 2–4 business days.",
              "Rest of India: 3–7 business days.",
              "North-East states, Jammu & Kashmir, Ladakh, Andaman & Nicobar Islands, Lakshadweep and remote pin codes: 7–12 business days.",
            ],
          },
          { note: "Perfumes contain alcohol and are classified as flammable goods for air transport, so many parcels travel by road. This keeps your shipment safe and compliant, but can add a day or two for distant locations." },
        ],
      },
      {
        id: "tracking",
        heading: "Tracking your order",
        blocks: [
          "As soon as your order ships, we send a tracking link by email, SMS or WhatsApp. You can also check the status any time on our Order Tracking page using your order number. Tracking details can take up to 24 hours after dispatch to update.",
        ],
      },
      {
        id: "delivery-attempts",
        heading: "Delivery attempts",
        blocks: [
          {
            list: [
              "Our courier partners make up to three delivery attempts. Some deliveries require a one-time password (OTP) shared on your registered mobile number.",
              "If delivery fails after three attempts, the parcel is returned to us. We then re-ship it at no charge or issue a full refund for prepaid orders.",
              "Please make sure your address, landmark and phone number are correct. Address changes are possible only before dispatch.",
            ],
          },
        ],
      },
      {
        id: "receiving",
        heading: "Receiving your parcel",
        blocks: [
          {
            list: [
              "Check that the outer packaging is intact. If it looks damaged or tampered with, you may refuse the delivery.",
              "Record an unboxing video when you open the parcel — it helps us resolve any issue quickly.",
              "Report damage, leakage or missing items within 48 hours of delivery, as explained in our Refund & Return Policy.",
            ],
          },
        ],
      },
      {
        id: "delays",
        heading: "Delays beyond our control",
        blocks: [
          "Weather, natural events, strikes, regional restrictions or courier disruptions can occasionally delay deliveries. We'll keep you updated and do everything we can to get your order to you as soon as possible.",
        ],
      },
    ],
  },

  "gst-invoice": {
    eyebrow: "Information",
    title: "GST Invoice",
    intro: "Every Azelle order comes with a GST-compliant tax invoice. Buying for your business? Add your GSTIN to claim input tax credit.",
    legal: true,
    highlights: [
      { icon: "check", title: "Tax invoice included", text: "With every order, by email" },
      { icon: "award", title: "Claim input tax credit", text: "On business purchases with GSTIN" },
      { icon: "gift", title: "Bulk & corporate orders", text: "Invoiced in your business name" },
    ],
    form: "gst",
    sections: [
      {
        id: "every-order",
        heading: "A tax invoice with every order",
        blocks: [
          "Every order includes a tax invoice issued under the Central Goods and Services Tax Act, 2017. It is emailed to you after dispatch and shows:",
          {
            list: [
              `Our GSTIN (${COMPANY.gstin}) and registered address.`,
              "Invoice number and date.",
              "Product description, HSN code (3303 — perfumes) and quantity.",
              "Taxable value and GST — CGST and SGST for deliveries within our state, or IGST for deliveries to other states, based on the place of supply.",
            ],
          },
          "Our prices already include GST, so adding a GSTIN does not change the amount you pay.",
        ],
      },
      {
        id: "business",
        heading: "Buying for your business",
        blocks: [
          "To receive a B2B invoice in your business name, enter your GSTIN and registered business name at checkout. You can then claim input tax credit on the purchase, subject to the conditions of GST law — including the invoice appearing in your GSTR-2B.",
          {
            list: [
              "The GSTIN must be active and the business name must match your registration on the GST portal.",
              "The state of your GST registration and the delivery address determine whether IGST or CGST + SGST applies.",
              "Where e-invoicing applies to our business, B2B invoices carry an Invoice Reference Number (IRN) and QR code.",
            ],
          },
          { note: "Whether a purchase qualifies for input tax credit depends on how it is used in your business. Please check with your tax adviser." },
        ],
      },
      {
        id: "after-ordering",
        heading: "Forgot to add your GSTIN?",
        blocks: [
          "Send us your order number, GSTIN, registered business name and address using the form below before your order is dispatched, and we'll issue the invoice in your business name.",
          "Once an invoice has been issued and reported, buyer details generally can't be edited. Any correction requires a credit note and a fresh invoice, which is possible only within the time limits allowed under GST law.",
        ],
      },
      {
        id: "bulk",
        heading: "Bulk and corporate orders",
        blocks: [
          "For corporate gifting, events or larger quantities, we provide a formal quotation with a full GST breakdown, followed by a tax invoice in your business name. Use our Bulk Order – Query Form to get started.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────── Our House ──
  "our-story": {
    eyebrow: "Our House",
    title: "Our Story",
    intro: "Azelle was born from a simple belief: a great fragrance says what words can't. Fragrance Beyond Words.",
    highlights: [
      { icon: "flag", title: "Made in India", text: "Composed, blended and bottled at home" },
      { icon: "rabbit", title: "Cruelty free", text: "Never tested on animals" },
      { icon: "droplet", title: "High perfume oil", text: "Rich concentrations that last" },
    ],
    sections: [
      {
        id: "beginning",
        heading: "Where it began",
        blocks: [
          "Azelle began with a question we kept asking ourselves: why should a truly long-lasting, beautifully made perfume feel out of reach? We wanted fragrances with the depth and character of the world's most celebrated perfumery, made in India and priced honestly.",
          "So we started small — a handful of compositions, reworked again and again until each one felt complete on skin, not just on a blotter.",
        ],
      },
      {
        id: "craft",
        heading: "How we make our perfumes",
        blocks: [
          "Every Azelle fragrance is composed in small batches, allowed to mature before bottling, and checked by nose before it leaves our studio.",
          {
            list: [
              "High perfume oil concentrations for rich projection and lasting wear.",
              "Balanced top, heart and base notes, so the scent evolves beautifully through the day.",
              "Matured before bottling, so every note settles and blends.",
              "Finished and quality-checked batch by batch.",
            ],
          },
        ],
      },
      {
        id: "values",
        heading: "What we stand for",
        blocks: [
          {
            list: [
              "Cruelty free — our perfumes are never tested on animals, in line with India's ban on animal testing of cosmetics.",
              "Made in India — proudly composed, blended and bottled in India.",
              "Honest pricing — premium quality at a fair price, with free shipping on every order.",
              "Transparency — clear notes, longevity and ingredients on every product.",
            ],
          },
        ],
      },
      {
        id: "collection",
        heading: "The collection",
        blocks: [
          "From the airy calm of White Oud to the commanding presence of Imperium and the adventurous spirit of Urban Voyage, each Azelle fragrance has its own story — and becomes part of yours.",
          "Thank you for choosing Azelle. We can't wait for you to find your signature scent.",
        ],
      },
    ],
  },

  "contact-us": {
    eyebrow: "Our House",
    title: "Contact Us",
    intro: "Questions about a fragrance, an order or a gift? Our team is happy to help.",
    showContact: true,
    form: "contact",
    formFirst: true,
    sections: [
      {
        id: "response",
        heading: "When to expect a reply",
        blocks: [
          {
            list: [
              "Email and contact form: within one business day.",
              `WhatsApp: during business hours, ${COMPANY.hours}.`,
              "Complaints: acknowledged within 48 hours and resolved within one month.",
            ],
          },
        ],
      },
      {
        id: "include",
        heading: "Help us help you faster",
        blocks: [
          {
            list: [
              "Your order number (it starts with AZ-), if your question is about an order.",
              "The phone number or email address used to place the order.",
              "Photos or an unboxing video for damaged, leaking or incorrect items.",
            ],
          },
        ],
      },
      { id: "grievance", heading: "Grievance Officer", blocks: grievanceBlock() },
    ],
  },

  "order-tracking": {
    eyebrow: "Our House",
    title: "Order Tracking",
    intro: "Enter your order number to see its details and status. You'll find it in your order confirmation — it starts with AZ-.",
    form: "tracking",
    formFirst: true,
    sections: [
      {
        id: "statuses",
        heading: "What each status means",
        blocks: [
          {
            list: [
              "Order placed — we've received your order and payment.",
              "Packed — your perfume is quality-checked and securely packed.",
              "Shipped — your parcel is with our courier partner; a tracking link is sent to you.",
              "Out for delivery — the courier will deliver today. Keep your phone handy for the OTP.",
              "Delivered — enjoy your fragrance! Report any issue within 48 hours.",
            ],
          },
        ],
      },
      {
        id: "not-updating",
        heading: "Tracking not updating?",
        blocks: [
          "Tracking can take up to 24 hours after dispatch to show the first update, and parcels travelling by road may not update at every stop. If there's no movement for 3 business days, or your order hasn't arrived within the expected delivery time, contact us with your order number and we'll check with the courier.",
        ],
      },
    ],
  },

  "bulk-order-enquiry": {
    eyebrow: "Our House",
    title: "Bulk Order – Query Form",
    intro: "Fragrance makes a memorable gift. We create bulk and corporate orders for businesses, weddings, events and hospitality across India.",
    highlights: [
      { icon: "award", title: "Volume pricing", text: "Better rates on larger quantities" },
      { icon: "gift", title: "Gift-ready packing", text: "With personalised notes on request" },
      { icon: "check", title: "GST invoice", text: "Claim input tax credit" },
    ],
    form: "bulk",
    sections: [
      {
        id: "who",
        heading: "Who we work with",
        blocks: [
          {
            list: [
              "Corporate gifting — Diwali, New Year, employee milestones and client appreciation.",
              "Weddings and celebrations — guest favours and return gifts.",
              "Events and brand activations.",
              "Hotels, salons and hospitality partners.",
              "Retailers and resellers — subject to a written reseller agreement.",
            ],
          },
        ],
      },
      {
        id: "how",
        heading: "How it works",
        blocks: [
          {
            list: [
              "Share your requirement using the form below — fragrances, sizes, quantity and delivery date.",
              "We send a quotation with pricing and GST breakdown within 2 business days.",
              "Samples can be arranged before you confirm.",
              "Confirm the order with an advance payment by bank transfer or UPI. Corporate purchase orders are welcome.",
              "We pack, invoice and deliver to one address or multiple locations across India.",
            ],
          },
          { note: "Please share your requirement at least 2–3 weeks before your event, especially during festive and wedding seasons." },
        ],
      },
    ],
  },

  help: {
    eyebrow: "Our House",
    title: "Get Help",
    intro: "Answers to the questions we hear most often. Can't find what you need? Contact us and we'll help.",
    sections: [
      {
        id: "longevity",
        heading: "How long does an Azelle perfume last?",
        blocks: ["It depends on the fragrance and your skin. Each product page shows the perfume oil concentration and expected longevity — for example, around 8–12 hours for our richer compositions."],
      },
      {
        id: "sizes",
        heading: "Which size should I choose?",
        blocks: ["30 ml is ideal for discovering a new scent or travelling, 50 ml for everyday wear, and 100 ml when you've found your signature fragrance."],
      },
      {
        id: "track",
        heading: "How do I track my order?",
        blocks: ["Use the tracking link sent after dispatch, or enter your order number (starting with AZ-) on the Order Tracking page."],
      },
      {
        id: "damaged",
        heading: "My parcel arrived damaged. What should I do?",
        blocks: ["Contact us within 48 hours of delivery with your order number, an unboxing video and photos. We'll arrange a free replacement or full refund."],
      },
      {
        id: "gst",
        heading: "Can I get a GST invoice?",
        blocks: ["Yes. Every order includes a tax invoice. Add your GSTIN at checkout to receive a B2B invoice in your business name."],
      },
      {
        id: "bulk",
        heading: "Do you take bulk or corporate orders?",
        blocks: ["Yes — for corporate gifting, weddings and events. Fill in the Bulk Order – Query Form and we'll send a quotation within 2 business days."],
      },
      {
        id: "storage",
        heading: "How should I store my perfume?",
        blocks: ["Keep it upright in a cool, dry place away from direct sunlight, and avoid storing it in the bathroom. Always replace the cap after use."],
      },
    ],
  },
};

/** Pages listed under "Related pages" at the bottom of each info page. */
export const RELATED_PAGES: { slug: string; label: string }[] = [
  { slug: "our-story", label: "Our Story" },
  { slug: "contact-us", label: "Contact Us" },
  { slug: "order-tracking", label: "Order Tracking" },
  { slug: "shipping-policy", label: "Shipping Policy" },
  { slug: "refund-and-return", label: "Refund & Return" },
  { slug: "gst-invoice", label: "GST Invoice" },
  { slug: "terms-and-conditions", label: "Terms & Conditions" },
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "bulk-order-enquiry", label: "Bulk Order – Query Form" },
  { slug: "help", label: "Get Help" },
];
