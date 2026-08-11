/**
 * CRLVCria — Gerador do CRLV Digital em 6 Etapas
 *
 * Mapeamento e Estilo baseados 100% no formulário ELITEDOC.STORE / DocMaster:
 * 1. AUTOMAÇÃO VIA WHATSAPP (Copiar / Colar e Preencher)
 * 2. 1. IDENTIFICAÇÃO DO VEÍCULO (Renavam, Placa, Exercício, CRV, Seg CRV, Seg CLA)
 * 3. 2. CARACTERÍSTICAS (Marca/Modelo, Ano Fab/Mod, Cor, Combustível, Espécie, Categoria, Carroceria, CAT)
 * 4. 3. TÉCNICA (Chassi, Placa Ant., Potência/Cil, Capacidade, Lotação, Peso Bruto, Motor, CMT, Eixos)
 * 5. 4. PROPRIETÁRIO & LOCAL (Nome, CPF/CNPJ, Local/UF, Data)
 * 6. 5. OBSERVAÇÕES (Observações do Veículo & DPVAT)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import CRLVDocument, { type CRLVDocumentHandle, type CRLVDocumentProps } from "../components/CRLVDocument";
import { toast } from "sonner";
import EmissionModal from "@/components/EmissionModal";
import { snoopPerfilCPF } from "@/lib/snoopApi";
import {
  ArrowLeft, Download, MessageCircle, Copy, Zap, Check, User, Car, RefreshCw,
  ZoomIn, ZoomOut, RotateCcw, ArrowUp, ArrowDown, Maximize2, Sparkles, Search, ShieldCheck, Wrench, FileText,
  ChevronLeft, ChevronRight
} from "lucide-react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const MODELO_TEXTO_CRLV = `RENAVAM: 
Placa: 
Exercício: 2026
Ano Fab: 
Ano Mod: 
Marca/Modelo: 
Chassi: 
Cor: 
Combustível: 
Proprietário: 
CPF/CNPJ: 
Local: 
UF: `;

function gerarNumero(len: number): string {
  let r = "";
  for (let i = 0; i < len; i++) r += Math.floor(Math.random() * 10).toString();
  return r;
}

function gerarPlaca(): string {
  const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const d = "0123456789";
  return `${l[Math.floor(Math.random() * 26)]}${l[Math.floor(Math.random() * 26)]}${l[Math.floor(Math.random() * 26)]}${d[Math.floor(Math.random() * 10)]}${l[Math.floor(Math.random() * 26)]}${d[Math.floor(Math.random() * 10)]}${d[Math.floor(Math.random() * 10)]}`;
}

function gerarChassi(): string {
  const chars = "0123456789ABCDEFGHJKLMNPRSTUVWXYZ";
  let r = "9BGV";
  for (let i = 0; i < 13; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function formatarCPFInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  }
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function getHojeDataStr(): string {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const ano = agora.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function getHojeDataHoraStr(): string {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const ano = agora.getFullYear();
  const hora = String(agora.getHours()).padStart(2, "0");
  const min = String(agora.getMinutes()).padStart(2, "0");
  const seg = String(agora.getSeconds()).padStart(2, "0");
  return `${dia}/${mes}/${ano} às ${hora}:${min}:${seg}`;
}

export default function CRLVCria() {
  const { user, updateBalance } = useAuth();
  const [, setLocation] = useLocation();
  const docRef = useRef<CRLVDocumentHandle>(null);

  // Etapas das Abas (6 Seções Fieis)
  const [etapa, setEtapa] = useState<"automacao" | "identificacao" | "caracteristicas" | "tecnica" | "proprietario" | "observacoes">("automacao");

  // Estados do Formulário
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codigoQR, setCodigoQR] = useState("");
  const [importText, setImportText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [documentPrice, setDocumentPrice] = useState(1500);

  // Campos extras de Segurança CRV
  const [segurancaCRV, setSegurancaCRV] = useState("66545815734");

  // Ajustes de Zoom e Navegação do Preview
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Ocultar / Exibir Formulário com Animação e Seta
  const [formOculto, setFormOculto] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);

  const [data, setData] = useState<CRLVDocumentProps>({
    renavam: "00278581161",
    placa: "MPK5502",
    exercicio: "2026",
    anoFabricacao: "1993",
    anoModelo: "1993",
    numeroCRV: "***",
    codigoSegurancaCLA: "60529625695",
    cat: "***",
    marcaModeloVersao: "GM/OMEGA GLS",
    especieTipo: "PASSAGEIRO",
    placaAnteriorUF: "*******/**",
    chassi: "9BGVP19BPPB233276",
    corPredominante: "PRETA",
    combustivel: "GASOLINA",

    detranUF: "PR",
    emissaoDetranUF: "SE",
    emissaoDetranHash: "D72C8C94ED88BF41",
    emissaoDataHora: getHojeDataHoraStr(),

    categoria: "PARTICULAR",
    capacidade: "*.*",
    potenciaCilindrada: "116CV/2198",
    pesoBrutoTotal: "1.29",
    motor: "C20NE31022309V",
    cmt: "3.05",
    eixos: "2",
    lotacao: "05",
    carroceria: "NÃO APLICAVEL",
    nome: "ANTONIO CAMILO ALMEIDA FREITAS JUNIOR",
    cpfCnpj: "042.512.909-84",
    local: "CURITIBA PR",
    dataEmissaoDoc: getHojeDataStr(),

    dpvatCatTarif: "",
    dpvatDataQuitacao: "",
    dpvatPagamento: "",
    dpvatRepasseFns: "",
    dpvatCustoBilhete: "",
    dpvatCustoEfetivo: "",
    dpvatRepasseDenatran: "",
    dpvatValorIof: "",
    dpvatValorTotal: "",

    observacoesVeiculo: "SEM OBSERVAÇÕES",
    informacoesDpvat: "",

    codigoQR: "PREVIEW",
    blurred: true,
  });

  const routeParams = useParams<{ id?: string }>();

  // Carregar preço e documento se em edição
  useEffect(() => {
    fetch("/api/pricing", { credentials: "include" })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          const crlvPrice = result.data.crlv || result.data.crlvcria || 1500;
          setDocumentPrice(crlvPrice);
        }
      })
      .catch(() => undefined);

    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get("edit_id");
    const routeId = routeParams?.id;
    const id = routeId || queryId;

    if (id) {
      setEditId(id);
      setLoading(true);
      fetch(`/api/documents/${id}`, { credentials: "include" })
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            const doc = result.data;
            let docData: any = {};
            try { docData = typeof doc.data === "string" ? JSON.parse(doc.data) : (doc.data || {}); } catch { docData = {}; }
            const merged = {
              ...docData,
              nome: doc.nome || docData.nome || "",
              cpfCnpj: doc.cpf || docData.cpfCnpj || "",
              codigoQR: doc.codigo_qr || doc.codigo_validacao || doc.id || "PREVIEW",
              blurred: false,
            };
            setData(merged);
            setCodigoQR(doc.codigo_qr || doc.codigo_validacao || doc.id);
            setSaved(true);
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }
  }, [routeParams?.id]);

  const update = useCallback((field: keyof CRLVDocumentProps) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (field === "cpfCnpj") val = formatarCPFInput(val);
    setData((d) => ({ ...d, [field]: val }));
  }, []);

  const limparFormulario = () => {
    setData({
      renavam: "", placa: "", exercicio: "2026", anoFabricacao: "", anoModelo: "",
      numeroCRV: "", codigoSegurancaCLA: "", cat: "***", marcaModeloVersao: "",
      especieTipo: "PASSAGEIRO", placaAnteriorUF: "*******/**", chassi: "",
      corPredominante: "", combustivel: "GASOLINA", detranUF: "PR", emissaoDetranUF: "PR",
      emissaoDetranHash: "D72C8C94ED88BF41", emissaoDataHora: getHojeDataHoraStr(),
      categoria: "PARTICULAR", capacidade: "*.*", potenciaCilindrada: "", pesoBrutoTotal: "",
      motor: "", cmt: "", eixos: "2", lotacao: "05", carroceria: "NÃO APLICAVEL",
      nome: "", cpfCnpj: "", local: "", dataEmissaoDoc: getHojeDataStr(),
      dpvatCatTarif: "", dpvatDataQuitacao: "", dpvatPagamento: "",
      dpvatRepasseFns: "", dpvatCustoBilhete: "", dpvatCustoEfetivo: "",
      dpvatRepasseDenatran: "", dpvatValorIof: "", dpvatValorTotal: "",
      observacoesVeiculo: "SEM OBSERVAÇÕES", informacoesDpvat: "",
      codigoQR: "PREVIEW", blurred: true
    });
    setSegurancaCRV("");
    setSaved(false);
    toast.success("Formulário limpo!");
  };

  // Geradores Individuais por campo
  const gerarRenavam = () => setData(d => ({ ...d, renavam: gerarNumero(11) }));
  const gerarPlacaField = () => setData(d => ({ ...d, placa: gerarPlaca() }));
  const gerarNumeroCRV = () => setData(d => ({ ...d, numeroCRV: gerarNumero(10) }));
  const gerarSegurancaCRV = () => setSegurancaCRV(gerarNumero(11));
  const gerarCodigoCLA = () => setData(d => ({ ...d, codigoSegurancaCLA: gerarNumero(11) }));
  const gerarChassiField = () => setData(d => ({ ...d, chassi: gerarChassi() }));

  // Gerador Inteligente de Motor por Padrão da Marca/Modelo
  const gerarMotorField = (marcaModeloInput?: string) => {
    const model = (marcaModeloInput || data.marcaModeloVersao || "").toUpperCase();
    let prefix = "";
    let digitsLen = 7;

    if (model.includes("PEUGEOT") || model.includes("CITROEN") || model.includes("206") || model.includes("207") || model.includes("208")) {
      prefix = "10FS01";
      digitsLen = 6;
    } else if (model.includes("GM/") || model.includes("CHEVROLET") || model.includes("OMEGA") || model.includes("CORSA") || model.includes("CELTA") || model.includes("ONIX")) {
      const gmPrefixes = ["C20NE", "N14YF", "SPE4", "CSS"];
      prefix = gmPrefixes[Math.floor(Math.random() * gmPrefixes.length)];
      digitsLen = 7;
    } else if (model.includes("FIAT") || model.includes("UNO") || model.includes("PALIO") || model.includes("STRADA") || model.includes("TORO")) {
      prefix = "310A2000";
      digitsLen = 7;
    } else if (model.includes("VW/") || model.includes("VOLKSWAGEN") || model.includes("GOL") || model.includes("FOX") || model.includes("POLO")) {
      prefix = "CCRA";
      digitsLen = 6;
    } else if (model.includes("FORD") || model.includes("KA") || model.includes("FIESTA") || model.includes("RANGER")) {
      prefix = "SIGMA";
      digitsLen = 6;
    } else if (model.includes("TOYOTA") || model.includes("COROLLA") || model.includes("HILUX")) {
      prefix = "2ZR";
      digitsLen = 7;
    } else if (model.includes("HONDA") || model.includes("CIVIC") || model.includes("FIT") || model.includes("HR-V")) {
      prefix = "R18A1";
      digitsLen = 7;
    } else if (model.includes("HYUNDAI") || model.includes("KIA") || model.includes("HB20")) {
      prefix = "G4FC";
      digitsLen = 6;
    } else if (model.includes("RENAULT") || model.includes("SANDERO") || model.includes("LOGAN")) {
      prefix = "K4M";
      digitsLen = 7;
    } else {
      prefix = "MOT";
      digitsLen = 8;
    }

    const num = gerarNumero(digitsLen);
    const motorGerado = `${prefix}${num}`;
    setData((d) => ({ ...d, motor: motorGerado }));
    toast.success(`Motor gerado no padrão ${prefix}: ${motorGerado}`);
  };

  // Auto-Completar Inteligente de Dados Técnicos por Modelo
  const preencherDadosTecnicosPorModelo = (modeloInput: string) => {
    const model = modeloInput.toUpperCase().trim();
    if (!model || model.length < 3) return;

    let specs: Partial<CRLVDocumentProps> = {};

    if (/PEUGEOT.*206|PEUGEOT.*207|PEUGEOT.*208|206|207|208/i.test(model)) {
      specs = {
        potenciaCilindrada: "113CV/1587",
        pesoBrutoTotal: "1.56",
        cmt: "2.46",
        combustivel: "ALCOOL/GASOLINA",
        especieTipo: "PASSAGEIRO AUTOMOVEL",
        carroceria: "NÃO APLICAVEL",
        lotacao: "05",
        eixos: "2",
      };
    } else if (/OMEGA|GM.*OMEGA|VECTRA|ASTRA/i.test(model)) {
      specs = {
        potenciaCilindrada: "116CV/2198",
        pesoBrutoTotal: "1.29",
        cmt: "3.05",
        combustivel: "GASOLINA",
        especieTipo: "PASSAGEIRO AUTOMOVEL",
        carroceria: "NÃO APLICAVEL",
        lotacao: "05",
        eixos: "2",
      };
    } else if (/GOL|VW.*GOL|FOX|POLO|VOYAGE/i.test(model)) {
      specs = {
        potenciaCilindrada: "76CV/999",
        pesoBrutoTotal: "1.42",
        cmt: "2.10",
        combustivel: "ALCOOL/GASOLINA",
        especieTipo: "PASSAGEIRO AUTOMOVEL",
        carroceria: "NÃO APLICAVEL",
        lotacao: "05",
        eixos: "2",
      };
    } else if (/ONIX|CELTA|CORSA|AGILE|PRISMA/i.test(model)) {
      specs = {
        potenciaCilindrada: "82CV/999",
        pesoBrutoTotal: "1.41",
        cmt: "2.15",
        combustivel: "ALCOOL/GASOLINA",
        especieTipo: "PASSAGEIRO AUTOMOVEL",
        carroceria: "NÃO APLICAVEL",
        lotacao: "05",
        eixos: "2",
      };
    } else if (/UNO|PALIO|SIENA|MOBI|ARGO/i.test(model)) {
      specs = {
        potenciaCilindrada: "75CV/999",
        pesoBrutoTotal: "1.38",
        cmt: "2.00",
        combustivel: "ALCOOL/GASOLINA",
        especieTipo: "PASSAGEIRO AUTOMOVEL",
        carroceria: "NÃO APLICAVEL",
        lotacao: "05",
        eixos: "2",
      };
    } else if (/STRADA|SAVEIRO|TORO|S10|HILUX|RANGER|AMAROK/i.test(model)) {
      const isHilux = /HILUX|AMAROK|RANGER/i.test(model);
      specs = {
        potenciaCilindrada: isHilux ? "204CV/2755" : "109CV/1332",
        pesoBrutoTotal: isHilux ? "3.05" : "1.85",
        cmt: isHilux ? "5.50" : "3.00",
        combustivel: isHilux ? "DIESEL" : "ALCOOL/GASOLINA",
        especieTipo: "CARGA CAMINHONETE",
        carroceria: "ABERTA",
        lotacao: "05",
        eixos: "2",
      };
    } else if (/COROLLA|CIVIC|CITY|FIT|HR-V|CRETA|HB20|KICKS|RENEGADE/i.test(model)) {
      specs = {
        potenciaCilindrada: "155CV/1997",
        pesoBrutoTotal: "1.75",
        cmt: "2.50",
        combustivel: "ALCOOL/GASOLINA",
        especieTipo: "PASSAGEIRO AUTOMOVEL",
        carroceria: "NÃO APLICAVEL",
        lotacao: "05",
        eixos: "2",
      };
    }

    if (Object.keys(specs).length > 0) {
      setData((prev) => ({
        ...prev,
        ...specs,
      }));
    }
  };

  // Snoop Intelligence / CPF Lookup
  const [isSnoopLoading, setIsSnoopLoading] = useState(false);
  const handleSnoopLookup = async () => {
    const targetCpf = (data.cpfCnpj || "").replace(/\D/g, "");
    if (targetCpf.length !== 11) {
      toast.error("Digite um CPF válido com 11 dígitos para consultar.");
      return;
    }

    setIsSnoopLoading(true);
    const toastId = toast.loading("Consultando SnoopIntelligence...");
    try {
      const perfilData = await snoopPerfilCPF(targetCpf).catch(() => null);
      const perfil = perfilData?.perfil || {};
      const cpfDados = perfil.cpf_dados || {};

      const nomeVal = cpfDados.nome || cpfDados.name || cpfDados.nome_completo;
      const localVal = cpfDados.cidade && cpfDados.uf ? `${cpfDados.cidade} ${cpfDados.uf}` : "";

      setData((prev) => ({
        ...prev,
        nome: nomeVal ? String(nomeVal).toUpperCase() : prev.nome,
        cpfCnpj: formatarCPFInput(targetCpf),
        local: localVal ? String(localVal).toUpperCase() : prev.local,
      }));

      toast.success("✅ Dados preenchidos via SnoopIntelligence!", { id: toastId });
    } catch {
      toast.dismiss(toastId);
    } finally {
      setIsSnoopLoading(false);
    }
  };

  // Importar / Copiar Texto WhatsApp & PLACA MASTER
  const handleCopiarModelo = () => {
    navigator.clipboard.writeText(MODELO_TEXTO_CRLV);
    toast.success("Modelo de formulário copiado para a área de transferência!");
  };

  const handleColarEPreencher = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        toast.error("Nenhum texto encontrado na área de transferência.");
        return;
      }
      setImportText(clipboardText);

      const cleanVal = (v: string) => {
        return v
          .replace(/\(código.*?\)/gi, "")
          .replace(/\(codigo.*?\)/gi, "")
          .trim();
      };

      const linhas = clipboardText.split("\n");
      const extraido: Partial<CRLVDocumentProps> = {};

      let potenciaTemp = "";
      let cilindradaTemp = "";
      let especieTemp = "";
      let tipoTemp = "";

      linhas.forEach((linha) => {
        if (!linha.includes(":")) return;
        const [chave, ...resto] = linha.split(":");
        if (!resto.length) return;
        const rawVal = resto.join(":").trim();
        const val = cleanVal(rawVal);
        const k = chave.toLowerCase().trim();

        if (k.includes("renavam")) {
          extraido.renavam = val;
        } else if (k === "placa" || (k.includes("placa") && !k.includes("anterior") && !k.includes("master"))) {
          extraido.placa = val.toUpperCase();
        } else if (k.includes("exercício") || k.includes("exercicio")) {
          extraido.exercicio = val;
        } else if (k === "ano fabricação" || k === "ano fabricacao" || k.includes("ano fab")) {
          extraido.anoFabricacao = val;
        } else if (k === "ano modelo" || k.includes("ano mod")) {
          extraido.anoModelo = val;
        } else if ((k.includes("marca") || k.includes("modelo")) && !k.includes("ano")) {
          extraido.marcaModeloVersao = val.toUpperCase();
        } else if (k.includes("chassi")) {
          extraido.chassi = val.toUpperCase();
        } else if (k === "cor" || k.includes("predominante")) {
          extraido.corPredominante = val.toUpperCase();
        } else if (k.includes("combustível") || k.includes("combustivel")) {
          extraido.combustivel = val.toUpperCase();
        } else if (k.includes("proprietário") || k.includes("proprietario") || k.includes("nome")) {
          if (!k.includes("tipo")) extraido.nome = val.toUpperCase();
        } else if (k.includes("cpf") || k.includes("cnpj") || k.includes("documento")) {
          extraido.cpfCnpj = formatarCPFInput(val);
        } else if (k.includes("município") || k.includes("municipio") || k.includes("local")) {
          extraido.local = val.replace("-", "").replace(/\s+/g, " ").toUpperCase();
          const parts = val.split("-");
          if (parts.length > 1) {
            const uf = parts[parts.length - 1].trim().toUpperCase();
            if (uf.length === 2) extraido.detranUF = uf;
          }
        } else if (k.includes("categoria")) {
          extraido.categoria = val.toUpperCase();
        } else if (k.includes("lotação") || k.includes("lotacao")) {
          extraido.lotacao = val.padStart(2, "0");
        } else if (k.includes("carroceria")) {
          extraido.carroceria = val.toUpperCase();
        } else if (k.includes("motor")) {
          extraido.motor = val.toUpperCase();
        } else if (k.includes("potência") || k.includes("potencia")) {
          potenciaTemp = val;
        } else if (k.includes("cilindrada")) {
          cilindradaTemp = val;
        } else if (k.includes("espécie") || k.includes("especie")) {
          especieTemp = val.toUpperCase();
        } else if (k.includes("tipo de veículo") || k.includes("tipo de veiculo")) {
          tipoTemp = val.toUpperCase();
        } else if (k === "cmt") {
          extraido.cmt = val;
        } else if (k === "pbt" || k.includes("peso bruto")) {
          extraido.pesoBrutoTotal = val;
        } else if (k.includes("eixos")) {
          extraido.eixos = val;
        }
      });

      if (especieTemp || tipoTemp) {
        if (especieTemp && tipoTemp) extraido.especieTipo = `${especieTemp} ${tipoTemp}`;
        else extraido.especieTipo = especieTemp || tipoTemp;
      }

      if (potenciaTemp || cilindradaTemp) {
        if (potenciaTemp && cilindradaTemp) extraido.potenciaCilindrada = `${potenciaTemp}CV/${cilindradaTemp}`;
        else if (potenciaTemp) extraido.potenciaCilindrada = `${potenciaTemp}CV`;
      }

      setData((prev) => ({ ...prev, ...extraido }));
      toast.success("Dados da consulta PLACA MASTER importados com sucesso!");
      setEtapa("identificacao");
    } catch {
      toast.error("Não foi possível acessar a área de transferência.");
    }
  };

  // Controles de Preview
  const scrollToTop = () => previewContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => previewContainerRef.current?.scrollTo({ top: previewContainerRef.current.scrollHeight, behavior: "smooth" });
  const zoomIn = () => setPreviewZoom((z) => Math.min(z + 0.15, 2.0));
  const zoomOut = () => setPreviewZoom((z) => Math.max(z - 0.15, 0.5));
  const zoomReset = () => setPreviewZoom(1.0);

  // Modal de Emissão
  const handleAbrirEmissao = () => {
    if (!data.nome.trim() || !data.renavam.trim() || !data.placa.trim()) {
      toast.error("Preencha Nome, RENAVAM e Placa para atualizar/emitir o CRLV.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmarEmissao = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      const isEdit = Boolean(editId);
      const url = isEdit ? `/api/documents/${editId}` : "/api/documents/crlv";
      const method = isEdit ? "PUT" : "POST";

      const agoraDataHora = getHojeDataHoraStr();
      const agoraData = getHojeDataStr();

      const payload = {
        ...data,
        emissaoDataHora: agoraDataHora,
        dataEmissaoDoc: data.dataEmissaoDoc || agoraData,
        nome: data.nome.trim().toUpperCase(),
        cpf: data.cpfCnpj,
        type: "crlv",
        blurred: false,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error || "Erro ao emitir documento.");
        return;
      }

      if (result.newBalance !== undefined) updateBalance(result.newBalance);
      else if (result.balance !== undefined) updateBalance(result.balance);

      const savedCode = result.codigo_qr || result.codigo_validacao || result.id || editId || "CRLV-2026";
      setCodigoQR(savedCode);
      setData((prev) => ({ ...prev, codigoQR: savedCode, blurred: false }));
      setSaved(true);
      setShowSuccessModal(true);
      toast.success(isEdit ? "Documento atualizado com sucesso!" : "CRLV Emitido com sucesso!");
    } catch {
      toast.error("Erro de conexão ao emitir documento.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      await docRef.current.exportAsPdf();
      toast.success("PDF baixado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-screen w-full bg-[#020617] text-white flex flex-col font-sans select-none overflow-hidden">
      {/* HEADER BAR SUPREMO (Estilo DOCMASTER.STORE) */}
      <header className="h-16 border-b border-amber-500/20 bg-[#050a17]/95 px-5 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-wide flex items-center gap-2">
            <span className="text-white font-black text-base">DOCMASTER</span>
            <span className="text-[#005CA9] font-black text-base">.STORE</span>
            <span className="text-amber-400 font-bold ml-1">Gerador de CRLV</span>
          </h1>
        </div>

          <div className="flex items-center gap-2">
            <button
              onClick={limparFormulario}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/30 hover:bg-amber-500/10 text-amber-300 text-xs font-bold transition"
            >
              LIMPAR FORMULÁRIO
            </button>
            <button
              onClick={() => setLocation("/dashboard")}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition"
            >
              VOLTAR
            </button>
          </div>
        </header>

        {/* ÁREA PRINCIPAL DUAS COLUNAS COM ANIMAÇÃO DE RECOLHIMENTO */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden relative">
          {/* COLUNA ESQUERDA: NAVEGAÇÃO DE ABAS & FORMULÁRIO */}
          <div
            className={`border-r border-slate-800 bg-[#040914] flex flex-col h-[calc(100vh-4rem-4rem)] transition-all duration-300 ease-in-out relative shrink-0 ${
              formOculto
                ? "w-12 min-w-[48px] max-w-[48px] overflow-hidden select-none"
                : "w-full lg:w-[42%] lg:min-w-[380px] lg:max-w-[520px]"
            }`}
          >
            {formOculto ? (
              /* BARRA VERTICAL COMPACTA QUANDO O FORMULÁRIO ESTÁ OCULTO */
              <div className="flex-1 flex flex-col items-center py-4 gap-6 bg-[#040914] border-r border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setFormOculto(false)}
                  title="Expandir Formulário"
                  className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 transition shadow-md hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5 animate-pulse text-amber-400" />
                </button>

                <div
                  onClick={() => setFormOculto(false)}
                  className="flex-1 flex items-center justify-center cursor-pointer group py-4"
                  title="Clique para expandir o formulário"
                >
                  <span
                    className="text-xs font-black tracking-widest text-slate-400 group-hover:text-amber-400 uppercase transition-colors"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    FORMULÁRIO DO CRLV
                  </span>
                </div>
              </div>
            ) : (
              /* CONTEÚDO COMPLETO DO FORMULÁRIO */
              <>
                <div className="flex-1 overflow-y-auto p-4 flex gap-4">
                  {/* SIDEBAR TABS VERTICAL */}
                  <div className="w-40 flex flex-col gap-1.5">
                    {[
                      { id: "automacao", label: "AUTOMAÇÃO", activeColor: "border-amber-400 text-amber-300 bg-amber-500/10" },
                      { id: "identificacao", label: "1. IDENTIFICAÇÃO", activeColor: "border-amber-400 text-amber-300 bg-amber-500/10" },
                      { id: "caracteristicas", label: "2. CARACTERÍSTICAS", activeColor: "border-amber-400 text-amber-300 bg-amber-500/10" },
                      { id: "tecnica", label: "3. TÉCNICA", activeColor: "border-amber-400 text-amber-300 bg-amber-500/10" },
                      { id: "proprietario", label: "4. PROPRIETÁRIO", activeColor: "border-amber-400 text-amber-300 bg-amber-500/10" },
                      { id: "observacoes", label: "5. OBSERVAÇÕES", activeColor: "border-amber-400 text-amber-300 bg-amber-500/10" },
                    ].map((t) => {
                      const active = etapa === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setEtapa(t.id as any)}
                          className={`py-2 px-3 rounded-md font-bold text-[11px] text-left transition border ${
                            active
                              ? `${t.activeColor} shadow-sm`
                              : "border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* CONTEÚDO DA ABA SELECIONADA */}
                  <div className="flex-1 space-y-4">
                    {/* 0. AUTOMAÇÃO VIA WHATSAPP */}
                    {etapa === "automacao" && (
                      <div className="p-4 rounded-xl bg-[#070e20] border border-emerald-500/40 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                          <MessageCircle className="w-4 h-4" /> AUTOMAÇÃO VIA WHATSAPP
                        </div>

                        <p className="text-xs text-slate-300 font-medium">1. Envie para o cliente preencher</p>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={handleCopiarModelo}
                            className="py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 uppercase"
                          >
                            <Copy className="w-3.5 h-3.5" /> COPIAR
                          </button>
                          <button
                            type="button"
                            onClick={handleColarEPreencher}
                            className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 uppercase shadow-md shadow-emerald-950"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> COLAR E PREENCHER
                          </button>
                        </div>

                        <p className="text-[11px] text-emerald-400/80 font-mono">
                          Aguardando cópia ou colagem do formulário.
                        </p>
                      </div>
                    )}

                    {/* 1. IDENTIFICAÇÃO DO VEÍCULO */}
                    {etapa === "identificacao" && (
                      <div className="p-4 rounded-xl bg-[#070e20] border border-amber-500/30 space-y-3.5">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                          <Car className="w-4 h-4" /> IDENTIFICAÇÃO DO VEÍCULO
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Renavam</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={data.renavam}
                              onChange={update("renavam")}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                            />
                            <button type="button" onClick={gerarRenavam} className="px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                              GERAR
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Placa</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={data.placa}
                                onChange={update("placa")}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono uppercase"
                              />
                              <button type="button" onClick={gerarPlacaField} className="px-2 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                                GERAR
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Exercício</label>
                            <input
                              type="text"
                              value={data.exercicio}
                              onChange={update("exercicio")}
                              className="w-full px-3 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Número do CRV</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={data.numeroCRV}
                              onChange={update("numeroCRV")}
                              placeholder="Ex: 1234567890"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                            />
                            <button type="button" onClick={gerarNumeroCRV} className="px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                              GERAR
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Segurança CRV</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={segurancaCRV}
                                onChange={(e) => setSegurancaCRV(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                              />
                              <button type="button" onClick={gerarSegurancaCRV} className="px-2 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                                GERAR
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Cód. Seg CLA</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={data.codigoSegurancaCLA}
                                onChange={update("codigoSegurancaCLA")}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                              />
                              <button type="button" onClick={gerarCodigoCLA} className="px-2 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                                GERAR
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. CARACTERÍSTICAS */}
                    {etapa === "caracteristicas" && (
                      <div className="p-4 rounded-xl bg-[#070e20] border border-amber-500/30 space-y-3.5">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                          <Car className="w-4 h-4" /> CARACTERÍSTICAS
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-300">Marca / Modelo</label>
                            <button
                              type="button"
                              onClick={() => preencherDadosTecnicosPorModelo(data.marcaModeloVersao)}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 uppercase flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30"
                            >
                              <Sparkles className="w-3 h-3" /> AUTO-SPECS
                            </button>
                          </div>
                          <input
                            type="text"
                            value={data.marcaModeloVersao}
                            onChange={(e) => {
                              const val = e.target.value;
                              setData((d) => ({ ...d, marcaModeloVersao: val }));
                              preencherDadosTecnicosPorModelo(val);
                            }}
                            placeholder="Ex: PEUGEOT/206 SW16 ESCA FX"
                            className="w-full px-3 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Ano Fab</label>
                            <input type="text" value={data.anoFabricacao} onChange={update("anoFabricacao")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Ano Mod</label>
                            <input type="text" value={data.anoModelo} onChange={update("anoModelo")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Cor</label>
                            <input type="text" value={data.corPredominante} onChange={update("corPredominante")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Combustível</label>
                            <input type="text" value={data.combustivel} onChange={update("combustivel")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Espécie / Tipo</label>
                            <input type="text" value={data.especieTipo} onChange={update("especieTipo")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Categoria</label>
                            <input type="text" value={data.categoria} onChange={update("categoria")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Carroceria</label>
                            <input type="text" value={data.carroceria} onChange={update("carroceria")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">CAT (*.*)</label>
                            <input type="text" value={data.cat} onChange={update("cat")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. TÉCNICA (ESPECIFICAÇÕES TÉCNICAS) */}
                    {etapa === "tecnica" && (
                      <div className="p-4 rounded-xl bg-[#070e20] border border-amber-500/30 space-y-3.5">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                          <Wrench className="w-4 h-4" /> ESPECIFICAÇÕES TÉCNICAS
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Chassi</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={data.chassi}
                              onChange={update("chassi")}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono uppercase"
                            />
                            <button type="button" onClick={gerarChassiField} className="px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                              GERAR
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Placa Ant.</label>
                            <input type="text" value={data.placaAnteriorUF} onChange={update("placaAnteriorUF")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase font-mono" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Potência/Cil</label>
                            <input type="text" value={data.potenciaCilindrada} onChange={update("potenciaCilindrada")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Capacidade</label>
                            <input type="text" value={data.capacidade} onChange={update("capacidade")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Lotação</label>
                            <input type="text" value={data.lotacao} onChange={update("lotacao")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Peso Bruto</label>
                            <input type="text" value={data.pesoBrutoTotal} onChange={update("pesoBrutoTotal")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Motor</label>
                            <div className="flex gap-1">
                              <input type="text" value={data.motor} onChange={update("motor")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono uppercase" />
                              <button type="button" onClick={() => gerarMotorField(data.marcaModeloVersao)} className="px-2 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-bold text-[10px] uppercase">
                                GERAR
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">CMT</label>
                            <input type="text" value={data.cmt} onChange={update("cmt")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                          </div>
                        </div>

                        <div className="w-1/4 space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Eixos</label>
                          <input type="text" value={data.eixos} onChange={update("eixos")} className="w-full px-2 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase" />
                        </div>
                      </div>
                    )}

                    {/* 4. PROPRIETÁRIO & LOCAL */}
                    {etapa === "proprietario" && (
                      <div className="p-4 rounded-xl bg-[#070e20] border border-amber-500/30 space-y-3.5">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                          <User className="w-4 h-4" /> PROPRIETÁRIO & LOCAL
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Nome Proprietário</label>
                          <input
                            type="text"
                            value={data.nome}
                            onChange={update("nome")}
                            placeholder="NOME COMPLETO"
                            className="w-full px-3 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">CPF / CNPJ</label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={data.cpfCnpj}
                                onChange={update("cpfCnpj")}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                              />
                              <button type="button" onClick={handleSnoopLookup} title="Snoop Lookup" className="px-2 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200">
                                <Search className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Local / UF</label>
                            <input
                              type="text"
                              value={data.local}
                              onChange={(e) => {
                                const val = e.target.value;
                                setData((d) => {
                                  const clean = val.trim().toUpperCase().replace(/\s*-\s*/g, " ").replace(/\s+/g, " ");
                                  const parts = clean.split(" ");
                                  let updatedUf = d.detranUF;
                                  if (parts.length > 1) {
                                    const last = parts[parts.length - 1];
                                    if (last.length === 2 && /^[A-Z]{2}$/.test(last)) {
                                      updatedUf = last;
                                    }
                                  }
                                  return {
                                    ...d,
                                    local: val,
                                    detranUF: updatedUf,
                                    emissaoDetranUF: updatedUf,
                                  };
                                });
                              }}
                              placeholder="Ex: CURITIBA PR"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs uppercase"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">Data</label>
                            <input
                              type="text"
                              value={data.dataEmissaoDoc}
                              onChange={update("dataEmissaoDoc")}
                              placeholder="21/01/2026"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#030712] border border-slate-800 text-white text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. OBSERVAÇÕES */}
                    {etapa === "observacoes" && (
                      <div className="p-4 rounded-xl bg-[#070e20] border border-amber-500/30 space-y-3.5">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                          <FileText className="w-4 h-4" /> OBSERVAÇÕES & DPVAT
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Observações do Veículo</label>
                          <textarea
                            rows={3}
                            value={data.observacoesVeiculo}
                            onChange={update("observacoesVeiculo")}
                            placeholder="SEM OBSERVAÇÕES"
                            className="w-full p-2.5 rounded-lg bg-[#030712] border border-slate-800 text-xs text-white uppercase focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Informações do Seguro DPVAT</label>
                          <textarea
                            rows={3}
                            value={data.informacoesDpvat}
                            onChange={update("informacoesDpvat")}
                            placeholder="Campos adicionais DPVAT"
                            className="w-full p-2.5 rounded-lg bg-[#030712] border border-slate-800 text-xs text-white uppercase focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTÃO FIXO DE AÇÃO INFERIOR DO FORMULÁRIO */}
                <div className="p-3 border-t border-slate-800 bg-[#050a17] flex justify-center">
                  <button
                    type="button"
                    onClick={handleAbrirEmissao}
                    className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/50 text-amber-300 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> ATUALIZAR CRLV (EMITIR)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* COLUNA DIREITA: PRÉVIA INTERATIVA EM TEMPO REAL */}
          <div className="flex-1 bg-[#020617] flex flex-col h-[calc(100vh-4rem-4rem)] relative overflow-hidden transition-all duration-300 ease-in-out">
            {/* BARRA DE ZOOM */}
            <div className="p-2.5 bg-[#050a17]/90 border-b border-slate-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormOculto(!formOculto)}
                  title={formOculto ? "Expandir Formulário" : "Ocultar Formulário"}
                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all flex items-center gap-1 group shadow-sm hover:scale-105"
                >
                  {formOculto ? (
                    <ChevronRight className="w-4 h-4 text-amber-300 transition-transform duration-300 group-hover:translate-x-0.5" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-amber-300 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  )}
                </button>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" /> Prévia do Documento
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={zoomOut} className="p-1.5 rounded-md bg-slate-900 text-slate-300 hover:bg-slate-800"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={zoomReset} className="px-2 py-1 rounded-md bg-slate-900 text-slate-300 text-[11px] font-mono">100%</button>
                <button onClick={zoomIn} className="p-1.5 rounded-md bg-slate-900 text-slate-300 hover:bg-slate-800"><ZoomIn className="w-4 h-4" /></button>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                <button onClick={scrollToTop} className="p-1.5 rounded-md bg-slate-900 text-slate-300 hover:bg-slate-800"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={scrollToBottom} className="p-1.5 rounded-md bg-slate-900 text-slate-300 hover:bg-slate-800"><ArrowDown className="w-4 h-4" /></button>
              </div>
            </div>

            {/* PREVIEW CANVAS */}
            <div ref={previewContainerRef} className="flex-1 overflow-auto p-6 flex justify-center items-start bg-[#090d16]">
              <div style={{ transform: `scale(${previewZoom})`, transformOrigin: "top center", transition: "transform 0.15s ease-out" }} className="my-2">
                <CRLVDocument ref={docRef} {...data} previewWidth={760} />
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE EMISSÃO */}
        <EmissionModal
          docLabel="CRLV Digital"
          docEmoji="📄"
          documentPrice={documentPrice}
          userBalance={user?.balance ?? 0}
          showConfirm={showConfirmModal}
          showSuccess={showSuccessModal}
          isEmitting={loading}
          isDownloading={isDownloading}
          onConfirm={handleConfirmarEmissao}
          onCancel={() => setShowConfirmModal(false)}
          onDownload={handleDownloadPDF}
          onClose={() => setShowSuccessModal(false)}
          historyPath="/crlvsalvos"
        />
      </div>
  );
}
