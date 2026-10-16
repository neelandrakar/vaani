FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

RUN npm install --workspace=packages/backend

COPY packages/backend ./packages/backend

WORKDIR /app/packages/backend
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/packages/backend

ENV NODE_ENV=production
ENV PORT=5001

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/backend/node_modules ./node_modules
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY --from=builder /app/packages/backend/package.json ./package.json

EXPOSE 5001

CMD ["node", "dist/index.js"]
