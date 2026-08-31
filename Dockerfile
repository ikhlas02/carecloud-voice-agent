FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/patients.db

CMD ["node", "src/server.js"]
