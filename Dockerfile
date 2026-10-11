# Runtime-only image for the owner's own server (BRIEF §3).
#
# THE BUILD HAPPENS ON THE HOST, NOT HERE:
#
#   npm run build:docker     # pre-build guard, next build, post-build scan
#   docker build -t phoenix-site .
#   docker run -p 3000:3000 -e RESEND_API_KEY=... -e TURNSTILE_SECRET_KEY=... phoenix-site
#
# Building inside the image would mean either skipping the secret scan (gitleaks
# is not in the image) or weakening it, and neither is allowed. The image copies
# only the three folders a standalone Next server needs. No env file is ever
# copied — `.dockerignore` excludes them and the post-build scan refuses a
# standalone folder that contains one — so every secret is passed at `docker run`.

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
