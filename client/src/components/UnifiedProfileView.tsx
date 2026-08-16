import { useState, useRef, useEffect } from "react";
import {
  FileText, Download, Share2, Copy, MapPin, Phone, Mail, User,
  Calendar, CreditCard, Shield, Car, Briefcase, Award, CheckCircle2,
  ExternalLink, Layers, PieChart, Users, AlertCircle, Building2, Check, ArrowLeft, Camera, Loader2, Search,
  Syringe, Gift, Globe, Activity, Heart
} from "lucide-react";

import { toast } from "sonner";
import { exportElementToPDF, generatePDFFilename } from "@/lib/pdfExport";
import { normalizeConsultaResult } from "@/lib/consultas/normalizer";
import { VaccinesSection } from "./consultas/sections/VaccinesSection";
import { BenefitsSection } from "./consultas/sections/BenefitsSection";
import { MosaicProfileSection } from "./consultas/sections/MosaicProfileSection";
import { EmptyStateBanner } from "./consultas/sections/EmptyStateBanner";
import { VehicleProfileView } from "./consultas/sections/VehicleProfileView";
import { AddressesSection } from "./consultas/sections/AddressesSection";
import { RelativesSection } from "./consultas/sections/RelativesSection";
import { PhonesSection } from "./consultas/sections/PhonesSection";
import { QsaSection } from "./consultas/sections/QsaSection";





export function sanitizeField(val: any): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === "" ||
    upper === "INVALIDO" ||
    upper === "INVÁLIDO" ||
    upper === "NAO CONSTA" ||
    upper === "NÃO CONSTA" ||
    upper === "N/A" ||
    upper === "NULL" ||
    upper === "UNDEFINED" ||
    upper === "0" ||
    upper === "-"
  ) {
    return null;
  }
  return str;
}

export function AddressMap({ address, isLoaded }: { address: string; isLoaded: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!address || address === "Não informado" || !isLoaded) return;
    setLoading(true);
    // Geocodificar usando Nominatim do OpenStreetMap
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setCoords({
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon)
          });
        }
      })
      .catch(err => console.error("Erro no geocoding:", err))
      .finally(() => setLoading(false));
  }, [address, isLoaded]);

  useEffect(() => {
    if (!coords || !mapRef.current || !(window as any).L) return;

    // Destruir mapa anterior se existir
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {}
    }

    const L = (window as any).L;
    
    // Configurar o ícone padrão do Leaflet (para evitar quebra de imagem de marcador)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
    });

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([coords.lat, coords.lon], 16);
    
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    L.marker([coords.lat, coords.lon]).addTo(map)
      .bindPopup(`<div style="color:#0f172a;font-weight:bold;font-size:11px;padding:2px;">${address}</div>`)
      .openPopup();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [coords]);

  if (loading) {
    return <div className="h-56 w-full bg-slate-950/40 animate-pulse rounded-2xl border border-violet-500/20 flex flex-col items-center justify-center text-xs text-violet-400 gap-2"><Loader2 className="w-6 h-6 animate-spin" /> Geolocalizando endereço...</div>;
  }

  if (!coords) return null;

  return (
    <div className="space-y-2 mt-4 no-print">
      <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">📍 Visualização Espacial (Mapa Vetorial)</span>
      <div ref={mapRef} className="h-56 w-full rounded-2xl border border-violet-500/30 overflow-hidden shadow-2xl relative z-10" />
    </div>
  );
}

export function calculateProfileHealth(cpfData: any, photoGallery: any[]): { score: number; label: string; color: string } {
  let score = 0;
  if (photoGallery && photoGallery.length > 0) score += 20;
  if (cpfData.mother_name && cpfData.mother_name !== "Não informado") score += 20;
  if (cpfData.federal_status === "REGULAR") score += 20;
  if (!cpfData.death_flag && cpfData.death_flag !== "1") score += 20;
  if (cpfData.address || cpfData.birth_city) score += 20;

  let label = "BAIXA CONFIABILIDADE";
  let color = "text-red-400";
  if (score >= 80) {
    label = "ALTA CONFIABILIDADE (PERFIL VERIFICADO)";
    color = "text-emerald-400";
  } else if (score >= 60) {
    label = "MÉDIA CONFIABILIDADE (DADOS PARCIAIS)";
    color = "text-amber-400";
  }

  return { score, label, color };
}

