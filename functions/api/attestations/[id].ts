/**
 * /api/attestations/[id] — Proxy para o handler principal de attestations
 * Suporta GET (buscar por ID), PUT (editar), DELETE (excluir)
 */

import type { Env } from '../../types';
import { isValidCpf, isValidCrm, isValidCid } from '../../utils/validation';

function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAuthUser(env: Env, token: string | null): Promise<any | null> {
  if (!token) return null;
  const now = new Date().toISOString();
  const session = await env.DB.prepare(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ? LIMIT 1"
  ).bind(token, now).first<{ user_id: string }>();
  if (!session) return null;
  const user = await env.DB.prepare(
    "SELECT id, username, role, balance, is_active FROM users WHERE id = ? AND is_active = 1 LIMIT 1"
  ).bind(session.user_id).first<any>();
  return user || null;
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

function jsonResponse(request: Request, data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(request) });
}

function hasOwn(obj: any, key: string): boolean {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function getPresentValue(obj: any, keys: string[]): { present: boolean; value: any } {
  for (const key of keys) {
    if (hasOwn(obj, key)) {
      return { present: true, value: obj[key] };
    }
  }
  return { present: false, value: undefined };
}

function toNullableUpper(value: any): string | null {
  if (value === null || value === undefined) return null;
  return String(value).toUpperCase();
}

function toNullableString(value: any): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toNullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNullableBooleanNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

function resolveValue(
  body: any,
  existing: any,
  incomingKeys: string[],
  existingKey: string,
  transform: (value: any) => any = (value) => value
) {
  const incoming = getPresentValue(body, incomingKeys);
  if (incoming.present) {
    return transform(incoming.value);
  }
  return existing[existingKey] ?? null;
}

function buildSyncPayload(row: any) {
  return {
    paciente: row.paciente || "",
    sexo: row.sexo || "FEMALE",
    nascimento: row.nascimento || "",
    cpf: row.cpf || "-",
    cns: row.cns || "",
    tipo_doc: row.tipo_doc || (row.cns ? "CNS" : "CPF"),
    nome_mae: row.nome_mae || "-",
    endereco: row.endereco || "-",
    condicao: row.texto_atestado || "Atestado médico",
    texto_atestado: row.texto_atestado || "",
    vacinacao: "-",
    cid: row.cid_display || row.cid || "-",
    cid_display: row.cid_display || row.cid || "-",
    cid_nome: row.cid_nome || "",
    medico: row.medico || "",
    crm: row.crm || "",
    especialidade: row.especialidade || "",
    data_assinatura: row.data_assinatura || "",
    hora_assinatura: row.hora_assinatura || "",
    data_emissao: row.data_emissao || "",
    logo_url: row.logo_url || "",
    logo_right: row.logo_right || "",
    endereco_emitente: row.endereco_emitente || "",
    instituicao: row.instituicao || "",
    unidade: row.unidade || "",
    cidade: row.cidade || "",
    signature_color: row.signature_color || "#0b109f",
    signature_image: row.signature_image || "",
    modo_carimbo: row.modo_carimbo || 0,
    logo_left_scale: row.logo_left_scale ?? 1.0,
    logo_right_scale: row.logo_right_scale ?? 1.0,
    logo_left_x: row.logo_left_x ?? 0,
    logo_left_y: row.logo_left_y ?? 0,
    logo_right_x: row.logo_right_x ?? 0,
    logo_right_y: row.logo_right_y ?? 0,
    document_type: row.document_type || 'atestado',
    hide_signature_line: row.hide_signature_line ?? 0,
    hide_patient_signature: row.hide_patient_signature ?? 0,
    hide_afastamento_text: row.hide_afastamento_text ?? 0,
  };
}

async function syncUpdateToIdab(env: Env, row: any) {
  if (!row?.codigo_qr) return;
  const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";

  try {
    const response = await fetch(`https://validaratestado.digital/api/attestations/${encodeURIComponent(row.codigo_qr)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${syncToken}`,
      },
      body: JSON.stringify(buildSyncPayload(row)),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("[sync-edit] IDAB respondeu com erro:", response.status, errorText);
    }
  } catch (syncErr) {
    console.warn("[sync-edit] Falha ao sincronizar edição com IDAB:", syncErr);
  }
}

async function syncDeleteToIdab(env: Env, codigoQr: string | null | undefined) {
  if (!codigoQr) return;
  const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";

  try {
    await fetch(`https://validaratestado.digital/api/attestations/${encodeURIComponent(codigoQr)}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${syncToken}`,
      },
    });
  } catch (syncErr) {
    console.warn("[sync-delete] Falha ao sincronizar exclusão com IDAB:", syncErr);
  }
}

