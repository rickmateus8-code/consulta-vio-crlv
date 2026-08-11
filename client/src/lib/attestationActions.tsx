import { createElement } from "react";
import { createRoot } from "react-dom/client";
import AttestationDocument from "@/components/AttestationDocument";
import type { AttestationData } from "@/data/attestations";
import { exportElementToPDF, generatePDFFilename } from "@/lib/pdfExport";

export interface AttestationDocRecord {
  id: string;
  nome?: string;
  paciente?: string;
  cpf?: string;
  status?: string;
  codigo_qr?: string;
  data?: any;
  [key: string]: any;
}

function parseAttestationDocData(doc: AttestationDocRecord) {
  if (!doc) return {};
  let parsed = {};
  if (doc.data) {
    if (typeof doc.data === "string") {
      try {
        parsed = JSON.parse(doc.data || "{}");
      } catch {
        parsed = {};
      }
    } else if (typeof doc.data === "object") {
      parsed = doc.data;
    }
  }
  return { ...doc, ...parsed };
}

export function buildAttestationData(doc: AttestationDocRecord): AttestationData & Record<string, any> {
  const d = parseAttestationDocData(doc);
  return {
    id: doc.id,
    paciente: d.paciente || d.nome_paciente || doc.nome || doc.paciente || "",
    cpf: d.cpf || d.cpf_paciente || doc.cpf || "",
    cns: d.cns || "",
    tipoDoc: d.tipo_doc || d.tipoDoc || (d.cns ? "CNS" : "CPF"),
    sexo: d.sexo || "FEMALE",
    nascimento: d.nascimento || "",
    nomeMae: d.nome_mae || d.nomeMae || "",
    endereco: d.endereco || "",
    medico: d.medico || doc.medico || "",
    crm: d.crm || "",
    especialidade: d.especialidade || "",
    cid: d.cid || "",
    cidDisplay: d.cid_display || d.cidDisplay || d.cid || "",
    cidNome: d.cid_nome || d.cidNome || "",
    afastamento: d.afastamento || "3",
    textoAtestado: d.texto_atestado || d.textoAtestado || "",
    dataAssinatura: d.data_assinatura || d.dataAssinatura || d.data_emissao || "",
    horaAssinatura: d.hora_assinatura || d.horaAssinatura || "",
    dataEmissao: d.data_emissao || d.dataEmissao || "",
    instituicao: d.instituicao || "",
    unidade: d.unidade || "",
    enderecoEmitente: d.endereco_emitente || d.enderecoEmitente || "",
    cidade: d.cidade || "",
    logoUrl: d.logo_url || d.logoUrl || "",
    logoRight: d.logo_right || d.logoRight || "",
    signatureColor: d.signature_color || d.signatureColor || "#0b109f",
    signatureImage: d.signature_image || d.signatureImage || "",
    modoCarimbo: d.modo_carimbo === 1 || d.modoCarimbo === true,
    codigoQR: doc.codigo_qr || d.codigo_qr || d.codigoQR || "",
    status: doc.status || "emitido",
    documentType: d.document_type || d.documentType || "atestado",
    logoLeftScale: d.logo_left_scale ?? d.logoLeftScale ?? 1,
    logoRightScale: d.logo_right_scale ?? d.logoRightScale ?? 1,
    logoLeftX: d.logo_left_x ?? d.logoLeftX ?? 0,
    logoLeftY: d.logo_left_y ?? d.logoLeftY ?? 0,
    logoRightX: d.logo_right_x ?? d.logoRightX ?? 0,
    logoRightY: d.logo_right_y ?? d.logoRightY ?? 0,
    stampScale: d.stamp_scale ?? d.stampScale ?? 1.2,
    stampX: d.stamp_x ?? d.stampX ?? 141,
    stampY: d.stamp_y ?? d.stampY ?? -120,
    stampRotate: d.stamp_rotate ?? d.stampRotate ?? -3,
    hideQRCode: d.hide_qr_code === 1 || d.hideQRCode === true,
    showStampInfo: d.show_stamp_info !== 0 && d.showStampInfo !== false,
  } as AttestationData & Record<string, any>;
}

export async function fetchLatestAttestationRecord<T extends AttestationDocRecord>(doc: T): Promise<T> {
  try {
    const res = await fetch(`/api/attestations/${doc.id}`, { credentials: "include" });
    if (!res.ok) return doc;
    const json = await res.json();
    const latest = json.data || json;
    if (!latest?.id) return doc;

    return {
      ...doc,
      ...latest,
      nome: latest.paciente || latest.nome_paciente || doc.nome || doc.paciente || "",
      paciente: latest.paciente || doc.paciente,
      cpf: latest.cpf || doc.cpf,
      codigo_qr: latest.codigo_qr || doc.codigo_qr,
      data: {
        ...parseAttestationDocData(doc),
        ...latest,
      },
    } as T;
  } catch {
    return doc;
  }
}

export async function downloadAttestationPdf<T extends AttestationDocRecord>(doc: T): Promise<T> {
  const latestDoc = await fetchLatestAttestationRecord(doc);
  const attData = buildAttestationData(latestDoc);
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    await new Promise<void>((resolve) => {
      root.render(
        createElement(AttestationDocument, {
          data: attData,
          logoLeft: attData.logoUrl,
          logoRight: attData.logoRight,
          signatureColor: attData.signatureColor,
          signatureImage: attData.signatureImage,
          documentType: attData.documentType,
          logoLeftScale: attData.logoLeftScale,
          logoRightScale: attData.logoRightScale,
          logoLeftX: attData.logoLeftX,
          logoLeftY: attData.logoLeftY,
          logoRightX: attData.logoRightX,
          logoRightY: attData.logoRightY,
          stampScale: attData.stampScale,
          stampX: attData.stampX,
          stampY: attData.stampY,
          stampRotate: attData.stampRotate,
          hideQRCode: attData.hideQRCode,
          showStampInfo: attData.showStampInfo,
          modoCarimbo: attData.modoCarimbo,
          isExporting: true, // Habilitar ajustes estritos de exportação
          })
          );      setTimeout(resolve, 1200);
    });

    await exportElementToPDF(container.firstElementChild as HTMLElement, {
      filename: generatePDFFilename(
        attData.paciente || "PACIENTE",
        attData.documentType === "laudo" ? "laudo" : "atestado"
      ),
      scale: 2,
      quality: 0.92,
    });

    return latestDoc;
  } finally {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
