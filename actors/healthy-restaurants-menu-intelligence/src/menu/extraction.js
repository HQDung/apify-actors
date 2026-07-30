import { mergeDietaryTags } from "../dietary/extraction.js";
import { cleanText, normalizeText } from "../normalization/index.js";

const extractionMethods = new Set([
  "json_ld",
  "embedded_json",
  "dom_repeated_structure",
  "generic_text_parser",
]);

const headingNames = new Set([
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "starters",
  "mains",
  "main courses",
  "sides",
  "salads",
  "bowls",
  "desserts",
  "drinks",
  "beverages",
  "our menu",
  "menu",
]);

const decodeEntities = (value) =>
  value
    .replace(/&pound;|&#163;|&#xA3;/gi, "£")
    .replace(/&euro;|&#8364;|&#x20AC;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');

const textFromHtml = (value) =>
  cleanText(
    decodeEntities(
      value
        .replace(
          /<(br|\/p|\/li|\/div|\/section|\/article|\/h[1-6])\b[^>]*>/gi,
          "\n",
        )
        .replace(/<[^>]*>/g, " "),
    ),
  );

const attribute = (attributes, name) =>
  attributes.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ??
  null;

const currencyForSymbol = (value) => {
  if (/£/.test(value)) return "GBP";
  if (/€/.test(value)) return "EUR";
  if (/(?:US|CA)?\$/.test(value)) return "USD";
  return null;
};

const numericValues = (value) => {
  const matches = value.match(/\d+(?:[.,]\d{1,2})?/g) ?? [];
  return matches
    .map((entry) => Number(entry.replace(/,(?=\d{2}$)/, ".").replace(/,/g, "")))
    .filter((entry) => Number.isFinite(entry));
};

export const normalizeMenuText = (value) =>
  normalizeText(textFromHtml(String(value ?? "")));

export const parseMenuPrice = (value, { defaultCurrency = null } = {}) => {
  const formattedOriginal = textFromHtml(String(value ?? ""));
  if (!formattedOriginal) return null;
  const values = numericValues(formattedOriginal);
  const currency =
    currencyForSymbol(formattedOriginal) ?? defaultCurrency ?? null;
  if (!values.length)
    return {
      amount: null,
      currency,
      formattedOriginal,
      priceType: "unknown",
    };
  const lower = formattedOriginal.toLocaleLowerCase();
  const isRange = /\bto\b|[-–—]/.test(lower) && values.length > 1;
  const isMultiple =
    values.length > 1 &&
    !isRange &&
    (/\//.test(formattedOriginal) ||
      /\b(?:small|medium|large|regular|single|double|kids?|adult|size)\b/i.test(
        lower,
      ));
  let priceType = "fixed";
  if (/\b(?:from|starting)\b/i.test(lower) || /\+$/.test(lower))
    priceType = "from";
  else if (isRange) priceType = "range";
  else if (isMultiple) priceType = "multiple";
  return {
    amount: values[0],
    ...(values.length > 1 ? { amounts: values } : {}),
    currency,
    formattedOriginal,
    priceType,
  };
};

const priceOnly = (value) =>
  !textFromHtml(value)
    .replace(/[£€$\d.,+\-–—/\s]/g, "")
    .trim();

const isGenericHeading = (value) => headingNames.has(normalizeMenuText(value));

export const isValidMenuItemCandidate = (candidate) => {
  if (!candidate || typeof candidate !== "object") return false;
  const name = textFromHtml(candidate.nameOriginal ?? candidate.name ?? "");
  if (!name || name.length < 2 || isGenericHeading(name)) return false;
  if (candidate.isHeading || priceOnly(name)) return false;
  if (
    /^(?:home|menu home|about|contact|privacy|terms|careers?|order online|book now)$/i.test(
      name,
    )
  )
    return false;
  if (
    /\b(?:opening|closing) hours?\b|\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/i.test(
      name,
    )
  )
    return false;
  if (/\b\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}\b/.test(name)) return false;
  if (
    /\d/.test(name) &&
    /\b(?:street|road|avenue|lane|postcode|zip code)\b/i.test(name)
  )
    return false;
  if (
    /\b(?:limited time|special offer|summer special|winter special|buy one|get one|2 for 1|promotion|deal)\b/i.test(
      name,
    )
  )
    return false;
  if (/\b(?:cookie|accept all|privacy policy|we use cookies)\b/i.test(name))
    return false;
  if (
    candidate.descriptionOriginal &&
    /\b(?:opening hours|privacy policy|accept cookies)\b/i.test(
      candidate.descriptionOriginal,
    )
  )
    return false;
  if (candidate.priceText && priceOnly(name) && !candidate.descriptionOriginal)
    return false;
  return true;
};

const buildItem = ({
  name,
  description = null,
  section = null,
  priceText = null,
  evidenceText = null,
  sourceUrl,
  method,
  defaultCurrency = null,
}) => {
  const nameOriginal = textFromHtml(name ?? "");
  const descriptionOriginal = textFromHtml(description ?? "") || null;
  const sectionOriginal = textFromHtml(section ?? "") || null;
  if (
    !isValidMenuItemCandidate({ nameOriginal, descriptionOriginal, priceText })
  )
    return null;
  return {
    nameOriginal,
    nameNormalized: normalizeMenuText(nameOriginal),
    descriptionOriginal,
    descriptionNormalized: descriptionOriginal
      ? normalizeMenuText(descriptionOriginal)
      : null,
    sectionOriginal,
    sectionNormalized: sectionOriginal
      ? normalizeMenuText(sectionOriginal)
      : null,
    price: priceText ? parseMenuPrice(priceText, { defaultCurrency }) : null,
    publishedNutrition: null,
    dietaryTags: [],
    sourceUrl,
    extractionMethods: [method],
    sourceEvidenceText:
      evidenceText ??
      [nameOriginal, descriptionOriginal, sectionOriginal, priceText]
        .filter(Boolean)
        .join(" "),
  };
};

const priceFromOffer = (offer) => {
  if (!offer || typeof offer !== "object") return null;
  if (offer.price !== undefined) return String(offer.price);
  if (offer.lowPrice !== undefined || offer.highPrice !== undefined)
    return [offer.lowPrice, offer.highPrice]
      .filter((value) => value != null)
      .join("–");
  return null;
};

const structuredItem = (value, section, sourceUrl, method, defaultCurrency) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const type = String(value["@type"] ?? "");
  const offer = Array.isArray(value.offers) ? value.offers[0] : value.offers;
  const offerCurrency =
    offer && typeof offer === "object" ? offer.priceCurrency : null;
  const priceText =
    value.price ?? priceFromOffer(offer) ?? value.priceRange ?? null;
  const looksLikeItem =
    typeof value.name === "string" &&
    (value.description || priceText || /menuitem|product|food/i.test(type));
  if (!looksLikeItem) return null;
  return buildItem({
    name: value.name,
    description: value.description,
    section,
    priceText,
    sourceUrl,
    method,
    defaultCurrency: offerCurrency ?? defaultCurrency,
    evidenceText: JSON.stringify(value),
  });
};

