FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat bash curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Ensure dependencies like `sharp` are appropriately installed
RUN yarn add sharp && rm yarn.lock package.json

# Set the correct permission for prerender cache
COPY --chown=nextjs:nodejs .next/standalone .
COPY --chown=nextjs:nodejs .next/static ./dist/apps/fronts/privasys.org/.next/static
COPY --chown=nextjs:nodejs public ./apps/fronts/privasys.org/public

# When compiling on Windows there is a problem with the path separator
RUN sed -i 's#\\#/#g' ./apps/fronts/privasys.org/server.js

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "apps/fronts/privasys.org/server.js"]