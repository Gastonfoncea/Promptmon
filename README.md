# PROMPTMON

> Pokémon que dibujás con palabras — y te los pueden robar para siempre. On-chain, en Monad.

Escribís un prompt, una IA te genera una criatura 3D, la **acuñás como NFT** pagando en stablecoins, y la mandás a la **arena**: dos criaturas pelean y **el ganador se queda con el NFT del perdedor** — todo resuelto en una sola transacción on-chain.

Las stats salen de un hash con pool fijo de 100 puntos, así que el prompt es **solo estética**: nadie puede pedir un "dios invencible".

---

## Contratos en vivo (Monad testnet · chain id 10143)

| Contrato | Address |
|---|---|
| **PromptMon** (ERC-721 + juego) | [`0xB61Dc153eB4B149C5cb6Ed46FD67c62063311932`](https://testnet.monadexplorer.com/address/0xB61Dc153eB4B149C5cb6Ed46FD67c62063311932) |
| **mUSDC** (stablecoin de prueba, faucet público) | [`0xD182ECE40977e5f8D91627399aA577Ae7b02fe97`](https://testnet.monadexplorer.com/address/0xD182ECE40977e5f8D91627399aA577Ae7b02fe97) |

Mint = **10 mUSDC** → se reenvían a una wallet treasury.

---

## Cómo funciona

```
prompt → IA genera GLB (Tripo) → mintCreature(glb, mUSDC) → NFT con stats
                                                                  ↓
              createChallenge ← arena → acceptChallenge → batalla on-chain
                                                                  ↓
                       el NFT perdedor se transfiere al ganador (atómico)
```

- **Mint**: pago en stablecoins (no MON nativo). El owner habilita tokens y precio con `setPaymentToken`.
- **Stats anti "dios invencible"**: `atk/def/hp/spd` derivados de `keccak256` con pool fijo de ~100.
- **"Escrow" sin escrow**: el contrato de juego **es** el ERC-721. Una criatura en desafío no se mueve a ningún lado — solo se marca `locked`. Al aceptar, se resuelve y se hace `_transfer` interno en la misma tx.
- **Batalla**: `power = (atk*12 + spd*11 + def*10 + hp*9)/10 + level*5 + rand`, random con `block.prevrandao` (sin VRF). El ganador sube `level` y `wins`.

---

## Estructura del repo

```
Promptmon/
├── contracts/   Solidity + Foundry — el juego on-chain (PromptMon.sol)
├── tripo/       Cliente TS de la API de Tripo (prompt → GLB 3D)
├── frontend/    Cliente web (Next.js + R3F + wagmi) — ABI y addresses en src/contract.ts
└── backend/     (reservado)
```

---

## Quickstart

### Contratos

```bash
cd contracts
forge build
forge test          # 31/31 passing
```

Deploy a Monad testnet (ver `contracts/DEPLOY.md`):

```bash
cp .env.example .env      # completar PRIVATE_KEY
source .env
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
```

### Pipeline 3D (Tripo)

```bash
cd tripo
cp ../.env.example .env.local   # completar TRIPO_API_KEY
pnpm install
```

### Frontend

El frontend importa contrato y ABI desde `frontend/src/contract.ts`
(`PROMPTMON_ADDRESS`, `PROMPTMON_ABI`, `PAYMENT_TOKENS`, chain id 10143).

---

## Flujo de mint (lo que hace el frontend)

```ts
// 1. faucet de prueba
mUSDC.mint(user, 10_000000)
// 2. autorizar el cobro
mUSDC.approve(PROMPTMON_ADDRESS, 10_000000)
// 3. acuñar: paga 10 mUSDC → treasury, devuelve el tokenId
PromptMon.mintCreature(glbUrl, mUSDC_ADDRESS)
```

---

## Stack

- **On-chain**: Solidity 0.8.34, Foundry, OpenZeppelin (ERC-721, Ownable, SafeERC20, ReentrancyGuard), Monad testnet
- **3D / IA**: Tripo API (text-to-3D), GLB
- **Frontend**: Next.js, React Three Fiber, wagmi / viem, RainbowKit

## Eventos (para indexar en el frontend)

`CreatureMinted` · `ChallengeCreated` · `ChallengeCancelled` · `BattleResult`
