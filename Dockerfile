# Stage 1: Build the frontend
FROM node:22 AS builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm install --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Stage 2: Build the MCP server
FROM node:22 AS mcp_builder
WORKDIR /app
COPY bigid-mcp-server/package.json bigid-mcp-server/package-lock.json ./bigid-mcp-server/
RUN npm ci --prefix bigid-mcp-server
COPY bigid-mcp-server/ ./bigid-mcp-server/
RUN npm run build --prefix bigid-mcp-server
# Install only production dependencies in a clean directory
RUN cd bigid-mcp-server && npm ci --omit=dev --ignore-scripts

# Stage 3: Build the production image
FROM node:22
WORKDIR /app

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip downloading Chromium and use the installed version
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package.json package-lock.json ./
RUN npm install --production
COPY server.js ./
COPY server/ ./server/
COPY --from=builder /app/frontend/dist ./build
COPY --from=mcp_builder /app/bigid-mcp-server/package.json ./bigid-mcp-server/package.json
COPY --from=mcp_builder /app/bigid-mcp-server/dist ./bigid-mcp-server/dist
COPY --from=mcp_builder /app/bigid-mcp-server/node_modules ./bigid-mcp-server/node_modules

# Add user for running Chrome (security best practice)
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user
USER pptruser

EXPOSE 3000
CMD ["node", "server.js"]
