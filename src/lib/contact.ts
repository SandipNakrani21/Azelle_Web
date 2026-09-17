// Azelle's public contact points. Used by the footer, the contact page and the policy pages.
export const CONTACT = {
  email: "azelleperfume@gmail.com",
  // Display form and the digits-only form wa.me needs.
  phone: "+91 96013 10202",
  whatsappNumber: "919601310202",
  instagram: "https://www.instagram.com/azelle.perfume/",
} as const;

export const WHATSAPP_URL = `https://wa.me/${CONTACT.whatsappNumber}`;
export const MAILTO_URL = `mailto:${CONTACT.email}`;
