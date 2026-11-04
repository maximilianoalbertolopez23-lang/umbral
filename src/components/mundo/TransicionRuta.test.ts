import { describe, expect, it } from "vitest";
import { claseTransicion } from "./TransicionRuta";

describe("claseTransicion", () => {
  it("elige el efecto del storyboard según el destino", () => {
    expect(claseTransicion("/sala")).toBe("t-retorno");
    expect(claseTransicion("/archivo")).toBe("t-zoom");
    expect(claseTransicion("/archivo/abc")).toBe("t-elevar");
    expect(claseTransicion("/escritorio/libro/abc")).toBe("t-libro");
    expect(claseTransicion("/taller/sala")).toBe("t-panel");
    expect(claseTransicion("/escritorio")).toBe("animate-aparecer");
  });
});
