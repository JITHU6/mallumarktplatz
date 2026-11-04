/**
 * Site-wide configuration.
 *
 * IMPORTANT: The legal details below are placeholders. Replace them with the
 * real operator details before going live – an Impressum with fake or missing
 * data is not compliant with § 5 DDG.
 */
export const siteConfig = {
  name: "MalluMarktplatz",
  domain: "mallumarktplatz.de",
  defaultCountry: "DE",
  social: {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? "",
  },
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@mallumarktplatz.de",
  legal: {
    operatorName: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME ?? "[Operator name – please configure]",
    street: process.env.NEXT_PUBLIC_LEGAL_STREET ?? "[Street and number]",
    postalCity: process.env.NEXT_PUBLIC_LEGAL_POSTAL_CITY ?? "[Postal code and city]",
    country: "Germany",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@mallumarktplatz.de",
    phone: process.env.NEXT_PUBLIC_LEGAL_PHONE ?? "",
    responsiblePerson: process.env.NEXT_PUBLIC_LEGAL_RESPONSIBLE ?? "[Name of person responsible for content]",
  },
} as const;

export const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

export const PAGE_SIZE = 12;
