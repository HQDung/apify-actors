import { setTimeout } from "node:timers/promises";

import { Actor, log } from "apify";
import { chromium } from "playwright";

import {
  createSourceDiagnostic,
  sanitizeError,
} from "./logging/source-diagnostics.js";
import { runPipeline } from "./pipeline/run.js";
import { validateInput } from "./schemas/validators.js";
import { createQuickBooksAdapter } from "./sources/quickbooks/quickbooks-adapter.js";
import { createXeroAdapter } from "./sources/xero/xero-adapter.js";

Actor.on("aborting", async () => {
  await setTimeout(1000);
  await Actor.exit();
});

await Actor.init();
let browser;
let exitCode = 0;
const adapters = {};
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
  const onDiagnostic = (event) => {
    const message = `${event.source} ${event.stage}`;
    if (event.error) log.warning(message, event);
    else log.info(message, event);
  };
  browser = await chromium.launch({ headless: true });
  if (input.sources.includes("xero")) {
    adapters.xero = createXeroAdapter({
      browser,
      createContext,
      onDiagnostic,
    });
  }
  if (input.sources.includes("quickbooks")) {
    adapters.quickbooks = createQuickBooksAdapter({ browser, createContext });
  }
  const { leads, summary } = await runPipeline({
    input,
    adapters,
    onFailure: ({ source, location, stage, error }) =>
      onDiagnostic(
        createSourceDiagnostic({ source, location, stage, error }),
      ),
  });
  for (const lead of leads) await Actor.pushData(lead);
  await Actor.setValue("OUTPUT", summary);
  log.info("Finished accounting firm lead collection.", summary);
} catch (error) {
  exitCode = 1;
  log.error("Actor failed before producing output.", {
    error: sanitizeError(error),
  });
} finally {
  await Promise.allSettled(
    Object.values(adapters).map((adapter) => adapter.close?.()),
  );
  await browser?.close();
  await Actor.exit({ exitCode });
}