const collectStructuredItems = (
  value,
  section,
  sourceUrl,
  method,
  defaultCurrency,
) => {
  const items = [];
  const visit = (entry, inheritedSection = section) => {
    if (Array.isArray(entry)) {
      entry.forEach((child) => visit(child, inheritedSection));
      return;
    }
    if (!entry || typeof entry !== "object") return;
    const nextSection =
      typeof entry.name === "string" &&
      (entry.hasMenuItem || entry.itemListElement || entry.hasMenuSection)
        ? entry.name
        : inheritedSection;
    const item = structuredItem(
      entry,
      inheritedSection,
      sourceUrl,
      method,
      defaultCurrency,
    );
    if (item) items.push(item);
    Object.entries(entry).forEach(([key, child]) => {
      if (["offers", "price", "lowPrice", "highPrice"].includes(key)) return;
      visit(child, nextSection);
    });
  };
  visit(value);
  return items;
};

const extractStructured = (html, sourceUrl, method, defaultCurrency) => {
  const items = [];
  const pattern =
    method === "json_ld"
      ? /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      : /<script\b[^>]*(?:type\s*=\s*["']application\/json["']|data-menu-json\b)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      items.push(
        ...collectStructuredItems(
          JSON.parse(match[1]),
          null,
          sourceUrl,
          method,
          defaultCurrency,
        ),
      );
    } catch {
      // Malformed structured data falls through to DOM and text layers.
    }
  }
  return items;
};

const headingBefore = (html, position) => {
  const headings = [...html.matchAll(/<h([1-2])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .filter((match) => match.index < position)
    .map((match) => textFromHtml(match[2]))
    .filter(Boolean);
  return headings.at(-1) ?? null;
};

const extractFirst = (html, pattern) =>
  textFromHtml(html.match(pattern)?.[1] ?? "") || null;

const extractDomItems = (html, sourceUrl, defaultCurrency) => {
  const items = [];
  const pattern =
    /<(article|li|div)\b([^>]*(?:class|id)\s*=\s*["'][^"']*(?:menu[-_ ]?item|menu[-_ ]?card|food[-_ ]?card|\bitem\b|\bcard\b|dish|product)[^"']*["'][^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const block = match[3];
    const name =
      extractFirst(block, /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i) ??
      extractFirst(
        block,
        /<(?:span|div|p)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:name|title)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|p)>/i,
      );
    const description =
      extractFirst(block, /<p\b[^>]*>([\s\S]*?)<\/p>/i) ??
      extractFirst(
        block,
        /<(?:span|div)\b[^>]*(?:class|id)\s*=\s*["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/i,
      );
    const price =
      extractFirst(
        block,
        /<(?:span|div|p)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:price|amount)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|p)>/i,
      ) ??
      textFromHtml(block).match(
        /(?:from\s+)?[£€$]\s?\d[\d.,]*(?:\s*(?:[-–—/]|to)\s*[£€$]?\s?\d[\d.,]*)?/i,
      )?.[0] ??
      null;
    const section =
      attribute(match[2], "data-section") ?? headingBefore(html, match.index);
    const item = buildItem({
      name,
      description,
      section,
      priceText: price,
      sourceUrl,
      method: "dom_repeated_structure",
      defaultCurrency,
      evidenceText: textFromHtml(block),
    });
    if (item) items.push(item);
  }
  return items;
};