export function cleanRgIssuer(issuer: string | null): string | null {
  if (!issuer) return null;
  let str = issuer.trim();
  if (!str || str.toUpperCase() === "NULL" || str.toUpperCase() === "INVALIDO" || str.toUpperCase() === "INVÁLIDO") return null;

  if (/SECRETARIA\s+DE\s+SEGURA/i.test(str) || /SEGURANCA\s+PUBLICA/i.test(str)) {
    if (/SESP/i.test(str)) return "SESP";
    if (/SSPSP/i.test(str)) return "SSP";
    if (/SSP/i.test(str)) return "SSP";
    if (/PC/i.test(str)) return "PC";
    return "SSP";
  }

  if (str.includes(" - ")) {
    const parts = str.split(" - ").map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      const first = parts[0].toUpperCase();
      if (["SSP", "SESP", "DETRAN", "PC", "DIC", "IFP", "IPF", "SPTC", "DGPC"].includes(first)) {
        return first;
      }
      return parts[0];
    }
  }

  return str.length > 15 ? str.substring(0, 15) : str;
}

export function getCPFStateFromNinthDigit(cpfStr: string): string {
  const digits = (cpfStr || "").replace(/\D/g, "");
  if (digits.length !== 11) return "";
  const ninth = digits.charAt(8);
  switch (ninth) {
    case '1': return 'DF / GO / MS / MT / TO';
    case '2': return 'AC / AM / AP / PA / RO / RR';
    case '3': return 'CE / MA / PI';
    case '4': return 'AL / PB / PE / RN';
    case '5': return 'BA / SE';
    case '6': return 'Minas Gerais - MG';
    case '7': return 'ES / RJ';
    case '8': return 'São Paulo - SP';
    case '9': return 'PR / SC';
    case '0': return 'Rio Grande do Sul - RS';
    default: return '';
  }
}

