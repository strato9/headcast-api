FROM node:20-bookworm-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better cache
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy the rest
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
