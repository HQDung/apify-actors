import { domainOf, normalizeUrl } from "../normalization/index.js";
import {
  DEFAULT_RUNTIME_POLICY,
  isRetryableError,
  retryOperation,
} from "../runtime/reliability.js";

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const trackingParameters = /^(?:utm_[^=]+|fbclid|gclid)$/i;
const menuPathPattern =
  /(?:^|\/)(?:menu|menus|food|our-menu|eat|nutrition|nutritional-information|allergens?)(?:\/|$)/i;
const menuTextPattern =
  /\b(?:menu|menus|food|our food|view menu|food menu|nutrition|nutritional|allergen|eat)\b/i;
const thirdPartyHosts = [
  "deliveroo.",
  "ubereats.",
  "doordash.",
  "toasttab.",
  "squareup.",
  "popmenu.",
  "chownow.",
  "menufy.",
  "grubhub.",
  "justeat.",
  "foodhub.",
  "order.online",
];

const stripTags = (value) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

const headerLocation = (response) =>
  response.headers?.get?.("location") ?? response.headers?.location ?? null;

export const canonicalizeWebsiteUrl = (value) => {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      if (trackingParameters.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
};

export const resolveUrl = (value, baseUrl) => {
  if (typeof value !== "string" || typeof baseUrl !== "string") return null;
  try {
    return canonicalizeWebsiteUrl(new URL(value.trim(), baseUrl).href);
  } catch {
    return null;
  }
};

export const isSameDomain = (left, right) => {
  const leftDomain = domainOf(canonicalizeWebsiteUrl(left));
  const rightDomain = domainOf(canonicalizeWebsiteUrl(right));
  return Boolean(leftDomain && rightDomain && leftDomain === rightDomain);
};

export const isThirdPartyOrderingUrl = (value) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return thirdPartyHosts.some((fragment) => host.includes(fragment));
  } catch {
    return false;
  }
};

export const classifyMenuFormat = (value) => {
  if (isThirdPartyOrderingUrl(value)) return "third_party_ordering";
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    if (/\.(?:pdf)(?:$|\/)/.test(pathname)) return "pdf";
    if (/\.(?:png|jpe?g|gif|webp|svg)(?:$|\/)/.test(pathname)) return "image";
    if (
      /\.(?:html?|php)(?:$|\/)/.test(pathname) ||
      !/\.[a-z\d]+$/i.test(pathname)
    )
      return "html";
    return "unknown";
  } catch {
    return "unknown";
  }
};

export const scoreMenuCandidate = (candidate) => {
  const { homepageUrl, url } = candidate;
  const text = candidate.text ?? "";
  const source = candidate.source ?? "homepage";
  const format = candidate.format ?? classifyMenuFormat(url);
  let score = 0;
  if (isSameDomain(url, homepageUrl)) score += 40;
  if (isThirdPartyOrderingUrl(url)) score -= 45;
  if (menuTextPattern.test(text)) score += 30;
  if (menuPathPattern.test(new URL(url).pathname)) score += 25;
  if (source === "navigation") score += 18;
  if (source === "footer") score += 12;
  if (source === "structured_metadata") score += 15;
  if (source === "common_path") score += 10;
  if (format === "html") score += 5;
  if (format === "pdf") score -= 5;
  if (format === "image") score -= 10;
  return score;
};

const extractAnchors = (html, homepageUrl, source) => {
  const anchors = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const text = stripTags(match[2]);
    if (!menuTextPattern.test(`${text} ${match[1]}`)) continue;
    const url = resolveUrl(match[1], homepageUrl);
    if (!url) continue;
    anchors.push({
      url,
      text,
      source,
      homepageUrl,
      format: classifyMenuFormat(url),
    });
  }
  return anchors;
};

const extractStructuredLinks = (html, homepageUrl) => {
  const candidates = [];
  const scriptPattern =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const visit = (value) => {
    if (typeof value === "string") {
      if (menuPathPattern.test(value) || menuTextPattern.test(value)) {
        const url = resolveUrl(value, homepageUrl);
        if (url)
          candidates.push({
            url,
            text: "structured menu",
            source: "structured_metadata",
            homepageUrl,
            format: classifyMenuFormat(url),
          });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object")
      Object.entries(value).forEach(([key, entry]) => {
        if (/^(?:menu|menuurl|menu_url)$/i.test(key)) visit(entry);
        else if (typeof entry === "object") visit(entry);
      });
  };
  for (const match of html.matchAll(scriptPattern)) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      // Invalid JSON-LD is ignored; visible HTML links remain usable.
    }
  }
  const canonicalPattern =
    /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i;
  const canonical = html.match(canonicalPattern)?.[1];
  const canonicalUrl = resolveUrl(canonical, homepageUrl);
  const canonicalPath = (() => {
    if (!canonicalUrl) return null;
    try {
      return new URL(canonicalUrl).pathname;
    } catch {
      return null;
    }
  })();
  const canonicalIsMenu =
    canonicalUrl &&
    canonicalizeWebsiteUrl(canonicalUrl) !==
      canonicalizeWebsiteUrl(homepageUrl) &&
    (menuTextPattern.test(canonicalUrl) ||
      menuPathPattern.test(canonicalPath ?? ""));
  if (canonicalIsMenu)
    candidates.push({
      url: canonicalUrl,
      text: "canonical",
      source: "structured_metadata",
      homepageUrl,
      format: classifyMenuFormat(canonicalUrl),
    });
  return candidates;
};

