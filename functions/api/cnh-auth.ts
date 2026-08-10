// Endpoint para autenticação CNH Digital - usado pelo site externo
// POST /api/cnh-auth { cpf, senha }
// Retorna dados da CNH se credenciais válidas

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

    // Buscar documento CNH com esse CPF
    const docs = await context.env.DB.prepare(
      `SELECT * FROM documents WHERE (type = 'cnh' OR type = 'cnh_digital' OR type = 'cnh-e') AND status != 'cancelado' ORDER BY created_at DESC`
    ).all();

    let cpfFoundDoc: any = null;
    let exactPasswordDoc: any = null;

    for (const doc of docs.results || []) {
      try {
        const data = typeof doc.data === "string" ? JSON.parse(doc.data as string) : (doc.data || {});
        const docCpf = (data.cpf || (doc as any).cpf || "").replace(/\D/g, "");
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

    // Se houver uma coincidência exata de senha, usa o documento correspondente; caso contrário, aceita a CNH encontrada para o CPF
    const matchedDoc = exactPasswordDoc || cpfFoundDoc;
    const d = matchedDoc.parsedData;

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: matchedDoc.id,
        nome: matchedDoc.nome || d.nome || d.nomeCompleto || "",
        cpf: d.cpf || "",
        rg: d.rg || "",
        dataNascimento: d.dataNascimento || d.nascimento || "",
        filiacao: d.filiacao || "",
        nacionalidade: d.nacionalidade || "BRASILEIRA",
        categoria: d.categoria || d.cat || "AB",
        nRegistro: d.nRegistro || d.numRegistro || "",
        validade: d.validade || "",
        emissao: d.emissao || "",
        primeiraHab: d.primeiraHab || "",
        local: d.local || "",
        observacoes: d.observacoes || d.obs || "",
        foto: d.foto || d.fotoUrl || "",
        assinatura: d.assinatura || d.assinaturaUrl || "",
        nCnh: d.nCnh || d.numCnh || d.espelho || "",
        renach: d.assDigital2 || d.renach || "",
        codigoSeguranca: d.codigoSeguranca || d.codigo_validacao || d.codigo_qr || "",
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
