FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production DB_FILE=/data/hub.sqlite PORT=3000
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "--no-warnings", "server/index.js"]
