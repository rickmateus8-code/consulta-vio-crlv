export interface UserPermissions {
  editaveis?: string[];
  ferramentas?: string[];
}

export interface UserForPermission {
  role?: string;
  permissions?: UserPermissions | string;
  free_documents?: string[] | string;
}

export const PERMISSIONS_UPDATED_EVENT = "docmaster:permissions-updated";

/**
 * Dispara um evento global de atualização de permissões no navegador.
 */
export function triggerPermissionsUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PERMISSIONS_UPDATED_EVENT));
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
 * Normaliza qualquer slug de documento (atual ou futuro) para sua forma canônica base,
 * removendo automaticamente sufixos de ação como 'cria', 'salvos', 'editar', 'view', etc.
 */
export function getCanonicalSlug(rawSlug: string): string {
  if (!rawSlug) return "";
  let s = rawSlug.toLowerCase().trim();

  // Mapeamentos conhecidos de aliases DocMaster
  if (s === "crlv" || s === "crlvcria" || s === "crlvsalvos") return "crlv";
  if (s === "cnh" || s === "cnhcria" || s === "cnhsalvas" || s === "cnh-do-brasil") return "cnh";
  if (s === "cha" || s === "chacria" || s === "chasalvas") return "cha";
  if (s === "atestado" || s === "atestadocria" || s === "atestadosalvos" || s === "atestadoview") return "atestado";
  if (s === "receita" || s === "receitacria" || s === "receitassalvas") return "receita";
  if (s === "toxicologico" || s === "toxicria" || s === "laudocria" || s === "toxicologia" || s === "toxicriasalvos") return "toxicologico";
  if (s === "historico-sp") return "historico-sp";
  if (s === "historico-uninter" || s === "historicocria" || s === "historicossalvos") return "historico-uninter";
  if (s === "diploma-uninter") return "diploma-uninter";
  if (s === "fgv" || s === "certificado-fgv" || s === "fgvcria") return "fgv";
  if (s === "peticao-stj" || s === "peticaocria" || s === "peticao" || s === "peticaocria-salvos") return "peticao-stj";
  if (s === "bot-adv") return "bot-adv";
  if (s === "consultas" || s === "consultar dados" || s === "consultar-dados") return "consultas";

  // Motor dinâmico universal para novos documentos futuros:
  // Se o slug terminar com 'cria', '-cria', 'salvos', '-salvos', 'editar', '-editar', 'view', '-view', remove o sufixo
  s = s.replace(/(-)?(cria|salvos|salvas|editar|view)$/i, "");
  return s || rawSlug.toLowerCase().trim();
}

/**
 * Motor Universal de Auditoria e Liberação em Tempo Real do DocMaster.
 * Funciona de forma universal e dinâmica para todos os documentos atuais e futuros.
 */
export function isToolLiberated(user: UserForPermission | null | undefined, key: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  const perms = parsePermissions(user.permissions);
  const freeDocs = parseFreeDocs(user.free_documents);
  
  const rawKey = key.toLowerCase().trim();
  const canonicalKey = getCanonicalSlug(rawKey);

  const editaveisRaw = perms.editaveis.map(s => s.toLowerCase().trim());
  const ferramentasRaw = perms.ferramentas.map(s => s.toLowerCase().trim());
  const freeRaw = freeDocs.map(s => s.toLowerCase().trim());

  const editaveisCanonical = editaveisRaw.map(getCanonicalSlug);
  const ferramentasCanonical = ferramentasRaw.map(getCanonicalSlug);
  const freeCanonical = freeRaw.map(getCanonicalSlug);

  // 1. Checagem por correspondência exata do slug bruto
  if (freeRaw.includes(rawKey) || editaveisRaw.includes(rawKey) || ferramentasRaw.includes(rawKey)) {
    return true;
  }

  // 2. Checagem Universal por correspondência de slug canônico (Garante compatibilidade total com documentos atuais e futuros)
  if (freeCanonical.includes(canonicalKey) || editaveisCanonical.includes(canonicalKey) || ferramentasCanonical.includes(canonicalKey)) {
    return true;
  }

  return false;
}
