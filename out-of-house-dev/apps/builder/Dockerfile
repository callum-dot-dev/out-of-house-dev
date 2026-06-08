# Builder worker image: Node 20 + git + Chromium runtime deps for puppeteer.
# Build context MUST be the npm workspace root (the `out-of-house-dev/` project
# dir). On Render set the docker service rootDir to that dir and dockerfilePath
# to apps/builder/Dockerfile (see render.yaml, Phase 11).
FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates fonts-liberation \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libpangocairo-1.0-0 libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/builder/package.json apps/builder/package.json
RUN npm ci || npm install

# Sources + build (shared, then builder).
COPY . .
RUN npm run build -w packages/shared && npm run build -w apps/builder

CMD ["node", "apps/builder/dist/index.js"]
