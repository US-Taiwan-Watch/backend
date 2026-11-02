FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY scripts/patch-payload-form.cjs ./scripts/patch-payload-form.cjs
RUN npm ci --no-audit --no-fund
COPY next.config.mjs next-env.d.ts tsconfig.json ./
COPY src ./src
ENV NEXT_TELEMETRY_DISABLED=1 PAYLOAD_TELEMETRY_DISABLED=true USTW_BUILD_ONLY=1 NODE_OPTIONS=--max-old-space-size=2304 AZURE_STORAGE_ACCOUNT_BASEURL=https://ustwcmsstorage.blob.core.windows.net
RUN npm run build

FROM node:22.23.4-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3080 MONGODB_TLS_CA_FILE=/app/mongodb-ca.crt NEXT_TELEMETRY_DISABLED=1 PAYLOAD_TELEMETRY_DISABLED=true
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY start-production.mjs ./start-production.mjs
COPY mongodb-ca.crt ./mongodb-ca.crt
RUN mkdir -p /app/runtime-storage /app/.next/cache && chown node:node /app/runtime-storage /app/.next/cache
USER node
EXPOSE 3080
CMD ["node", "start-production.mjs"]
