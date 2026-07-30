import { cleanText } from "../normalization/index.js";
import { dietaryTagForLabel, dietaryTagIds } from "../taxonomy/dietary-tags.js";

const supportedIds = new Set(dietaryTagIds);
const fallbackAliases = new Map([
  ["V", "vegetarian"],
  ["VE", "vegetarian"],
  ["VG", "vegan"],
  ["GF", "gluten_free"],
  ["DF", "dairy_free"],
  ["NF", "nut_free"],
]);

const fullLabelPatterns = [
  ["no[- ]added[- ]sugar", "no_added_sugar"],
  ["high[- ]protein", "high_protein"],
  ["low[- ]calorie", "low_calorie"],
  ["plant[- ]based", "plant_based"],
  ["gluten[- ]free", "gluten_free"],
  ["dairy[- ]free", "dairy_free"],
  ["nut[- ]free", "nut_free"],
  ["low[- ]carb", "low_carb"],
  ["sugar[- ]free", "sugar_free"],
  ["vegetarian", "vegetarian"],
  ["vegan", "vegan"],
  ["halal", "halal"],
  ["kosher", "kosher"],
  ["organic", "organic"],
  ["keto(?:genic)?", "keto"],
];

export const textFromHtml = (value) =>
  String(value ?? "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(
      /<(br|\/p|\/li|\/div|\/section|\/article|\/h[1-6])\b[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]*>/g, " ")
    .split(/\n+/)
    .map((line) => cleanText(line) ?? "")
    .filter(Boolean)
    .join("\n");

const normalizedKey = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const deduplicateTags = (tags) => {
  const output = [];
  const seen = new Map();
  for (const tag of tags) {
    if (!tag || !supportedIds.has(tag.id)) continue;
    const key = `${tag.id}|${tag.sourceUrl ?? ""}|${tag.sourceType}`;
    const index = seen.get(key);
    if (index === undefined) {
      seen.set(key, output.length);
      output.push(tag);
    } else if (tag.confidence > output[index].confidence) {
      output[index] = tag;
    }
  }
  return output;
};

export const mergeDietaryTags = (...tagLists) =>
  deduplicateTags(
    tagLists.flatMap((tags) => (Array.isArray(tags) ? tags : [])),
  );

export const resolveDietaryLabel = (
  label,
  legends = {},
  { allowFallbackAliases = false } = {},
) => {
  if (typeof label !== "string") return null;
  const normalized = label.trim().replace(/\s+/g, " ");
  const explicit = dietaryTagForLabel(normalized);
  if (explicit) return explicit;
  const key = normalizedKey(normalized);
  if (legends[key]) return supportedIds.has(legends[key]) ? legends[key] : null;
  return allowFallbackAliases ? (fallbackAliases.get(key) ?? null) : null;
};

export const extractMenuLegends = (value) => {
  const text = textFromHtml(value);
  const legends = {};
  const conflicts = new Set();
  const pattern =
    /\b(VE|VG|GF|DF|NF|V)\b\s*(?:=|:|-|–|—)\s*([A-Za-z][A-Za-z -]{2,30})/gi;
  for (const match of text.matchAll(pattern)) {
    const id = resolveDietaryLabel(match[2], {});
    const key = normalizedKey(match[1]);
    if (!id || conflicts.has(key)) continue;
    if (legends[key] && legends[key] !== id) {
      delete legends[key];
      conflicts.add(key);
      continue;
    }
    legends[key] = id;
  }
  return legends;
};

const labelForMatch = (match) => match.replace(/\s+/g, " ").trim();

const sourceTypeFor = (sourceType, id, label) => {
  if (/^[A-Z]{1,2}$/.test(label)) return "menu_label";
  if (sourceType === "restaurant_claim" || sourceType === "website_metadata")
    return sourceType;
  if (sourceType === "menu_section") return sourceType;
  if (id === "vegan" || id === "vegetarian") return "menu_description";
  return "menu_description";
};

export const extractDietaryTags = ({
  text,
  sourceType = "menu_description",
  sourceUrl = null,
  legends = {},
  confidence = 1,
} = {}) => {
  const sourceText = textFromHtml(text);
  if (!sourceText) return [];
  const tags = [];
  for (const [pattern, id] of fullLabelPatterns) {
    const regex = new RegExp(
      `\\b${pattern}\\b(?:\\s+(?:options?|menu|friendly))?`,
      "gi",
    );
    for (const match of sourceText.matchAll(regex)) {
      const labelOriginal = labelForMatch(match[0]);
      tags.push({
        id,
        labelOriginal,
        sourceType: sourceTypeFor(sourceType, id, labelOriginal),
        sourceUrl,
        confidence,
      });
    }
  }
  const aliases = sourceText.match(/\b(?:VE|VG|GF|DF|NF|V)\b/g) ?? [];
  for (const alias of aliases) {
    const id = resolveDietaryLabel(alias, legends);
    if (!id) continue;
    tags.push({
      id,
      labelOriginal: alias,
      sourceType: "menu_label",
      sourceUrl,
      confidence,
    });
  }
  return deduplicateTags(tags);
};

