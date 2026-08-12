export interface UserPermissions {
  editaveis?: string[];
  ferramentas?: string[];
}

export interface UserForPermission {
  role?: string;
  permissions?: UserPermissions | string;
  free_documents?: string[] | string;
}

export function parsePermissions(raw: any): UserPermissions {
  if (!raw) return { editaveis: [], ferramentas: [] };
  if (typeof raw === "object" && raw !== null) {
    return {
      editaveis: Array.isArray(raw.editaveis) ? raw.editaveis : [],
      ferramentas: Array.isArray(raw.ferramentas) ? raw.ferramentas : [],
    };
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return {
        editaveis: Array.isArray(parsed.editaveis) ? parsed.editaveis : [],
        ferramentas: Array.isArray(parsed.ferramentas) ? parsed.ferramentas : [],
      };
    } catch {
      return { editaveis: [], ferramentas: [] };
    }
  }
  return { editaveis: [], ferramentas: [] };
}

export function parseFreeDocs(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Audit central para liberação de documentos e ferramentas para usuários.
 * Por padrão, novos usuários com permissões vazias NÃO possuem liberação para NENHUM documento
 * até que o Administrador realize a auditoria e faça a liberação no painel /admin.
 */
export function isToolLiberated(user: UserForPermission | null | undefined, key: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  const perms = parsePermissions(user.permissions);
  const freeDocs = parseFreeDocs(user.free_documents);
  const k = key.toLowerCase().trim();

  const editaveis = perms.editaveis.map(s => s.toLowerCase());
  const ferramentas = perms.ferramentas.map(s => s.toLowerCase());
  const free = freeDocs.map(s => s.toLowerCase());

  // Verificação direta no free_documents
  if (free.includes(k)) return true;

  // Documentos Veiculares
  if (k === "crlv" || k === "crlvcria") {
    return editaveis.includes("crlv") || free.includes("crlv") || free.includes("crlvcria");
  }
  if (k === "cnh" || k === "cnhcria") {
    return editaveis.includes("cnh") || free.includes("cnh") || free.includes("cnhcria");
  }
  if (k === "cha" || k === "chacria") {
    return editaveis.includes("cha") || free.includes("cha") || free.includes("chacria");
  }

  // Documentos Médicos
  if (k === "atestado" || k === "atestadocria") {
    return editaveis.includes("atestado") || free.includes("atestado") || free.includes("atestadocria");
  }
  if (k === "receita" || k === "receitacria") {
    return editaveis.includes("receita") || free.includes("receita") || free.includes("receitacria");
  }
  if (k === "toxicologico" || k === "toxicria" || k === "laudocria") {
    return editaveis.includes("toxicologico") || editaveis.includes("toxicria") || free.includes("toxicologico") || free.includes("toxicria");
  }

  // Documentos Escolares & Acadêmicos
  if (k === "historico-sp") {
    return editaveis.includes("historico-sp") || free.includes("historico-sp");
  }
  if (k === "historico-uninter" || k === "historicocria") {
    return editaveis.includes("historico-uninter") || editaveis.includes("historicocria") || free.includes("historico-uninter") || free.includes("historicocria");
  }
  if (k === "diploma-uninter") {
    return editaveis.includes("diploma-uninter") || free.includes("diploma-uninter");
  }
  if (k === "fgv" || k === "certificado-fgv") {
    return editaveis.includes("fgv") || editaveis.includes("certificado-fgv") || free.includes("fgv") || free.includes("certificado-fgv");
  }

  // Ferramentas & Petições
  if (k === "peticao-stj" || k === "peticaocria" || k === "peticao") {
    return ferramentas.includes("peticao-stj") || ferramentas.includes("peticaocria") || free.includes("peticao-stj") || free.includes("peticaocria") || free.includes("peticao");
  }
  if (k === "bot-adv") {
    return ferramentas.includes("bot-adv") || free.includes("bot-adv");
  }
  if (k === "consultas" || k === "consultar dados") {
    return ferramentas.includes("consultas") || free.includes("consultas");
  }

  return editaveis.includes(k) || ferramentas.includes(k);
}
