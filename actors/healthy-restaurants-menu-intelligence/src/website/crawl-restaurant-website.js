import {
  canonicalizeWebsiteUrl,
  classifyMenuFormat,
  discoverMenuCandidatesFromHtml,
  fetchWithRedirects,
  isSameDomain,
} from "./menu-discovery.js";

const contentTypeFor = (response) =>
  response.headers?.get?.("content-type")?.toLowerCase() ?? "";

const formatForResponse = (url, contentType) => {
  if (/pdf/.test(contentType)) return "pdf";
  if (/image\//.test(contentType)) return "image";
  return classifyMenuFormat(url);
};

const readResponseTextWithTimeout = async (response, timeoutMs) => {
  let timer;
  try {
    return await Promise.race([
      response.text(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Website response body timeout.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

export const emptyMenu = (status, sourceUrl = null, menuCandidates = []) => ({
  status,
  sourceUrl,
  menuUrls: menuCandidates.map((candidate) => candidate.url),
  menuCandidates,
  itemsFound: 0,
  items: [],
});

export const crawlRestaurantWebsite = async ({
  website,
  maximumMenuPages = 3,
  timeoutMs = 30_000,
  maxRedirects = 3,
  fetchImpl = globalThis.fetch,
}) => {
  const requestedUrl = canonicalizeWebsiteUrl(website);
  if (!requestedUrl)
    return {
      requestedUrl: null,
      finalUrl: null,
      redirectChain: [],
      pagesCrawled: 0,
      status: "website_missing",
      menu: emptyMenu("website_missing"),
      warnings: [],
      errors: [],
    };

  try {
    const result = await fetchWithRedirects(requestedUrl, {
      fetchImpl,
      timeoutMs,
      maxRedirects,
    });
    const finalUrl = canonicalizeWebsiteUrl(result.finalUrl) ?? requestedUrl;
    const contentType = contentTypeFor(result.response);
    if (result.response.status < 200 || result.response.status >= 400)
      throw new Error(`Website returned HTTP ${result.response.status}.`);

    const responseFormat = formatForResponse(finalUrl, contentType);
    if (responseFormat !== "html") {
      const candidate = {
        url: finalUrl,
        sourceUrl: finalUrl,
        format: responseFormat,
        score: 0,
        sameDomain: true,
        sources: ["homepage"],
      };
      return {
        requestedUrl,
        finalUrl,
        redirectChain: result.redirectChain,
        pagesCrawled: 1,
        status: "unsupported_format",
        menu: emptyMenu("unsupported_format", finalUrl, [candidate]),
        warnings: [
          {
            code: "MENU_UNSUPPORTED_FORMAT",
            message: `The restaurant website returned an unsupported ${responseFormat} format.`,
            sourceUrl: finalUrl,
          },
        ],
        errors: [],
      };
    }

    const html = await readResponseTextWithTimeout(result.response, timeoutMs);
    const candidates = discoverMenuCandidatesFromHtml(html, finalUrl)
      .map((candidate) => ({
        url: candidate.url,
        sourceUrl: finalUrl,
        format: candidate.format,
        score: candidate.score,
        sameDomain: isSameDomain(candidate.url, finalUrl),
        sources: candidate.sources ?? [candidate.source],
      }))
      .sort((left, right) => {
        if (left.sameDomain !== right.sameDomain)
          return left.sameDomain ? -1 : 1;
        return right.score - left.score;
      })
      .slice(0, maximumMenuPages);
    const hasSupportedCandidate = candidates.some(
      (candidate) => !["pdf", "image"].includes(candidate.format),
    );
    let status = "menu_not_found";
    let warnings = [];
    if (candidates.length && hasSupportedCandidate) status = "menu_found";
    else if (candidates.length) {
      status = "unsupported_format";
      warnings = [
        {
          code: "MENU_UNSUPPORTED_FORMAT",
          message: "Only unsupported menu formats were discovered.",
          sourceUrl: candidates[0]?.url ?? finalUrl,
        },
      ];
    } else {
      warnings = [
        {
          code: "MENU_NOT_FOUND",
          message: "No likely menu link was found on the official homepage.",
          sourceUrl: finalUrl,
        },
      ];
    }
    return {
      requestedUrl,
      finalUrl,
      redirectChain: result.redirectChain,
      pagesCrawled: 1,
      status: "enriched",
      menu: emptyMenu(status, finalUrl, candidates),
      warnings,
      errors: [],
    };
  } catch (error) {
    return {
      requestedUrl,
      finalUrl: null,
      redirectChain: [],
      pagesCrawled: 0,
      status: "website_unreachable",
      menu: emptyMenu("website_unreachable"),
      warnings: [],
      errors: [
        {
          code: "WEBSITE_UNREACHABLE",
          message: error instanceof Error ? error.message : String(error),
          sourceUrl: requestedUrl,
        },
      ],
    };
  }
};
