# Deploy de PromptMon a Monad testnet (chain id 10143)

## 1. Preparar el entorno

```bash
cd contracts
cp .env.example .env
# editar .env: PRIVATE_KEY (con fondos en Monad testnet), TREASURY,
# y opcionalmente USDC_ADDRESS / USDT_ADDRESS si ya los tenés.
source .env
```

## 2. Build + tests (deben pasar antes de deployar)

```bash
forge build
forge test
```

## 3. Deploy

```bash
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
```

La salida imprime la address del contrato. Si configuraste verificación
(`MONAD_ETHERSCAN_KEY` + `MONAD_VERIFIER_URL`), agregá `--verify`.

## 4. Publicar ABI + address al frontend

```bash
# ABI (re-exportar si cambió el contrato)
forge inspect PromptMon abi --json > ../frontend/src/PromptMon.abi.json
```

Luego editar `frontend/src/contract.ts`:
- `PROMPTMON_ADDRESS` = address impresa por el deploy.
- `PAYMENT_TOKENS.USDC` / `.USDT` = addresses de los stablecoins en Monad testnet.

## 5. Habilitar stablecoins (si no se pasaron en el deploy)

```bash
cast send <PROMPTMON_ADDRESS> "setPaymentToken(address,uint256)" \
  <USDC_ADDRESS> 10000000 --rpc-url monad_testnet --private-key $PRIVATE_KEY
```

(10000000 = 10 USDC con 6 decimales.)

## Notas

- El deployer es el `owner` y, por default, la `treasury`.
- El mint NO usa MON nativo: se paga en stablecoins por el valor de ~10 USDC.
- Random de batalla con `block.prevrandao` (alcanza para demo; sin VRF).
