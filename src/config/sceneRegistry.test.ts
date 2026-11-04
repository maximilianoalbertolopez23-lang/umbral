import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESCENA_IDS, PANORAMA_GRAN_SALA, SCENES } from "./sceneRegistry";
import { ZONAS_SALA, SALAS } from "@/modules/taller/sala";

describe("registro de escenas", () => {
  it("tiene las 13 escenas y cada archivo existe en public/", () => {
    expect(ESCENA_IDS).toHaveLength(13);
    for (const id of ESCENA_IDS) {
      expect(SCENES[id].id).toBe(id);
      expect(SCENES[id].src).toBe(`/escenas/${id}.webp`);
      expect(existsSync(`public${SCENES[id].src}`), id).toBe(true);
      expect(SCENES[id].alt.length).toBeGreaterThan(10);
    }
    expect(existsSync(`public${PANORAMA_GRAN_SALA.src}`)).toBe(true);
  });

  it("no se repite ninguna imagen entre escenas", () => {
    expect(new Set(ESCENA_IDS.map((id) => SCENES[id].src)).size).toBe(13);
  });

  it("cada habitación personalizable usa su propia escena", () => {
    expect(SALAS.map((z) => ZONAS_SALA[z].escena)).toEqual(["05_gran_sala", "06_archivo", "07_escritorio_journal", "08_taller"]);
  });
});
