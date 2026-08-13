/**
 * ENGINE CENTRALIZADO DE QR CODE COM CONTROLE DE INTENSIDADE/DENSIDADE — DOCMASTER
 * 
 * Regra Fundamental:
 * 1. Calcula a versão mínima necessária para o conteúdo (data) + errorCorrectionLevel ("H").
 * 2. Aplica a escala de intensidade (0 a 5 ou presets: compact, balanced, standard, dense).
 * 3. Seleciona a versão QR (1 a 40) correspondente, aumentando a densidade da matriz sem alterar o tamanho físico (size).
 * 4. Valida a legibilidade do módulo (moduleSize >= 2px).
 * 5. Não altera a URL, parâmetros (id, codigo) ou rotas de validação (/consulta/, /validar).
 */
import QRCode from "qrcode";

export type QRIntensity = 0 | 1 | 2 | 3 | 4 | 5;
export type QRPreset = "compact" | "balanced" | "standard" | "dense";
export type QRErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QRCodeEngineOptions {
  data: string;
  intensity?: QRIntensity;
  preset?: QRPreset;
  size?: number;
  errorCorrectionLevel?: QRErrorCorrectionLevel;
  margin?: number;
}

// Escala progressiva de intensidade relativa sobre a versão mínima
const INTENSITY_MAP: Record<QRIntensity, number> = {
  0: 1.00, // Mínimo
  1: 1.10, // Baixo (compact)
  2: 1.25, // Moderado (balanced)
  3: 1.40, // Padrão (standard)
  4: 1.60, // Alto (dense)
  5: 1.80  // Máximo
};

const PRESET_MAP: Record<QRPreset, QRIntensity> = {
  compact: 1,
  balanced: 2,
  standard: 3,
  dense: 4
};

/**
 * Calcula a versão efetiva e segura da matriz QR baseada nos parâmetros.
 */
export function calculateQRVersion(options: QRCodeEngineOptions): {
  effectiveVersion: number;
  minVersion: number;
  intensity: QRIntensity;
  moduleCount: number;
  moduleSize: number;
} {
  const data = options.data || "https://docmaster.store";
  const ecl = options.errorCorrectionLevel || "H";
  const size = options.size || 260;
  const margin = options.margin !== undefined ? options.margin : 4;

  // Resolver intensidade por número ou por preset
  let intensity: QRIntensity = 3; // Padrão
  if (options.intensity !== undefined) {
    intensity = Math.max(0, Math.min(5, options.intensity)) as QRIntensity;
  } else if (options.preset) {
    intensity = PRESET_MAP[options.preset] || 3;
  }

  // 1. Determinar a menor versão QR capaz de armazenar o conteúdo completo
  let minVersion = 1;
  try {
    const qrModel = QRCode.create(data, { errorCorrectionLevel: ecl });
    minVersion = qrModel.version || 1;
  } catch (err) {
    // Se estourar a capacidade da v1, incrementar até encontrar a minVersion válida
    for (let v = 1; v <= 40; v++) {
      try {
        QRCode.create(data, { version: v, errorCorrectionLevel: ecl });
        minVersion = v;
        break;
      } catch {}
    }
  }

  // 2. Aplicar o multiplicador de intensidade para elevar a versão da matriz
  const multiplier = INTENSITY_MAP[intensity] || 1.4;
  let targetVersion = Math.max(minVersion, Math.ceil(minVersion * multiplier));

  // Para pequenas strings, permitir incremento perceptível de densidade quando solicitado
  if (intensity > 0 && minVersion <= 3) {
    targetVersion = Math.min(40, minVersion + intensity);
  }

  // 3. Limite de legibilidade (Módulo mínimo de 2.0px)
  let effectiveVersion = targetVersion;
  const usableSize = size - 2 * margin;

  while (effectiveVersion > minVersion) {
    const count = effectiveVersion * 4 + 17;
    const modSize = usableSize / count;
    if (modSize >= 2.0) {
      break;
    }
    effectiveVersion--;
  }

  const finalCount = effectiveVersion * 4 + 17;
  const finalModSize = usableSize / finalCount;

  return {
    effectiveVersion,
    minVersion,
    intensity,
    moduleCount: finalCount,
    moduleSize: finalModSize
  };
}

/**
 * Gera um Data URL em formato PNG do QR Code com densidade controlada.
 */
export async function generateQRCodeDataURL(options: QRCodeEngineOptions): Promise<string> {
  const data = options.data || "https://docmaster.store";
  const ecl = options.errorCorrectionLevel || "H";
  const size = options.size || 260;
  const margin = options.margin !== undefined ? options.margin : 4;

  const { effectiveVersion } = calculateQRVersion(options);

  return await QRCode.toDataURL(data, {
    version: effectiveVersion,
    errorCorrectionLevel: ecl,
    width: size,
    margin,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  });
}

/**
 * Gera uma string SVG do QR Code com nitidez máxima (crispEdges).
 */
export async function generateQRCodeSVGString(options: QRCodeEngineOptions): Promise<string> {
  const data = options.data || "https://docmaster.store";
  const ecl = options.errorCorrectionLevel || "H";
  const size = options.size || 260;
  const margin = options.margin !== undefined ? options.margin : 4;

  const { effectiveVersion } = calculateQRVersion(options);

  const svgRaw = await QRCode.toString(data, {
    type: "svg",
    version: effectiveVersion,
    errorCorrectionLevel: ecl,
    width: size,
    margin,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  });

  // Garantir renderização nítida sem anti-aliasing nos módulos SVG
  return svgRaw.replace("<svg", '<svg shape-rendering="crispEdges"');
}
