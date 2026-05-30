# @promptmon/prompt-input

Input de prompt de criatura con validación y feedback de carga. **(PRO-15)**

Componente React **desacoplado del cliente Tripo**: hace toda la UX (textarea con
contador, límite de caracteres, bloqueo de envío vacío, estado de carga, error) y
delega la generación a una prop `onGenerate`. Así se monta en el scaffold de Dev3
(PRO-19) sin exponer la API key en el browser.

## Uso

```tsx
import { PromptInput } from "@promptmon/prompt-input";

<PromptInput
  onGenerate={async (prompt) => {
    // DEBE ir server-side: el cliente Tripo lee TRIPO_API_KEY del entorno.
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Falló la generación");
    const { glbUrl } = await res.json();
    // pasá glbUrl al loader R3F (PRO-16)
  }}
/>
```

### Por qué `onGenerate` y no llamar a Tripo directo

El cliente `@promptmon/tripo` (PRO-14) corre en Node y lee `TRIPO_API_KEY`. Llamarlo
desde el browser filtraría la key y rompería el límite de 1 tarea concurrente del free
tier. El patrón correcto: una **API route** (Next, de Dev3) que invoca `generateCreature`
server-side; este componente le hace `POST`.

Ejemplo de la API route (lado Dev3 / PRO-19+):

```ts
// app/api/generate/route.ts
import { generateCreature } from "@promptmon/tripo";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  try {
    const glbUrl = await generateCreature(prompt);
    return Response.json({ glbUrl });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
```

## Contrato del componente

| Prop | Tipo | Default | Qué hace |
|------|------|---------|----------|
| `onGenerate` | `(prompt: string) => Promise<void>` | — (requerida) | Genera la criatura. Recibe el prompt ya validado y trimmeado. El componente await-ea para el loading y muestra `error.message` si rechaza. |
| `placeholder` | `string` | ejemplo cyberpunk | Placeholder del textarea. |
| `disabled` | `boolean` | `false` | Deshabilita desde afuera (ej. wallet no conectada). |
| `className` | `string` | — | Clase del contenedor (los estilos los pone el scaffold). |

Criterios de aceptación de PRO-15, cubiertos por tests:

- ✅ no se puede enviar prompt vacío (botón deshabilitado + guard en el submit).
- ✅ feedback de carga mientras Tripo genera (`role="status"` + input deshabilitado).

## Validación reutilizable

```ts
import { validatePrompt, PROMPT_MAX_LENGTH } from "@promptmon/prompt-input";

const { valid, trimmed, remaining, error } = validatePrompt(raw);
```

Reglas: no vacío, mínimo 3 / máximo 200 caracteres. El prompt es **solo estética**
— los stats salen del contrato, así que no se valida "poder".

## Dev

```bash
pnpm install
pnpm test        # 13 tests (validación pura + componente con Testing Library)
pnpm typecheck
```
