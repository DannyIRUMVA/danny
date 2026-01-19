FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
# Build the Angular app into /app/dist
RUN npm run build

FROM nginx:alpine
# The Angular build emits a `browser/` directory inside `/app/dist` with the
# client files; copy that directory's contents into nginx's web root so the
# app is served at `/` and assets like `/favicon.ico` resolve correctly.
COPY --from=build /app/dist/browser/. /usr/share/nginx/html/
# Use our custom nginx config to support SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
