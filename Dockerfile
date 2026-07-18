# Self-hosted image. Multi-stage so the runtime layer carries no build toolchain,
# no source, and no dev dependencies.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV BUILD_STANDALONE=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The catalogue is generated at build time so the image ships ready to serve.
RUN npm run normalize && npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
# Local-first defaults: no cloud account needed to run this container.
ENV MAIL_DRIVER=file
ENV STORAGE_DRIVER=local
ENV BACKUP_DRIVER=local
ENV VAR_DIR=/data/var
ENV UPLOAD_DIR=/data/var/uploads
ENV OUTBOX_DIR=/data/var/outbox
ENV BACKUP_DIR=/data/var/backups

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Scripts and data are needed for backup/restore and re-normalisation in place.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

RUN mkdir -p /data/var/uploads /data/var/outbox /data/var/backups && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3100
VOLUME ["/data/var"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