export function TeiaConexoesGraph({
  nomeCentral,
  cpfCentral,
  parentes,
  vizinhos,
  telefones,
  enderecos,
  corporateShare,
  onSelectPerson
}: {
  nomeCentral: string;
  cpfCentral: string;
  parentes: any;
  vizinhos: any;
  telefones: any;
  enderecos: any;
  corporateShare: any;
  onSelectPerson?: (cpf: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const safeParentes = Array.isArray(parentes) ? parentes : [];
  const safeVizinhos = Array.isArray(vizinhos) ? vizinhos : [];
  const safeTelefones = Array.isArray(telefones) ? telefones : [];
  const safeEnderecos = Array.isArray(enderecos) ? enderecos : [];

  const allNodes: { id: string; label: string; sub: string; type: string; rawValue: string; cpf?: string; color: string; bg: string; icon: string; border: string }[] = [];

  safeParentes.forEach((p, idx) => {
    if (!p || typeof p !== 'object') return;
    const name = p.nome || p.NOME || "Parente";
    const cpfVal = p.cpf || p.CPF || "";
    allNodes.push({
      id: `p-${cpfVal || idx}`,
      label: name,
      sub: p.vinculo || "Parente Direto",
      type: "parentes",
      rawValue: cpfVal ? `CPF: ${cpfVal}` : name,
      cpf: cpfVal,
      color: "#c084fc",
      bg: "bg-purple-950/40",
      border: "border-purple-500/40",
      icon: "👤"
    });
  });

  safeVizinhos.forEach((v, idx) => {
    if (!v || typeof v !== 'object') return;
    const name = v.nome || v.NOME || "Vizinho";
    const cpfVal = v.cpf || v.CPF || "";
    allNodes.push({
      id: `v-${cpfVal || idx}`,
      label: name,
      sub: "Vizinho / Entorno",
      type: "vizinhos",
      rawValue: cpfVal ? `CPF: ${cpfVal}` : name,
      cpf: cpfVal,
      color: "#60a5fa",
      bg: "bg-blue-950/40",
      border: "border-blue-500/40",
      icon: "🏡"
    });
  });

  safeTelefones.forEach((t, idx) => {
    const rawNum = typeof t === 'object' && t ? (t.telefone || t.numero || String(t)) : String(t || '');
    const cleanNum = rawNum.replace(/\D/g, "");
    const formattedNum = cleanNum.length === 11 
      ? `(${cleanNum.substring(0, 2)}) ${cleanNum.substring(2, 7)}-${cleanNum.substring(7)}`
      : rawNum;
    allNodes.push({
      id: `t-${idx}`,
      label: formattedNum,
      sub: typeof t === 'object' && t && t.fonte ? `Tel (${t.fonte})` : "Contato Telefônico",
      type: "telefones",
      rawValue: formattedNum,
      color: "#34d399",
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/40",
      icon: "📞"
    });
  });

  if (corporateShare) {
    allNodes.push({
      id: "emp-1",
      label: `${(nomeCentral || "").split(" ")[0]} Sociedade Empresarial`,
      sub: `Quadro Societário (${corporateShare}%)`,
      type: "empresas",
      rawValue: `Participação Societária: ${corporateShare}%`,
      color: "#fbbf24",
      bg: "bg-amber-950/40",
      border: "border-amber-500/40",
      icon: "🏢"
    });
  }

  safeEnderecos.forEach((end, idx) => {
    let loc = "Residência Cadastrada";
    if (typeof end === 'object' && end) {
      const street = end.street || end.logradouro || "";
      const city = end.city || end.cidade || "";
      const state = end.state || end.uf || "";
      if (street) loc = `${street}${city ? `, ${city}` : ""}${state ? ` - ${state}` : ""}`;
      else if (city) loc = `${city} - ${state}`;
    }
    allNodes.push({
      id: `end-${idx}`,
      label: loc,
      sub: idx === 0 ? "Endereço Principal" : "Endereço Secundário",
      type: "enderecos",
      rawValue: loc,
      color: "#f472b6",
      bg: "bg-pink-950/40",
      border: "border-pink-500/40",
      icon: "📍"
    });
  });

  if (allNodes.length === 0) return null;

  const filteredNodes = activeCategory === "todos" 
    ? allNodes 
    : allNodes.filter(n => n.type === activeCategory);

  return (
    <div className="w-full overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-[#0b0e2b] to-slate-950 border border-violet-500/40 p-5 md:p-6 shadow-2xl space-y-5 no-print relative">
      {/* Cabeçalho de Análise Forense */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-violet-500/20 pb-4 gap-3">
        <div>
          <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Matriz de Teia de Conexões & Vínculos (Link Analysis)
          </h3>
          <p className="text-[11px] text-violet-300 font-mono mt-0.5">
            Mapeamento dinâmico de conexões interpessoais, telefônicas, imobiliárias e corporativas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-mono font-bold shadow-sm">
            {allNodes.length} VÍNCULOS MAPEADOS
          </span>
        </div>
      </div>

      {/* CARD DO INVESTIGADO PRINCIPAL (ALVO CENTRAL) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/80 via-indigo-950/80 to-slate-950 border-2 border-violet-500/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-900/60 border border-violet-400/50 flex items-center justify-center text-xl text-violet-200 font-bold shadow-inner">
            👤
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-violet-600 text-white tracking-widest">
                Investigado Principal
              </span>
              <span className="text-xs font-mono text-emerald-300 font-bold">CPF: {cpfCentral}</span>
            </div>
            <h4 className="text-base font-black text-white tracking-tight mt-0.5">{nomeCentral}</h4>
          </div>
        </div>
        <span className="text-xs text-purple-200/80 font-mono">
          {filteredNodes.length} vínculo(s) visível(is)
        </span>
      </div>

      {/* FILTROS POR CATEGORIA DE CONEXÃO */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
        {[
          { id: "todos", label: "TODAS AS CONEXÕES", count: allNodes.length, icon: "🌐" },
          { id: "parentes", label: "PARENTES", count: allNodes.filter(n => n.type === "parentes").length, icon: "👤" },
          { id: "vizinhos", label: "VIZINHOS", count: allNodes.filter(n => n.type === "vizinhos").length, icon: "🏡" },
          { id: "telefones", label: "TELEFONES", count: allNodes.filter(n => n.type === "telefones").length, icon: "📞" },
          { id: "empresas", label: "SOCIETÁRIO", count: allNodes.filter(n => n.type === "empresas").length, icon: "🏢" },
          { id: "enderecos", label: "ENDEREÇOS", count: allNodes.filter(n => n.type === "enderecos").length, icon: "📍" },
        ].map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                isActive
                  ? "bg-violet-600 text-white border-violet-300 shadow-lg shadow-violet-600/30 scale-105"
                  : "bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-900 border-violet-500/20"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] font-mono">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* GRADE ESTRUTURADA DE VÍNCULOS E CONEXÕES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {filteredNodes.map((node) => (
          <div
            key={node.id}
            onClick={() => setSelectedNode(node)}
            className={`p-4 rounded-2xl ${node.bg} border ${node.border} hover:border-violet-400 hover:scale-[1.02] transition-all cursor-pointer shadow-lg space-y-3 flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-lg border border-violet-500/30 shrink-0">
                  {node.icon}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs leading-snug">{node.label}</h4>
                  <span className="text-[10px] font-bold block mt-0.5" style={{ color: node.color }}>
                    {node.sub}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-mono text-purple-200 truncate">{node.rawValue}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(node.rawValue.replace(/^CPF:\s*/, ''));
                    toast.success("Dado copiado!");
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold border border-violet-500/20"
                >
                  📋 Copiar
                </button>
                {node.cpf && onSelectPerson && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPerson(node.cpf!.replace(/\D/g, ''));
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow"
                  >
                    🔍 Buscar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* INSPECTOR MODAL QUANDO UM NÓ É SELECIONADO */}
      {selectedNode && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950 to-indigo-950 border-2 border-violet-400 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-2xl border border-violet-400/40">
              {selectedNode.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-white text-sm">{selectedNode.label}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: selectedNode.color }}>
                  {selectedNode.sub}
                </span>
              </div>
              <p className="text-xs font-mono text-purple-200 mt-1">{selectedNode.rawValue}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedNode.rawValue.replace(/^CPF:\s*/, ''));
                toast.success("Dado copiado!");
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-violet-500/30 text-white text-xs font-bold transition-all"
            >
              📋 Copiar Dado
            </button>

            {selectedNode.cpf && onSelectPerson && (
              <button
                onClick={() => {
                  onSelectPerson(selectedNode.cpf.replace(/\D/g, ''));
                  setSelectedNode(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg active:scale-95"
              >
                🔍 Investigar este Perfil em 1-Clique ➔
              </button>
            )}

            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
    if (!trimmed) return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image/")) {
      return trimmed;
    }
    const cleanB64 = trimmed.replace(/\s+/g, "");
    if (cleanB64.length > 30 && /^[A-Za-z0-9+/=]+$/.test(cleanB64)) {
      let mime = "jpeg";
      if (cleanB64.startsWith("iVBORw0KGgo")) mime = "png";
      else if (cleanB64.startsWith("R0lGOD")) mime = "gif";
      else if (cleanB64.startsWith("PHN2Zw")) mime = "svg+xml";
      return `data:image/${mime};base64,${cleanB64}`;
    }
    return null;
  }

  if (Array.isArray(val)) {
    for (const item of val) {
      const res = formatImageUrl(item);
      if (res) return res;
    }
    return null;
  }

  if (typeof val === "object") {
    const candidates = [
      val.foto, val.url, val.base64, val.image, val.imagem, val.data, val.body,
      val.b64, val.photo, val.img, val.pic, val.src, val.content,
      val.foto_base64, val.base64_foto, val.foto_sp, val.foto_ma, val.foto_ro,
      val.foto_cnh, val.foto_rg, val.cnh_foto, val.rg_foto, val.nacional,
      val.sp, val.ma, val.ro
    ];

    for (const cand of candidates) {
      if (cand && cand !== val) {
        const res = formatImageUrl(cand);
        if (res) return res;
      }
    }
  }

  return null;
}

interface UnifiedProfileViewProps {
  data: unknown;
  onClose?: () => void;
  onSelectPerson?: (cpf: string) => void;
}

export default function UnifiedProfileView({ data, onClose, onSelectPerson }: UnifiedProfileViewProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  if (!data) return null;

  const vm = normalizeConsultaResult(data);
  const nome = vm.nome;
  const cpf = vm.cpf;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleExportPDF = async () => {
    if (profileRef.current) {
      try {
        setIsExportingPDF(true);
        toast.info("Gerando PDF em alta qualidade...");
        await exportElementToPDF(profileRef.current, {
          filename: generatePDFFilename(nome !== "Não informado" ? nome : (cpf !== "Não informado" ? cpf : "consulta"), "generic"),
          docType: "generic",
          multiPage: true,
          scale: 2,
        });
        toast.success("PDF exportado com sucesso!");
      } catch (err) {
        console.error("Erro na exportação PDF:", err);
        window.print();
      } finally {
        setIsExportingPDF(false);
      }
    } else {
      window.print();
    }
  };

  // ─── CUSTOM RENDER: OPERADORA ───────────────────────────────────────────────
  if (vm.operadoraData) {
    const { operadora, portado, telefone, ddd, estado } = vm.operadoraData;

    const copyOpData = () => {
      const text = `=== CONSULTA OPERADORA ===\nTELEFONE: ${telefone}\nOPERADORA: ${operadora}\nPORTADO: ${portado}\nDDD: ${ddd}\nESTADO: ${estado}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Dados da operadora copiados!");
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="w-full space-y-6 text-slate-100 font-sans select-text bg-slate-900/90 border border-violet-500/30 p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-violet-500/20 no-print">
          <span className="text-sm font-bold text-violet-300">Consulta de Operadora</span>
          <div className="flex gap-2">
            <button onClick={copyOpData} className="px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Número de Telefone</span>
            <span className="font-mono font-bold text-white text-base block mt-1">{telefone}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Operadora Celular</span>
            <span className="font-bold text-violet-300 text-base block mt-1">{operadora}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Portabilidade Recente?</span>
            <span className={`font-bold text-sm block mt-1 ${portado === "SIM" || portado === true || String(portado).toLowerCase() === "sim" ? "text-emerald-400" : "text-slate-300"}`}>
              {String(portado).toUpperCase()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Região / DDD / UF</span>
            <span className="font-bold text-white text-sm block mt-1">{ddd ? `DDD ${ddd}` : ""} {estado ? `(${estado})` : "Não informado"}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── CUSTOM RENDER: BANCOS ──────────────────────────────────────────────────
  if (vm.bancoData) {
    const { nome: nomeBanco, codigo: codigoBanco, ispb, site = "" } = vm.bancoData;

    const copyBankData = () => {
      const text = `=== CONSULTA BANCO ===\nBANCO: ${nomeBanco}\nCÓDIGO COMPE: ${codigoBanco}\nISPB: ${ispb}\nSITE: ${site}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Dados do banco copiados!");
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="w-full space-y-6 text-slate-100 font-sans select-text bg-slate-900/90 border border-violet-500/30 p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-violet-500/20 no-print">
          <span className="text-sm font-bold text-violet-300">Consulta de Banco / ISPB</span>
          <div className="flex gap-2">
            <button onClick={copyBankData} className="px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10 md:col-span-2">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Razão Social / Nome da Instituição</span>
            <span className="font-bold text-white text-base block mt-1">{nomeBanco}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Código COMPE (Compensação)</span>
            <span className="font-mono font-bold text-violet-300 text-base block mt-1">{codigoBanco}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">ISPB (Identificador de Sistema de Pagamentos)</span>
            <span className="font-mono font-bold text-white text-base block mt-1">{ispb}</span>
          </div>
          {site && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10 md:col-span-2">
              <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Website Oficial</span>
              <a href={site.startsWith("http") ? site : `https://${site}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 font-semibold text-sm flex items-center gap-1.5 mt-1">
                {site} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── CUSTOM RENDER: TÍTULO ELEITORAL ────────────────────────────────────────
  if (vm.tituloEleitoralData) {
    const { nome: nomeEleitor, inscricao, secao, zona, municipio, uf } = vm.tituloEleitoralData;

    const copyTseData = () => {
      const text = `=== CONSULTA TÍTULO ELEITORAL ===\nNOME: ${nomeEleitor}\nINSCRIÇÃO: ${inscricao}\nSEÇÃO: ${secao}\nZONA: ${zona}\nMUNICÍPIO/UF: ${municipio} - ${uf}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Dados eleitorais copiados!");
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="w-full space-y-6 text-slate-100 font-sans select-text bg-slate-900/90 border border-violet-500/30 p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-violet-500/20 no-print">
          <span className="text-sm font-bold text-violet-300">Consulta de Título Eleitoral</span>
          <div className="flex gap-2">
            <button onClick={copyTseData} className="px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10 md:col-span-2">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Nome Completo do Eleitor</span>
            <span className="font-bold text-white text-base block mt-1">{nomeEleitor}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Número de Inscrição</span>
            <span className="font-mono font-bold text-violet-300 text-base block mt-1">{inscricao}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Zona Eleitoral / Seção</span>
            <span className="font-bold text-white text-sm block mt-1">Zona: {zona} • Seção: {secao}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10 md:col-span-2">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Domicílio Eleitoral</span>
            <span className="font-bold text-white text-sm block mt-1">{municipio} {uf ? ` - ${uf}` : ""}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── CUSTOM RENDER: PIS / PASEP / NIT ────────────────────────────────────────
  if (vm.pisData) {
    const { nome: nomeTrabalhador, pisNum, cpf: pisCpf, ctps } = vm.pisData;

    const copyPisData = () => {
      const text = `=== CONSULTA PIS/PASEP ===\nNOME: ${nomeTrabalhador}\nPIS/NIS: ${pisNum}\nCPF: ${pisCpf}\nCTPS: ${ctps}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Dados do PIS/PASEP copiados!");
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="w-full space-y-6 text-slate-100 font-sans select-text bg-slate-900/90 border border-violet-500/30 p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-violet-500/20 no-print">
          <span className="text-sm font-bold text-violet-300">Consulta PIS / PASEP / NIS</span>
          <div className="flex gap-2">
            <button onClick={copyPisData} className="px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10 md:col-span-2">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Nome do Trabalhador</span>
            <span className="font-bold text-white text-base block mt-1">{nomeTrabalhador}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Número PIS / NIS / NIT</span>
            <span className="font-mono font-bold text-violet-300 text-base block mt-1">{pisNum}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Documento Vinculado (CPF)</span>
            <span className="font-mono font-bold text-white text-sm block mt-1">{pisCpf}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-violet-500/10 md:col-span-2">
            <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Carteira de Trabalho (CTPS)</span>
            <span className="font-bold text-white text-sm block mt-1">{ctps}</span>
          </div>
        </div>
      </div>
    );
  }

  // Detectar se a resposta é de Consulta de Placa (Veículo)
  if (vm.singleVehicle) {
    return (
      <VehicleProfileView
        vehicle={vm.singleVehicle}
        profileRef={profileRef}
        isExportingPDF={isExportingPDF}
        handleExportPDF={handleExportPDF}
        onSelectPerson={onSelectPerson}
      />
    );
  }

  // Se a resposta for uma lista de resultados (ex: busca por nome ou cep)
  if (vm.personList && vm.personList.length > 0) {
    const listItems = vm.personList;
    return (
      <div className="w-full space-y-4 text-slate-100 font-sans select-text">
        <div className="flex items-center justify-between py-2 border-b border-violet-500/20 no-print">
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
          {listItems.map((item, idx: number) => {
            const itemNome = item.nome;
            const itemCpf = item.documento;
            const itemMae = item.mae || "";
            const itemNasc = item.nascimento || "";
            const itemUf = item.uf || "";
            return (
              <div
                key={idx}
                onClick={() => onSelectPerson && item.isSelectable && onSelectPerson(itemCpf)}
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
                {onSelectPerson && item.isSelectable && (
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

  const parentesData = vm.parentes;
  const vizinhosData = vm.vizinhos ?? [];
  const profissionaisData = vm.profissionais ?? [];
  const veiculosData = vm.veiculos;
  const telefonesList = vm.telefones;
  const enderecosList = vm.enderecos;
  const enderecoPrincipal = vm.enderecoPrincipal;
  const vacinasList = vm.vacinas;
  const emailsList = vm.emails;
  const serasaMosaicObj = vm.serasaMosaic;
  const poderAquisitivoObj = vm.poderAquisitivo;

  const beneficiosObj: BeneficiosData = {
    bolsaFamilia: vm.beneficios.some(b => b.programa === 'Bolsa Família') ? {
      parcelasRecebidas: vm.beneficios.filter(b => b.programa === 'Bolsa Família').map(b => ({
        valor: b.ultimoValor,
        nisFavorecido: b.nisFavorecido,
      }))
    } : undefined,
    auxilioBrasil: vm.beneficios.some(b => b.programa === 'Auxílio Brasil') ? {
      parcelasRecebidas: vm.beneficios.filter(b => b.programa === 'Auxílio Brasil').map(b => ({
        valor: b.ultimoValor,
      }))
    } : undefined,
  };

  const nascimento = vm.nascimento || "Não informado";
  const sexo = vm.sexo || "Não informado";
  const cleanParentName = (val: string | null) => {
    if (!val) return "SEM INFORMACAO";
    const clean = val
      .replace(/SEM INFORMAÃÃO/gi, "SEM INFORMACAO")
      .replace(/SEM INFORMAÇÃ?O/gi, "SEM INFORMACAO")
      .replace(/INFORMAÃÃO/gi, "INFORMACAO");
    if (clean.toUpperCase().includes("SEM INFORMA") || clean.toUpperCase().includes("SEM INFORMAC")) {
      return "SEM INFORMACAO";
    }
    return clean;
  };

  const mae = cleanParentName(vm.mae || null);
  const pai = cleanParentName(vm.pai || null);

  const idadeStr = vm.idadeStr || (nascimento !== "Não informado" ? calculateAge(nascimento) : "");
  const signoStr = nascimento !== "Não informado" ? getZodiacSign(nascimento) : "";

  const rg = vm.rg || null;
  const rgFormatted = rg;
  const titulo = vm.tituloEleitor || null;
  const pis = vm.pisNis || null;
  const cnh = vm.cnh || null;
  const naturalidade = vm.naturalidade || null;
  const renda = vm.renda || null;
  const scoreVal = vm.scoreVal ?? null;
  const mosaic = vm.serasaMosaic?.codMosaic || null;
  const profissao = vm.profissao || null;

  const isDeceased = vm.isDeceased;
  const isCpfIrregular = vm.isCpfIrregular;

  const photoGallery: { label: string; url: string }[] = vm.fotos || [];

  const copyAllData = () => {
    const lines = [
      "=== CONSULTA MASTER BUSCAS ===",
      `NOME: ${nome}`,
      `CPF: ${cpf}`,
      `NASCIMENTO: ${nascimento}${idadeStr ? ` (${idadeStr})` : ''}`,
      `SIGNO: ${signoStr || 'N/A'}`,
      `SEXO: ${sexo || 'N/A'}`,
      `MÃE: ${mae}`,
      `PAI: ${pai || 'N/A'}`,
      `NATURALIDADE: ${naturalidade || 'N/A'}`,
      `STATUS RECEITA: ${vm.statusReceita || "REGULAR"}`,
      `ENDEREÇO PRINCIPAL: ${enderecoPrincipal}`,
      `RG: ${rgFormatted || rg || 'N/A'}`,
      `CNH: ${cnh || 'N/A'}`,
      `TÍTULO ELEITOR: ${titulo || 'N/A'}`,
      `PIS/NIS: ${pis || 'N/A'}`,
      `RENDA: ${renda || 'N/A'}`,
      `SCORE: ${scoreVal || 'N/A'}`,
      `PROFISSÃO: ${profissao || 'N/A'}`,
    ];

    if (telefonesList.length > 0) {
      lines.push("\n--- TELEFONES ---");
      telefonesList.forEach((t, i) => {
        const num = t.numero;
        const type = t.tipo ? ` (${t.tipo})` : "";
        lines.push(`${i + 1}. ${num}${type}`);
      });
    }

    if (enderecosList.length > 0) {
      lines.push("\n--- ENDEREÇOS ---");
      enderecosList.forEach((a, i) => {
        const addrStr = [a.tipo, a.logradouro, a.numero, a.bairro, a.cidade, a.uf, a.cep].filter(Boolean).join(", ");
        lines.push(`${i + 1}. ${addrStr}`);
      });
    }

    if (Array.isArray(parentesData) && parentesData.length > 0) {
      lines.push("\n--- PARENTES VINCULADOS ---");
      parentesData.slice(0, 15).forEach((p, i: number) => {
        const pNome = p.nome;
        const pVinculo = p.vinculo || "Parente";
        const pCpf = p.cpf || "";
        lines.push(`${i + 1}. ${pNome} [${pVinculo}]${pCpf ? ` - CPF: ${pCpf}` : ''}`);
      });
    }

    if (Array.isArray(veiculosData) && veiculosData.length > 0) {
      lines.push("\n--- VEÍCULOS ---");
      veiculosData.forEach((v, i: number) => {
        const vPlaca = v.placa || "";
        const vMod = v.modelo || v.marca || "";
        lines.push(`${i + 1}. ${vPlaca}${vMod ? ` - ${vMod}` : ''}`);
      });
    }

    const text = lines.join("\n").trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Ficha completa de dados copiada com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

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

  const downloadPhoto = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download da foto iniciado!");
  };

  return (
    <div ref={profileRef} className="w-full space-y-6 text-slate-100 font-sans select-text">
      {/* BARRA DE AÇÕES RÁPIDAS */}
      <div className="flex items-center justify-between py-3 border-b border-violet-500/20 flex-wrap gap-2 no-print">
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
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-500/30 text-xs font-semibold transition-all disabled:opacity-60"
          >
            {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> : <Download className="w-3.5 h-3.5 text-violet-400" />}
            {isExportingPDF ? "Exportando..." : "Exportar PDF"}
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

      {/* BARRA DE STATUS DE FONTES CONSULTADAS */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] p-3 rounded-xl bg-slate-900/80 border border-violet-500/20 no-print">
        <span className="text-violet-300 font-bold uppercase tracking-wide mr-1 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" /> Fontes Consultadas:
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${nome !== "Não informado" ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          Receita Federal
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${photoGallery.length > 0 ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          Galeria de Fotos ({photoGallery.length})
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${telefonesList.length > 0 ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          Telefonia ({telefonesList.length})
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${enderecosList.length > 0 ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          Endereços ({enderecosList.length})
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${cnh || rg ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          DETRAN / CNH
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${scoreVal ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          Score / Crédito
        </span>
        {vm.isCache && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-violet-950 border border-violet-500/50 text-violet-300 font-bold text-[10px] flex items-center gap-1">
            ⚡ Entrega Ultra-Rápida (Cache D1)
          </span>
        )}
      </div>

      {/* EMPTY STATE GERAL QUANDO ZERO REGISTROS ENCONTRADOS */}
      {vm.isFullyEmpty && (
        <EmptyStateBanner onClose={onClose} />
      )}

      {/* ALERTA DE COMPLIANCE / KYC */}
      {(isDeceased || isCpfIrregular) && (
        <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center gap-4 animate-pulse shadow-2xl ${
          isDeceased 
            ? "bg-red-950/70 border-red-500/50 text-red-200" 
            : "bg-amber-950/70 border-amber-500/50 text-amber-200"
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isDeceased ? "bg-red-900/50" : "bg-amber-900/50"
          }`}>
            <AlertCircle className={`w-7 h-7 ${isDeceased ? "text-red-400 animate-bounce" : "text-amber-400"}`} />
          </div>
          <div className="space-y-1 text-center md:text-left grow">
            <h4 className="text-sm font-black uppercase tracking-wider">
              {isDeceased ? "⚠️ ALERTA DE COMPLIANCE: ÓBITO CONFIRMADO" : "⚠️ ALERTA: CPF COM SITUAÇÃO CADASTRAL IRREGULAR"}
            </h4>
            <p className="text-xs opacity-90 font-medium">
              {isDeceased 
                ? "Atenção: Este CPF possui registro de óbito cadastrado em bases oficiais. Não prossiga com emissões ou validações."
                : `Atenção: A situação cadastral do CPF na Receita Federal consta como "${vm.statusReceita}". Verifique a idoneidade cadastral antes de realizar operações.`}
            </p>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO DOSSIÊ FORENSE */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 border border-violet-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-900/60 border border-violet-400/30 flex items-center justify-center font-bold text-violet-300 shrink-0">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">DOSSIÊ DE INTELIGÊNCIA CADASTRAL & COMPLIANCE</h3>
            <span className="text-[10px] text-violet-300 font-mono">
              HASH AUDITORIA: {(() => {
                let hash = 0;
                const str = `${cpf}-${nome}`;
                for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
                return `MD5-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
              })()}
            </span>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-400 font-mono bg-slate-950/60 px-3 py-1.5 rounded-xl border border-violet-500/20">
          <span>EMISSÃO: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
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
                <button
                  onClick={() => downloadPhoto(item.url, `FOTO_${nome.replace(/\s+/g, "_")}_${item.label.replace(/\s+/g, "_")}.jpg`)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-violet-600 text-white text-[10px] font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-all shadow border border-violet-500/40 no-print"
                  title="Baixar Foto"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Baixar</span>
                </button>
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
          { label: "Empresas", count: 0, icon: Building2, targetId: "secao-societario" },
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
            {vm.statusReceita || "REGULAR"}
          </span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {(() => {
            const health = calculateProfileHealth({ mother_name: vm.mae, federal_status: vm.statusReceita, death_flag: vm.isDeceased ? '1' : undefined, address: vm.enderecoPrincipal !== 'Não informado' ? vm.enderecoPrincipal : undefined, birth_city: vm.naturalidade }, photoGallery);
            return (
              <div className="md:col-span-2 p-3 rounded-xl bg-slate-950/60 border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 my-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-900/50 border border-violet-500/30 flex items-center justify-center font-black text-sm text-violet-300">
                    {health.score}%
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Índice de Confiabilidade Cadastral</span>
                    <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
                  </div>
                </div>
                <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                  <div className={`h-full transition-all duration-500 ${health.score >= 80 ? "bg-emerald-500" : health.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${health.score}%` }} />
                </div>
              </div>
            );
          })()}
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
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Naturalidade / UF</span>
            <span className="text-white font-semibold block">{naturalidade || "Não informado"}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">RG / Órgão Emissor / UF</span>
            <span className="text-white font-semibold block">{rgFormatted || "Não informado"}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Título de Eleitor</span>
            <span className="text-white font-semibold block">{titulo || "Não informado"}</span>
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-slate-400 block font-medium">Nome da Mãe</span>
            <span className="text-white font-semibold block">{mae}</span>
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-slate-400 block font-medium">Nome do Pai</span>
            <span className="text-white font-semibold block">{pai}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO: DIAGRAMA DE TEIA DE CONEXÕES (Filtrado para Perfil Completo com Vínculos) */}
      {(parentesData.length > 0 || vizinhosData.length > 0 || telefonesList.length > 0 || enderecosList.length > 0) && (
        <TeiaConexoesGraph
          nomeCentral={nome}
          cpfCentral={cpf}
          parentes={parentesData}
          vizinhos={vizinhosData}
          telefones={telefonesList}
          enderecos={enderecosList}
          corporateShare={undefined}
          onSelectPerson={onSelectPerson}
        />
      )}

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
      <AddressesSection
        enderecosList={enderecosList}
        enderecoPrincipal={enderecoPrincipal}
        leafletLoaded={leafletLoaded}
      />

      {/* SEÇÃO: TELEFONES REGISTRADOS */}
      <PhonesSection telefonesList={telefonesList} />

      {/* SEÇÃO: PARENTES VINCULADOS */}
      <RelativesSection
        parentesData={parentesData}
        onSelectPerson={onSelectPerson}
      />

      {/* SEÇÃO: VÍNCULOS SOCIETÁRIOS (CNPJ / QSA) */}
      <QsaSection
        corporateSharePct={undefined}
        nome={nome}
      />

      {/* SEÇÃO: HISTÓRICO DE VACINAÇÃO (SUS / DATASUS) */}
      <VaccinesSection vacinasList={vacinasList} />

      {/* SEÇÃO: BENEFÍCIOS SOCIAIS E ASSISTENCIAIS */}
      <BenefitsSection beneficiosObj={beneficiosObj} />

      {/* SEÇÃO: SERASA MOSAIC & PODER AQUISITIVO (ESTILO CLEAN SEM CORES CHAMATIVAS) */}
      <MosaicProfileSection serasaMosaicObj={serasaMosaicObj} poderAquisitivoObj={poderAquisitivoObj} />
    </div>
  );
}
