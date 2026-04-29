FROM node:24-alpine AS deps
WORKDIR /app
COPY api/package*.json ./api/
RUN cd api && npm install

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api ./api
RUN cd api && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
COPY --from=build /app/api/build ./build
COPY --from=build /app/api/package*.json ./
COPY --from=build /app/api/node_modules ./node_modules
COPY api/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
EXPOSE 3333
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "build/bin/server.js"]
