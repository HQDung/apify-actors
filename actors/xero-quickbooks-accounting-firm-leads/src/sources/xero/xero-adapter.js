import { resolveLocation } from "../../location/locale-resolver.js";
import { createSourceDiagnostic } from "../../logging/source-diagnostics.js";
import { normalizeXeroProfile, parseXeroSearchHtml } from "./xero-parser.js";

const responseSizeFrom = (headers) => {
  const value = Number(headers?.["content-length"]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

export const createXeroAdapter = ({
  browser,
  createContext,
  fetchImpl = fetch,
  onDiagnostic = () => {},
} = {}) => {
  let context;
  let page;

  const getPage = async () => {
    if (!browser || !createContext) {
      throw new Error("Xero profile browser is unavailable.");
    }
    if (!context) context = await createContext(browser);
    if (!page) page = await context.newPage();
    page.setDefaultTimeout(30_000);
    return page;
  };

  return {
    source: "xero",
    search: async ({ location, limit }) => {
      const requestedUrl = resolveLocation(location).xeroSearchUrl;
      if (!requestedUrl) {
        throw new Error(`No supported Xero route for ${location}.`);
      }

      let response;
      let responseSize = null;
      try {
        response = await fetchImpl(requestedUrl, {
          headers: { accept: "text/html,application/xhtml+xml" },
          redirect: "follow",
        });
        const html = await response.text();
        responseSize = Buffer.byteLength(html);
        if (!response.ok) {
          throw new Error(`Xero search returned HTTP ${response.status}.`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType?.toLocaleLowerCase().includes("text/html")) {
          throw new Error("Xero search returned an unexpected content type.");
        }
        const items = parseXeroSearchHtml(html, limit);
        onDiagnostic(
          createSourceDiagnostic({
            source: "xero",
            location,
            stage: "search",
            requestedUrl,
            status: response.status,
            contentType,
            responseSize,
            parsedItems: items.length,
          }),
        );
        return items;
      } catch (error) {
        onDiagnostic(
          createSourceDiagnostic({
            source: "xero",
            location,
            stage: "search",
            requestedUrl,
            status: response?.status ?? null,
            contentType: response?.headers.get("content-type") ?? null,
            responseSize,
            error,
          }),
        );
        throw error;
      }
    },
    fetchProfile: async (item, { location } = {}) => {
      const activePage = await getPage();
      let response;
      try {
        response = await activePage.goto(item.profileUrl, {
          waitUntil: "domcontentloaded",
        });
        const heading = activePage.locator("main h1");
        await heading.waitFor({ state: "visible" });
        const profile = await activePage.evaluate(
          ({ fallbackName }) => {
            const main = document.querySelector("main");
            if (!main) return null;
            const clean = (value) =>
              value?.replace(/\s+/gu, " ").trim() || null;
            const sectionFor = (name) => {
              const title = [...main.querySelectorAll("h2")].find(
                (node) => clean(node.textContent) === name,
              );
              return title?.closest("section") ?? title?.parentElement ?? null;
            };
            const headingsFrom = (name) =>
              [...(sectionFor(name)?.querySelectorAll("h3") ?? [])]
                .map((node) => clean(node.textContent))
                .filter(Boolean);
            const h1 = main.querySelector("h1");
            const firmName = clean(h1?.textContent) ?? fallbackName;
            const header = h1?.closest("section") ?? h1?.parentElement;
            const address = clean(header?.querySelector("p")?.textContent);
            const aboutSection = sectionFor("About us");
            const description = clean(
              aboutSection?.querySelector("p")?.textContent,
            );
            const industriesSection = sectionFor("Industries");
            const industries = [
              ...(industriesSection?.querySelectorAll(
                "li, [class*='Tag__Element'], [data-testid*='tag']",
              ) ?? []),
            ]
              .map((node) => clean(node.textContent))
              .filter((value) => value && !/^show\b/iu.test(value));
            const socialUrl = (name) =>
              [...main.querySelectorAll("a[href]")].find((link) =>
                clean(link.textContent)?.toLocaleLowerCase().startsWith(name),
              )?.href ?? null;

            return {
              id: window.location.pathname.split("/").filter(Boolean).at(-1),
              profileUrl: window.location.href,
              firmName,
              address,
              experience: headingsFrom("Experience"),
              achievements: headingsFrom("Xero achievements"),
              description,
              industries,
              team: headingsFrom("Meet the team"),
              socialLinks: {
                linkedin: socialUrl("linkedin"),
                facebook: socialUrl("facebook"),
              },
            };
          },
          { fallbackName: item.firmName },
        );
        if (!profile?.firmName || /sorry|not found/iu.test(profile.firmName)) {
          throw new Error("Xero profile did not render an advisor.");
        }
        const headers = response?.headers() ?? {};
        onDiagnostic(
          createSourceDiagnostic({
            source: "xero",
            location,
            stage: "profile",
            requestedUrl: item.profileUrl,
            status: response?.status() ?? null,
            contentType: headers["content-type"] ?? null,
            responseSize: responseSizeFrom(headers),
            parsedItems: 1,
          }),
        );
        return profile;
      } catch (error) {
        const headers = response?.headers() ?? {};
        onDiagnostic(
          createSourceDiagnostic({
            source: "xero",
            location,
            stage: "profile",
            requestedUrl: item.profileUrl,
            status: response?.status() ?? null,
            contentType: headers["content-type"] ?? null,
            responseSize: responseSizeFrom(headers),
            error,
          }),
        );
        throw error;
      }
    },
    normalize: normalizeXeroProfile,
    close: async () => context?.close(),
  };
};
