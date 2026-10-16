FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/frontend/package.json ./packages/frontend/

RUN npm install --workspace=packages/frontend

COPY packages/frontend ./packages/frontend

WORKDIR /app/packages/frontend
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 3000
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
