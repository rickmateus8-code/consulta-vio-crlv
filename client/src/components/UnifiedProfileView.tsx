import { useState } from "react";
import {
  FileText, Download, Share2, Copy, MapPin, Phone, Mail, User,
  Calendar, CreditCard, Shield, Car, Briefcase, Award, CheckCircle2,
  ExternalLink, Layers, PieChart, Users, AlertCircle, Building2, Check, ArrowLeft, Camera
} from "lucide-react";
import { toast } from "sonner";

export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  return true;
}

export function calculateAge(birthDateStr: string): string {
  if (!birthDateStr || birthDateStr === "Não informado") return "";
  let day = 0, month = 0, year = 0;
  if (birthDateStr.includes("/")) {
    const parts = birthDateStr.split("/");
    day = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    year = parseInt(parts[2]);
  } else if (birthDateStr.includes("-")) {
    const parts = birthDateStr.split(" ")[0].split("-");
    year = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    day = parseInt(parts[2]);
  }
  if (!year || isNaN(year)) return "";
  const birth = new Date(year, month, day);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  return `${years} anos, ${months} meses`;
}

export function getZodiacSign(birthDateStr: string): string {
  if (!birthDateStr || birthDateStr === "Não informado") return "";
  let day = 0, month = 0;
  if (birthDateStr.includes("/")) {
    const parts = birthDateStr.split("/");
    day = parseInt(parts[0]);
    month = parseInt(parts[1]);
  } else if (birthDateStr.includes("-")) {
    const parts = birthDateStr.split(" ")[0].split("-");
    month = parseInt(parts[1]);
    day = parseInt(parts[2]);
  }
  if (!day || !month || isNaN(day) || isNaN(month)) return "";

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "♈ Áries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "♉ Touro";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "♊ Gêmeos";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "♋ Câncer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "♌ Leão";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "♍ Virgem";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "♎ Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "♏ Escorpião";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "♐ Sagitário";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "♑ Capricórnio";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "♒ Aquário";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "♓ Peixes";
  return "";
}

export function formatImageUrl(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image/")) {
      return trimmed;
    }
    if (trimmed.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 50))) {
      return `data:image/jpeg;base64,${trimmed}`;
    }
  }
  if (typeof val === "object") {
    return formatImageUrl(val.foto || val.url || val.base64 || val.image || val.data);
  }
  return null;
}

interface UnifiedProfileViewProps {
  data: any;
  onClose?: () => void;
  onSelectPerson?: (cpf: string) => void;
}

