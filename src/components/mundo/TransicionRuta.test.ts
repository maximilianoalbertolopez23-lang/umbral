import { describe, expect, it } from "vitest";
import { claseTransicion, claseTransicionJuego } from "./TransicionRuta";

describe("claseTransicion", () => {
  it("elige el efecto del storyboard según el destino", () => {
    expect(claseTransicionJuego("/sala")).toBe("t-retorno");
    expect(claseTransicionJuego("/archivo")).toBe("t-zoom");
    expect(claseTransicionJuego("/archivo/abc")).toBe("t-elevar");
    expect(claseTransicionJuego("/escritorio/libro/abc")).toBe("t-libro");
    expect(claseTransicionJuego("/taller/sala")).toBe("t-panel");
    expect(claseTransicionJuego("/escritorio")).toBe("animate-aparecer");
  });
  it("sin juego no hay transiciones", () => {
    expect(claseTransicion("/archivo")).toBe("");
  });
});
