/** Traduce errores crudos de wallet/chain a un mensaje corto y legible. */
export function humanizeTxError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|rejected the request|denied/i.test(msg)) {
    return "Rechazaste la transacción en la wallet.";
  }
  if (/insufficient funds/i.test(msg)) {
    return "No te alcanza el MON para el gas. Pedí del faucet de Monad.";
  }
  if (/NotOwner|not the owner/i.test(msg)) return "Esa criatura no es tuya.";
  if (/Locked|locked/i.test(msg)) return "Esa criatura está en un desafío.";
  if (/ChallengeClosed|not open/i.test(msg)) return "El desafío ya no está abierto.";
  if (/SelfChallenge|creatureId!=myId|same/i.test(msg)) {
    return "No podés pelear una criatura contra sí misma.";
  }
  return msg.split("\n")[0] ?? "Falló la transacción.";
}
