/**
 * GET /api/validate/:code
 * Endpoint público de validação de documentos via QR Code.
 *
 * SEGURANÇA:
 * - Apenas documentos com status "emitido" são considerados válidos
 * - O código QR é gerado exclusivamente pelo servidor no momento da emissão
 * - Não há como forjar um código sem acesso ao banco D1
 */

import type { Env } from "../../types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const code = (params.code as string || "").trim().toUpperCase();

  if (!code || code.length < 4) {
    return new Response(
      JSON.stringify({ valid: false, message: "Código inválido." }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    // Busca na tabela attestations (atestados médicos)
    const attestation = await env.DB.prepare(
      `SELECT
        a.id, a.codigo_qr, a.paciente, a.sexo, a.nascimento,
        a.cpf, a.cns, a.tipo_doc, a.nome_mae, a.endereco,
        a.medico, a.crm, a.especialidade, a.cid, a.cid_display, a.cid_nome,
        a.texto_atestado, a.afastamento, a.data_emissao, a.data_assinatura, a.hora_assinatura,
        a.cidade, a.instituicao, a.unidade, a.endereco_emitente,
        a.logo_url, a.logo_right, a.signature_color, a.signature_image, a.modo_carimbo,
        a.logo_left_scale, a.logo_right_scale, a.logo_left_x, a.logo_left_y, a.logo_right_x, a.logo_right_y,
        a.hide_signature_line, a.hide_patient_signature, a.hide_afastamento_text,
        a.document_type, a.status, a.created_at,
        u.username as emitido_por
       FROM attestations a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.codigo_qr = ? AND a.status = 'emitido'`
    )
      .bind(code)
      .first<Record<string, unknown>>();

    if (attestation) {
      // Garantir que logos relativos funcionem em qualquer domínio
      const formatLogo = (url: any) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('/') && !url.startsWith('//')) {
          return `https://docmaster.store${url}`;
        }
        return url;
      };

      const data = {
        id: attestation.id,
        tipo: attestation.document_type || "atestado",
        type: attestation.document_type || "atestado",
        documentType: attestation.document_type || "atestado",
        document_type: attestation.document_type || "atestado",
        codigoQR: attestation.codigo_qr,
        paciente: attestation.paciente,
        sexo: attestation.sexo,
        nascimento: attestation.nascimento,
        cpf: attestation.cpf,
        cns: attestation.cns,
        tipoDoc: attestation.tipo_doc,
        nomeMae: attestation.nome_mae,
        endereco: attestation.endereco,
        medico: attestation.medico,
        crm: attestation.crm,
        especialidade: attestation.especialidade,
        cid: attestation.cid,
        cidDisplay: attestation.cid_display,
        cidNome: attestation.cid_nome,
        textoAtestado: attestation.texto_atestado,
        afastamento: attestation.afastamento,
        dataEmissao: attestation.data_emissao,
        dataAssinatura: attestation.data_assinatura || attestation.data_emissao,
        horaAssinatura: attestation.hora_assinatura,
        cidade: attestation.cidade,
        instituicao: attestation.instituicao,
        unidade: attestation.unidade,
        enderecoEmitente: attestation.endereco_emitente,
        logoUrl: formatLogo(attestation.logo_url),
        logoRight: formatLogo(attestation.logo_right),
        signatureColor: attestation.signature_color,
        signatureImage: formatLogo(attestation.signature_image),
        modoCarimbo: attestation.modo_carimbo === 1,
        hideSignatureLine: attestation.hide_signature_line === 1,
        hidePatientSignature: attestation.hide_patient_signature === 1,
        hideAfastamentoText: attestation.hide_afastamento_text === 1,
        logoLeftScale: attestation.logo_left_scale ?? 1.0,
        logoRightScale: attestation.logo_right_scale ?? 1.0,
        logoLeftX: attestation.logo_left_x ?? 0,
        logoLeftY: attestation.logo_left_y ?? 0,
        logoRightX: attestation.logo_right_x ?? 0,
        logoRightY: attestation.logo_right_y ?? 0,
        status: attestation.status,
        emitidoPor: attestation.emitido_por,
        createdAt: attestation.created_at,
      };

      return new Response(
        JSON.stringify({ valid: true, message: "Documento válido e autêntico.", data }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Busca na tabela receitas (receituário médico)
    let receita: Record<string, unknown> | null = null;
    try {
      receita = await env.DB.prepare(
        `SELECT
          r.id, r.codigo_qr, r.tipo_receituario,
          r.paciente, r.cpf, r.identidade, r.endereco, r.telefone, r.cidade,
          r.medico, r.crm, r.especialidade, r.instituicao, r.unidade,
          r.endereco_emitente, r.cnpj_emitente, r.telefone_emitente, r.site_emitente,
          r.prescricao, r.data_emissao, r.hora_emissao,
          r.logo_url, r.signature_color, r.signature_image,
          r.status, r.created_at,
          u.username as emitido_por
         FROM receitas r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.codigo_qr = ? AND r.status = 'emitido'`
      )
        .bind(code)
        .first<Record<string, unknown>>();
    } catch {
      receita = null;
    }

    if (receita) {
      let prescricao: any[] = [];
      try {
        prescricao = JSON.parse(receita.prescricao as string || "[]");
      } catch { prescricao = []; }

      return new Response(
        JSON.stringify({
          valid: true,
          message: "Receita médica válida e autêntica.",
          data: {
            id: receita.id,
            tipo: "receita",
            tipo_receituario: receita.tipo_receituario,
            codigoQR: receita.codigo_qr,
            paciente: receita.paciente,
            cpf: receita.cpf,
            identidade: receita.identidade,
            endereco: receita.endereco,
            telefone: receita.telefone,
            cidade: receita.cidade,
            medico: receita.medico,
            crm: receita.crm,
            especialidade: receita.especialidade,
            instituicao: receita.instituicao,
            unidade: receita.unidade,
            endereco_emitente: receita.endereco_emitente,
            cnpj_emitente: receita.cnpj_emitente,
            telefone_emitente: receita.telefone_emitente,
            site_emitente: receita.site_emitente,
            prescricao,
            dataEmissao: receita.data_emissao,
            horaEmissao: receita.hora_emissao,
            logoUrl: receita.logo_url,
            signatureColor: receita.signature_color,
            signatureImage: receita.signature_image,
            status: receita.status,
            emitidoPor: receita.emitido_por,
            createdAt: receita.created_at,
          },
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Busca na tabela documents (CNH, CHA, Toxicológico, etc.)
    let document: Record<string, unknown> | null = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
    const codeLower = code.toLowerCase();
    const codeUpper = code.toUpperCase();

    try {
      if (isUuid) {
        // UUID canônico da emissão: busca indexada direta na chave primária 'id'
        document = await env.DB.prepare(
          `SELECT
            d.id, d.codigo_validacao, d.codigo_qr, d.type, d.data, d.status, d.created_at,
            u.username as emitido_por
           FROM documents d
           LEFT JOIN users u ON d.user_id = u.id
           WHERE d.id = ? AND d.status != 'cancelado'`
        )
          .bind(codeLower)
          .first<Record<string, unknown>>();
      } else {
        // Código de validação / QR alternativo: busca indexada em codigo_validacao / codigo_qr
        document = await env.DB.prepare(
          `SELECT
            d.id, d.codigo_validacao, d.codigo_qr, d.type, d.data, d.status, d.created_at,
            u.username as emitido_por
           FROM documents d
           LEFT JOIN users u ON d.user_id = u.id
           WHERE (d.codigo_validacao = ? OR d.codigo_qr = ?) AND d.status != 'cancelado'`
        )
          .bind(codeUpper, codeUpper)
          .first<Record<string, unknown>>();
      }
    } catch {
      document = null;
    }

    if (document) {
      let parsedData: Record<string, unknown> = {};
      try {
        parsedData = JSON.parse(document.data as string || "{}");
      } catch {}

      const innerData = (parsedData.data && typeof parsedData.data === 'object')
        ? (parsedData.data as Record<string, unknown>)
        : {};

      const get = (key: string, ...aliases: string[]): string => {
        if (innerData[key] !== undefined && innerData[key] !== null && String(innerData[key]).trim() !== "") {
          return String(innerData[key]);
        }
        if (parsedData[key] !== undefined && parsedData[key] !== null && String(parsedData[key]).trim() !== "") {
          return String(parsedData[key]);
        }
        for (const alt of aliases) {
          if (innerData[alt] !== undefined && innerData[alt] !== null && String(innerData[alt]).trim() !== "") {
            return String(innerData[alt]);
          }
          if (parsedData[alt] !== undefined && parsedData[alt] !== null && String(parsedData[alt]).trim() !== "") {
            return String(parsedData[alt]);
          }
        }
        return "";
      };

      const docType = String(document.type || "").toLowerCase();

      let publicData: Record<string, unknown>;

      if (docType === "cnh") {
        publicData = {
          id: document.id,
          tipo: "cnh",
          codigoQR: document.codigo_validacao || document.codigo_qr || document.id,
          status: document.status,
          emitidoPor: document.emitido_por,
          createdAt: document.created_at,
          nome: get("nome", "nomeCompleto", "nome_completo"),
          cpf: get("cpf"),
          rg: get("rg", "docIdentidade", "numero_rg"),
          orgaoEmissor: get("orgaoEmissor", "org_emissor_rg", "orgao_emissor"),
          ufRG: get("ufRG", "uf_rg"),
          dataNascimento: get("dataNascimento", "nascimento", "data_nascimento"),
          sexo: get("sexo"),
          nacionalidade: get("nacionalidade") || "BRASILEIRA",
          nomePai: get("nomePai", "filiacao_pai", "pai"),
          nomeMae: get("nomeMae", "filiacao_mae", "mae"),
          registro: get("registro", "n_registro", "numero_registro"),
          categoria: get("categoria", "categoria_cnh"),
          espelho: get("espelho", "n_cnh", "numero_espelho"),
          validade: get("validade", "validadeCNH"),
          primeiraHabilitacao: get("primeiraHabilitacao", "primeira_habilitacao"),
          localEmissao: get("localEmissao", "local_emissao", "cidade"),
          ufEmissao: get("ufEmissao", "uf_emissao"),
          dataEmissao: get("dataEmissao", "data_emissao"),
          observacoes: get("observacoes", "ear"),
          acc: get("acc"),
          fotoUrl: get("fotoUrl", "foto", "foto_cnh"),
          assinaturaUrl: get("assinaturaUrl", "assinatura"),
          renach: get("renach"),
          localNascimento: get("localNascimento", "local_nascimento"),
          ufNascimento: get("ufNascimento", "uf_nascimento"),
          assDigital1: get("assDigital1", "ass_digital_1"),
          assDigital2: get("assDigital2", "ass_digital_2"),
        };
      } else {
        publicData = {
          id: document.id,
          tipo: document.type,
          codigoQR: document.codigo_validacao || document.codigo_qr || document.id,
          status: document.status,
          emitidoPor: document.emitido_por,
          createdAt: document.created_at,
          nome: get("nome", "paciente", "nomeCompleto", "condutor"),
          cpf: get("cpf"),
          rg: get("rg", "docIdentidade"),
          dataNascimento: get("dataNascimento", "nascimento"),
          dataEmissao: get("dataEmissao", "data_emissao"),
          cidade: get("cidade", "localEmissao"),
          instituicao: get("instituicao"),
          unidade: get("unidade"),
          crm: get("crm"),
          medico: get("medico"),
          especialidade: get("especialidade"),
          laudo: get("laudo", "resultado", "texto_laudo"),
          fotoUrl: get("fotoUrl", "foto"),
          assinaturaUrl: get("assinaturaUrl", "assinatura"),
        };
      }

      return new Response(
        JSON.stringify({
          valid: true,
          message: "Documento válido e autêntico.",
          data: publicData,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ valid: false, message: "Documento não encontrado ou código inválido." }),
      { status: 404, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[validate] Erro:", err);
    return new Response(
      JSON.stringify({ valid: false, message: "Erro interno ao validar documento." }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
