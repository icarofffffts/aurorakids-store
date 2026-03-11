# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

COPY package*.json ./

# Install cleanly
RUN npm ci

COPY . .

# Build the frontend
RUN VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
    npm run build

# Production Stage (Node.js Server)
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Copy server code
COPY server.js ./
COPY seed/ ./seed/

# Expose port (Use 3000 for non-root safety)
EXPOSE 3000

# Run server
CMD ["node", "server.js"]
