import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptInput } from "./PromptInput.js";

describe("<PromptInput />", () => {
  it("no permite enviar un prompt vacío (botón deshabilitado, no llama onGenerate)", async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(<PromptInput onGenerate={onGenerate} />);

    const button = screen.getByRole("button", { name: /generar/i });
    expect(button).toBeDisabled();

    // intentar enviar igual no dispara nada
    await userEvent.click(button);
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("habilita el botón con un prompt válido y llama onGenerate con el texto trimmeado", async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(<PromptInput onGenerate={onGenerate} />);

    await userEvent.type(screen.getByRole("textbox"), "  a small cute dragon  ");
    const button = screen.getByRole("button", { name: /generar/i });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onGenerate).toHaveBeenCalledWith("a small cute dragon");
  });

  it("muestra feedback de carga mientras Tripo genera y deshabilita el input", async () => {
    let resolveGen: () => void = () => {};
    const onGenerate = vi.fn(
      () => new Promise<void>((res) => { resolveGen = res; }),
    );
    render(<PromptInput onGenerate={onGenerate} />);

    await userEvent.type(screen.getByRole("textbox"), "a fire lizard");
    await userEvent.click(screen.getByRole("button", { name: /generar/i }));

    // mientras la promesa no resuelve → estado de carga visible
    expect(await screen.findByRole("status")).toHaveTextContent(/generando tu criatura/i);
    expect(screen.getByRole("textbox")).toBeDisabled();

    // al resolver → vuelve al estado normal
    resolveGen();
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });

  it("muestra el mensaje de error si la generación falla", async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error("Sin crédito en Tripo"));
    render(<PromptInput onGenerate={onGenerate} />);

    await userEvent.type(screen.getByRole("textbox"), "a fire lizard");
    await userEvent.click(screen.getByRole("button", { name: /generar/i }));

    expect(await screen.findByText(/sin crédito en tripo/i)).toBeInTheDocument();
    // tras el error se puede reintentar
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("muestra el contador de caracteres restantes", async () => {
    render(<PromptInput onGenerate={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox"), "dragon");
    expect(screen.getByText(/194/)).toBeInTheDocument();
  });
});
