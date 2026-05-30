/**
 * Mintea el roster pre-generado ON-CHAIN (PRO-18, parte 2).
 *
 * Replica server-side el flujo de mint de PRO-21 (faucet mUSDC → approve →
 * mintCreature) usando viem, contra el contrato ya deployado en Monad testnet.
 * Recorre las criaturas del roster que ya tienen `.glb` y las acuña, guardando
 * el `tokenId` de vuelta en el manifest. Es idempotente/resumible: salta las que
 * ya tienen tokenId.
 *
 * Uso:
 *   pnpm mint-roster
 *
 * Variables (en ../.env.local, raíz del repo):
 *   PRIVATE_KEY      wallet de Monad testnet con MON para gas (NUNCA commitear)
 *   PUBLIC_BASE_URL  base pública del deploy, ej. https://promptmon.vercel.app
 *                    → se mintea `${PUBLIC_BASE_URL}/roster/<slug>.glb` (URL
 *                    absoluta y permanente; las de Tripo expiran en 24h)
 *   MONAD_RPC_URL    (opcional) override del RPC
 *
 * Requisitos previos: haber corrido `pnpm roster` (genera los .glb) y, para que
 * la URL on-chain sea válida, haber deployado el front (PRO-31).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  erc20Abi,
  type Abi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const MANIFEST_PATH = resolve(REPO_ROOT, "frontend/src/lib/roster.manifest.json");
const ABI_PATH = resolve(REPO_ROOT, "frontend/src/PromptMon.abi.json");

// Fuente de verdad de las addresses: frontend/src/contract.ts (deploy de PRO-12).
const PROMPTMON_ADDRESS = "0xB61Dc153eB4B149C5cb6Ed46FD67c62063311932" as Address;
const USDC_ADDRESS = "0xD182ECE40977e5f8D91627399aA577Ae7b02fe97" as Address;

/** ERC-20 estándar + `mint(to, amount)` público (faucet del mock USDC). */
const erc20MintableAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

interface RosterEntry {
  slug: string;
  name: string;
  prompt: string;
  glb: string | null;
  preview: string | null;
  taskId: string | null;
  generatedAt: string | null;
  // Completados por este script:
  tokenId?: string | null;
  mintTx?: string | null;
  mintedAt?: string | null;
}

/** Carga mínima de .env.local (igual que los otros scripts). */
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(REPO_ROOT, ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function readManifest(): RosterEntry[] {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as RosterEntry[];
}

function writeManifest(entries: RosterEntry[]): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2) + "\n");
}

async function main(): Promise<void> {
  loadEnvLocal();

  const rawKey = process.env.PRIVATE_KEY;
  if (!rawKey) {
    throw new Error(
      "Falta PRIVATE_KEY en .env.local (wallet de Monad testnet con MON para gas).",
    );
  }
  const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error(
      "Falta PUBLIC_BASE_URL (ej. https://promptmon.vercel.app) para mintear URLs absolutas y permanentes.",
    );
  }

  const abi = JSON.parse(readFileSync(ABI_PATH, "utf8")) as Abi;
  const account = privateKeyToAccount(
    (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`,
  );
  const transport = process.env.MONAD_RPC_URL
    ? http(process.env.MONAD_RPC_URL)
    : http();
  const publicClient = createPublicClient({ chain: monadTestnet, transport });
  const wallet = createWalletClient({ account, chain: monadTestnet, transport });

  const manifest = readManifest();
  const ready = manifest.filter((e) => e.glb);
  const pending = ready.filter((e) => !e.tokenId);

  if (ready.length === 0) {
    console.log("El roster no tiene .glb todavía. Corré `pnpm roster` primero.");
    return;
  }
  console.log(
    `Wallet: ${account.address}\nA mintear: ${pending.length} (de ${ready.length} con .glb).`,
  );
  if (pending.length === 0) {
    console.log("Todas las criaturas con .glb ya están minteadas. ✅");
    return;
  }

  // Precio del mint en mUSDC (lo define el contrato).
  const price = (await publicClient.readContract({
    address: PROMPTMON_ADDRESS,
    abi,
    functionName: "mintPrice",
    args: [USDC_ADDRESS],
  })) as bigint;
  if (price === BigInt(0)) {
    throw new Error("El contrato no acepta mUSDC (mintPrice = 0).");
  }
  const need = price * BigInt(pending.length);

  // 1. Faucet de mUSDC si el balance no alcanza para todo el lote.
  const balance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
  if (balance < need) {
    console.log("→ faucet mUSDC…");
    const hash = await wallet.writeContract({
      address: USDC_ADDRESS,
      abi: erc20MintableAbi,
      functionName: "mint",
      args: [account.address, need],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // 2. Approve para que el contrato cobre todo el lote.
  const allowance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, PROMPTMON_ADDRESS],
  })) as bigint;
  if (allowance < need) {
    console.log("→ approve…");
    const hash = await wallet.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [PROMPTMON_ADDRESS, need],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // 3. Mint de cada criatura, guardando el tokenId tras cada una (resumible).
  for (const entry of pending) {
    const glbUrl = `${baseUrl}${entry.glb}`;
    console.log(`→ mint ${entry.name}: ${glbUrl}`);
    try {
      const hash = await wallet.writeContract({
        address: PROMPTMON_ADDRESS,
        abi,
        functionName: "mintCreature",
        args: [glbUrl, USDC_ADDRESS],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi,
        eventName: "CreatureMinted",
        logs: receipt.logs,
      });
      const tokenId = (logs[0]?.args as { id?: bigint } | undefined)?.id;
      entry.tokenId = tokenId !== undefined ? tokenId.toString() : null;
      entry.mintTx = hash;
      entry.mintedAt = new Date().toISOString();
      writeManifest(manifest);
      console.log(`  ✅ tokenId ${entry.tokenId ?? "?"}  tx ${hash}`);
    } catch (err) {
      console.error(`  ❌ ${(err as Error).message.split("\n")[0]}`);
    }
  }

  const minted = manifest.filter((e) => e.tokenId).length;
  console.log(`\nRoster on-chain: ${minted}/${ready.length} criaturas minteadas.`);
}

main().catch((err) => {
  console.error(`\n❌ ${err?.name ?? "Error"}: ${err?.message ?? err}`);
  process.exitCode = 1;
});
