import { setTimeout } from "node:timers/promises";

import { Actor, log } from "apify";
import { chromium } from "playwright";

import { runPipeline } from "./pipeline/run.js";
import { validateInput } from "./schemas/validators.js";
import { createQuickBooksAdapter } from "./sources/quickbooks/quickbooks-adapter.js";
import { xeroAdapter } from "./sources/xero/xero-adapter.js";

Actor.on("aborting", async () => {
  await setTimeout(1000);
  await Actor.exit();
});

await Actor.init();
let browser;
try {
  const input = validateInput((await Actor.getInput()) ?? {});
  const proxyConfiguration = input.proxyConfiguration?.useApifyProxy
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : null;
  const createContext = async (activeBrowser) => {
    const proxyUrl = proxyConfiguration
      ? await proxyConfiguration.newUrl()
      : null;
    return activeBrowser.newContext(
      proxyUrl ? { proxy: { server: proxyUrl } } : undefined,
    );
  };
  const adapters = { xero: xeroAdapter };
  if (input.sources.includes("quickbooks")) {
    browser = await chromium.launch({ headless: true });
    adapters.quickbooks = createQuickBooksAdapter({ browser, createContext });
  }
  const { leads, summary } = await runPipeline({
    input,
    adapters,
    onFailure: ({ source, location, stage, error }) =>
      log.warning(
        `${source} ${stage} failed for ${location}: ${error.message}`,
      ),
  });
  for (const lead of leads) await Actor.pushData(lead);
  await Actor.setValue("OUTPUT", summary);
  log.info("Finished accounting firm lead collection.", summary);
} finally {
  await browser?.close();
  await Actor.exit();
}
