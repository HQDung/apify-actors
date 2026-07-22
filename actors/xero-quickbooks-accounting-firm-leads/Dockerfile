FROM apify/actor-node-playwright-chrome:24-1.60.0

RUN npm ls @crawlee/core apify puppeteer playwright

COPY --chown=myuser:myuser package*.json Dockerfile check-playwright-version.mjs ./

RUN node check-playwright-version.mjs

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && npm list --omit=dev --all \
    && node --version \
    && npm --version \
    && rm -r ~/.npm

COPY --chown=myuser:myuser . ./

CMD ["node", "src/main.js"]
