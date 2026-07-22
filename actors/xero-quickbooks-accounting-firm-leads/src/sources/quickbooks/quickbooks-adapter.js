import { resolveLocation } from "../../location/locale-resolver.js";
import { createSourceDiagnostic } from "../../logging/source-diagnostics.js";
import {
  normalizeQuickBooksProfile,
  parseQuickBooksSearchCards,
} from "./quickbooks-parser.js";

const responseMetadata = (response) => {
  const headers = response?.headers() ?? {};
  const size = Number(headers["content-length"]);
  return {
    status: response?.status() ?? null,
    contentType: headers["content-type"] ?? null,
    responseSize: Number.isFinite(size) && size > 0 ? size : null,
  };
};

export const quickBooksSearchRequestFor = (location) => {
  const resolved = resolveLocation(location);
  return {
    requestedUrl: resolved.quickBooksSearchUrl,
    searchTerm: resolved.city ?? location,
  };
};

export const createQuickBooksAdapter = ({
  browser,
  createContext,
  onDiagnostic = () => {},
}) => {
  let context;
  let page;
  const getPage = async () => {
    if (!context) context = await createContext(browser);
    if (!page) page = await context.newPage();
    page.setDefaultTimeout(30_000);
    return page;
  };

  return {
    source: "quickbooks",
    search: async ({ location, limit }) => {
      const activePage = await getPage();
      const { requestedUrl, searchTerm } = quickBooksSearchRequestFor(location);
      let response;
      try {
        response = await activePage.goto(requestedUrl, {
          waitUntil: "domcontentloaded",
        });
        const locationInput = activePage.locator("#idsTxtField1");
        await locationInput.fill(searchTerm);
        await locationInput.press("Enter");
        await activePage.waitForSelector(
          '[data-automation-id^="mm_srp_search_card_"]',
        );
        const cards = await activePage.$$eval(
          '[data-automation-id^="mm_srp_search_card_"]',
          (nodes) =>
            nodes.map((card) => {
              const text = (id) =>
                card
                  .querySelector(`[data-automation-id="${id}"]`)
                  ?.textContent?.trim() ?? null;
              const link = card.querySelector('a[href*="searchId="]');
              const profileUrl = link
                ? new URL(link.href, location.href).href
                : null;
              return {
                id: card
                  .getAttribute("data-automation-id")
                  ?.replace(/^mm_srp_search_card_/u, ""),
                fullName: text("mm_srp_full_name_read"),
                firmName: text("mm_srp_firm_name_read"),
                address: text("mm_srp_address_name_read"),
                description: text("mm_srp_description_read"),
                services: [
                  ...card.querySelectorAll(
                    '[data-automation-id="mm_srp_services_list"] li',
                  ),
                ]
                  .map((item) => item.textContent.trim())
                  .filter(Boolean),
                profileUrl,
              };
            }),
        );
        const items = parseQuickBooksSearchCards(cards, limit);
        onDiagnostic(
          createSourceDiagnostic({
            source: "quickbooks",
            location,
            stage: "search",
            requestedUrl,
            ...responseMetadata(response),
            parsedItems: items.length,
          }),
        );
        return items;
      } catch (error) {
        onDiagnostic(
          createSourceDiagnostic({
            source: "quickbooks",
            location,
            stage: "search",
            requestedUrl,
            ...responseMetadata(response),
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
        await activePage.waitForSelector(
          '[data-automation-id="mm_full_name_read"]',
        );
        const profile = await activePage.evaluate(
          ({ id, profileUrl }) => {
            const text = (automationId) =>
              document
                .querySelector(`[data-automation-id="${automationId}"]`)
                ?.textContent?.trim() ?? null;
            const list = (automationId) => {
              const container = document.querySelector(
                `[data-automation-id="${automationId}"]`,
              );
              if (!container) return [];
              const items = [...container.querySelectorAll("li")]
                .map((node) => node.textContent.trim())
                .filter(Boolean);
              return items.length
                ? items
                : container.textContent
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean);
            };
            const href = (automationId) =>
              document
                .querySelector(`[data-automation-id="${automationId}"] a`)
                ?.getAttribute("href") ?? null;
            const languageText = text("mm_bio_languages_list") ?? "";
            const credentialsTitle = document.querySelector(
              '[data-automation-id="mm_bio_professional_designations_title"]',
            );
            const credentials = credentialsTitle?.parentElement
              ? [...credentialsTitle.parentElement.querySelectorAll("li")]
                  .map((node) => node.textContent.trim())
                  .filter(Boolean)
              : [];
            return {
              id,
              fullName: text("mm_full_name_read"),
              firmName: text("mm_firm_name_read"),
              addressLines: [
                text("mm_address_read_1"),
                text("mm_address_read_2"),
              ].filter(Boolean),
              website: text("mm_website_read"),
              phoneNumbers: [
                ...document.querySelectorAll('a[href^="tel:"]'),
              ].map((link) => link.getAttribute("href").replace(/^tel:/u, "")),
              services: list("mm_services_list"),
              certifications: [
                ...document.querySelectorAll(
                  '[data-automation-id="mm_cert_checkbox_edit"]',
                ),
              ]
                .map((node) => node.textContent.trim().replace(/\s+/gu, " "))
                .filter(Boolean),
              description:
                text("mm_bio_about_me_description") ??
                text("mm_bio_about_me_show_more_trimmed_description"),
              industries: list("mm_bio_industries_preview_display_list"),
              languages: languageText
                .replace(/^Languages\s*/iu, "")
                .split(/[,\n]/u)
                .map((value) => value.trim())
                .filter(Boolean),
              credentials,
              socialLinks: {
                linkedin: href("mm_bio_social_linkedin_button"),
                facebook: href("mm_bio_social_facebook_button"),
                instagram: null,
                x: null,
              },
              profileUrl,
            };
          },
          { id: item.id, profileUrl: item.profileUrl },
        );
        onDiagnostic(
          createSourceDiagnostic({
            source: "quickbooks",
            location,
            stage: "profile",
            requestedUrl: item.profileUrl,
            ...responseMetadata(response),
            parsedItems: 1,
          }),
        );
        return profile;
      } catch (error) {
        onDiagnostic(
          createSourceDiagnostic({
            source: "quickbooks",
            location,
            stage: "profile",
            requestedUrl: item.profileUrl,
            ...responseMetadata(response),
            error,
          }),
        );
        throw error;
      }
    },
    normalize: normalizeQuickBooksProfile,
    close: async () => context?.close(),
  };
};
