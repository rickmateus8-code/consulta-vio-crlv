/**
 * CNH DIGITAL VIO LAYOUT CONFIGURATION
 * Single Source of Truth (SSOT) para coordenadas e renderização forense 1:1 da CNH (/cnhcria).
 * Permite ajuste arrastável no Studio Engine e sincronia instantânea.
 */

export interface CNHFieldPosition {
  x: number;
  y: number;
  fontSize: number;
  color?: string;
  maxWidth?: number;
  letterSpacing?: string;
}

export const CNH_DEFAULT_LAYOUT = {
  shiftX: 22,
  
  fields: {
    nome: { x: 304, y: 463, fontSize: 21, color: "#000000", maxWidth: 600, letterSpacing: "1px" },
    primeiraHabilitacao: { x: 969, y: 463, fontSize: 21, color: "#000000", maxWidth: 130 },
    nascimento: { x: 599, y: 523, fontSize: 20, color: "#000000", maxWidth: 335 },
    docIdentidade: { x: 599, y: 644, fontSize: 20, color: "#000000", maxWidth: 335 },
    dataEmissao: { x: 599, y: 583, fontSize: 20, color: "#000000", maxWidth: 180 },
    validade: { x: 786, y: 583, fontSize: 20, color: "#c0392b", maxWidth: 160 },
    acc: { x: 1074, y: 572, fontSize: 46.5, color: "#000000", maxWidth: 60 },
    cpf: { x: 599, y: 704, fontSize: 20, color: "#000000", maxWidth: 215 },
    registro: { x: 805, y: 704, fontSize: 20, color: "#c0392b", maxWidth: 175 },
    categoria: { x: 1007, y: 704, fontSize: 21.5, color: "#c0392b", maxWidth: 80 },
    nacionalidade: { x: 599, y: 764, fontSize: 20, color: "#000000", maxWidth: 405 },
    nomePai: { x: 599, y: 832, fontSize: 19, color: "#000000", maxWidth: 415 },
    nomeMae: { x: 599, y: 904, fontSize: 19, color: "#000000", maxWidth: 415 },
    observacoes: { x: 299, y: 1334, fontSize: 19.9, color: "#000000", maxWidth: 740 },
    localEmissao: { x: 295, y: 1579, fontSize: 20, color: "#000000", maxWidth: 500 },
    nomeEstadoExtenso: { x: 600, y: 1668, fontSize: 43.9, color: "#000000" },
    assDigital1: { x: 965, y: 1559, fontSize: 18.2, color: "#222222" },
    assDigital2: { x: 915, y: 1584, fontSize: 18.2, color: "#222222" },
    espelho: { x: 208, y: 952, fontSize: 40, color: "#000000" },
    qrCode: { x: 1350, y: 1430, size: 860 }
  }
};

// Carrega layout salvo no localStorage (se configurado via Studio visualmente)
export function getActiveCNHLayout() {
  try {
    const saved = localStorage.getItem("docmaster_cnh_layout_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...CNH_DEFAULT_LAYOUT, fields: { ...CNH_DEFAULT_LAYOUT.fields, ...parsed.fields } };
    }
  } catch {}
  return CNH_DEFAULT_LAYOUT;
}

export function saveActiveCNHLayout(layoutConfig: any) {
  try {
    localStorage.setItem("docmaster_cnh_layout_config", JSON.stringify(layoutConfig));
  } catch {}
}
