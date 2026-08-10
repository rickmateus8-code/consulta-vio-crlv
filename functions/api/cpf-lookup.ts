/**
 * Cloudflare Pages Function — Consulta de CPF via Snoop Intelligence API
 * Rota: GET /api/cpf-lookup?cpf=00000000000
 *
 * Retorna dados do paciente: nome, nascimento, sexo, mae, endereco, cidade, uf, cep
 * Requer autenticação de sessão (apenas usuários logados podem consultar).
 *
 * Provider primário: Snoop Intelligence (https://snoopintelligence.cloud/api/v2)
 * Fallback: BrasilAPI (dados básicos da Receita Federal)
 */

interface Env {
  DB: D1Database;
}

const SNOOP_API_KEY = "snp_dP3ynuQD-sTMH-CVmi-1kQh-yJNuqT7tMP3f";
const SNOOP_BASE_URL = "https://snoopintelligence.cloud/api/v2";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(cpf[10]);
}

function normalizeSexo(raw: string): "MALE" | "FEMALE" {
  const s = String(raw || "").toUpperCase().trim();
  if (["F", "FEMININO", "FEMALE"].includes(s)) return "FEMALE";
  if (["M", "MASCULINO", "MALE"].includes(s)) return "MALE";
  return "MALE";
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  const s = String(raw).trim();

  // YYYY-MM-DD → DD/MM/AAAA
  if (s.length >= 10 && s[4] === "-") {
    const parts = s.substring(0, 10).split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return s;
}

function firstNonEmpty(...values: any[]): string {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeSnoopPayload(result: any) {
  // Suporta múltiplos formatos de envelope: { data: {...} }, { body: {...} } ou payload direto
  const payload = result?.data || result?.body || result;
  if (!payload || typeof payload !== "object") return null;

  // Suporta endereço em múltiplos formatos e estruturas aninhadas
  const address = payload.address || payload.endereco || payload.addresses?.[0] || {};
  const relatives = payload.relatives || payload.parentesco || {};

  const nome = firstNonEmpty(
    payload.nome,
    payload.name,
    payload.nome_completo,
    payload.full_name
  ).toUpperCase();
  if (!nome) return null;

  // Cobre todos os aliases conhecidos da API Snoop para Nome da Mãe
  const nomeMae = firstNonEmpty(
    payload.mae,
    payload.nome_mae,
    payload.mother_name,
    payload.nomeMae,
    payload.mother,
    payload.mae_completo,
    payload.nome_mae_completo,
    relatives.mother,
    relatives.mae,
    relatives.nome_mae
  ).toUpperCase();

  // Cobre todos os aliases conhecidos da API Snoop para Nome do Pai
  const nomePai = firstNonEmpty(
    payload.pai,
    payload.nome_pai,
    payload.father_name,
    payload.nomePai,
    payload.father,
    payload.pai_completo,
    payload.nome_pai_completo,
    relatives.father,
    relatives.pai,
    relatives.nome_pai,
    Array.isArray(payload.parentes) ? payload.parentes.find((p: any) => p?.vinculo === "PAI" || p?.parentesco === "PAI" || p?.relacao === "PAI")?.nome : ""
  ).toUpperCase();

  const rg = firstNonEmpty(
    payload.rg,
    payload.numero_rg,
    payload.rg_numero,
    payload.rg_num,
    payload.documento_rg
  ).replace(/\D/g, "");

  const orgaoEmissor = firstNonEmpty(
    payload.orgao_emissor,
    payload.orgao_expedidor,
    payload.orgaoEmissor,
    payload.orgao_rg,
    payload.emissor_rg,
    payload.orgao_emissor_rg,
    payload.emissor
  ).toUpperCase();

  const ufRG = firstNonEmpty(
    payload.uf_rg,
    payload.estado_rg,
    payload.uf_emissao_rg,
    payload.uf_expedicao_rg,
    payload.uf_emissor,
    payload.uf,
    address.uf,
    address.state
  ).toUpperCase();

  const endereco = firstNonEmpty(
    payload.logradouro,
    payload.endereco,
    address.logradouro,
    address.street,
    address.address,
    address.endereco
  ).toUpperCase();

  const numero = firstNonEmpty(
    payload.numero,
    payload.number,
    address.numero,
    address.number
  ).toUpperCase();

  const bairro = firstNonEmpty(
    payload.bairro,
    address.bairro,
    address.neighborhood,
    address.district
  ).toUpperCase();

  const cidade = firstNonEmpty(
    payload.cidade,
    payload.municipio,
    address.cidade,
    address.city,
    address.municipio
  ).toUpperCase();

  const uf = firstNonEmpty(
    payload.uf,
    payload.estado,
    address.uf,
    address.state,
    address.estado
  ).toUpperCase();

  const cep = firstNonEmpty(
    payload.cep,
    address.cep,
    address.zip_code,
    address.zipcode
  );

  return {
    nome,
    nascimento: normalizeDate(firstNonEmpty(
      payload.nascimento,
      payload.birth_date,
      payload.data_nascimento,
      payload.dt_nascimento
    )),
    sexo: normalizeSexo(firstNonEmpty(
      payload.sexo,
      payload.gender,
      payload.genero
    )),
    rg,
    orgaoEmissor: orgaoEmissor || "SSP",
    ufRG: ufRG || uf || "SP",
    nomePai,
    nomeMae,
    endereco,
    numero,
    bairro,
    cidade,
    uf,
    cep,
  };
}

async function getAuthUser(request: Request, env: Env): Promise<any | null> {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/docmaster_session=([^;]+)/) || cookie.match(/session_token=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  try {
    const session = await env.DB.prepare(
      "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(token).first<{ user_id: number }>();
    return session || null;
  } catch (_) {
    return null;
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: "Não autenticado." }),
      { status: 401, headers: corsHeaders() }
    );
  }

  const url = new URL(request.url);
  const cpfRaw = url.searchParams.get("cpf") || "";
  const cpf = cpfRaw.replace(/\D/g, "");

  if (cpf.length !== 11) {
    return new Response(
      JSON.stringify({ success: false, error: "CPF inválido. Informe 11 dígitos." }),
      { status: 400, headers: corsHeaders() }
    );
  }

  if (!validateCPF(cpf)) {
    return new Response(
      JSON.stringify({ success: false, error: "CPF inválido. Verifique os dígitos." }),
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const snoopEndpoints = [
      `${SNOOP_BASE_URL}/cpf?cpf=${cpf}`,
      `${SNOOP_BASE_URL}/generic/cpf?cpf=${cpf}`,
    ];

    const activeApiKey = (env as any)?.SNOOP_API_KEY || SNOOP_API_KEY;
    for (const endpoint of snoopEndpoints) {
      const snoopRes = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${activeApiKey}`,
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (snoopRes.status === 404) {
        continue;
      }

      if (!snoopRes.ok) {
        continue;
      }

      const result = await snoopRes.json() as any;
      const normalized = normalizeSnoopPayload(result);

      if (normalized?.nome) {
        return new Response(
          JSON.stringify({
            success: true,
            source: "snoop",
            data: normalized,
          }),
          { headers: corsHeaders() }
        );
      }
    }
  } catch (_snoopErr) {
    // Snoop falhou (timeout, rede) — tentar fallback
  }

  try {
    const brasilRes = await fetch(
      `https://brasilapi.com.br/api/cpf/v1/${cpf}`,
      {
        headers: { "User-Agent": "DocMaster/1.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!brasilRes.ok) {
      if (brasilRes.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: "CPF não encontrado na base de dados." }),
          { status: 404, headers: corsHeaders() }
        );
      }
      throw new Error(`BrasilAPI HTTP ${brasilRes.status}`);
    }

    const data = await brasilRes.json() as any;
    const nome = String(data.nome || data.name || "").toUpperCase().trim();
    const dataNasc = data.data_nascimento || data.nascimento || "";
    const sexo = data.sexo || data.genero || "";
    const nomeMae = String(data.nome_mae || data.mae || "").toUpperCase().trim();

    if (!nome) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados incompletos. Preencha manualmente." }),
        { status: 422, headers: corsHeaders() }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "brasilapi",
        data: {
          nome,
          nascimento: normalizeDate(dataNasc),
          sexo: normalizeSexo(sexo),
          nomeMae,
          endereco: "",
          bairro: "",
          cidade: "",
          uf: "",
          cep: "",
        },
      }),
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "Tempo de consulta esgotado. Preencha os dados manualmente."
          : "Erro ao consultar CPF. Preencha os dados manualmente.",
      }),
      { status: 502, headers: corsHeaders() }
    );
  }
};
