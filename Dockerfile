FROM node:18-alpine

WORKDIR /app

# Copy manifest package dan install library pendukung
COPY package*.json ./
RUN npm install

# Copy seluruh source code (termasuk server.js)
COPY . .

# Railway otomatis ngasih port dinamis via ENV PORT
EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
