# @promptmon/tripo

Cliente de [Tripo](https://platform.tripo3d.ai) para PromptMon. Convierte un prompt de texto en un modelo 3D `.glb`. **(PRO-14)**

## API pública

```ts
import { generateCreature } from "@promptmon/tripo";

// prompt → URL del .glb (la firma que pide PRO-14)
const glbUrl = await generateCreature("a fire-breathing armored lizard");
```

Variantes:

```ts
import { generateCreatureDetailed, TripoClient } from "@promptmon/tripo";

// detalle completo: { glbUrl, renderedImageUrl, taskId, consumedCredit }
const creature = await generateCreatureDetailed(prompt, {
  timeoutMs: 240_000,        // default 4 min
  pollIntervalMs: 3_000,     // default 3s
  onProgress: (p, status) => console.log(status, p),
  signal: abortController.signal, // cancelable
});

// o el cliente reutilizable (1 sola lectura de la key)
const client = new TripoClient({ apiKey: process.env.TRIPO_API_KEY });
const taskId = await client.createTextToModelTask(prompt);
const result = await client.waitForCompletion(taskId);
```

## Configuración

Lee del entorno por default (o pasá `{ apiKey, baseUrl }`):

| Variable | Default | Qué es |
|----------|---------|--------|
| `TRIPO_API_KEY` | — (requerida) | API key `tsk_...` |
| `TRIPO_API_BASE` | `https://api.tripo3d.ai/v2/openapi` | Base de la API |

## Errores (todos extienden `TripoError`)

| Clase | Cuándo |
|-------|--------|
| `TripoApiError` | La API respondió `code !== 0` (sin crédito, key inválida, etc.). Trae `.code` y `.suggestion`. |
| `TripoTaskFailedError` | La generación terminó en `failed`/`banned`/`expired`/`cancelled`. |
| `TripoTimeoutError` | Se agotó el `timeoutMs` sin terminar. |

```ts
import { generateCreature, TripoApiError } from "@promptmon/tripo";
try {
  await generateCreature(prompt);
} catch (e) {
  if (e instanceof TripoApiError && e.code === 2010) {
    // sin crédito → mostrar mensaje al usuario
  }
}
```

## Probar localmente

```bash
pnpm install
pnpm gen "a small cute dragon"   # genera de verdad (consume ~20 créditos)
```

El CLI lee `TRIPO_API_KEY` de `../.env.local` (raíz del repo).

## Roster pre-generado (PRO-18)

Set fijo de criaturas para poblar la arena y como red de seguridad de la demo
(si Tripo/wifi fallan en vivo). Genera cada criatura, **baja el `.glb` a
`frontend/public/roster/`** (Next lo sirve estático → no expira ni depende de la
API en vivo) y completa `frontend/src/lib/roster.manifest.json`.

```bash
pnpm roster          # genera SOLO las que falten (resumible: guarda tras cada una)
pnpm roster --force  # regenera todas
```

- Necesita `TRIPO_API_KEY` en `../.env.local`. Genera secuencial (free tier = 1 tarea concurrente); ~45-90s y ~20 créditos por criatura → las 10 tardan un rato.
- El front consume el roster con `import { roster, readyRoster } from "@/lib/roster"`.
  `readyRoster` son las que ya tienen `.glb` local.
- Los `.glb` generados **se commitean** (son el backup).

### Mintear el roster on-chain (PRO-18 parte 2)

Acuña cada criatura del roster en el contrato PromptMon (Monad testnet),
replicando el flujo de PRO-21 (faucet mUSDC → approve → `mintCreature`) con viem.
Guarda el `tokenId` en el manifest. Resumible (salta las ya minteadas).

```bash
pnpm mint-roster
```

Necesita en `../.env.local`:

| Var | Qué es |
|-----|--------|
| `PRIVATE_KEY` | wallet de Monad testnet con MON para gas (**nunca commitear**) |
| `PUBLIC_BASE_URL` | base del deploy (ej. `https://promptmon.vercel.app`) → mintea `${base}/roster/<slug>.glb`, URL absoluta y permanente |
| `MONAD_RPC_URL` | (opcional) override del RPC |

Requisitos: haber corrido `pnpm roster` (genera los `.glb`) y tener el front
deployado (PRO-31) para que la URL on-chain sea válida.

## ⚠️ Notas para el resto del equipo

- **Las URLs `.glb` son presigned y EXPIRAN** (~24h). Para Dev3 (PRO-21) está bien usarlas al vuelo; para el roster de backup (PRO-18) hay que **rehostearlas** o regenerarlas.
- **Free tier = 1 tarea concurrente.** Generar de a una. Para roster/demo en paralelo, evaluar plan pago.
- Una generación tarda **~45-90s** y cuesta **~20 créditos**.
