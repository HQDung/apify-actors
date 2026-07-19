import { extractionKeywords } from "../locales/index.js";
import { detectLanguage, normalizeText } from "../normalization/index.js";

const found = (text, keywords) =>
  keywords.some((keyword) =>
    new RegExp(
      `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    ).test(text),
  );
export const extractActivities = (text) =>
  Object.entries(extractionKeywords.activities)
    .filter(([, keywords]) => found(text, keywords))
    .map(([id, keywords]) => ({
      id,
      labelOriginal:
        keywords.find((keyword) =>
          text.toLowerCase().includes(keyword.toLowerCase()),
        ) ?? null,
      confidence: 0.85,
    }));
export const extractAmenities = (text) =>
  Object.fromEntries(
    Object.entries(extractionKeywords.amenities).map(([key, keywords]) => [
      key,
      found(text, keywords) ? true : null,
    ]),
  );
export const extractAge = (text) => {
  const explicitMatch =
    text.match(
      /(?:suitable for|designed for|recommended for)\s+(?:(?:children|kids)\s*)?(?:(?:aged?|ages?)\s*)?(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})(?:\s*years?)?/i,
    ) ??
    text.match(
      /(?:children|kids)\s+(?:aged?|ages?)\s*(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})(?:\s*years?)?/i,
    ) ??
    text.match(
      /(?:dành cho|phù hợp cho|độ tuổi)\s*(?:trẻ em|trẻ|bé)?\s*(?:từ)?\s*(\d{1,2})\s*(?:-|–|đến)\s*(\d{1,2})\s*tuổi/i,
    ) ??
    text.match(
      /(?:trẻ em|trẻ|bé)\s+từ\s*(\d{1,2})\s*(?:-|–|đến)\s*(\d{1,2})\s*tuổi/i,
    );
  const bareMatch = text.match(
    /\bages?\s*(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\b/i,
  );
  let match = explicitMatch ?? bareMatch;
  if (match) {
    const start = text.lastIndexOf("\n", match.index) + 1;
    const end = text.indexOf("\n", match.index + match[0].length);
    const line = text.slice(start, end < 0 ? text.length : end);
    if (
      /tickets?|admission|price|£|\$|€|₫|VNĐ|VND|USD|GBP|EUR|\d(?:[\d.,]*\d)?\s*đ(?![\p{L}])|vé|giá/iu.test(
        line,
      )
    )
      match = null;
  }
  return {
    minimumAge: match ? Number(match[1]) : null,
    maximumAge: match ? Number(match[2]) : null,
    toddlerAreaAvailable:
      found(text, extractionKeywords.activities.toddler_zone) || null,
    ageTextOriginal: match?.[0] ?? null,
    confidence: match ? 0.85 : 0,
  };
};

const priceTokenPattern =
  /(?:£|\$|€|₫|VNĐ|VND|USD|GBP|EUR|đ(?![\p{L}]))\s*\d(?:[\d.,]*\d)?|\d(?:[\d.,]*\d)?\s*(?:£|\$|€|₫|VNĐ|VND|USD|GBP|EUR|đ(?![\p{L}]))/giu;
const audiencePatterns = {
  child:
    /\b(?:children|child|kids?|child ticket|kids ticket)\b|(?:vé\s*)?(?:trẻ em|cho bé)/gi,
  adult: /\b(?:adults?|parents?)\b|người lớn|phụ huynh/gi,
  toddler: /\b(?:toddlers?|under\s*[234])\b|(?:vé\s*)?bé\s*dưới\s*[234]/gi,
  family: /\b(?:family|families)\b|gia đình/gi,
};
const audienceFields = {
  child: ["childPriceFrom", "childPriceTo"],
  adult: ["adultPriceFrom", "adultPriceTo"],
  toddler: ["toddlerPriceFrom", null],
  family: ["familyPriceFrom", null],
};
const currencyForToken = (token) => {
  if (token.includes("£") || /GBP/i.test(token)) return "GBP";
  if (token.includes("€") || /EUR/i.test(token)) return "EUR";
  if (token.includes("₫") || /VNĐ|VND|đ/i.test(token)) return "VND";
  if (token.includes("$") || /USD/i.test(token)) return "USD";
  return null;
};
const amountForToken = (token, currency) => {
  let numeric = token.match(/\d(?:[\d.,]*\d)?/)?.[0] ?? "";
  if (currency === "VND" || /[.,]\d{3}(?:[.,]\d{3})*$/.test(numeric))
    numeric = numeric.replace(/[.,]/g, "");
  else if (numeric.includes(",") && numeric.includes(".")) {
    const decimal =
      numeric.lastIndexOf(",") > numeric.lastIndexOf(".") ? "," : ".";
    numeric = numeric
      .replace(decimal === "," ? /\./g : /,/g, "")
      .replace(decimal, ".");
  } else numeric = numeric.replace(",", ".");
  const amount = Number(numeric);
  return Number.isFinite(amount) ? amount : null;
};
const matchesFor = (text, pattern) =>
  [...text.matchAll(new RegExp(pattern.source, pattern.flags))].map(
    (match) => ({
      index: match.index,
      end: match.index + match[0].length,
    }),
  );
const distanceBetween = (label, tokenStart, tokenEnd) => {
  if (label.end <= tokenStart) return tokenStart - label.end;
  if (label.index >= tokenEnd) return label.index - tokenEnd;
  return 0;
};
const isPriceConnector = (segment, label, tokenStart, tokenEnd) => {
  const connector =
    label.end <= tokenStart
      ? segment.slice(label.end, tokenStart)
      : segment.slice(tokenEnd, label.index);
  const words = normalizeText(connector)
    .replace(/[,:=()–—-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const allowed = new Set([
    "price",
    "prices",
    "ticket",
    "tickets",
    "admission",
    "entry",
    "from",
    "starting",
    "at",
    "only",
    "per",
    "each",
    "gia",
    "ve",
    "tu",
    "chi",
    "moi",
  ]);
  return words.every((word) => allowed.has(word));
};
const pricingUnitForEvidence = (text) => {
  if (/per session|\bsession\b|mỗi lượt|lượt chơi/i.test(text))
    return "per_session";
  if (/per hour|hourly|mỗi giờ/i.test(text)) return "per_hour";
  if (/per day|daily|mỗi ngày/i.test(text)) return "per_day";
  return null;
};
const populatedPriceFieldCount = (pricing) =>
  [
    "childPriceFrom",
    "childPriceTo",
    "adultPriceFrom",
    "adultPriceTo",
    "toddlerPriceFrom",
    "familyPriceFrom",
  ].filter((field) => pricing[field] !== null).length;
export const extractPricing = (text, sourceUrl) => {
  const values = {
    childPriceFrom: null,
    childPriceTo: null,
    adultPriceFrom: null,
    adultPriceTo: null,
    toddlerPriceFrom: null,
    familyPriceFrom: null,
  };
  const evidence = [];
  let currency = null;
  for (const match of text.matchAll(
    new RegExp(priceTokenPattern.source, priceTokenPattern.flags),
  )) {
    const token = match[0];
    const tokenStart = match.index;
    const tokenEnd = tokenStart + token.length;
    const segmentStart =
      Math.max(
        text.lastIndexOf("\n", tokenStart),
        text.lastIndexOf(";", tokenStart),
      ) + 1;
    const nextNewline = text.indexOf("\n", tokenEnd);
    const nextSemicolon = text.indexOf(";", tokenEnd);
    const candidates = [nextNewline, nextSemicolon].filter(
      (index) => index >= 0,
    );
    const segmentEnd = candidates.length
      ? Math.min(...candidates)
      : text.length;
    const segment = text.slice(segmentStart, segmentEnd);
    const relativeStart = tokenStart - segmentStart;
    const relativeEnd = tokenEnd - segmentStart;
    let audience = null;
    let closestDistance = Infinity;
    for (const [kind, pattern] of Object.entries(audiencePatterns)) {
      for (const label of matchesFor(segment, pattern)) {
        const distance = distanceBetween(label, relativeStart, relativeEnd);
        if (
          distance < closestDistance &&
          distance <= 48 &&
          isPriceConnector(segment, label, relativeStart, relativeEnd)
        ) {
          audience = kind;
          closestDistance = distance;
        }
      }
    }
    if (!audience) continue;
    const tokenCurrency = currencyForToken(token);
    if (!tokenCurrency || (currency && currency !== tokenCurrency)) continue;
    const amount = amountForToken(token, tokenCurrency);
    if (amount === null) continue;
    currency = tokenCurrency;
    const [fromField, toField] = audienceFields[audience];
    if (values[fromField] === null) values[fromField] = amount;
    else if (toField) {
      values[toField] = Math.max(values[fromField], amount);
      values[fromField] = Math.min(values[fromField], amount);
    }
    evidence.push(segment.trim().replace(/\s+/g, " ").slice(0, 180));
  }
  const uniqueEvidence = [...new Set(evidence)];
  const evidenceText = uniqueEvidence.join(" | ");
  return {
    currency,
    pricingUnit: pricingUnitForEvidence(evidenceText),
    ...values,
    priceTextOriginal: uniqueEvidence.length
      ? evidenceText.slice(0, 500)
      : null,
    sourceUrl: uniqueEvidence.length ? sourceUrl : null,
    confidence: uniqueEvidence.length ? 0.82 : 0,
  };
};
export const extractBooking = (text, links) => {
  const link = links.find((item) =>
    /book|booking|đặt vé|đặt chỗ/i.test(`${item.text} ${item.url}`),
  );
  const required = /booking (?:is )?required|must book|phải đặt/i.test(text);
  const recommended =
    /booking.*recommended|advance booking|khuyến nghị đặt/i.test(text);
  let bookingTextOriginal = null;
  if (required) bookingTextOriginal = "Booking required";
  else if (recommended) bookingTextOriginal = "Advance booking recommended";
  return {
    required: required || null,
    recommended: recommended || null,
    walkInsAccepted: null,
    bookingUrl: link?.url ?? null,
    bookingTextOriginal,
    confidence: link || required || recommended ? 0.75 : 0,
  };
};
export const extractRules = (text) => ({
  gripSocksRequired: /grip socks|vớ chống trượt/i.test(text) || null,
  adultSupervisionRequired:
    /adult supervision|phụ huynh giám sát/i.test(text) || null,
  heightRestrictions: [],
  weightRestrictions: [],
  rulesTextOriginal: [],
});
export const extractWebsiteData = ({ pages }) => {
  const text = pages.map((page) => page.text).join("\n");
  const links = pages.flatMap((page) => page.links);
  const language = detectLanguage(text);
  const pricing = pages
    .map((page) => extractPricing(page.text, page.url))
    .reduce(
      (best, candidate) =>
        populatedPriceFieldCount(candidate) > populatedPriceFieldCount(best)
          ? candidate
          : best,
      extractPricing("", null),
    );
  return {
    ageSuitability: extractAge(text),
    activities: extractActivities(text),
    pricing,
    amenities: extractAmenities(text),
    booking: extractBooking(text, links),
    rules: extractRules(text),
    languages: {
      detectedSourceLanguages: [language],
      normalizedOutputLanguage: "en",
    },
  };
};
