#!/usr/bin/env sh
set -e

echo "Attente de Postgres…"

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres prêt."

echo "Déploiement des migrations Prisma…"
npx prisma migrate deploy

echo "Démarrage…"
exec "$@"
