FROM apify/actor-node:22

COPY --chown=myuser:myuser package*.json ./
COPY --chown=myuser:myuser vendor ./vendor

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && npm cache clean --force

COPY --chown=myuser:myuser . ./

CMD ["node", "src/main.js"]
