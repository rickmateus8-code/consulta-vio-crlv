// Endpoint para autenticação CNH Digital - usado pelo site externo
// POST /api/cnh-auth { cpf, senha }
// Retorna dados da CNH se credenciais válidas e token de sessão

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const body = await context.request.json() as any;
    const { cpf, senha } = body;

    if (!cpf) {
      return new Response(JSON.stringify({ success: false, error: "CPF é obrigatório" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Normalizar CPF (remover pontos e traços)
    const cpfNorm = cpf.replace(/\D/g, "");

    if (!cpfNorm || cpfNorm.length !== 11) {
      return new Response(JSON.stringify({ success: false, error: "CPF informado inválido. (ERL0000500)", code: "CPF_NOT_FOUND" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Buscar documento CNH com esse CPF
    const docs = await context.env.DB.prepare(
      `SELECT * FROM documents WHERE (LOWER(type) = 'cnh' OR type = 'cnh_digital' OR type = 'cnh-e' OR type = 'cnhcria') AND status != 'cancelado' ORDER BY created_at DESC LIMIT 500`
    ).all();

    let cpfFoundDoc: any = null;
    let exactPasswordDoc: any = null;

    for (const doc of docs.results || []) {
      try {
        let data = typeof doc.data === "string" ? JSON.parse(doc.data as string) : (doc.data || {});
        if (data && typeof data === "object" && data.data && typeof data.data === "object") {
          data = { ...data, ...data.data };
        }

        const docCpf = String(data.cpf || (doc as any).cpf || "").replace(/\D/g, "");
        const docSenha = String(data.senhaApp || data.senha || data.password || (doc as any).senha || "").trim();
        const userSenha = String(senha || "").trim();

        if (docCpf === cpfNorm) {
          if (!cpfFoundDoc) cpfFoundDoc = { ...doc, parsedData: data };

          if (docSenha && userSenha && docSenha === userSenha) {
            exactPasswordDoc = { ...doc, parsedData: data };
            break;
          }
        }
      } catch {}
    }

    if (!cpfFoundDoc) {
      return new Response(JSON.stringify({ success: false, error: "CPF informado inválido. (ERL0000500)", code: "CPF_NOT_FOUND" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const userSenhaInput = String(senha || "").trim();
    if (userSenhaInput && !exactPasswordDoc) {
      return new Response(JSON.stringify({ success: false, error: "Senha incorreta. Tente novamente.", code: "INVALID_PASSWORD" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const matchedDoc = exactPasswordDoc || cpfFoundDoc;
    const d = matchedDoc.parsedData || {};
    const sessionToken = "sess_" + crypto.randomUUID().replace(/-/g, "");

    return new Response(JSON.stringify({
      success: true,
      token: sessionToken,
      data: {
        id: matchedDoc.id,
        nome: matchedDoc.nome || d.nome || d.nomeCompleto || "",
        cpf: d.cpf || matchedDoc.cpf || "",
        rg: d.rg || "",
        orgaoEmissor: d.orgaoEmissor || "",
        ufRG: d.ufRG || d.ufRg || "",
        sexo: (d.sexo || "").toUpperCase(),
        dataNascimento: d.dataNascimento || d.nascimento || "",
        localNascimento: d.localNascimento || "",
        ufNascimento: (d.ufNascimento || "").toUpperCase(),
        nomePai: d.nomePai || d.filiacaoPai || "",
        nomeMae: d.nomeMae || d.filiacaoMae || "",
        filiacao: d.filiacao || [d.nomeMae, d.nomePai].filter(Boolean).join(" / "),
        nacionalidade: (d.nacionalidade || "BRASILEIRA").toUpperCase(),
        categoria: (matchedDoc.categoria || d.categoria || d.cat || "B").toUpperCase(),
        nRegistro: d.registro || d.nRegistro || d.numRegistro || "",
        registro: d.registro || d.nRegistro || d.numRegistro || "",
        espelho: d.espelho || d.nCnh || d.numCnh || d.numeroFormulario || "",
        validade: d.validade || d.dataValidade || d.val || "",
        emissao: d.dataEmissao || d.emissao || d.dtEmissao || "",
        dataEmissao: d.dataEmissao || d.emissao || d.dtEmissao || "",
        primeiraHab: d.primeiraHabilitacao || d.primeiraHab || "",
        primeiraHabilitacao: d.primeiraHabilitacao || d.primeiraHab || "",
        local: d.localEmissao || d.local || "",
        localEmissao: d.localEmissao || d.local || "",
        ufEmissao: (d.ufEmissao || d.uf || d.ufEmissor || "").toUpperCase(),
        observacoes: d.observacoes || d.obs || "",
        foto: d.fotoUrl || d.foto || "",
        fotoUrl: d.fotoUrl || d.foto || "",
        assinatura: d.assinaturaUrl || d.assinatura || "",
        assinaturaUrl: d.assinaturaUrl || d.assinatura || "",
        nCnh: d.espelho || d.nCnh || d.numCnh || "",
        renach: d.assDigital2 || d.renach || "",
        codigoSeguranca: matchedDoc.codigo_validacao || matchedDoc.codigo_qr || d.codigo_validacao || d.codigo_qr || d.codigoQR || matchedDoc.id || "",
        codigo_validacao: matchedDoc.codigo_validacao || matchedDoc.codigo_qr || d.codigo_validacao || d.codigo_qr || "",
      },
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
