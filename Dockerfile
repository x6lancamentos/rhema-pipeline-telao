FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3210

COPY package*.json ./

RUN npm ci --only=production || npm install --omit=dev

COPY . .

EXPOSE 3210

USER node

CMD ["node", "server.js"]
