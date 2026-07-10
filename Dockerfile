# syntax=docker/dockerfile:1

# auth-service — Node microservice (easy-node monorepo with npm workspaces).
# Config is provided at runtime via environment variables (compose / Railway), never a .env file.
FROM node:22-bookworm-slim

WORKDIR /app

# NODE_ENV=production skips dev tooling behaviour; API_HOST=0.0.0.0 makes the server bind to all
# interfaces (the app defaults to localhost, which is unreachable from outside the container).
ENV NODE_ENV=production \
	API_HOST=0.0.0.0

# Copy the whole monorepo (npm workspaces need every packages/*/package.json to resolve the
# install). The host node_modules, .git, secrets and .env are excluded via .dockerignore.
COPY . .

# Drop the local-only "prepare" script (it wires git hooks and would fail without a .git dir),
# then install runtime dependencies for every workspace. `npm install` (not `npm ci`) is used
# because the committed lock file is currently out of sync with package.json (a latent repo issue,
# tracked separately); install is lenient and still honours the lock file where it can.
RUN npm pkg delete scripts.prepare && npm install --omit=dev

# Documentation only (Railway injects its own PORT; compose maps this). Matches API_PORT's default.
EXPOSE 3000

CMD ["npm", "start"]
