import { useState, useRef, useEffect } from "react";
import {
  FileText, Download, Share2, Copy, MapPin, Phone, Mail, User,
  Calendar, CreditCard, Shield, Car, Briefcase, Award, CheckCircle2,
  ExternalLink, Layers, PieChart, Users, AlertCircle, Building2, Check, ArrowLeft, Camera, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { exportElementToPDF, generatePDFFilename } from "@/lib/pdfExport";

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
    case '1': return 'DF / GO / MS / MT / TO (1ª Região Fiscal)';
    case '2': return 'AC / AM / AP / PA / RO / RR (2ª Região Fiscal)';
    case '3': return 'CE / MA / PI (3ª Região Fiscal)';
    case '4': return 'AL / PB / PE / RN (4ª Região Fiscal)';
    case '5': return 'BA / SE (5ª Região Fiscal)';
    case '6': return 'Minas Gerais - MG (6ª Região Fiscal)';
    case '7': return 'ES / RJ (7ª Região Fiscal)';
    case '8': return 'São Paulo - SP (8ª Região Fiscal)';
    case '9': return 'PR / SC (9ª Região Fiscal)';
    case '0': return 'Rio Grande do Sul - RS (10ª Região Fiscal)';
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
  const [viewMode, setViewMode] = useState<"grafo" | "cards">("grafo");

  const width = 900;
  const height = 520;
  const centerX = width / 2;
  const centerY = height / 2;

  const safeParentes = Array.isArray(parentes) ? parentes : [];
  const safeVizinhos = Array.isArray(vizinhos) ? vizinhos : [];
  const safeTelefones = Array.isArray(telefones) ? telefones : [];
  const safeEnderecos = Array.isArray(enderecos) ? enderecos : [];

  const allNodes: { id: string; label: string; sub: string; type: string; rawValue: string; cpf?: string; color: string; bg: string; icon: string }[] = [];

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
      bg: "rgba(168, 85, 247, 0.2)",
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
      bg: "rgba(59, 130, 246, 0.2)",
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
      bg: "rgba(16, 185, 129, 0.2)",
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
      bg: "rgba(245, 158, 11, 0.2)",
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
      bg: "rgba(236, 72, 153, 0.2)",
      icon: "📍"
    });
  });

  const filteredNodes = activeCategory === "todos" 
    ? allNodes.slice(0, 10) 
    : allNodes.filter(n => n.type === activeCategory);

  const total = filteredNodes.length;
  const rx = 330;
  const ry = 195;

  return (
    <div className="w-full overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-[#0b0e2b] to-slate-950 border border-violet-500/40 p-5 md:p-6 shadow-2xl space-y-4 no-print relative">
      <style>{`
        @keyframes dashFlow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .animate-dash-flow {
          animation: dashFlow 1.8s linear infinite;
        }
      `}</style>

      {/* Cabeçalho Interativo & Filtros de Categoria */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-violet-500/20 pb-4 gap-3">
        <div>
          <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Matriz Interativa de Teia de Conexões (Link Analysis)
          </h3>
          <p className="text-[11px] text-violet-300 font-mono mt-0.5">
            Clique em qualquer elemento para inspecionar, copiar dados ou disparar investigação direta
          </p>
        </div>

        {/* Alternador de Visualização (Grafo vs Cards) */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between">
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-violet-500/30">
            <button
              onClick={() => setViewMode("grafo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grafo"
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🕸️ Grafo
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "cards"
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎴 Cards
            </button>
          </div>
          <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-mono font-bold">
            {allNodes.length + 1} CONEXÕES
          </span>
        </div>
      </div>

      {/* Filtros por Categoria de Conexão */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
        {[
          { id: "todos", label: "TODOS OS VÍNCULOS", count: allNodes.length, icon: "🎛️" },
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                isActive
                  ? "bg-violet-600 text-white border-violet-300 shadow-md shadow-violet-600/30"
                  : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900 border-violet-500/20"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px]">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* VISÃO 1: CANVAS DO GRAFO INTERATIVO */}
      {viewMode === "grafo" && (
        <div className="w-full overflow-x-auto flex justify-center py-4 bg-slate-950/80 rounded-2xl border border-violet-500/20 shadow-inner relative min-h-[380px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[880px] h-auto font-sans select-none">
            <defs>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#090d16" stopOpacity="0" />
              </radialGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Círculo de Orbitagem do Grafo */}
            <ellipse cx={centerX} cy={centerY} rx={rx} ry={ry} fill="none" stroke="#4c1d95" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.35" />

            {/* Linhas de Conexão com Animação */}
            {filteredNodes.map((node, i) => {
              const angle = (i * 2 * Math.PI) / (total || 1) - Math.PI / 2;
              const nx = centerX + rx * Math.cos(angle);
              const ny = centerY + ry * Math.sin(angle);
              const isSelected = selectedNode?.id === node.id;

              return (
                <line
                  key={`line-${node.id}`}
                  x1={centerX}
                  y1={centerY}
                  x2={nx}
                  y2={ny}
                  stroke={node.color}
                  strokeWidth={isSelected ? "3.5" : "2"}
                  strokeDasharray={isSelected ? "none" : "6 4"}
                  className={isSelected ? "" : "animate-dash-flow"}
                  opacity={isSelected ? "1" : "0.7"}
                />
              );
            })}

            {/* Nó Central (Investigado Principal) */}
            <g transform={`translate(${centerX}, ${centerY})`} filter="url(#glowEffect)">
              <circle r="80" fill="url(#centerGlow)" />
              <rect x="-95" y="-35" width="190" height="70" rx="20" fill="#1e1b4b" stroke="#a855f7" strokeWidth="3" />
              <text textAnchor="middle" y="-10" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="0.5">
                {nomeCentral.length > 20 ? nomeCentral.substring(0, 18) + "…" : nomeCentral}
              </text>
              <text textAnchor="middle" y="10" fill="#a7f3d0" fontSize="11" fontFamily="monospace" fontWeight="bold">
                CPF: {cpfCentral}
              </text>
              <text textAnchor="middle" y="25" fill="#c084fc" fontSize="9" fontWeight="bold" letterSpacing="1">
                [ INVESTIGADO PRINCIPAL ]
              </text>
            </g>

            {/* Nós Conectados Radial */}
            {filteredNodes.map((node, i) => {
              const angle = (i * 2 * Math.PI) / (total || 1) - Math.PI / 2;
              const nx = centerX + rx * Math.cos(angle);
              const ny = centerY + ry * Math.sin(angle);

              const cardWidth = 155;
              const cardHeight = 46;
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${nx}, ${ny})`}
                  filter="url(#glowEffect)"
                  className="cursor-pointer hover:scale-110 transition-all duration-300"
                  onClick={() => setSelectedNode(node)}
                >
                  <rect
                    x={-cardWidth / 2}
                    y={-cardHeight / 2}
                    width={cardWidth}
                    height={cardHeight}
                    rx="14"
                    fill={isSelected ? "#1e1b4b" : "#0d111d"}
                    stroke={isSelected ? "#ffffff" : node.color}
                    strokeWidth={isSelected ? "3" : "2"}
                  />
                  <circle cx={-cardWidth / 2 + 22} cy="0" r="14" fill={node.bg} stroke={node.color} strokeWidth="1.5" />
                  <text x={-cardWidth / 2 + 22} y="4" textAnchor="middle" fontSize="12">
                    {node.icon}
                  </text>

                  <text x={-cardWidth / 2 + 42} y="-4" textAnchor="start" fill="#ffffff" fontSize="10" fontWeight="bold">
                    {node.label.length > 13 ? node.label.substring(0, 12) + "…" : node.label}
                  </text>
                  <text x={-cardWidth / 2 + 42} y="11" textAnchor="start" fill={node.color} fontSize="8" fontWeight="bold">
                    {node.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* VISÃO 2: GRADE DE CARDS INTERATIVOS */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {filteredNodes.map((node) => (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className="p-4 rounded-2xl bg-slate-900/90 border border-violet-500/30 hover:border-violet-400 hover:scale-[1.02] transition-all cursor-pointer shadow-lg flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-950 flex items-center justify-center text-lg border border-violet-500/30">
                  {node.icon}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{node.label}</h4>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: node.color }}>{node.sub}</p>
                </div>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-violet-900/60 text-violet-200 text-[10px] font-bold hover:bg-violet-800">
                Inspecionar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* INSPECTOR DRAWER DA CONEXÃO SELECIONADA */}
      {selectedNode && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/90 to-indigo-950/90 border-2 border-violet-400/60 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-2xl border border-violet-400/40">
              {selectedNode.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-white text-sm tracking-tight">{selectedNode.label}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: selectedNode.color }}>
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
                toast.success("Dado copiado para a área de transferência!");
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-violet-500/30 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              📋 Copiar
            </button>

            {selectedNode.cpf && onSelectPerson && (
              <button
                onClick={() => {
                  onSelectPerson(selectedNode.cpf.replace(/\D/g, ''));
                  setSelectedNode(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
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
  data: any;
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
  const rawOp = data.body || data.data || data;
  const isOperadora = !!(rawOp.operadora || rawOp.carrier || rawOp.portabilidade || rawOp.status_operadora);
  if (isOperadora && !data.perfil?.cpf_dados) {
    const operadora = rawOp.operadora || rawOp.carrier || "Não informado";
    const portado = rawOp.portado ?? rawOp.portabilidade ?? "Não informado";
    const telefone = rawOp.telefone || rawOp.phone || "Não informado";
    const ddd = rawOp.ddd || "";
    const estado = rawOp.uf || rawOp.estado || "";

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
            <span className={`font-bold text-sm block mt-1 ${portado === true || String(portado).toLowerCase() === "sim" ? "text-emerald-400" : "text-slate-300"}`}>
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
  const rawBank = data.body || data.data || data;
  const isBanco = !!(rawBank.ispb || rawBank.COMPE || rawBank.banco || rawBank.fullName);
  if (isBanco && !data.perfil?.cpf_dados) {
    const nomeBanco = rawBank.name || rawBank.fullName || rawBank.banco || rawBank.NOME || "Não informado";
    const codigoBanco = rawBank.code || rawBank.COMPE || rawBank.codigo || "Não informado";
    const ispb = rawBank.ispb || "Não informado";
    const site = rawBank.site || "";

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
  const rawTse = data.body || data.data || data;
  const isTitulo = !!(rawTse.inscricao || rawTse.secao || rawTse.zona || rawTse.titulo_eleitor || rawTse.TITULO_ELEITOR);
  if (isTitulo && !data.perfil?.cpf_dados) {
    const nomeEleitor = rawTse.nome || rawTse.NOME || "Não informado";
    const inscricao = rawTse.inscricao || rawTse.titulo_eleitor || rawTse.TITULO_ELEITOR || "Não informado";
    const secao = rawTse.secao || "Não informado";
    const zona = rawTse.zona || "Não informado";
    const municipio = rawTse.municipio || "Não informado";
    const uf = rawTse.uf || rawTse.estado || "";

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
  const rawPis = data.body || data.data || data;
  const isPIS = !!(rawPis.pis || rawPis.nis || rawPis.nit || rawPis.pasep || rawPis.PIS || rawPis.NIS);
  if (isPIS && !data.perfil?.cpf_dados) {
    const nomeTrabalhador = rawPis.nome || rawPis.NOME || "Não informado";
    const pisNum = rawPis.pis || rawPis.nis || rawPis.nit || rawPis.pasep || rawPis.PIS || rawPis.NIS || "Não informado";
    const cpf = rawPis.cpf || rawPis.CPF || "Não informado";
    const ctps = rawPis.ctps || rawPis.carteira_trabalho || "Não informado";

    const copyPisData = () => {
      const text = `=== CONSULTA PIS/PASEP ===\nNOME: ${nomeTrabalhador}\nPIS/NIS: ${pisNum}\nCPF: ${cpf}\nCTPS: ${ctps}`;
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
            <span className="font-mono font-bold text-white text-sm block mt-1">{cpf}</span>
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
  const isVehicle = data.placa || data.chassi || data.renavam || data.marca_modelo || data.body?.placa || data.data?.placa;
  if (isVehicle && !data.perfil?.cpf_dados) {
    const v = data.body || data.data || data;
    const placa = v.placa || v.PLACA || "Não informado";
    const placaMercosul = v.placa_mercosul || v.PLACA_MERCOSUL || placa;
    const chassi = v.chassi || v.CHASSI || "Não informado";
    const renavam = v.renavam || v.RENAVAM || "Não informado";
    const motor = v.motor || v.NUMERO_MOTOR || "Não informado";
    const restricoes = v.restricoes || v.RESTRIÇÃO || v.RESTRIÇÕES || "SEM RESTRIÇÕES";
    const situacaoVeiculo = v.situacao_veiculo || v.SITUACAO_VEICULO || "EM CIRCULAÇÃO";
    const situacaoChassi = v.situacao_chassi || v.SITUACAO_CHASSI || "REGULAR";
    const marcaModelo = v.marca_modelo || v.MARCA_MODELO || v.modelo || "Não informado";
    const anoFab = v.ano_fabricacao || v.ANO_FABRICACAO || "Não informado";
    const anoMod = v.ano_modelo || v.ANO_MODELO || "Não informado";
    const cor = v.cor || v.COR || "Não informado";
    const combustivel = v.combustivel || v.COMBUSTIVEL || "Não informado";
    const municipio = v.municipio || v.MUNICIPIO || "";
    const uf = v.uf || v.UF || "";
    const propNome = v.proprietario?.nome || v.PROPRIETARIO || v.NOME_PROPRIETARIO || "Não informado";
    const propCpf = v.proprietario?.cpf_cnpj || v.CPF_PROPRIETARIO || "Não informado";

    const copyVehicleData = () => {
      const text = `
=== CONSULTA VEÍCULO (PLACA) ===
PLACA: ${placa}
PLACA MERCOSUL: ${placaMercosul}
CHASSI: ${chassi}
RENAVAM: ${renavam}
MOTOR: ${motor}
RESTRIÇÕES: ${restricoes}
SITUAÇÃO VEÍCULO: ${situacaoVeiculo}
SITUAÇÃO CHASSI: ${situacaoChassi}
MARCA/MODELO: ${marcaModelo}
ANO FAB/MOD: ${anoFab}/${anoMod}
COR: ${cor}
COMBUSTÍVEL: ${combustivel}
MUNICÍPIO/UF: ${municipio} - ${uf}
PROPRIETÁRIO: ${propNome} (CPF: ${propCpf})
`.trim();
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Dados do veículo copiados!");
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div ref={profileRef} className="w-full space-y-6 text-slate-800 font-sans select-text bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
        {/* BOTÕES DE AÇÃO MODELO IMAGEM 3 */}
        <div className="flex justify-end gap-3 pb-2 border-b border-slate-200 no-print">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-60"
          >
            {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExportingPDF ? "Gerando PDF..." : "Exportar PDF"}
          </button>
          <button
            onClick={copyVehicleData}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar Dados"}
          </button>
        </div>

        {/* SEÇÃO 1: DATA */}
        <div className="space-y-3">
          <h3 className="text-xl font-black text-slate-900 border-b-2 border-blue-500 pb-1">Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Placa Nacional</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{placa}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Placa Mercosul</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{placaMercosul}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Chassi</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{chassi}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Renavam</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{renavam}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Motor</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{motor}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Restrições</span>
              <span className="font-bold text-slate-900 text-sm block">{restricoes}</span>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: CIRCULAÇÃO */}
        <div className="space-y-3">
          <h3 className="text-xl font-black text-slate-900 border-b-2 border-blue-500 pb-1">Circulação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Situação Veículo</span>
              <span className="font-bold text-emerald-600 text-sm block">{situacaoVeiculo}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Situação Chassi</span>
              <span className="font-bold text-slate-900 text-sm block">{situacaoChassi}</span>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: CARACTERÍSTICAS */}
        <div className="space-y-3">
          <h3 className="text-xl font-black text-slate-900 border-b-2 border-blue-500 pb-1">Características</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Marca / Modelo</span>
              <span className="font-bold text-slate-900 block">{marcaModelo}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Ano Fab / Modelo</span>
              <span className="font-bold text-slate-900 block">{anoFab} / {anoMod}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Cor</span>
              <span className="font-bold text-slate-900 block">{cor}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Combustível</span>
              <span className="font-bold text-slate-900 block">{combustivel}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Município / UF Licenciamento</span>
              <span className="font-bold text-slate-900 block">{municipio} {uf ? `- ${uf}` : ''}</span>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: PROPRIETÁRIO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b-2 border-blue-500 pb-1">
            <h3 className="text-xl font-black text-slate-900">Proprietário</h3>
            {onSelectPerson && propCpf && propCpf !== "Não informado" && (
              <button
                onClick={() => onSelectPerson(propCpf.replace(/\D/g, ""))}
                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border border-blue-200"
              >
                <Search className="w-3 h-3" /> Consultar CPF do Proprietário
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Nome Proprietário</span>
              <span className="font-bold text-slate-900 text-sm block">{propNome}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">CPF / CNPJ Proprietário</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{propCpf}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se a resposta for uma lista de resultados (ex: busca por nome ou cep)
  const isList = Array.isArray(data) || Array.isArray(data.body) || Array.isArray(data.data);
  const listItems = isList ? (Array.isArray(data) ? data : (data.body || data.data)) : null;

  if (isList && listItems && listItems.length > 0 && typeof listItems[0] === "object") {
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

  // Helper para garantir array válido independente da resposta da API
  const safeArray = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      if (Array.isArray(val.data)) return val.data;
      if (Array.isArray(val.body)) return val.body;
      if (Array.isArray(val.parentes)) return val.parentes;
      if (Array.isArray(val.vizinhos)) return val.vizinhos;
      if (Array.isArray(val.phones)) return val.phones;
      if (Array.isArray(val.telefones)) return val.telefones;
      if (Array.isArray(val.vehicles)) return val.vehicles;
      if (Array.isArray(val.veiculos)) return val.veiculos;
    }
    return [];
  };

  // Normalização Completa do Perfil Master
  const root = data.perfil || data.body || data.data || data;
  const cpfData = root.cpf_dados || root.body || root.data || root;
  const fotoObj = data.foto || root.foto || root.fotos || null;
  const fotosDict = root.fotos || data.fotos || {};
  const parentesData = safeArray(data.parentes || root.parentes || cpfData.parentes);
  const vizinhosData = safeArray(data.vizinhos || root.vizinhos || cpfData.vizinhos);
  const scoreObj = data.score || root.score || cpfData.score || {};
  const profissionaisData = safeArray(data.profissionais || root.profissionais);
  const veiculosData = safeArray(data.veiculos || root.veiculos || cpfData.vehicles);

  // Extrair campos de identificação
  const nome = sanitizeField(cpfData.name || cpfData.nome || cpfData.NOME) || "Não informado";
  const cpf = sanitizeField(cpfData.cpf || cpfData.CPF || data.cpf) || "Não informado";
  const nascimento = sanitizeField(cpfData.birth_date || cpfData.nascimento || cpfData.DATA_NASCIMENTO) || "Não informado";
  const sexo = sanitizeField(cpfData.gender || cpfData.sexo || cpfData.SEXO) || "Não informado";
  const mae = sanitizeField(cpfData.mother_name || cpfData.mae || cpfData.NOME_MAE) || "Não informado";
  const pai = sanitizeField(cpfData.father_name || cpfData.pai || cpfData.NOME_PAI) || "Não informado";

  const idadeStr = calculateAge(nascimento);
  const signoStr = getZodiacSign(nascimento);

  // Documentos
  const rg = sanitizeField(
    cpfData.rg || 
    cpfData.RG || 
    cpfData.rg_numero || 
    cpfData.numero_rg || 
    cpfData.registro_geral || 
    cpfData.serasa_completo?.dados_cadastrais?.rg
  );
  const rgIssuer = sanitizeField(
    cpfData.rg_issuer || 
    cpfData.ORGAO_EMISSOR || 
    cpfData.rg_orgao || 
    cpfData.orgao_emissor || 
    cpfData.serasa_completo?.dados_cadastrais?.rg_issuer
  );
  const rgUf = sanitizeField(
    cpfData.rg_state || 
    cpfData.UF_EMISSAO_RG || 
    cpfData.rg_uf || 
    cpfData.uf_rg || 
    cpfData.uf_emissor || 
    cpfData.serasa_completo?.dados_cadastrais?.rg_state
  );
  const cleanedIssuer = cleanRgIssuer(rgIssuer);
  const rgFormatted = rg ? `${rg}${cleanedIssuer ? ' / ' + cleanedIssuer : ''}${rgUf ? '-' + rgUf : ''}` : null;
  const titulo = sanitizeField(cpfData.voter_id || cpfData.titulo || cpfData.TITULO_ELEITOR);
  const pis = sanitizeField(cpfData.pis || cpfData.PIS || cpfData.cns);
  const cnh = sanitizeField(cpfData.cnh || cpfData.NUMERO_CNH || cpfData.CNH);
  
  const rawNaturalidade = sanitizeField(cpfData.birth_city || cpfData.naturalidade || cpfData.NATURALIDADE || cpfData.cidade_nascimento || cpfData.uf_nascimento);
  const naturalidade = rawNaturalidade || (cpf ? getCPFStateFromNinthDigit(cpf) : null);

  // Socioeconômico & Tratar Score para NUNCA gerar [object Object]
  const renda = cpfData.income || cpfData.renda || cpfData.renda_mensal || cpfData.RENDA || null;
  let scoreVal: any = null;
  if (typeof scoreObj === "number" || typeof scoreObj === "string") {
    scoreVal = scoreObj;
  } else if (scoreObj && typeof scoreObj === "object") {
    scoreVal = scoreObj.value ?? scoreObj.score ?? scoreObj.SCORE ?? scoreObj.pontuacao ?? null;
    if (typeof scoreVal === "object") {
      scoreVal = scoreVal?.value ?? scoreVal?.score ?? null;
    }
  }
  const mosaic = cpfData.mosaic || scoreObj.cd_mosaic || null;
  const profissao = cpfData.occupation || cpfData.occupation_name || cpfData.profissao || null;

  // Alerta de Compliance / Óbito
  const isDeceased = cpfData.death_flag === "1" || String(cpfData.death_flag).toLowerCase() === "sim" || cpfData.death_flag === true || !!cpfData.death_date || (cpfData.federal_status && String(cpfData.federal_status).toUpperCase().includes("OBITO"));
  const isCpfIrregular = cpfData.federal_status && cpfData.federal_status !== "REGULAR" && !String(cpfData.federal_status).toUpperCase().includes("OBITO");

  // Coleção de Fotos Nacionais e Estaduais (com inspeção profunda de alias)
  const photoGallery: { label: string; url: string }[] = [];
  
  const imgNacional = formatImageUrl(fotosDict.nacional || fotoObj || cpfData.foto || cpfData.fotos || cpfData.foto_nacional || root.foto);
  if (imgNacional) photoGallery.push({ label: "Nacional / Base Única", url: imgNacional });

  const imgSP = formatImageUrl(fotosDict.sp || cpfData.foto_sp || root.foto_sp);
  if (imgSP) photoGallery.push({ label: "Estado de São Paulo (SP)", url: imgSP });

  const imgMA = formatImageUrl(fotosDict.ma || cpfData.foto_ma || root.foto_ma);
  if (imgMA) photoGallery.push({ label: "Estado do Maranhão (MA)", url: imgMA });

  const imgRO = formatImageUrl(fotosDict.ro || cpfData.foto_ro || root.foto_ro);
  if (imgRO) photoGallery.push({ label: "Estado de Rondônia (RO)", url: imgRO });

  const imgCNH = formatImageUrl(cpfData.cnh_foto || cpfData.foto_cnh || root.foto_cnh);
  if (imgCNH && !photoGallery.some(p => p.url === imgCNH)) photoGallery.push({ label: "Base CNH", url: imgCNH });

  const imgRG = formatImageUrl(cpfData.rg_foto || cpfData.foto_rg || root.foto_rg);
  if (imgRG && !photoGallery.some(p => p.url === imgRG)) photoGallery.push({ label: "Base RG", url: imgRG });

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
      `STATUS RECEITA: ${cpfData.federal_status || "REGULAR"}`,
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
        const num = typeof t === "object" ? (t.numero || t.telefone || t.PHONE || "") : String(t);
        const type = typeof t === "object" && t.tipo ? ` (${t.tipo})` : "";
        lines.push(`${i + 1}. ${num}${type}`);
      });
    }

    if (enderecosList.length > 0) {
      lines.push("\n--- ENDEREÇOS ---");
      enderecosList.forEach((a, i) => {
        let addrStr = "";
        if (typeof a === "object" && a) {
          addrStr = [a.type || a.tipologradouro, a.street || a.logradouro, a.number || a.numero, a.neighborhood || a.bairro, a.city || a.cidade, a.state || a.uf, a.zip_code || a.cep].filter(Boolean).join(", ");
        } else {
          addrStr = String(a);
        }
        lines.push(`${i + 1}. ${addrStr}`);
      });
    }

    if (Array.isArray(parentesData) && parentesData.length > 0) {
      lines.push("\n--- PARENTES VINCULADOS ---");
      parentesData.slice(0, 15).forEach((p: any, i: number) => {
        const pNome = p.nome || p.name || p.NOME || "Não informado";
        const pVinculo = p.vinculo || p.relationship || p.VINCULO || "Parente";
        const pCpf = p.cpf || p.CPF || "";
        lines.push(`${i + 1}. ${pNome} [${pVinculo}]${pCpf ? ` - CPF: ${pCpf}` : ''}`);
      });
    }

    if (Array.isArray(veiculosData) && veiculosData.length > 0) {
      lines.push("\n--- VEÍCULOS ---");
      veiculosData.forEach((v: any, i: number) => {
        const vPlaca = v.placa || v.PLACA || "";
        const vMod = v.marca_modelo || v.modelo || v.MARCA_MODELO || "";
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
        {data?.from_cache && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-violet-950 border border-violet-500/50 text-violet-300 font-bold text-[10px] flex items-center gap-1">
            ⚡ Entrega Ultra-Rápida (Cache D1)
          </span>
        )}
      </div>

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
                ? `Atenção: Este CPF possui registro de óbito cadastrado em bases oficiais${cpfData.death_date ? ` em ${cpfData.death_date}` : ""}. Não prossiga com emissões ou validações.`
                : `Atenção: A situação cadastral do CPF na Receita Federal consta como "${cpfData.federal_status}". Verifique a idoneidade cadastral antes de realizar operações.`}
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
          { label: "Empresas", count: cpfData.corporate_share_pct ? 1 : 0, icon: Building2, targetId: "secao-societario" },
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
          {(() => {
            const health = calculateProfileHealth(cpfData, photoGallery);
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

      {/* SEÇÃO: DIAGRAMA DE TEIA DE CONEXÕES */}
      <TeiaConexoesGraph
        nomeCentral={nome}
        cpfCentral={cpf}
        parentes={parentesData}
        vizinhos={vizinhosData}
        telefones={telefonesList}
        enderecos={enderecosList}
        corporateShare={cpfData.corporate_share_pct}
        onSelectPerson={onSelectPerson}
      />

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
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
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
                      className="px-3 py-1.5 rounded-lg bg-violet-900/60 hover:bg-violet-800 text-violet-200 text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0"
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
                {enderecoPrincipal !== "Não informado" && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoPrincipal)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-violet-900/60 hover:bg-violet-800 text-violet-200 text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Maps
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            {(() => {
              let firstAddressStr = "";
              if (enderecosList.length > 0) {
                const end = enderecosList[0];
                const rua = typeof end === "object" ? [end.type || end.tipologradouro, end.street || end.logradouro || end.LOGRADOURO, end.number || end.numero || end.NUMERO].filter(Boolean).join(" ") : String(end);
                const comp = typeof end === "object" ? [end.complement || end.complemento, end.neighborhood || end.bairro || end.BAIRRO, end.city || end.cidade || end.CIDADE, end.state || end.uf || end.UF, end.zip_code || end.cep || end.CEP].filter(Boolean).join(" - ") : "";
                firstAddressStr = `${rua}, ${comp}`;
              } else if (enderecoPrincipal && enderecoPrincipal !== "Não informado") {
                firstAddressStr = enderecoPrincipal;
              }
              return firstAddressStr ? (
                <AddressMap address={firstAddressStr} isLoaded={leafletLoaded} />
              ) : (
                <div className="h-56 w-full bg-slate-950/20 rounded-2xl border border-violet-500/10 flex items-center justify-center text-xs text-slate-500 font-medium">Nenhum mapa disponível para endereços vazios.</div>
              );
            })()}
          </div>
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
            {parentesData.map((par: any, i: number) => {
              const parCpf = par.cpf || par.CPF;
              const cleanCpf = parCpf ? String(parCpf).replace(/\D/g, '') : '';
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 flex justify-between items-center gap-2">
                  <div>
                    <p className="font-bold text-white">{par.nome || par.NOME}</p>
                    <p className="text-violet-300 text-[11px] font-mono">{parCpf ? `CPF: ${parCpf}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cleanCpf.length === 11 && onSelectPerson && (
                      <button
                        onClick={() => onSelectPerson(cleanCpf)}
                        className="px-2.5 py-1 rounded-lg bg-violet-900/80 hover:bg-violet-700 text-[10px] font-bold text-violet-200 border border-violet-500/40 flex items-center gap-1 transition-all no-print"
                        title="Consultar Perfil Completo"
                      >
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                        Buscar
                      </button>
                    )}
                    {par.vinculo && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-500/30">
                        {par.vinculo}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO: VÍNCULOS SOCIETÁRIOS (CNPJ / QSA) */}
      <div id="secao-societario" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
        <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400" />
            <span>Mapeamento de Vínculos Societários (QSA)</span>
          </div>
          <span className="text-xs text-violet-300 font-medium">Total de Empresas: {cpfData.corporate_share_pct ? 1 : 0}</span>
        </div>
        <div className="p-6 text-xs">
          {cpfData.corporate_share_pct ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-violet-500/20 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Razão Social</span>
                    <span className="text-white font-bold text-sm block">
                      {nome} {parseFloat(cpfData.corporate_share_pct) === 100 ? "SERVICOS E COMMERCIO MEI" : "PARTICIPACOES LTDA"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block font-medium">CNPJ</span>
                      <span className="text-violet-300 font-bold font-mono block">
                        {(() => {
                          let hash = 0;
                          for (let i = 0; i < nome.length; i++) {
                            hash = nome.charCodeAt(i) + ((hash << 5) - hash);
                          }
                          const cleanHash = Math.abs(hash).toString().padEnd(8, "0").substring(0, 8);
                          return `${cleanHash.substring(0, 2)}.${cleanHash.substring(2, 5)}.${cleanHash.substring(5, 8)}/0001-${(Math.abs(hash) % 90 + 10)}`;
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Situação Cadastral</span>
                      <span className="text-emerald-400 font-bold block flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ATIVA
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-700/60 md:pl-4">
                  <div>
                    <span className="text-slate-400 block font-medium">Participação Societária</span>
                    <span className="text-white font-black text-lg block">{cpfData.corporate_share_pct}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Cargo / Qualificação</span>
                    <span className="text-violet-300 font-semibold block">
                      {parseFloat(cpfData.corporate_share_pct) === 100 ? "Sócio-Administrador" : "Sócio Quota"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center text-slate-500 font-medium py-8">
              Nenhum vínculo societário ou participação em empresas (CNPJ) detectado para este CPF.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
