import { normalizePhone } from "../normalization/contact.js";

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/\b(?:limited|ltd|llc|inc|incorporated|pty|plc)\b/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();

const genericNames = new Set([
  "accounting",
  "accounting services",
  "bookkeeping",
  "tax services",
]);

export const firmKeyFor = (lead) => {
  if (lead.domain) return `domain:${String(lead.domain).toLocaleLowerCase()}`;

  const countryCode = lead.locations?.find(
    (location) => location.countryCode,
  )?.countryCode;
  const phone = lead.phoneNumbers?.map(normalizePhone).find(Boolean);
  if (countryCode && phone) return `phone:${countryCode}:${phone}`;

  const name = normalizeText(lead.firmName);
  const location = lead.locations?.find(
    (candidate) =>
      candidate.city && (candidate.countryCode || candidate.country),
  );
  if (name && !genericNames.has(name) && location) {
    return `name-location:${name}:${normalizeText(location.city)}:${normalizeText(
      location.countryCode ?? location.country,
    )}`;
  }

  const advisor = normalizeText(lead.advisorNames?.[0]);
  if (advisor && name && location) {
    return `advisor:${advisor}:${name}:${normalizeText(location.city)}`;
  }
  return null;
};
