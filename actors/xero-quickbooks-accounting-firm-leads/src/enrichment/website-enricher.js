import { isIP } from "node:net";

import { createSourceDiagnostic } from "../logging/source-diagnostics.js";
import {
  classifyEmail,
  normalizeEmail,
  normalizePhone,
} from "../normalization/contact.js";
import { canonicalizeUrl, domainFromUrl } from "../normalization/url.js";
import {
  isRetryableError,
  retryOperation,
  withTimeout,
} from "../reliability/retry.js";
import { mapIndustries, mapServices } from "../taxonomy/taxonomies.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_PAGES = 3;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DOMAIN_TIMEOUT_MS = 30_000;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const candidatePathPattern = /(?:contact|about|team|people|staff)/iu;
const socialPatterns = {
  linkedin: /linkedin\.com/iu,
  facebook: /facebook\.com/iu,
  instagram: /instagram\.com/iu,
  x: /(?:twitter\.com|x\.com)/iu,
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const safeCodePoint = (value) =>
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 0x10ffff &&
  !(value >= 0xd800 && value <= 0xdfff)
    ? String.fromCodePoint(value)
    : " ";

const decodeEntities = (value) =>
  String(value ?? "")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&#x([\da-f]+);/giu, (_, code) =>
      safeCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/gu, (_, code) =>
      safeCodePoint(Number.parseInt(code, 10)),
    );

const textFromHtml = (html) =>
  decodeEntities(
    String(html ?? "")
      .replace(/<!--(?:.|\n|\r)*?-->/gu, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/giu, " ")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/\s+/gu, " ")
    .trim();

const attributeFrom = (tag, name) => {
  const match = String(tag).match(
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "iu"),
  );
  return match ? decodeEntities(match[1]) : null;
};

const canonicalPublicUrl = (value) => {
  const canonical = canonicalizeUrl(value);
  if (!canonical) return null;
  try {
    const url = new URL(canonical);
    const hostname = url.hostname.toLocaleLowerCase();
    const ipHostname = hostname.replace(/^\[|\]$/gu, "");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      isIP(ipHostname) ||
      /^127\.|^10\.|^192\.168\.|^169\.254\./u.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./u.test(hostname)
    ) {
      return null;
    }
    return canonical;
  } catch {
    return null;
  }
};

const responseHeader = (response, name) => {
  if (typeof response?.headers?.get === "function")
    return response.headers.get(name);
  return (
    response?.headers?.[name] ?? response?.headers?.[name.toLowerCase()] ?? null
  );
};

const responseStatus = (response) =>
  typeof response?.status === "function" ? response.status() : response?.status;

const responseBody = async (response) => {
  if (typeof response?.text === "function") return response.text();
  return String(response?.body ?? "");
};

const errorForResponse = (response) => {
  const status = Number(responseStatus(response)) || 0;
  const error = new Error(
    status
      ? `Website request failed with HTTP ${status}.`
      : "Website request failed.",
  );
  if (status) error.status = status;
  return error;
};

const extractAnchors = (html) => {
  const anchors = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/giu;
  for (const match of String(html ?? "").matchAll(pattern)) {
    const href = attributeFrom(match[1], "href");
    if (!href) continue;
    anchors.push({ href, text: textFromHtml(match[2]) });
  }
  return anchors;
};

const extractDescription = (html) => {
  const tags = String(html ?? "").match(/<meta\b[^>]*>/giu) ?? [];
  for (const tag of tags) {
    const name = attributeFrom(tag, "name") ?? attributeFrom(tag, "property");
    if (!/^description$/iu.test(name ?? "")) continue;
    const content = attributeFrom(tag, "content")?.trim();
    if (content) return content.slice(0, MAX_DESCRIPTION_LENGTH);
  }
  const paragraphs =
    String(html ?? "").match(/<p\b[^>]*>[\s\S]*?<\/p>/giu) ?? [];
  const paragraph = paragraphs
    .map((value) => textFromHtml(value))
    .find((value) => value.length >= 20);
  return paragraph?.slice(0, MAX_DESCRIPTION_LENGTH) ?? null;
};

