# Imagen única para todo el monorepo: cada contenedor del compose usa esta
# misma imagen, solo cambia `working_dir` + `command`. Evita duplicar 5
# Dockerfiles casi idénticos para un monorepo de este tamaño.
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/auth/package.json services/auth/package.json
COPY services/appointments/package.json services/appointments/package.json
COPY services/payments/package.json services/payments/package.json
COPY services/notifications/package.json services/notifications/package.json
COPY gateway/package.json gateway/package.json
RUN npm ci

COPY . .

# prisma.config.ts resuelve DATABASE_URL de forma eager incluso para
# `prisma generate` (que no toca la BD real) — un valor dummy alcanza para
# que el build no falle; en runtime cada contenedor recibe la URL real.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# @vitalis/shared se importa en dev directo desde src/*.ts vía tsx, pero los
# servicios compilados con tsc + `node dist/...` no pueden resolver un import
# que apunte a un .ts crudo — por eso se compila shared aparte y se apunta
# su "main"/"types" al dist ya generado, solo dentro de esta imagen.
RUN npm run build -w packages/shared
RUN npm pkg set main=dist/index.js types=dist/index.d.ts -w packages/shared

# `prisma generate` corre aparte de `npm run build` (ese script ya no lo
# incluye) a propósito: Prisma 7.9 con `output` personalizado falla con
# "Could not resolve @prisma/client" si generate corre una segunda vez sobre
# un cliente ya generado en ese path — mezclar "generate && tsc" en el mismo
# script y encima invocarlo dos veces en CI (una explícita, otra desde
# build) reproducía el bug. Un solo generate por servicio, siempre.
RUN cd services/auth && npx prisma generate
RUN npm run build -w services/auth

RUN cd services/appointments && npx prisma generate
RUN npm run build -w services/appointments

RUN cd services/payments && npx prisma generate
RUN npm run build -w services/payments

RUN npm run build -w services/notifications
RUN npm run build -w gateway

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
