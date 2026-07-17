import type { Env } from "../../types";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function parseRecord(row: any) {
  if (!row) return null;
  let data = row.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  return { ...row, data: data || {} };
}

async function findByCpf(env: Env, cpf: string) {
  const clean = cpf.replace(/\D/g, "");
  try {
    const row = await env.DB.prepare(
      "SELECT * FROM documents WHERE type = ? AND cpf = ? AND status != 'cancelado' ORDER BY created_at DESC LIMIT 1"
    ).bind("cnh", clean).first<any>();
    if (row) return parseRecord(row);
  } catch {}

  const docs = await env.DB.prepare(
    "SELECT * FROM documents WHERE type = ? AND status != 'cancelado' ORDER BY created_at DESC LIMIT 100"
  ).bind("cnh").all<any>();

  for (const row of docs.results || []) {
    const parsed = await parseRecord(row);
    const candidate = String(parsed?.cpf || parsed?.data?.cpf || "").replace(/\D/g, "");
    if (candidate === clean) return parsed;
  }

  return null;
}

async function findByCode(env: Env, code: string) {
  const normalized = code.trim().toUpperCase();
  const rawCodeLower = code.trim().toLowerCase();
  
  const queries = [
    { sql: "SELECT * FROM documents WHERE type = ? AND codigo_validacao = ? AND status != 'cancelado' LIMIT 1", bind: normalized },
    { sql: "SELECT * FROM documents WHERE type = ? AND codigo_qr = ? AND status != 'cancelado' LIMIT 1", bind: normalized },
    { sql: "SELECT * FROM documents WHERE type = ? AND id = ? AND status != 'cancelado' LIMIT 1", bind: rawCodeLower },
  ];

  for (const query of queries) {
    try {
      const row = await env.DB.prepare(query.sql).bind("cnh", query.bind).first<any>();
      if (row) return parseRecord(row);
    } catch {}
  }

  const docs = await env.DB.prepare(
    "SELECT * FROM documents WHERE type = ? AND status != 'cancelado' ORDER BY created_at DESC LIMIT 100"
  ).bind("cnh").all<any>();

  for (const row of docs.results || []) {
    const parsed = await parseRecord(row);
    const candidates = [
      parsed?.codigo_validacao,
      parsed?.codigo_qr,
      parsed?.codigoQR,
      parsed?.id,
      parsed?.data?.codigo_validacao,
      parsed?.data?.codigo_qr,
      parsed?.data?.codigoQR,
    ]
      .filter(Boolean)
      .map((value: string) => String(value).trim().toUpperCase());
    if (candidates.includes(normalized)) return parsed;
  }

  return null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const cpf = searchParams.get("cpf");
  const code = searchParams.get("code");

  if (!cpf && !code) {
    return new Response(JSON.stringify({ error: "CPF or code required" }), { status: 400, headers });
  }

  try {
    const result = cpf ? await findByCpf(context.env, cpf) : await findByCode(context.env, code || "");

    if (!result) {
      return new Response(JSON.stringify({ error: "CNH not found" }), { status: 404, headers });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), { status: 500, headers });
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers });
