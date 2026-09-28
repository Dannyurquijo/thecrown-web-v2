FROM node:20-alpine
WORKDIR /app
COPY chatbot/proxy/server.js ./server.js
EXPOSE 3000
USER node
CMD ["node", "server.js"]