export default function UnifiedProfileView({ data, onClose, onSelectPerson }: UnifiedProfileViewProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Se a resposta for uma lista de resultados (ex: busca por nome ou cep)
  const isList = Array.isArray(data) || Array.isArray(data.body) || Array.isArray(data.data);
  const listItems = isList ? (Array.isArray(data) ? data : (data.body || data.data)) : null;

  if (isList && listItems && listItems.length > 0 && typeof listItems[0] === "object") {
    return (
      <div className="w-full space-y-4 text-slate-100 font-sans select-none">
        <div className="flex items-center justify-between py-2 border-b border-violet-500/20">
          <span className="text-sm font-bold text-violet-300">
            {listItems.length} registro(s) encontrado(s)
          </span>
          {onClose && (
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listItems.map((item: any, idx: number) => {
            const itemNome = item.name || item.nome || item.NOME || item.razao_social || "Não informado";
            const itemCpf = item.cpf || item.CPF || item.cnpj || item.CNPJ || "Não informado";
            const itemMae = item.mother_name || item.mae || item.NOME_MAE || "";
            const itemNasc = item.birth_date || item.nascimento || "";
            const itemUf = item.uf || item.UF || (item.endereco?.state || item.endereco?.uf || "");
            return (
              <div
                key={idx}
                onClick={() => onSelectPerson && itemCpf !== "Não informado" && onSelectPerson(itemCpf)}
                className="p-5 rounded-2xl bg-slate-900/90 border border-violet-500/30 hover:border-violet-400 hover:scale-[1.01] transition-all cursor-pointer space-y-2 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-white text-base">{itemNome}</h4>
                    <p className="text-violet-300 font-mono text-xs font-bold mt-0.5">CPF/Doc: {itemCpf}</p>
                  </div>
                  {itemUf && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950/80 border border-violet-500/40 text-violet-300">
                      {itemUf}
                    </span>
                  )}
                </div>
                {itemMae && <p className="text-slate-400 text-xs"><span className="text-slate-500">Mãe:</span> {itemMae}</p>}
                {itemNasc && <p className="text-slate-400 text-xs"><span className="text-slate-500">Nascimento:</span> {itemNasc}</p>}
                {onSelectPerson && itemCpf !== "Não informado" && (
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

  // Normalização Completa do Perfil Master
  const root = data.perfil || data.body || data.data || data;
  const cpfData = root.cpf_dados || root.body || root.data || root;
  const fotoObj = data.foto || root.foto || root.fotos || null;
  const fotosDict = root.fotos || data.fotos || {};
  const parentesData = data.parentes || root.parentes || cpfData.parentes || [];
  const vizinhosData = data.vizinhos || root.vizinhos || cpfData.vizinhos || [];
  const scoreObj = data.score || root.score || cpfData.score || {};
  const profissionaisData = data.profissionais || root.profissionais || [];
  const veiculosData = data.veiculos || root.veiculos || cpfData.vehicles || [];

  // Extrair campos de identificação
  const nome = cpfData.name || cpfData.nome || cpfData.NOME || "Não informado";
  const cpf = cpfData.cpf || cpfData.CPF || data.cpf || "Não informado";
  const nascimento = cpfData.birth_date || cpfData.nascimento || cpfData.DATA_NASCIMENTO || "Não informado";
  const sexo = cpfData.gender || cpfData.sexo || cpfData.SEXO || "Não informado";
  const mae = cpfData.mother_name || cpfData.mae || cpfData.NOME_MAE || "Não informado";
  const pai = cpfData.father_name || cpfData.pai || cpfData.NOME_PAI || "Não informado";

  const idadeStr = calculateAge(nascimento);
  const signoStr = getZodiacSign(nascimento);

  // Documentos
  const rg = cpfData.rg || cpfData.RG || null;
  const rgIssuer = cpfData.rg_issuer || cpfData.ORGAO_EMISSOR || null;
  const rgUf = cpfData.rg_state || cpfData.UF_EMISSAO_RG || null;
  const rgFormatted = rg ? `${rg}${rgIssuer ? ' / ' + rgIssuer : ''}${rgUf ? ' - ' + rgUf : ''}` : null;
  const titulo = cpfData.voter_id || cpfData.titulo || cpfData.TITULO_ELEITOR || null;
  const pis = cpfData.pis || cpfData.PIS || cpfData.cns || null;
  const cnh = cpfData.cnh || cpfData.NUMERO_CNH || cpfData.CNH || null;

  // Socioeconômico
  const renda = cpfData.income || cpfData.renda || cpfData.renda_mensal || cpfData.RENDA || null;
  const scoreVal = typeof scoreObj === "object" ? (scoreObj.value || scoreObj.score || scoreObj.SCORE || null) : scoreObj;
  const mosaic = cpfData.mosaic || scoreObj.cd_mosaic || null;
  const profissao = cpfData.occupation || cpfData.occupation_name || cpfData.profissao || null;

  // Coleção de Fotos Nacionais e Estaduais
  const photoGallery: { label: string; url: string }[] = [];
  
  const imgNacional = formatImageUrl(fotosDict.nacional || fotoObj || cpfData.foto || cpfData.fotos);
  if (imgNacional) photoGallery.push({ label: "Nacional / Base Única", url: imgNacional });

  const imgSP = formatImageUrl(fotosDict.sp);
  if (imgSP) photoGallery.push({ label: "Estado de São Paulo (SP)", url: imgSP });

  const imgMA = formatImageUrl(fotosDict.ma);
  if (imgMA) photoGallery.push({ label: "Estado do Maranhão (MA)", url: imgMA });

  const imgRO = formatImageUrl(fotosDict.ro);
  if (imgRO) photoGallery.push({ label: "Estado de Rondônia (RO)", url: imgRO });

  // Telefones
  const telefonesList: any[] = [];
  const rawPhones = [
    ...(Array.isArray(cpfData.phones) ? cpfData.phones : []),
    ...(Array.isArray(cpfData.telefones_assecc) ? cpfData.telefones_assecc : []),
    ...(Array.isArray(cpfData.datasus_phones) ? cpfData.datasus_phones : []),
    ...(Array.isArray(cpfData.historico_telefones) ? cpfData.historico_telefones : []),
    ...(Array.isArray(data.telefones) ? data.telefones : []),
    ...(Array.isArray(root.telefones) ? root.telefones : []),
  ];
  if (cpfData.telefone) rawPhones.push(cpfData.telefone);

  const phoneSeen = new Set();
  for (const item of rawPhones) {
    const numStr = typeof item === "object" ? (item.numero || item.telefone || item.PHONE || "") : String(item);
    const cleanNum = numStr.replace(/\D/g, "");
    if (cleanNum && !phoneSeen.has(cleanNum)) {
      phoneSeen.add(cleanNum);
      telefonesList.push(typeof item === "object" ? item : { numero: numStr });
    }
  }

  // Endereços
  const enderecosList: any[] = [];
  const rawAddresses = [
    ...(Array.isArray(cpfData.all_addresses) ? cpfData.all_addresses : []),
    ...(Array.isArray(cpfData.enderecos) ? cpfData.enderecos : []),
  ];
  if (cpfData.address) rawAddresses.unshift(cpfData.address);

  const addressSeen = new Set();
  for (const item of rawAddresses) {
    let key = "";
    if (typeof item === "object" && item) {
      key = [item.street || item.logradouro, item.number || item.numero, item.city || item.cidade].filter(Boolean).join("|");
    } else {
      key = String(item);
    }
    if (key && !addressSeen.has(key)) {
      addressSeen.add(key);
      enderecosList.push(item);
    }
  }

  // Endereço string principal
  let enderecoPrincipal = "Não informado";
  if (enderecosList.length > 0) {
    const a = enderecosList[0];
    if (typeof a === "object") {
      enderecoPrincipal = [a.type || a.tipologradouro, a.street || a.logradouro, a.number || a.numero, a.neighborhood || a.bairro, a.city || a.cidade, a.state || a.uf, a.zip_code || a.cep].filter(Boolean).join(", ");
    } else {
      enderecoPrincipal = String(a);
    }
  }

  const copyAllData = () => {
    const text = `
=== CONSULTA MASTER BUSCAS ===
NOME: ${nome}
CPF: ${cpf}
NASCIMENTO: ${nascimento} (${idadeStr})
SIGNO: ${signoStr}
MÃE: ${mae}
ENDEREÇO: ${enderecoPrincipal}
CNH: ${cnh || 'N/A'}
RG: ${rgFormatted || rg || 'N/A'}
TÍTULO ELEITOR: ${titulo || 'N/A'}
PIS/NIS: ${pis || 'N/A'}
RENDA: ${renda || 'N/A'}
SCORE: ${scoreVal || 'N/A'}
PROFISISSÃO: ${profissao || 'N/A'}
`.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados copiados com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPDF = () => { window.print(); };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Perfil - ${nome}`,
        text: `Master Buscas: ${nome} - CPF ${cpf}`,
        url: window.location.href,
      }).catch(() => undefined);
    } else {
      copyAllData();
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans select-none">
      {/* BARRA DE AÇÕES RÁPIDAS */}
      <div className="flex items-center justify-between py-3 border-b border-violet-500/20 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <span className="text-xs text-violet-300 font-bold uppercase tracking-wider">
            Perfil Master Unificado • {cpf}
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

      {/* BOX: GALERIA DE FOTOS NACIONAIS E DOS ESTADOS */}
      <div id="secao-foto" className="rounded-2xl p-6 bg-slate-900/90 border border-violet-500/30 text-center shadow-xl space-y-4">
        <div className="flex items-center justify-center gap-2 text-violet-300 font-bold text-sm">
          <Camera className="w-4 h-4 text-violet-400" />
          <span>Galeria de Fotos Nacionais e dos Estados</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 font-mono font-bold border border-violet-500/30">
            {photoGallery.length} foto(s)
          </span>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 pt-2">
          {photoGallery.length > 0 ? (
            photoGallery.map((item, idx) => (
              <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-violet-500/50 shadow-2xl bg-slate-950 p-1 transition-all hover:scale-105">
                <img src={item.url} alt={item.label} className="w-48 h-56 object-cover rounded-xl" />
                <div className="absolute bottom-0 inset-x-0 bg-black/80 py-1.5 px-2 text-[10px] text-violet-300 font-bold tracking-wide">
                  {item.label}
                </div>
              </div>
            ))
          ) : (
            <div className="w-48 h-56 rounded-2xl border-2 border-dashed border-violet-500/30 flex flex-col items-center justify-center bg-slate-800/50 p-4 text-slate-400">
              <User className="w-12 h-12 mb-2 text-slate-500" />
              <span className="text-xs">Nenhuma foto cadastrada em bases oficiais</span>
            </div>
          )}
        </div>
      </div>

      {/* GRID DE RESUMO DE MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "Endereços", count: enderecosList.length || (enderecoPrincipal !== "Não informado" ? 1 : 0), icon: MapPin, targetId: "secao-enderecos" },
          { label: "Telefones", count: telefonesList.length, icon: Phone, targetId: "secao-telefones" },
          { label: "Parentes", count: Array.isArray(parentesData) ? parentesData.length : 0, icon: Users, targetId: "secao-parentes" },
          { label: "Empresas", count: Array.isArray(profissionaisData) ? profissionaisData.length : 0, icon: Building2, targetId: "secao-socioeconomicas" },
          { label: "Veículos", count: Array.isArray(veiculosData) ? veiculosData.length : 0, icon: Car, targetId: "secao-pessoais" },
          { label: "CNH", count: cnh ? 1 : 0, icon: Car, targetId: "secao-pessoais" },
          { label: "RG", count: rg ? 1 : 0, icon: FileText, targetId: "secao-pessoais" },
          { label: "Título Eleitor", count: titulo ? 1 : 0, icon: Award, targetId: "secao-pessoais" },
          { label: "PIS / NIS", count: pis ? 1 : 0, icon: Layers, targetId: "secao-pessoais" },
          { label: "Score", count: scoreVal ? `${scoreVal} pts` : "N/A", icon: PieChart, targetId: "secao-socioeconomicas" },
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <button
              key={idx}
              onClick={() => scrollToSection(item.targetId)}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-violet-950/80 border border-violet-500/20 hover:border-violet-400/60 hover:scale-[1.03] transition-all text-left shadow"
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
            </button>
          );
        })}
      </div>

      {/* SEÇÃO: INFORMAÇÕES PESSOAIS */}
      <div id="secao-pessoais" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
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
          {idadeStr && (
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Idade Calculada</span>
              <span className="text-emerald-400 font-semibold block">{idadeStr}</span>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Sexo</span>
            <span className="text-white font-semibold block">{sexo === "F" ? "Feminino" : sexo === "M" ? "Masculino" : sexo}</span>
          </div>
          {signoStr && (
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Signo Astral</span>
              <span className="text-violet-300 font-semibold block">{signoStr}</span>
            </div>
          )}
          {rgFormatted && (
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">RG / Órgão Emissor</span>
              <span className="text-white font-semibold block">{rgFormatted}</span>
            </div>
          )}
          {titulo && (
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Título de Eleitor</span>
              <span className="text-white font-semibold block">{titulo}</span>
            </div>
          )}
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

      {/* SEÇÃO: INFORMAÇÕES SOCIOECONÔMICAS */}
      <div id="secao-socioeconomicas" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-gradient-to-r from-purple-700 to-violet-800 font-bold text-white text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <span>Informações Socioeconômicas & Profissão</span>
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
              {scoreVal ? `${scoreVal} pts` : "N/A"}
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

      {/* SEÇÃO: ENDEREÇOS REGISTRADOS */}
      <div id="secao-enderecos" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-400" />
            <span>Endereços Registrados</span>
          </div>
          <span className="text-xs text-violet-300 font-medium">Total: {enderecosList.length || (enderecoPrincipal !== "Não informado" ? 1 : 0)}</span>
        </div>
        <div className="p-6 space-y-3">
          {enderecosList.length > 0 ? (
            enderecosList.map((end: any, i: number) => {
              const rua = typeof end === "object" ? [end.type || end.tipologradouro, end.street || end.logradouro || end.LOGRADOURO, end.number || end.numero || end.NUMERO].filter(Boolean).join(" ") : String(end);
              const comp = typeof end === "object" ? [end.complement || end.complemento, end.neighborhood || end.bairro || end.BAIRRO, end.city || end.cidade || end.CIDADE, end.state || end.uf || end.UF, end.zip_code || end.cep || end.CEP].filter(Boolean).join(" - ") : "";
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center gap-3">
                  <div>
                    <p className="font-bold text-white">{rua || "Endereço registrado"}</p>
                    {comp && <p className="text-slate-400">{comp}</p>}
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
                <p className="font-bold text-white">{enderecoPrincipal}</p>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoPrincipal)}`}
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

      {/* SEÇÃO: TELEFONES REGISTRADOS */}
      <div id="secao-telefones" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Telefones de Contato</span>
          </div>
          <span className="text-xs text-emerald-300 font-medium">Total: {telefonesList.length}</span>
        </div>
        <div className="p-6 space-y-2">
          {telefonesList.length > 0 ? (
            telefonesList.map((tel: any, i: number) => {
              const num = typeof tel === "object" ? (tel.numero || tel.telefone || tel.PHONE || "") : String(tel);
              const cleanNum = String(num).replace(/\D/g, "");
              const fonte = typeof tel === "object" ? tel.fonte : "";
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{num}</span>
                    {fonte && <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{fonte}</span>}
                  </div>
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
          ) : (
            <p className="text-slate-400 text-xs py-2">Nenhum telefone específico retornado.</p>
          )}
        </div>
      </div>

      {/* SEÇÃO: PARENTES VINCULADOS */}
      {Array.isArray(parentesData) && parentesData.length > 0 && (
        <div id="secao-parentes" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
          <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Parentes Registrados</span>
            </div>
            <span className="text-xs text-violet-300 font-medium">Total: {parentesData.length}</span>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {parentesData.map((par: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{par.nome || par.NOME}</p>
                  <p className="text-violet-300 text-[11px] font-mono">{par.cpf || par.CPF ? `CPF: ${par.cpf || par.CPF}` : ""}</p>
                </div>
                {par.vinculo && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-500/30">
                    {par.vinculo}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
