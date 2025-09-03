# -------- Builder --------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Si tu as un lockfile (package-lock.json), on profite du cache
COPY package*.json ./
RUN npm ci

# Injecte les variables publiques au BUILD (côté navigateur)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copie le code et build
COPY . .
RUN npm run build
# Enlève les devDeps pour réduire la taille
RUN npm prune --omit=dev

# -------- Runner --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5173 \
    NEXT_TELEMETRY_DISABLED=1

# Copie le bundle standalone + assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 5173
# server.js est généré par Next en mode standalone
CMD ["node", "server.js"]
