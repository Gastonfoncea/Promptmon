#!/usr/bin/env bash
# PRO-13 — Validación de la API key de Tripo.
# Lee TRIPO_API_KEY de .env.local y dispara un text_to_model de prueba.
# Criterio de aceptación: la respuesta contiene un task_id.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ No existe $ENV_FILE — copiá .env.example y completá TRIPO_API_KEY"; exit 1
fi

# Cargar variables del .env.local
set -a; source "$ENV_FILE"; set +a

: "${TRIPO_API_KEY:?Falta TRIPO_API_KEY en .env.local}"
: "${TRIPO_API_BASE:=https://api.tripo3d.ai/v2/openapi}"

if [[ "$TRIPO_API_KEY" == *REEMPLAZAR* || "$TRIPO_API_KEY" == *xxxx* ]]; then
  echo "❌ TRIPO_API_KEY sigue siendo el placeholder. Pegá tu key real (tsk_...) en .env.local"; exit 1
fi

echo "→ Probando text_to_model contra $TRIPO_API_BASE/task ..."
RESPONSE="$(curl -sS "$TRIPO_API_BASE/task" \
  -H "Authorization: Bearer $TRIPO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"text_to_model","prompt":"a wooden chair"}')"

echo "Respuesta: $RESPONSE"

if echo "$RESPONSE" | grep -q 'task_id'; then
  echo "✅ PRO-13 OK — la API devolvió un task_id."
else
  echo "❌ No se encontró task_id en la respuesta. Revisá la key/crédito."; exit 1
fi
