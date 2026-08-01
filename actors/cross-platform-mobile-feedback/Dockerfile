FROM apify/actor-node:24

RUN npm ls @crawlee/core apify

COPY --chown=myuser:myuser package*.json ./
COPY --chown=myuser:myuser vendor ./vendor

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && (npm list --omit=dev --all || true) \
    && node --version \
    && npm --version \
    && rm -r ~/.npm

COPY --chown=myuser:myuser . ./

CMD ["node", "src/main.js"]