export function deduplicateMenuCandidates(candidates) {
  const byUrl = new Map();
  for (const candidate of candidates) {
    const url = canonicalizeWebsiteUrl(candidate.url);
    if (!url) continue;
    const existing = byUrl.get(url);
    if (!existing) {
      byUrl.set(url, {
        ...candidate,
        url,
        sources: [...new Set([candidate.source].filter(Boolean))],
      });
      continue;
    }
    existing.sources = [
      ...new Set([...existing.sources, candidate.source].filter(Boolean)),
    ];
    existing.score = Math.max(existing.score ?? 0, candidate.score ?? 0);
    if ((candidate.text ?? "").length > (existing.text ?? "").length)
      existing.text = candidate.text;
  }
  return [...byUrl.values()].sort((left, right) => right.score - left.score);
}

export const discoverMenuCandidatesFromHtml = (html, homepageUrl) => {
  const candidates = [
    ...extractAnchors(
      html.match(/<nav\b[\s\S]*?<\/nav>/gi)?.join(" ") ?? "",
      homepageUrl,
      "navigation",
    ),
    ...extractAnchors(
      html.match(/<footer\b[\s\S]*?<\/footer>/gi)?.join(" ") ?? "",
      homepageUrl,
      "footer",
    ),
    ...extractAnchors(html, homepageUrl, "homepage"),
    ...extractStructuredLinks(html, homepageUrl),
  ];
  const hasOfficialMenuSignal = candidates.some(
    (candidate) =>
      isSameDomain(candidate.url, homepageUrl) &&
      (menuTextPattern.test(candidate.text ?? "") ||
        menuPathPattern.test(new URL(candidate.url).pathname)),
  );
  if (hasOfficialMenuSignal) {
    const { origin } = new URL(homepageUrl);
    for (const path of [
      "/menu",
      "/menus",
      "/food",
      "/our-menu",
      "/eat",
      "/nutrition",
      "/nutritional-information",
      "/allergens",
    ]) {
      const url = resolveUrl(path, origin);
      candidates.push({
        url,
        text: path.slice(1),
        source: "common_path",
        homepageUrl,
        format: classifyMenuFormat(url),
      });
    }
  }
  return deduplicateMenuCandidates(
    candidates.map((candidate) => ({
      ...candidate,
      score: scoreMenuCandidate(candidate),
    })),
  );
};

export const fetchWithRedirects = async (
  startUrl,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_RUNTIME_POLICY.timeoutMs,
    maxRedirects = DEFAULT_RUNTIME_POLICY.maxRedirects,
    maxAttempts = DEFAULT_RUNTIME_POLICY.maxAttempts,
    retryBaseDelayMs = DEFAULT_RUNTIME_POLICY.retryBaseDelayMs,
  } = {},
) => {
  let currentUrl = canonicalizeWebsiteUrl(startUrl);
  if (!currentUrl) throw new Error("Invalid website URL.");
  const redirectChain = [currentUrl];
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const requestUrl = currentUrl;
    const response = await retryOperation(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const nextResponse = await fetchImpl(requestUrl, {
            redirect: "manual",
            signal: controller.signal,
            headers: { accept: "text/html,application/xhtml+xml" },
          });
          if (isRetryableError({ status: nextResponse.status })) {
            const error = new Error(
              `Transient website response HTTP ${nextResponse.status}.`,
            );
            error.status = nextResponse.status;
            throw error;
          }
          return nextResponse;
        } finally {
          clearTimeout(timer);
        }
      },
      { maxAttempts, baseDelayMs: retryBaseDelayMs },
    );
    if (!redirectStatuses.has(response.status))
      return { response, finalUrl: currentUrl, redirectChain };
    if (redirectCount === maxRedirects)
      throw new Error("Website redirect limit exceeded.");
    const location = headerLocation(response);
    const nextUrl = resolveUrl(location, currentUrl);
    if (!nextUrl) throw new Error("Website redirect target is invalid.");
    currentUrl = nextUrl;
    redirectChain.push(currentUrl);
  }
  throw new Error("Website redirect limit exceeded.");
};

export const readResponseTextWithTimeout = async (
  response,
  timeoutMs,
  maxResponseChars = DEFAULT_RUNTIME_POLICY.maxResponseChars,
) => {
  let timer;
  try {
    const text = await Promise.race([
      response.text(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Website response body timeout.")),
          timeoutMs,
        );
      }),
    ]);
    if (text.length > maxResponseChars)
      throw new Error("Website response body exceeds the configured limit.");
    return text;
  } finally {
    clearTimeout(timer);
  }
};