const extractEmails = (html, pageUrl) => {
  const emails = [];
  const contacts = [];
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
  for (const raw of textFromHtml(html).match(emailPattern) ?? []) {
    const email = normalizeEmail(raw);
    if (email && !emails.some((item) => item.email === email)) {
      emails.push({
        email,
        type: classifyEmail(email),
        source: "website",
        sourceUrl: pageUrl,
      });
    }
  }
  for (const anchor of extractAnchors(html)) {
    const match = anchor.href.match(/^mailto:([^?]+)/iu);
    if (!match) continue;
    const email = normalizeEmail(match[1]);
    if (email && !emails.some((item) => item.email === email)) {
      emails.push({
        email,
        type: classifyEmail(email),
        source: "website",
        sourceUrl: pageUrl,
      });
    }
    const name = anchor.text.replace(/\s+/gu, " ").trim();
    if (
      !email ||
      !name ||
      name.includes("@") ||
      name.length > 80 ||
      !/^[\p{L}][\p{L} .'-]{1,78}$/u.test(name)
    )
      continue;
    contacts.push({
      name,
      role: null,
      email,
      phone: null,
      profileUrl: pageUrl,
      source: "website",
    });
  }
  return { emails, contacts };
};

const extractPhones = (html) => {
  const phones = [];
  const pattern = /(?:\+?\d[\d\s().-]{6,}\d)/gu;
  for (const raw of textFromHtml(html).match(pattern) ?? []) {
    const digits = raw.replace(/\D/gu, "");
    if (/^\d{4}[-/.]\d{1,4}(?:[-/.]\d{1,4})?$/u.test(raw.trim())) continue;
    if (digits.length < 9 && !/[+().-]/u.test(raw)) continue;
    const phone = normalizePhone(raw);
    if (phone && !phones.includes(phone)) phones.push(phone);
  }
  return phones;
};

const extractSocialLinks = (html) => {
  const socialLinks = {};
  for (const anchor of extractAnchors(html)) {
    const url = canonicalPublicUrl(anchor.href);
    if (!url) continue;
    for (const [key, pattern] of Object.entries(socialPatterns)) {
      if (!socialLinks[key] && pattern.test(url)) socialLinks[key] = url;
    }
  }
  return socialLinks;
};

const linksForCandidatePages = (html, homepageUrl) => {
  const homepageDomain = domainFromUrl(homepageUrl);
  const candidates = [];
  for (const anchor of extractAnchors(html)) {
    let url;
    try {
      url = canonicalPublicUrl(new URL(anchor.href, homepageUrl).href);
    } catch {
      continue;
    }
    if (!url || url === homepageUrl || domainFromUrl(url) !== homepageDomain)
      continue;
    if (!candidatePathPattern.test(new URL(url).pathname)) continue;
    if (!candidates.includes(url)) candidates.push(url);
  }
  return candidates;
};

const mergePageData = (aggregate, page) => {
  const emails = [
    ...aggregate.emails,
    ...page.emails.filter(
      (item) =>
        !aggregate.emails.some((existing) => existing.email === item.email),
    ),
  ];
  const contacts = [
    ...aggregate.contacts,
    ...page.contacts.filter(
      (item) =>
        !aggregate.contacts.some(
          (existing) =>
            `${existing.name}:${existing.email ?? ""}` ===
            `${item.name}:${item.email ?? ""}`,
        ),
    ),
  ];
  return {
    ...aggregate,
    pages: [...aggregate.pages, page.url],
    emails,
    phoneNumbers: unique([...aggregate.phoneNumbers, ...page.phoneNumbers]),
    services: unique([...aggregate.services, ...page.services]),
    industriesServed: unique([
      ...aggregate.industriesServed,
      ...page.industriesServed,
    ]),
    contacts,
    socialLinks: { ...aggregate.socialLinks, ...page.socialLinks },
    description: aggregate.description ?? page.description,
  };
};

const applyPageData = (record, data) => {
  const emails = [
    ...(record.emails ?? []),
    ...data.emails.filter(
      (item) =>
        !record.emails?.some((existing) => existing.email === item.email),
    ),
  ];
  const contacts = [
    ...(record.contacts ?? []),
    ...data.contacts.filter(
      (item) =>
        !record.contacts?.some(
          (existing) =>
            `${existing.name}:${existing.email ?? ""}` ===
            `${item.name}:${item.email ?? ""}`,
        ),
    ),
  ];
  const locationQuery = record.sourceRecords?.find(
    (item) => item.locationQuery,
  )?.locationQuery;
  const sourceRecords = [...(record.sourceRecords ?? [])];
  const existingRecords = new Set(
    (record.sourceRecords ?? []).map(
      (item) => `${item.source}:${item.profileUrl}:${item.locationQuery ?? ""}`,
    ),
  );
  for (const pageUrl of data.pages) {
    const key = `website:${pageUrl}:${locationQuery ?? ""}`;
    if (existingRecords.has(key)) continue;
    sourceRecords.push({
      source: "website",
      profileUrl: pageUrl,
      locationQuery: locationQuery ?? null,
    });
    existingRecords.add(key);
  }
  return {
    ...record,
    sourcePlatforms: unique([...(record.sourcePlatforms ?? []), "website"]),
    emails,
    phoneNumbers: unique([
      ...(record.phoneNumbers ?? []),
      ...data.phoneNumbers,
    ]),
    services: unique([...(record.services ?? []), ...data.services]),
    industriesServed: unique([
      ...(record.industriesServed ?? []),
      ...data.industriesServed,
    ]),
    contacts,
    socialLinks: { ...(record.socialLinks ?? {}), ...data.socialLinks },
    descriptionOriginal: record.descriptionOriginal ?? data.description,
    sourceRecords,
  };
};

export const createWebsiteEnricher = ({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  domainTimeoutMs = DEFAULT_DOMAIN_TIMEOUT_MS,
  maxPagesPerDomain = DEFAULT_MAX_PAGES,
  concurrency = DEFAULT_CONCURRENCY,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = 250,
  onDiagnostic = () => {},
} = {}) => {
  if (typeof fetchImpl !== "function")
    throw new TypeError(
      "A fetch implementation is required for website enrichment.",
    );
  const metrics = {
    attempts: 0,
    successes: 0,
    failures: 0,
    pagesFetched: 0,
    contactsFound: 0,
    emailsFound: 0,
    phonesFound: 0,
    servicesFound: 0,
    industriesFound: 0,
    domainTimeouts: 0,
    retryAttempts: 0,
  };

  const fetchResponse = async (initialUrl, signal) => {
    let currentUrl = initialUrl;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await fetchImpl(currentUrl, {
        redirect: "manual",
        signal,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "user-agent": "accounting-firm-leads/website-enrichment",
        },
      });
      const status = Number(responseStatus(response)) || 0;
      if (![301, 302, 303, 307, 308].includes(status))
        return { response, url: currentUrl };
      if (redirect === MAX_REDIRECTS)
        throw new Error("Website redirect limit exceeded.");
      const location = responseHeader(response, "location");
      let redirectedUrl;
      try {
        redirectedUrl = canonicalPublicUrl(new URL(location, currentUrl).href);
      } catch {
        redirectedUrl = null;
      }
      if (
        !redirectedUrl ||
        domainFromUrl(redirectedUrl) !== domainFromUrl(initialUrl)
      ) {
        throw new Error("Website redirect leaves the canonical public domain.");
      }
      currentUrl = redirectedUrl;
    }
    throw new Error("Website redirect limit exceeded.");
  };

  const fetchHtml = async (url, location, deadline) => {
    let lastStatus = null;
    let lastContentType = null;
    try {
      const page = await retryOperation(
        async () => {
          const remainingMs = deadline
            ? Math.max(1, deadline - Date.now())
            : timeoutMs;
          const controller = new AbortController();
          let result;
          try {
            result = await withTimeout(
              async () => {
                const { response, url: responseUrl } = await fetchResponse(
                  url,
                  controller.signal,
                );
                lastStatus = Number(responseStatus(response)) || null;
                lastContentType = responseHeader(response, "content-type");
                if (!response?.ok && lastStatus !== 200)
                  throw errorForResponse(response);
                const body = await responseBody(response);
                if (Buffer.byteLength(body) > MAX_HTML_BYTES) {
                  throw new Error(
                    "Website response exceeds the 2MB HTML limit.",
                  );
                }
                return { body, response, url: responseUrl };
              },
              Math.min(timeoutMs, remainingMs),
            );
          } catch (error) {
            controller.abort();
            throw error;
          }
          const contentType =
            responseHeader(result.response, "content-type") ?? "";
          if (!/text\/html|application\/xhtml\+xml/iu.test(contentType)) {
            const error = new Error("Website response is not HTML.");
            error.status = lastStatus;
            throw error;
          }
          return result;
        },
        {
          attempts,
          delayMs,
          shouldRetry: (error) =>
            Date.now() < (deadline ?? Number.POSITIVE_INFINITY) &&
            isRetryableError(error),
          onRetry: async () => {
            metrics.retryAttempts += 1;
          },
        },
      );
      onDiagnostic(
        createSourceDiagnostic({
          source: "website",
          location,
          stage: "page",
          requestedUrl: url,
          status: lastStatus,
          contentType: lastContentType,
          responseSize: Buffer.byteLength(page.body),
        }),
      );
      return { url: page.url, html: page.body };
    } catch (error) {
      onDiagnostic(
        createSourceDiagnostic({
          source: "website",
          location,
          stage: "page",
          requestedUrl: url,
          status: lastStatus,
          contentType: lastContentType,
          error,
        }),
      );
      return null;
    }
  };

  const enrichDomain = async ({ domain, records }) => {
    metrics.attempts += 1;
    const homepageUrl = canonicalPublicUrl(records[0]?.website);
    const location =
      records[0]?.sourceRecords?.find((item) => item.locationQuery)
        ?.locationQuery ?? null;
    let aggregate = {
      pages: [],
      emails: [],
      phoneNumbers: [],
      services: [],
      industriesServed: [],
      contacts: [],
      socialLinks: {},
      description: null,
    };
    if (!homepageUrl || domainFromUrl(homepageUrl) !== domain) {
      metrics.failures += 1;
      return { aggregate, records };
    }
    const queue = [homepageUrl];
    const visited = new Set();
    const deadline = Date.now() + domainTimeoutMs;
    while (queue.length && aggregate.pages.length < maxPagesPerDomain) {
      if (Date.now() >= deadline) {
        metrics.domainTimeouts += 1;
        break;
      }
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      const page = await fetchHtml(url, location, deadline);
      if (!page) continue;
      try {
        const emailData = extractEmails(page.html, page.url);
        aggregate = mergePageData(aggregate, {
          url: page.url,
          ...emailData,
          phoneNumbers: extractPhones(page.html),
          services: mapServices([textFromHtml(page.html)]),
          industriesServed: mapIndustries([textFromHtml(page.html)]),
          socialLinks: extractSocialLinks(page.html),
          description: extractDescription(page.html),
        });
      } catch (error) {
        aggregate = {
          ...aggregate,
          pages: [...aggregate.pages, page.url],
        };
        onDiagnostic(
          createSourceDiagnostic({
            source: "website",
            location,
            stage: "parse",
            requestedUrl: page.url,
            error,
          }),
        );
      }
      if (url === homepageUrl) {
        for (const candidate of linksForCandidatePages(
          page.html,
          homepageUrl,
        )) {
          if (!visited.has(candidate) && !queue.includes(candidate))
            queue.push(candidate);
        }
      }
    }
    metrics.pagesFetched += aggregate.pages.length;
    metrics.emailsFound += aggregate.emails.length;
    metrics.phonesFound += aggregate.phoneNumbers.length;
    metrics.servicesFound += aggregate.services.length;
    metrics.industriesFound += aggregate.industriesServed.length;
    metrics.contactsFound += aggregate.contacts.length;
    if (aggregate.pages.length) metrics.successes += 1;
    else metrics.failures += 1;
    return {
      aggregate,
      records: records.map((record) => applyPageData(record, aggregate)),
    };
  };

  return {
    async enrich(records = []) {
      const groups = new Map();
      for (const record of records) {
        const domain = domainFromUrl(record?.website) ?? record?.domain;
        const homepageUrl = canonicalPublicUrl(record?.website);
        if (!domain || !homepageUrl) continue;
        if (!groups.has(domain)) groups.set(domain, []);
        groups.get(domain).push(record);
      }
      const entries = [...groups.entries()];
      const replacements = new Map();
      let cursor = 0;
      const worker = async () => {
        while (cursor < entries.length) {
          const index = cursor;
          cursor += 1;
          const [domain, domainRecords] = entries[index];
          const result = await enrichDomain({ domain, records: domainRecords });
          domainRecords.forEach((record, recordIndex) =>
            replacements.set(record, result.records[recordIndex]),
          );
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(Math.max(1, concurrency), entries.length || 1) },
          worker,
        ),
      );
      return records.map((record) => replacements.get(record) ?? record);
    },
    getMetrics: () => ({ ...metrics }),
  };
};
