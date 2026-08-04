import { useState } from "react";
import {
  FileText, Download, Share2, Copy, MapPin, Phone, Mail, User,
  Calendar, CreditCard, Shield, Car, Briefcase, Award, CheckCircle2,
  ExternalLink, Layers, PieChart, Users, AlertCircle, Building2, Check, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

interface UnifiedProfileViewProps {
  data: any;
  onClose?: () => void;
  onSelectPerson?: (cpf: string) => void;
}

export default function UnifiedProfileView({ data, onClose, onSelectPerson }: UnifiedProfileViewProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  // Se a resposta for uma lista de resultados (ex: busca por nome)
  const isList = Array.isArray(data) || Array.isArray(data.body) || Array.isArray(data.data);
  const listItems = isList ? (Array.isArray(data) ? data : (data.body || data.data)) : null;

  if (isList && listItems) {
    return (
      <div className="w-full space-y-4 text-slate-100 font-sans">
        <div className="flex items-center justify-between py-2 border-b border-violet-500/20">
          <span className="text-sm font-bold text-violet-300">
            {listItems.length} pessoa(s) encontrada(s)
          </span>
          {onClose && (
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listItems.map((item: any, idx: number) => {
            const itemNome = item.name || item.nome || item.NOME || "Não informado";
            const itemCpf = item.cpf || item.CPF || "Não informado";
            const itemMae = item.mother_name || item.mae || item.NOME_MAE || "";
            const itemNasc = item.birth_date || item.nascimento || "";
            const itemUf = item.uf || item.UF || (item.endereco?.state || item.endereco?.uf || "");
            return (
              <div
                key={idx}
                onClick={() => onSelectPerson && onSelectPerson(itemCpf)}
                className="p-5 rounded-2xl bg-slate-900/90 border border-violet-500/30 hover:border-violet-400 hover:scale-[1.01] transition-all cursor-pointer space-y-2 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-white text-base">{itemNome}</h4>
                    <p className="text-violet-300 font-mono text-xs font-bold mt-0.5">CPF: {itemCpf}</p>
                  </div>
                  {itemUf && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950/80 border border-violet-500/40 text-violet-300">
                      {itemUf}
                    </span>
                  )}
                </div>
                {itemMae && <p className="text-slate-400 text-xs"><span className="text-slate-500">Mãe:</span> {itemMae}</p>}
                {itemNasc && <p className="text-slate-400 text-xs"><span className="text-slate-500">Nascimento:</span> {itemNasc}</p>}
                {onSelectPerson && (
                  <div className="pt-2 text-right">
                    <span className="text-xs font-bold text-violet-400 hover:underline flex items-center justify-end gap-1">
                      Ver Perfil Completo <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Normalizar campos da API (suportando formato body da Snoop V2)
  const root = data.perfil || data.body || data.data || data;
  const cpfData = root.cpf_dados || root.data || root;
  const fotosData = data.fotos || root.fotos || root.foto || [];
  const parentesData = data.parentes || root.parentes || [];
  const vizinhosData = data.vizinhos || root.vizinhos || [];
  const scoreData = data.score || root.score || {};
  const profissionaisData = data.profissionais || root.profissionais || [];
  const telefonesData = data.telefones || root.telefones || [];

  // Extrair campos comuns de todas as variações da API Snoop
  const nome = cpfData.name || cpfData.nome || cpfData.NOME || "Não informado";
  const cpf = cpfData.cpf || cpfData.CPF || "Não informado";
  const nascimento = cpfData.birth_date || cpfData.nascimento || cpfData.DATA_NASCIMENTO || "Não informado";
  const sexo = cpfData.gender || cpfData.sexo || cpfData.SEXO || "Não informado";
  const mae = cpfData.mother_name || cpfData.mae || cpfData.NOME_MAE || "Não informado";
  const pai = cpfData.father_name || cpfData.pai || cpfData.NOME_PAI || "Não informado";

  // Endereço
  let enderecoStr = "Não informado";
  if (typeof cpfData.address === "object" && cpfData.address) {
    const a = cpfData.address;
    enderecoStr = [a.type || a.tipologradouro, a.street || a.logradouro, a.number || a.numero, a.neighborhood || a.bairro, a.city || a.cidade, a.state || a.uf, a.zip_code || a.cep].filter(Boolean).join(", ");
  } else if (typeof cpfData.endereco === "string") {
    enderecoStr = cpfData.endereco;
  } else if (cpfData.LOGRADOURO) {
    enderecoStr = [cpfData.LOGRADOURO, cpfData.NUMERO, cpfData.BAIRRO, cpfData.CIDADE, cpfData.UF, cpfData.CEP].filter(Boolean).join(", ");
  }

  const cidade = cpfData.address?.city || cpfData.cidade || cpfData.CIDADE || "";
  const uf = cpfData.address?.state || cpfData.uf || cpfData.UF || "";
  const cnh = cpfData.cnh || cpfData.NUMERO_CNH || cpfData.CNH || null;
  const rg = cpfData.rg || cpfData.RG || null;
  const titulo = cpfData.voter_id || cpfData.titulo || cpfData.TITULO_ELEITOR || null;
  const pis = cpfData.pis || cpfData.PIS || null;
  const renda = cpfData.income || cpfData.renda || cpfData.RENDA || null;
  const score = typeof scoreData === "object" ? (scoreData.value || scoreData.score || scoreData.SCORE || cpfData.score?.value || null) : scoreData;
  const mosaic = cpfData.mosaic || scoreData.cd_mosaic || null;
  const profissao = cpfData.occupation || cpfData.profissao || null;

  // Foto principal
  let fotoUrl = null;
  if (Array.isArray(fotosData) && fotosData.length > 0) {
    fotoUrl = fotosData[0].url || fotosData[0];
  } else if (typeof fotosData === "string" && fotosData.startsWith("http")) {
    fotoUrl = fotosData;
  }

  const copyAllData = () => {
    const text = `
=== CONSULTA DOCMASTER / SNOOP ===
NOME: ${nome}
CPF: ${cpf}
NASCIMENTO: ${nascimento}
MÃE: ${mae}
ENDEREÇO: ${enderecoStr}
CNH: ${cnh || 'N/A'}
RG: ${rg || 'N/A'}
TÍTULO ELEITOR: ${titulo || 'N/A'}
PIS/NIS: ${pis || 'N/A'}
RENDA: ${renda || 'N/A'}
SCORE: ${score || 'N/A'}
`.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados copiados com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Perfil - ${nome}`,
        text: `Consulta DocMaster: ${nome} - CPF ${cpf}`,
        url: window.location.href,
      }).catch(() => undefined);
    } else {
      copyAllData();
    }
  };

  // Contadores
  const enderecosList = Array.isArray(cpfData.all_addresses) ? cpfData.all_addresses : (Array.isArray(cpfData.enderecos) ? cpfData.enderecos : []);
  const totalEnderecos = enderecosList.length > 0 ? enderecosList.length : (enderecoStr !== "Não informado" ? 1 : 0);
  const totalTelefones = Array.isArray(telefonesData) ? telefonesData.length : (cpfData.telefone ? 1 : 0);
  const totalEmails = Array.isArray(cpfData.emails) ? cpfData.emails.length : (cpfData.email ? 1 : 0);
  const totalParentes = Array.isArray(parentesData) ? parentesData.length : 0;
  const totalEmpresas = Array.isArray(profissionaisData) ? profissionaisData.length : 0;

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans">
      {/* Barra de Ações Rápidas */}
      <div className="flex items-center justify-between py-3 border-b border-violet-500/20 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <span className="text-xs text-violet-300 font-bold uppercase tracking-wider">
            Perfil Unificado • {cpf}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            Exportar PDF
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-violet-400" />
            Compartilhar
          </button>
          <button
            onClick={copyAllData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
            {copied ? "Copiado!" : "Copiar Dados"}
          </button>
        </div>
      </div>

      {/* Box: Foto e Documentos */}
      <div className="rounded-2xl p-6 bg-slate-900/90 border border-violet-500/30 text-center shadow-xl">
        <div className="flex items-center justify-center gap-2 text-violet-300 font-bold text-sm mb-4">
          <User className="w-4 h-4 text-violet-400" />
          <span>Foto e Documentos</span>
        </div>
        <div className="flex justify-center items-center">
          {fotoUrl ? (
            <div className="relative group rounded-xl overflow-hidden border-2 border-violet-500/50 shadow-2xl max-w-xs">
              <img src={fotoUrl} alt={nome} className="w-48 h-56 object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/75 py-1 text-[10px] text-violet-300 font-bold">
                DOCUMENTO OFICIAL
              </div>
            </div>
          ) : (
            <div className="w-44 h-52 rounded-xl border-2 border-dashed border-violet-500/30 flex flex-col items-center justify-center bg-slate-800/50 p-4 text-slate-400">
              <User className="w-12 h-12 mb-2 text-slate-500" />
              <span className="text-xs">Foto não disponível</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Resumo de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "Endereços", count: totalEnderecos, icon: MapPin },
          { label: "Telefones", count: totalTelefones, icon: Phone },
          { label: "E-mails", count: totalEmails, icon: Mail },
          { label: "Parentes", count: totalParentes, icon: Users },
          { label: "Empresas", count: totalEmpresas, icon: Building2 },
          { label: "CNH", count: cnh ? 1 : 0, icon: Car },
          { label: "RG", count: rg ? 1 : 0, icon: FileText },
          { label: "Título Eleitor", count: titulo ? 1 : 0, icon: Award },
          { label: "PIS / NIS", count: pis ? 1 : 0, icon: Layers },
          { label: "Score", count: score ? `${score} pts` : "N/A", icon: PieChart },
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-violet-500/20 shadow"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-900/50 flex items-center justify-center">
                  <IconComp className="w-3.5 h-3.5 text-violet-300" />
                </div>
                <span className="text-xs font-semibold text-slate-300">{item.label}</span>
              </div>
              <span className="text-xs font-black text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded-md border border-violet-500/30">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Seção: Informações Pessoais (Destaque Roxo) */}
      <div className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-gradient-to-r from-violet-700 to-indigo-700 font-bold text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Informações Pessoais</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded text-emerald-300 font-mono font-bold">
            {cpfData.federal_status || "REGULAR"}
          </span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Nome Completo</span>
            <span className="text-white font-bold text-sm block">{nome}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">CPF</span>
            <span className="text-violet-300 font-bold font-mono text-sm block">{cpf}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Data de Nascimento</span>
            <span className="text-white font-semibold block">{nascimento}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Sexo</span>
            <span className="text-white font-semibold block">{sexo === "F" ? "Feminino" : sexo === "M" ? "Masculino" : sexo}</span>
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-slate-400 block font-medium">Nome da Mãe</span>
            <span className="text-white font-semibold block">{mae}</span>
          </div>
          {pai !== "Não informado" && (
            <div className="space-y-1 md:col-span-2">
              <span className="text-slate-400 block font-medium">Nome do Pai</span>
              <span className="text-white font-semibold block">{pai}</span>
            </div>
          )}
        </div>
      </div>

      {/* Seção: Informações Socioeconômicas */}
      <div className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-gradient-to-r from-purple-700 to-violet-800 font-bold text-white text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <span>Informações Socioeconômicas</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Renda Estimada</span>
            <span className="text-emerald-400 font-bold text-sm block">
              {renda ? `R$ ${parseFloat(String(renda)).toFixed(2).replace('.', ',')}` : "N/A"}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Score de Crédito</span>
            <span className="text-violet-300 font-bold text-sm block">
              {score ? `${score} pts` : "N/A"}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Profissão / CBO</span>
            <span className="text-white font-semibold block">{profissao || "N/A"}</span>
          </div>
          {mosaic && (
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Perfil Serasa Mosaic</span>
              <span className="text-purple-300 font-bold font-mono block">{mosaic}</span>
            </div>
          )}
        </div>
      </div>

      {/* Seção: CNH & Documentação Habilitação */}
      {cnh && (
        <div className="rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-900 shadow-2xl">
          <div className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 font-bold text-white text-sm flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span>Dados da CNH Digital</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Número Registro CNH</span>
              <span className="text-amber-300 font-bold font-mono text-sm block">{cnh}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Categoria</span>
              <span className="text-white font-bold block">{cpfData.categoria_cnh || "AB"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Validade CNH</span>
              <span className="text-white font-semibold block">{cpfData.validade_cnh || "Em dia"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Endereços Registrados */}
      <div className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-400" />
            <span>Endereços Registrados</span>
          </div>
          <span className="text-xs text-violet-300 font-medium">Total: {totalEnderecos}</span>
        </div>
        <div className="p-6 space-y-3">
          {enderecosList.length > 0 ? (
            enderecosList.map((end: any, i: number) => {
              const rua = [end.type || end.tipologradouro, end.street || end.logradouro || end.LOGRADOURO, end.number || end.numero || end.NUMERO].filter(Boolean).join(" ");
              const comp = [end.complement || end.complemento, end.neighborhood || end.bairro || end.BAIRRO, end.city || end.cidade || end.CIDADE, end.state || end.uf || end.UF, end.zip_code || end.cep || end.CEP].filter(Boolean).join(" - ");
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center gap-3">
                  <div>
                    <p className="font-bold text-white">{rua || "Endereço registrado"}</p>
                    <p className="text-slate-400">{comp}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rua + " " + comp)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-violet-900/60 hover:bg-violet-800 text-violet-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Maps
                  </a>
                </div>
              );
            })
          ) : (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center gap-3">
              <div>
                <p className="font-bold text-white">{enderecoStr}</p>
                <p className="text-slate-400">{cidade} {uf}</p>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoStr)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-violet-900/60 hover:bg-violet-800 text-violet-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Seção: Telefones Registrados */}
      <div className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Telefones de Contato</span>
          </div>
          <span className="text-xs text-emerald-300 font-medium">Total: {totalTelefones}</span>
        </div>
        <div className="p-6 space-y-2">
          {Array.isArray(telefonesData) && telefonesData.length > 0 ? (
            telefonesData.map((tel: any, i: number) => {
              const num = tel.numero || tel.telefone || tel.PHONE || tel;
              const cleanNum = String(num).replace(/\D/g, "");
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center">
                  <span className="font-mono font-bold text-white">{num}</span>
                  <a
                    href={`https://wa.me/55${cleanNum}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                  >
                    WhatsApp
                  </a>
                </div>
              );
            })
          ) : cpfData.telefone ? (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center">
              <span className="font-mono font-bold text-white">{cpfData.telefone}</span>
              <a
                href={`https://wa.me/55${String(cpfData.telefone).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
              >
                WhatsApp
              </a>
            </div>
          ) : (
            <p className="text-slate-400 text-xs py-2">Nenhum telefone específico retornado.</p>
          )}
        </div>
      </div>

      {/* Seção: Parentes Vinculados */}
      {Array.isArray(parentesData) && parentesData.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
          <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Parentes Registrados</span>
            </div>
            <span className="text-xs text-violet-300 font-medium">Total: {parentesData.length}</span>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {parentesData.map((par: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20">
                <p className="font-bold text-white">{par.nome || par.NOME}</p>
                <p className="text-violet-300 text-[11px] font-mono">{par.cpf || par.CPF || par.vinculo || "Parente"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
