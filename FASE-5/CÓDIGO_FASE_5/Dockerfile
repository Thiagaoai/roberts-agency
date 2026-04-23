FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY index.js ./

ENV NODE_ENV=production
EXPOSE 3200

CMD ["node", "index.js"]
