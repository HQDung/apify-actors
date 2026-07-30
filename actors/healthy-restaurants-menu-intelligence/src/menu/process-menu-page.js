import {
  dietarySectionTagsForItems,
  dietaryTagsForMenuItem,
  dietaryTagsForOfficialPage,
  extractMenuLegends,
  matchingHtmlBlockForItem,
} from "../dietary/extraction.js";
import { parsePublishedNutritionText } from "../nutrition/parsing.js";
import {
  DEFAULT_RUNTIME_POLICY,
  statusFromError,
} from "../runtime/reliability.js";
import {
  canonicalizeWebsiteUrl,
  classifyMenuFormat,
  fetchWithRedirects,
  readResponseTextWithTimeout,
} from "../website/menu-discovery.js";
import { extractMenuItemsFromHtml } from "./extraction.js";

const contentTypeFor = (response) =>
  response.headers?.get?.("content-type")?.toLowerCase() ?? "";

const responseFormat = (url, contentType) => {
  if (/pdf/.test(contentType)) return "pdf";
  if (/image\//.test(contentType)) return "image";
  return classifyMenuFormat(url);
};

export const selectHtmlMenuCandidates = (candidates, maximumPages) =>
  (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate?.format === "html")
    .slice(0, maximumPages);

export const processMenuPage = async ({
  candidate,
  maxItems = 200,
  timeoutMs = DEFAULT_RUNTIME_POLICY.timeoutMs,
  maxRedirects = DEFAULT_RUNTIME_POLICY.maxRedirects,
  maxAttempts = DEFAULT_RUNTIME_POLICY.maxAttempts,
  retryBaseDelayMs = DEFAULT_RUNTIME_POLICY.retryBaseDelayMs,
  maxResponseChars = DEFAULT_RUNTIME_POLICY.maxResponseChars,
  defaultCurrency = null,
  fetchImpl = globalThis.fetch,
}) => {
  const requestedUrl = canonicalizeWebsiteUrl(candidate?.url);
  if (!requestedUrl || candidate?.format !== "html")
    return {
      requestedUrl,
      finalUrl: requestedUrl,
      status: "unsupported_format",
      items: [],
      rawItemsFound: 0,
      extractionMethods: [],
      dietaryTags: [],
      sectionDietaryTags: [],
      menuSections: [],
      warnings: [],
      errors: [],
    };

  try {
    const result = await fetchWithRedirects(requestedUrl, {
      fetchImpl,
      timeoutMs,
      maxRedirects,
      maxAttempts,
      retryBaseDelayMs,
    });
    const finalUrl = canonicalizeWebsiteUrl(result.finalUrl) ?? requestedUrl;
    if (result.response.status < 200 || result.response.status >= 400) {
      const error = new Error(
        `Menu page returned HTTP ${result.response.status}.`,
      );
      error.status = result.response.status;
      throw error;
    }
    const format = responseFormat(finalUrl, contentTypeFor(result.response));
    if (format !== "html")
      return {
        requestedUrl,
        finalUrl,
        status: "unsupported_format",
        items: [],
        rawItemsFound: 0,
        extractionMethods: [],
        warnings: [],
        errors: [],
      };
    const html = await readResponseTextWithTimeout(
      result.response,
      timeoutMs,
      maxResponseChars,
    );
    const extracted = extractMenuItemsFromHtml(html, finalUrl, {
      maxItems,
      defaultCurrency,
    });
    const legends = extractMenuLegends(html);
    const items = extracted.items.map((item) => {
      const { sourceEvidenceText, ...publicItem } = item;
      const evidenceText =
        sourceEvidenceText ?? matchingHtmlBlockForItem(html, item.nameOriginal);
      return {
        ...publicItem,
        dietaryTags: dietaryTagsForMenuItem({
          item: publicItem,
          html,
          sourceUrl: finalUrl,
          legends,
          evidenceText,
        }),
        publishedNutrition: parsePublishedNutritionText(evidenceText, finalUrl),
      };
    });
    return {
      requestedUrl,
      finalUrl,
      status: extracted.items.length ? "extracted" : "extracted_empty",
      ...extracted,
      items,
      dietaryTags: dietaryTagsForOfficialPage(html, finalUrl, {
        excludeMenuItems: true,
      }),
      sectionDietaryTags: dietarySectionTagsForItems(items, finalUrl),
      menuSections: [
        ...new Set(items.map((item) => item.sectionOriginal).filter(Boolean)),
      ],
      warnings: [],
      errors: [],
    };
  } catch (error) {
    return {
      requestedUrl,
      finalUrl: null,
      status: "extraction_failed",
      items: [],
      rawItemsFound: 0,
      extractionMethods: [],
      warnings: [],
      errors: [
        {
          code:
            statusFromError(error) === 404
              ? "MENU_NOT_FOUND"
              : "MENU_EXTRACTION_FAILED",
          message: error instanceof Error ? error.message : String(error),
          sourceUrl: requestedUrl,
        },
      ],
    };
  }
};
