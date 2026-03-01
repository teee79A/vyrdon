FROM node:20-alpine

WORKDIR /app

COPY engine/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY engine/dist ./dist
COPY engine/policies.json ./policies.json

RUN mkdir -p /app/system /app/memory /app/workspace /app/logs /app/archive /app/config /app/rules \
  && chown -R node:node /app

USER node
EXPOSE 4000

CMD ["node", "dist/index.js"]
