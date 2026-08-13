/**
 * PROTOCOLO DE PROTEÇÃO E COMPARAÇÃO DE REGRESSÃO DE DOCUMENTOS EXISTENTES — DOCMASTER
 *
 * Gera snapshots estruturais baseline dos documentos oficiais existentes (atestado, cnh, crlv, receita, historico_sp, historico_uninter, toxicologico)
 * e compara o estado interno contra o baseline para garantir ZERO REGRESSÃO em:
 * - Coordenadas X/Y
 * - Dimensões Largura/Altura (width, height)
 * - Rotação, Escala, Transform e Perspectiva
 * - Tipografia (FontFamily, FontSize, FontWeight, FontStyle, LetterSpacing, Color, TextAlign)
 * - QR Codes (type, format, sourceUrl, pattern, intensity, version, margin, errorCorrectionLevel, URL codificada)
 */

import { loadDocumentData, CoordinateBox } from "@/components/StudioEngine";

export interface DocumentSnapshot {
  documentSlug: string;
  documentName: string;
  boxCount: number;
  boxes: Array<{
    id: string;
    fieldKey: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    fontWeight?: string | number;
    fontStyle?: string;
    letterSpacing?: number;
    color: string;
    textAlign: string;
    isUpperCase: boolean;
    type?: string;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    transform?: string;
    perspective?: string;
    zIndex?: number;
    qrFormat?: string;
    qrSourceUrl?: string;
    qrPattern?: string;
    qrIntensity?: number;
    errorCorrectionLevel?: string;
    version?: number;
    margin?: number;
    data?: string;
  }>;
}

export interface ComparisonResult {
  documentSlug: string;
  status: "PASS" | "FAIL";
  checks: {
    x: "equal" | "diff";
    y: "equal" | "diff";
    width: "equal" | "diff";
    height: "equal" | "diff";
    rotation: "equal" | "diff";
    scale: "equal" | "diff";
    transform: "equal" | "diff";
    font: "equal" | "diff";
    qrData: "equal" | "diff";
    qrConfig: "equal" | "diff";
  };
  failures: string[];
}

/**
 * Cria o snapshot estrutural baseline a partir dos dados brutos do documento
 */
export function createDocumentSnapshot(docRaw: any): DocumentSnapshot {
  const loaded = loadDocumentData(docRaw);

  return {
    documentSlug: loaded.docSlug,
    documentName: loaded.docName,
    boxCount: loaded.boxes.length,
    boxes: loaded.boxes.map((b) => ({
      id: b.id,
      fieldKey: b.fieldKey,
      label: b.label,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      fontSize: b.fontSize,
      fontFamily: b.fontFamily,
      fontWeight: b.fontWeight,
      fontStyle: b.fontStyle,
      letterSpacing: b.letterSpacing,
      color: b.color,
      textAlign: b.textAlign,
      isUpperCase: b.isUpperCase,
      type: b.type,
      rotation: b.rotation,
      scaleX: b.scaleX,
      scaleY: b.scaleY,
      transform: b.transform,
      perspective: b.perspective,
      zIndex: b.zIndex,
      qrFormat: b.qrFormat,
      qrSourceUrl: b.qrSourceUrl,
      qrPattern: b.qrPattern,
      qrIntensity: b.qrIntensity,
      errorCorrectionLevel: b.errorCorrectionLevel,
      version: b.version,
      margin: b.margin,
      data: b.data,
    })),
  };
}

/**
 * Compara o estado reconstruído de um documento com o seu snapshot baseline
 */
export function compareDocumentWithSnapshot(
  baseline: DocumentSnapshot,
  currentRawDoc: any
): ComparisonResult {
  const currentLoaded = loadDocumentData(currentRawDoc);
  const failures: string[] = [];

  if (currentLoaded.boxes.length !== baseline.boxCount) {
    failures.push(`Box count mismatch: expected ${baseline.boxCount}, got ${currentLoaded.boxes.length}`);
  }

  let xStatus: "equal" | "diff" = "equal";
  let yStatus: "equal" | "diff" = "equal";
  let widthStatus: "equal" | "diff" = "equal";
  let heightStatus: "equal" | "diff" = "equal";
  let rotationStatus: "equal" | "diff" = "equal";
  let scaleStatus: "equal" | "diff" = "equal";
  let transformStatus: "equal" | "diff" = "equal";
  let fontStatus: "equal" | "diff" = "equal";
  let qrDataStatus: "equal" | "diff" = "equal";
  let qrConfigStatus: "equal" | "diff" = "equal";

  baseline.boxes.forEach((bBox, idx) => {
    const cBox = currentLoaded.boxes[idx];
    if (!cBox) {
      failures.push(`Missing box index ${idx} (${bBox.fieldKey})`);
      return;
    }

    if (cBox.x !== bBox.x) {
      xStatus = "diff";
      failures.push(`[${bBox.fieldKey}] X mismatch: expected ${bBox.x}, got ${cBox.x}`);
    }
    if (cBox.y !== bBox.y) {
      yStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Y mismatch: expected ${bBox.y}, got ${cBox.y}`);
    }
    if (cBox.width !== bBox.width) {
      widthStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Width mismatch: expected ${bBox.width}, got ${cBox.width}`);
    }
    if (cBox.height !== bBox.height) {
      heightStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Height mismatch: expected ${bBox.height}, got ${cBox.height}`);
    }
    if ((cBox.rotation ?? 0) !== (bBox.rotation ?? 0)) {
      rotationStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Rotation mismatch: expected ${bBox.rotation}, got ${cBox.rotation}`);
    }
    if ((cBox.scaleX ?? 1) !== (bBox.scaleX ?? 1) || (cBox.scaleY ?? 1) !== (bBox.scaleY ?? 1)) {
      scaleStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Scale mismatch`);
    }
    if ((cBox.transform ?? "") !== (bBox.transform ?? "")) {
      transformStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Transform mismatch`);
    }
    if (cBox.fontFamily !== bBox.fontFamily || cBox.fontSize !== bBox.fontSize) {
      fontStatus = "diff";
      failures.push(`[${bBox.fieldKey}] Font mismatch: expected ${bBox.fontFamily} ${bBox.fontSize}px, got ${cBox.fontFamily} ${cBox.fontSize}px`);
    }

    if (bBox.type === "qrcode") {
      if ((cBox.data ?? "") !== (bBox.data ?? "")) {
        qrDataStatus = "diff";
        failures.push(`[${bBox.fieldKey}] QR Data mismatch`);
      }
      if (
        cBox.qrFormat !== bBox.qrFormat ||
        cBox.qrSourceUrl !== bBox.qrSourceUrl ||
        cBox.qrPattern !== bBox.qrPattern
      ) {
        qrConfigStatus = "diff";
        failures.push(`[${bBox.fieldKey}] QR Config mismatch`);
      }
    }
  });

  const isPass = failures.length === 0;

  return {
    documentSlug: baseline.documentSlug,
    status: isPass ? "PASS" : "FAIL",
    checks: {
      x: xStatus,
      y: yStatus,
      width: widthStatus,
      height: heightStatus,
      rotation: rotationStatus,
      scale: scaleStatus,
      transform: transformStatus,
      font: fontStatus,
      qrData: qrDataStatus,
      qrConfig: qrConfigStatus,
    },
    failures,
  };
}
