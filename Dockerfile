FROM node:18-alpine

WORKDIR /app

# Inisialisasi package tanpa bikin file manual & langsung install websocket
RUN npm init -y && npm install ws

# Baru copy file server.js ke dalam container
COPY server.js .

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]