export const aggregateDietaryOptions = ({
  itemTags = [],
  pageTags = [],
  sectionTags = [],
} = {}) => {
  const sourcePriority = {
    restaurant_claim: 5,
    menu_section: 4,
    inferred: 3,
    menu_label: 2,
    menu_description: 2,
    website_metadata: 1,
  };
  const strongestById = new Map();
  for (const tag of deduplicateTags([...pageTags, ...sectionTags])) {
    const current = strongestById.get(tag.id);
    if (
      !current ||
      sourcePriority[tag.sourceType] > sourcePriority[current.sourceType] ||
      (sourcePriority[tag.sourceType] === sourcePriority[current.sourceType] &&
        tag.confidence > current.confidence)
    )
      strongestById.set(tag.id, tag);
  }
  const explicit = [...strongestById.values()];
  const output = [...explicit];
  const counts = new Map();
  for (const tags of itemTags) {
    const ids = new Set((Array.isArray(tags) ? tags : []).map((tag) => tag.id));
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    if (count < 2 || output.some((tag) => tag.id === id)) continue;
    const source = itemTags
      .flatMap((tags) => (Array.isArray(tags) ? tags : []))
      .find((tag) => tag.id === id);
    if (!source) continue;
    output.push({
      ...source,
      sourceType: "inferred",
      confidence: 0.65,
    });
  }
  return deduplicateTags(output);
};

export const matchingHtmlBlockForItem = (html, itemName) => {
  const text = textFromHtml(html);
  const name = textFromHtml(itemName);
  if (!name) return "";
  const index = text.toLocaleLowerCase().indexOf(name.toLocaleLowerCase());
  if (index < 0) return "";
  return text.slice(
    Math.max(0, index - 160),
    Math.min(text.length, index + 320),
  );
};

export const dietaryTagsForMenuItem = ({
  item,
  html = "",
  sourceUrl = null,
  legends = {},
  evidenceText = null,
} = {}) => {
  const block =
    evidenceText ?? matchingHtmlBlockForItem(html, item?.nameOriginal);
  const tags = [
    ...extractDietaryTags({
      text: item?.sectionOriginal,
      sourceType: "menu_section",
      sourceUrl,
      legends,
    }),
    ...extractDietaryTags({
      text: item?.descriptionOriginal,
      sourceType: "menu_description",
      sourceUrl,
      legends,
    }),
    ...extractDietaryTags({
      text: `${item?.nameOriginal ?? ""} ${block}`,
      sourceType: "menu_label",
      sourceUrl,
      legends,
    }),
  ];
  return deduplicateTags(tags);
};

const structuredMetadataTexts = (value) => {
  const texts = [];
  const scripts = String(value ?? "").matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      const candidates = roots.flatMap((root) => [
        root,
        ...(Array.isArray(root?.["@graph"]) ? root["@graph"] : []),
      ]);
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        for (const field of ["description", "slogan", "keywords", "about"]) {
          const fieldValue = candidate[field];
          if (typeof fieldValue === "string") texts.push(fieldValue);
          else if (Array.isArray(fieldValue)) {
            texts.push(
              ...fieldValue.filter((item) => typeof item === "string"),
            );
          }
        }
      }
    } catch {
      // Invalid JSON-LD is not trusted as restaurant metadata.
    }
  }
  return texts;
};

const menuItemBlocksPattern =
  /<(article|li|div)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:menu[-_ ]?item|menu[-_ ]?card|food[-_ ]?card|\bitem\b|\bdish\b|\bproduct\b)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi;

export const dietaryTagsForOfficialPage = (
  text,
  sourceUrl,
  { excludeMenuItems = false } = {},
) => {
  const pageSource = excludeMenuItems
    ? String(text ?? "").replace(menuItemBlocksPattern, " ")
    : text;
  return mergeDietaryTags(
    ...textFromHtml(pageSource)
      .split(/\n+/)
      .filter((line) =>
        /\b(?:option|options|menu|choices?|available|offer|serve|speciali[sz]|dietary|catering)\b/i.test(
          line,
        ),
      )
      .map((line) =>
        extractDietaryTags({
          text: line,
          sourceType: "restaurant_claim",
          sourceUrl,
        }),
      ),
    ...[...String(pageSource ?? "").matchAll(/<meta\b[^>]*>/gi)]
      .map((match) => match[0].match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1])
      .filter(Boolean)
      .map((metadataText) =>
        extractDietaryTags({
          text: metadataText,
          sourceType: "website_metadata",
          sourceUrl,
        }),
      ),
    ...structuredMetadataTexts(pageSource).map((metadataText) =>
      extractDietaryTags({
        text: metadataText,
        sourceType: "website_metadata",
        sourceUrl,
      }),
    ),
  );
};

export const dietarySectionTagsForItems = (items, sourceUrl) =>
  mergeDietaryTags(
    ...(Array.isArray(items) ? items : []).map((item) =>
      extractDietaryTags({
        text: item.sectionOriginal,
        sourceType: "menu_section",
        sourceUrl,
      }),
    ),
  );