const extractGenericItems = (html, sourceUrl, defaultCurrency) => {
  const items = [];
  const entries = [];
  for (const match of html.matchAll(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>|<(?:p|li|div)\b[^>]*>([\s\S]*?)<\/(?:p|li|div)>/gi,
  )) {
    const text = textFromHtml(match[2] ?? match[3] ?? "");
    if (text) entries.push({ text, isHeading: Boolean(match[2]) });
  }
  if (!entries.length) {
    entries.push(
      ...html
        .replace(/<(br|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .split(/\n+/)
        .map((line) => ({ text: textFromHtml(line), isHeading: false }))
        .filter((entry) => entry.text),
    );
  }
  let section = null;
  for (const entry of entries) {
    if (entry.isHeading) {
      section = entry.text;
      continue;
    }
    const line = entry.text;
    const priceMatch = line.match(
      /(?:from\s+)?[£€$]\s?\d[\d.,]*(?:\s*(?:[-–—/]|to)\s*[£€$]?\s?\d[\d.,]*)?/i,
    );
    if (!priceMatch) continue;
    const name = line
      .replace(priceMatch[0], "")
      .replace(/[-–—:|]+\s*$/, "")
      .trim();
    const item = buildItem({
      name,
      section,
      priceText: priceMatch[0],
      sourceUrl,
      method: "generic_text_parser",
      defaultCurrency,
      evidenceText: line,
    });
    if (item) items.push(item);
  }
  return items;
};

const completeness = (item) =>
  (item.descriptionOriginal ? 2 : 0) +
  (item.price ? 2 : 0) +
  (item.sectionOriginal ? 1 : 0) +
  (item.publishedNutrition ? 2 : 0) +
  (item.dietaryTags?.length ?? 0) +
  item.extractionMethods.length;

export const deduplicateMenuItems = (items) => {
  const result = [];
  const priceSignal = (price) =>
    price
      ? [
          price.priceType ?? "unknown",
          price.amounts?.join(",") ?? price.amount ?? "",
          price.currency ?? "",
        ].join("|")
      : null;
  const compatiblePrices = (left, right) =>
    !left || !right || priceSignal(left) === priceSignal(right);
  for (const item of items) {
    const existingIndex = result.findIndex(
      (existingItem) =>
        existingItem.sectionNormalized === item.sectionNormalized &&
        existingItem.nameNormalized === item.nameNormalized &&
        compatiblePrices(existingItem.price, item.price),
    );
    const existing = existingIndex >= 0 ? result[existingIndex] : null;
    if (!existing) {
      result.push({
        ...item,
        extractionMethods: [...new Set(item.extractionMethods)],
      });
      continue;
    }
    const winner =
      completeness(item) > completeness(existing) ? item : existing;
    const other = winner === item ? existing : item;
    const { sourceEvidenceText: winnerEvidence, ...winnerWithoutEvidence } =
      winner;
    const { sourceEvidenceText: otherEvidence, ...otherWithoutEvidence } =
      other;
    const mergedEvidence = winnerEvidence ?? otherEvidence;
    result[existingIndex] = {
      ...winnerWithoutEvidence,
      publishedNutrition:
        winnerWithoutEvidence.publishedNutrition ??
        otherWithoutEvidence.publishedNutrition ??
        null,
      dietaryTags: mergeDietaryTags(
        winnerWithoutEvidence.dietaryTags,
        otherWithoutEvidence.dietaryTags,
      ),
      extractionMethods: [
        ...new Set([
          ...winnerWithoutEvidence.extractionMethods,
          ...otherWithoutEvidence.extractionMethods,
        ]),
      ],
      ...(mergedEvidence != null ? { sourceEvidenceText: mergedEvidence } : {}),
    };
  }
  return result;
};

export const extractMenuItemsFromHtml = (
  html,
  sourceUrl,
  { maxItems = 200, defaultCurrency = null } = {},
) => {
  if (typeof html !== "string" || !html.trim())
    return { items: [], rawItemsFound: 0, extractionMethods: [] };
  const layered = [
    ...extractStructured(html, sourceUrl, "json_ld", defaultCurrency),
    ...extractStructured(html, sourceUrl, "embedded_json", defaultCurrency),
    ...extractDomItems(html, sourceUrl, defaultCurrency),
  ];
  const rawItems = layered.length
    ? layered
    : extractGenericItems(html, sourceUrl, defaultCurrency);
  const items = deduplicateMenuItems(rawItems).slice(0, maxItems);
  return {
    items,
    rawItemsFound: rawItems.length,
    extractionMethods: [
      ...new Set(items.flatMap((item) => item.extractionMethods)),
    ].filter((method) => extractionMethods.has(method)),
  };
};
