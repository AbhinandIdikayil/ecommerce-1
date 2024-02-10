FROM node:20.9.0-alpine
WORKDIR /user/ecommerce
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD [ "node","index.js" ]