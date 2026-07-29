import { createHash } from "node:crypto";

export const cleanText = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() || null : null;

export const normalizeText = (value) =>
  cleanText(value)
    ?.toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? "";

export const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return null;
    url.hash = "";
    url.search = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
};

export const domainOf = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname || null;
  } catch {
    return null;
  }
};

export const normalizePhone = (phone) => {
  if (typeof phone !== "string") return null;
  const normalized = phone.replace(/[^+\d]/g, "");
  return normalized || null;
};

export const hash = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);

export const normalizeGoogleMapsUrl = (value) => {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!/google\.[^/]+$/i.test(url.hostname)) return normalized;
    return `${url.origin}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return normalized;
  }
};

export const extractPlaceId = (value) => {
  if (typeof value !== "string") return null;
  const match = value.match(/(?:place_id=|!1s)([^!&/]+)/i);
  return match?.[1] || null;
};

export const parsePostalCode = (address) => {
  const value = cleanText(address);
  if (!value) return null;
  return (
    value
      .match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0]
      ?.toUpperCase()
      .replace(/\s+/g, " ") ?? null
  );
};

export const parseLocation = (location) => {
  const parts = location
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);
  const country = parts.at(-1) ?? null;
  const city = parts[0] ?? null;
  const countryCode = /^(?:united kingdom|uk|england|scotland|wales)$/i.test(
    country ?? "",
  )
    ? "GB"
    : null;
  return { city, region: null, country, countryCode };
};
