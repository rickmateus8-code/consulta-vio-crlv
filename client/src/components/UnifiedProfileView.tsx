import { useState } from "react";
import {
  FileText, Download, Share2, Copy, MapPin, Phone, Mail, User,
  Calendar, CreditCard, Shield, Car, Briefcase, Award, CheckCircle2,
  ExternalLink, Layers, PieChart, Users, AlertCircle, Building2, Check
} from "lucide-react";
import { toast } from "sonner";

interface UnifiedProfileViewProps {
  data: any;
  onClose?: () => void;
}

export default function UnifiedProfileView({ data, onClose }: UnifiedProfileViewProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  // Normalizar campos da API
  const cpfData = data.cpf_dados || data.data || data;
  const fotosData = data.fotos || [];
  const parentesData = data.parentes || [];
  const vizinhosData = data.vizinhos || [];
  const scoreData = data.score || {};
  const profissionaisData = data.profissionais || [];
  const telefonesData = data.telefones || [];

  // Extrair campos comuns
  const nome = cpfData.nome || cpfData.NOME || "Não informado";
  const cpf = cpfData.cpf || cpfData.CPF || "Não informado";
  const nascimento = cpfData.nascimento || cpfData.DATA_NASCIMENTO || "Não informado";
  const sexo = cpfData.sexo || cpfData.SEXO || "Não informado";
  const mae = cpfData.mae || cpfData.NOME_MAE || "Não informado";
  const pai = cpfData.pai || cpfData.NOME_PAI || "Não informado";
  const enderecoStr = cpfData.endereco || [cpfData.LOGRADOURO, cpfData.NUMERO, cpfData.BAIRRO, cpfData.CIDADE, cpfData.UF, cpfData.CEP].filter(Boolean).join(", ") || "Não informado";
  const cidade = cpfData.cidade || cpfData.CIDADE || "";
  const uf = cpfData.uf || cpfData.UF || "";
  const cnh = cpfData.cnh || cpfData.NUMERO_CNH || cpfData.CNH || null;
  const rg = cpfData.rg || cpfData.RG || null;
  const titulo = cpfData.titulo || cpfData.TITULO_ELEITOR || null;
  const pis = cpfData.pis || cpfData.PIS || null;
  const renda = cpfData.renda || cpfData.RENDA || null;
  const score = scoreData.score || scoreData.SCORE || null;

  // Foto principal
  const fotoUrl = Array.isArray(fotosData) && fotosData[0] ? (fotosData[0].url || fotosData[0]) : (typeof fotosData === 'string' ? fotosData : null);

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
TITLE ELEITOR: ${titulo || 'N/A'}
PIS/NIS: ${pis || 'N/A'}
`.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados copiados para a área de transferência!");
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

  // Contadores fictícios / reais baseados nos arrays
  const totalEnderecos = Array.isArray(cpfData.enderecos) ? cpfData.enderecos.length : (enderecoStr !== "Não informado" ? 1 : 0);
  const totalTelefones = Array.isArray(telefonesData) ? telefonesData.length : (cpfData.telefone ? 1 : 0);
  const totalEmails = Array.isArray(cpfData.emails) ? cpfData.emails.length : (cpfData.email ? 1 : 0);
  const totalParentes = Array.isArray(parentesData) ? parentesData.length : 0;
  const totalEmpresas = Array.isArray(profissionaisData) ? profissionaisData.length : 0;

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans">
      {/* Barra de Ações Rápidas */}
      <div className="flex items-center justify-center gap-3 py-3 border-b border-violet-500/20">
        <button
          onClick={handlePrintPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all"
        >
          <Download className="w-4 h-4 text-violet-400" />
          Exportar PDF
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all"
        >
          <Share2 className="w-4 h-4 text-violet-400" />
          Compartilhar
        </button>
        <button
          onClick={copyAllData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-violet-400" />}
          {copied ? "Copiado!" : "Copiar Dados"}
        </button>
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
          { label: "Score", count: score || "N/A", icon: PieChart },
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-violet-500/20"
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
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-mono">REGULAR</span>
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
            <span className="text-white font-semibold block">{sexo === "M" ? "Masculino" : sexo === "F" ? "Feminino" : sexo}</span>
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
              {renda ? `R$ ${parseFloat(renda).toFixed(2).replace('.', ',')}` : "N/A"}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Score de Crédito</span>
            <span className="text-violet-300 font-bold text-sm block">
              {score ? `${score} pts` : "Consultar Score"}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">País de Residência</span>
            <span className="text-white font-semibold block">Brasil</span>
          </div>
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
          {Array.isArray(cpfData.enderecos) && cpfData.enderecos.length > 0 ? (
            cpfData.enderecos.map((end: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center gap-3">
                <div>
                  <p className="font-bold text-white">{end.logradouro || end.LOGRADOURO || "Rua não informada"}</p>
                  <p className="text-slate-400">{[end.bairro, end.cidade, end.uf, end.cep].filter(Boolean).join(" - ")}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end.logradouro + " " + (end.cidade || ""))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-violet-900/60 hover:bg-violet-800 text-violet-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Maps
                </a>
              </div>
            ))
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