export async function onRequest(context: { request: Request; env: Env; params: { id: string } }) {
  const { request, env, params } = context;
  const attestationId = params.id;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    }});
  }

  const token = getSessionToken(request);
  const user = await getAuthUser(env, token);

  // Permitir GET público (Validação)
  const isPublicGet = request.method === "GET";

  if (!user && !isPublicGet) {
    return jsonResponse(request, { success: false, error: "Não autenticado." }, 401);
  }

  try {
    if (request.method === "GET") {
      const isAdmin = user?.role === "admin";
      const row = (!user || isAdmin)
        ? await env.DB.prepare("SELECT * FROM attestations WHERE id = ? LIMIT 1").bind(attestationId).first()
        : await env.DB.prepare("SELECT * FROM attestations WHERE id = ? AND user_id = ? LIMIT 1").bind(attestationId, user.id).first();

      if (!row) {
        return jsonResponse(request, { success: false, error: "Atestado não encontrado." }, 404);
      }

      return jsonResponse(request, { success: true, data: row });
    }

    if (request.method === "PUT") {
      const existing = await env.DB.prepare("SELECT * FROM attestations WHERE id = ? LIMIT 1")
        .bind(attestationId)
        .first<any>();

      if (!existing) {
        return jsonResponse(request, { success: false, error: "Atestado não encontrado." }, 404);
      }
      if (existing.user_id !== user.id && user.role !== "admin") {
        return jsonResponse(request, { success: false, error: "Sem permissão." }, 403);
      }

      const rawBody = await request.json() as any;
      const editPayload = rawBody?.data || rawBody || {};

      const fieldMap: Record<string, string> = {
        nome_paciente: 'paciente',
        nome_medico: 'medico',
        uf_crm: 'uf_crm',
        dias_afastamento: 'afastamento',
        tipo_doc: 'tipo_doc',
        observacoes: 'texto_atestado',
        hora_emissao: 'hora_assinatura',
      };

      const body: any = {};
      for (const [key, value] of Object.entries(editPayload)) {
        body[fieldMap[key] || key] = value;
      }

      if (rawBody?.fillCpf && body.cpf && !existing.cpf) {
        body.tipo_doc = 'CPF';
      }

      if (body.cpf && existing.cpf && body.cpf !== existing.cpf) {
        return jsonResponse(request, { success: false, error: "CPF não pode ser alterado após emissão." }, 400);
      }

      if (body.cpf && !isValidCpf(body.cpf)) {
        return jsonResponse(request, { success: false, error: "CPF inválido." }, 400);
      }
      if (body.crm && !isValidCrm(body.crm)) {
        return jsonResponse(request, { success: false, error: "CRM inválido." }, 400);
      }
      if (body.cid && !isValidCid(body.cid)) {
        return jsonResponse(request, { success: false, error: "CID inválido." }, 400);
      }

      const now = new Date().toISOString();

      await env.DB.prepare(`
        UPDATE attestations SET
          cpf = ?,
          cns = ?,
          tipo_doc = ?,
          instituicao = ?,
          unidade = ?,
          endereco_emitente = ?,
          medico = ?,
          crm = ?,
          especialidade = ?,
          paciente = ?,
          sexo = ?,
          nascimento = ?,
          nome_mae = ?,
          endereco = ?,
          cid = ?,
          cid_display = ?,
          cid_nome = ?,
          afastamento = ?,
          texto_atestado = ?,
          data_assinatura = ?,
          hora_assinatura = ?,
          data_emissao = ?,
          cidade = ?,
          logo_url = ?,
          logo_right = ?,
          signature_color = ?,
          signature_image = ?,
          modo_carimbo = ?,
          logo_left_scale = ?,
          logo_right_scale = ?,
          logo_left_x = ?,
          logo_left_y = ?,
          logo_right_x = ?,
          logo_right_y = ?,
          document_type = ?,
          hide_signature_line = ?,
          hide_patient_signature = ?,
          hide_afastamento_text = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        existing.cpf || resolveValue(body, existing, ['cpf'], 'cpf', toNullableString),
        existing.cns || resolveValue(body, existing, ['cns'], 'cns', toNullableString),
        resolveValue(body, existing, ['tipoDoc', 'tipo_doc'], 'tipo_doc', toNullableString),
        resolveValue(body, existing, ['instituicao'], 'instituicao', toNullableUpper),
        resolveValue(body, existing, ['unidade'], 'unidade', toNullableUpper),
        resolveValue(body, existing, ['enderecoEmitente', 'endereco_emitente'], 'endereco_emitente', toNullableUpper),
        resolveValue(body, existing, ['medico'], 'medico', toNullableUpper),
        resolveValue(body, existing, ['crm'], 'crm', toNullableString),
        resolveValue(body, existing, ['especialidade'], 'especialidade', toNullableUpper),
        resolveValue(body, existing, ['paciente'], 'paciente', toNullableUpper),
        resolveValue(body, existing, ['sexo'], 'sexo', toNullableString),
        resolveValue(body, existing, ['nascimento'], 'nascimento', toNullableString),
        resolveValue(body, existing, ['nomeMae', 'nome_mae'], 'nome_mae', toNullableUpper),
        resolveValue(body, existing, ['endereco'], 'endereco', toNullableUpper),
        resolveValue(body, existing, ['cid'], 'cid', toNullableString),
        resolveValue(body, existing, ['cidDisplay', 'cid_display'], 'cid_display', toNullableString),
        resolveValue(body, existing, ['cidNome', 'cid_nome'], 'cid_nome', toNullableString),
        resolveValue(body, existing, ['afastamento'], 'afastamento', toNullableString),
        resolveValue(body, existing, ['textoAtestado', 'texto_atestado'], 'texto_atestado', toNullableString),
        resolveValue(body, existing, ['dataAssinatura', 'data_assinatura'], 'data_assinatura', toNullableString),
        resolveValue(body, existing, ['horaAssinatura', 'hora_assinatura'], 'hora_assinatura', toNullableString),
        resolveValue(body, existing, ['dataEmissao', 'data_emissao'], 'data_emissao', toNullableString),
        resolveValue(body, existing, ['cidade'], 'cidade', toNullableUpper),
        resolveValue(body, existing, ['logoUrl', 'logo_url'], 'logo_url', toNullableString),
        resolveValue(body, existing, ['logoRight', 'logo_right'], 'logo_right', toNullableString),
        resolveValue(body, existing, ['signatureColor', 'signature_color'], 'signature_color', toNullableString),
        resolveValue(body, existing, ['signatureImage', 'signature_image'], 'signature_image', toNullableString),
        resolveValue(body, existing, ['modoCarimbo', 'modo_carimbo'], 'modo_carimbo', toNullableBooleanNumber),
        resolveValue(body, existing, ['logoLeftScale', 'logo_left_scale'], 'logo_left_scale', toNullableNumber),
        resolveValue(body, existing, ['logoRightScale', 'logo_right_scale'], 'logo_right_scale', toNullableNumber),
        resolveValue(body, existing, ['logoLeftX', 'logo_left_x'], 'logo_left_x', toNullableNumber),
        resolveValue(body, existing, ['logoLeftY', 'logo_left_y'], 'logo_left_y', toNullableNumber),
        resolveValue(body, existing, ['logoRightX', 'logo_right_x'], 'logo_right_x', toNullableNumber),
        resolveValue(body, existing, ['logoRightY', 'logo_right_y'], 'logo_right_y', toNullableNumber),
        resolveValue(body, existing, ['documentType', 'document_type'], 'document_type', toNullableString),
        resolveValue(body, existing, ['hideSignatureLine', 'hide_signature_line'], 'hide_signature_line', toNullableBooleanNumber),
        resolveValue(body, existing, ['hidePatientSignature', 'hide_patient_signature'], 'hide_patient_signature', toNullableBooleanNumber),
        resolveValue(body, existing, ['hideAfastamentoText', 'hide_afastamento_text'], 'hide_afastamento_text', toNullableBooleanNumber),
        now,
        attestationId
      ).run();

      const updated = await env.DB.prepare("SELECT * FROM attestations WHERE id = ? LIMIT 1")
        .bind(attestationId)
        .first<any>();

      await syncUpdateToIdab(env, updated);

      return jsonResponse(request, {
        success: true,
        message: "Atestado atualizado com sucesso.",
        data: updated,
      });
    }

    if (request.method === "DELETE") {
      const existing = await env.DB.prepare("SELECT id, user_id, codigo_qr FROM attestations WHERE id = ? LIMIT 1")
        .bind(attestationId)
        .first<any>();

      if (!existing) {
        return jsonResponse(request, { success: false, error: "Atestado não encontrado." }, 404);
      }
      if (existing.user_id !== user.id && user.role !== "admin") {
        return jsonResponse(request, { success: false, error: "Sem permissão." }, 403);
      }

      await syncDeleteToIdab(env, existing.codigo_qr);
      await env.DB.prepare("DELETE FROM attestations WHERE id = ?").bind(attestationId).run();

      return jsonResponse(request, { success: true, message: "Atestado excluído com sucesso." });
    }

    return jsonResponse(request, { success: false, error: "Método não permitido." }, 405);
  } catch (error) {
    console.error("[attestations/id] Erro:", error);
    return jsonResponse(request, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno.",
    }, 500);
  }
}
