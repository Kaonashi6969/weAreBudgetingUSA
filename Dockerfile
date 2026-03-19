# Use Node.js LTS as the base image
FROM node:20-alpine AS base

# Stage 1: Build Frontend
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build -- --configuration production

# Stage 2: Final Backend Image
FROM base AS backend
WORKDIR /app

# Install security and production tools
RUN apk add --no-cache curl sqlite

# Copy backend files
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/frontend/dist/budget-frontend/browser ./frontend/dist/budget-frontend/browser

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Create data directory for SQLite
RUN mkdir -p /app/backend/data && chown -node:node /app/backend/data

# Exposure
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/api/health || exit 1

WORKDIR /app/backend
USER node

# Use PM2 runtime to manage the process in the container
RUN npm install pm2 -g
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
