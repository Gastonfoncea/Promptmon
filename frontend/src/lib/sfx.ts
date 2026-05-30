/**
 * Efectos de sonido sintetizados con Web Audio (PRO-25). Sin assets: todo
 * generado en runtime. Cada función es no-op si el browser no tiene audio o si
 * todavía no hubo gesto del usuario (se llaman tras clicks, así que está OK).
 */

function ctx(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    return new Ctor();
  } catch {
    return null;
  }
}

/** "Whoosh" ascendente: al disparar la generación de una criatura. */
export function playWhoosh() {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t0 = ac.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.45);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.55);
  osc.onended = () => ac.close();
}

/** Sirena descendente: en el momento de la conquista. */
export function playSiren() {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t0 = ac.currentTime;
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.5);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.75);
  osc.onended = () => ac.close();
}

/** Golpe seco de impacto: al aceptar un desafío / iniciar la batalla. */
export function playImpact() {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t0 = ac.currentTime;
  osc.type = "square";
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.2);
  gain.gain.setValueAtTime(0.3, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.32);
  osc.onended = () => ac.close();
}
