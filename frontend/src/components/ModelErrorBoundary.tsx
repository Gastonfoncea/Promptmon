"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary para la carga de modelos 3D. Si un .glb no carga (URL expirada,
 * red caída, etc.) renderiza el fallback en vez de tumbar toda la app — clave
 * para que la demo en vivo no muestre una pantalla de error.
 *
 * Resetear con `key` desde el padre (ej. key={glbUrl}) para reintentar con otro modelo.
 */
export class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("No se pudo cargar el modelo 3D:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
