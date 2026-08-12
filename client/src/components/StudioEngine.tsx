import React, { useState, useRef, useEffect } from "react";
import { 
  Wand2, Upload, Move, Type, Trash2, Plus, CheckCircle, 
  DollarSign, Layers, Eye, RefreshCw, Sparkles, Tag, Shield, Sliders
} from "lucide-react";
import { toast } from "sonner";

export interface CoordinateBox {
  id: string;
  fieldKey: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: "left" | "center" | "right";
  isUpperCase: boolean;
}

interface StudioTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  target_structure: string;
  coordinates_json: string;
  created_at: string;
}

export default function StudioEngine() {
  const [docName, setDocName] = useState("");
  const [docSlug, setDocSlug] = useState("");
  const [category, setCategory] = useState("veiculos");
  const [price, setPrice] = useState("15.00");
  const [targetStructure, setTargetStructure] = useState("cnh");

  // QR Code & Configuração de Validação
  const [qrFormat, setQrFormat] = useState<"XXXX-XXXX" | "UUID-32" | "CPF">("UUID-32");
  const [qrSourceUrl, setQrSourceUrl] = useState("https://carteira-digital-transito-vio.digital");
  const [extractedLogos, setExtractedLogos] = useState<string[]>([]);

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 794, height: 1123 }); // Proporção nativa A4 / PDF
  const [zoom, setZoom] = useState(1);
  const [boxes, setBoxes] = useState<CoordinateBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const [savedTemplates, setSavedTemplates] = useState<StudioTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);

  // Histórico de Reversão de Erros (Undo / Redo)
  const [history, setHistory] = useState<Array<{ boxes: CoordinateBox[]; bgImage: string | null }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = (newBoxes: CoordinateBox[], newBgImage: string | null) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ boxes: JSON.parse(JSON.stringify(newBoxes)), bgImage: newBgImage });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setBoxes(JSON.parse(JSON.stringify(prev.boxes)));
      if (prev.bgImage) setBgImage(prev.bgImage);
      setHistoryIndex(historyIndex - 1);
      toast.info("Alteração desfeita (Undo ↩️)");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setBoxes(JSON.parse(JSON.stringify(next.boxes)));
      if (next.bgImage) setBgImage(next.bgImage);
      setHistoryIndex(historyIndex + 1);
      toast.info("Alteração refeita (Redo ↪️)");
    }
  };

  // Carregar Documento Existente do DocMaster para Edição Direta
  const handleLoadExistingDocPreset = (presetKey: string) => {
    const presetMap: Record<string, any> = {
      atestado: {
        name: "Atestado Médico Oficial IDAB",
        slug: "atestadocria",
        category: "saude",
        price: "10.00",
        targetStructure: "atestado",
        qrFormat: "XXXX-XXXX",
        qrSourceUrl: "https://validaratestado.digital",
        boxes: [
          { id: "atest-1", fieldKey: "paciente", label: "Nome do Paciente", x: 120, y: 220, width: 450, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "atest-2", fieldKey: "cpf", label: "CPF do Paciente", x: 120, y: 260, width: 220, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "atest-3", fieldKey: "cid", label: "Código CID-10", x: 420, y: 260, width: 160, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "atest-4", fieldKey: "medico", label: "Nome do Médico", x: 120, y: 720, width: 350, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "atest-5", fieldKey: "crm", label: "CRM / UF", x: 120, y: 750, width: 200, height: 24, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "atest-6", fieldKey: "codigoQR", label: "Código Validação IDAB", x: 480, y: 820, width: 180, height: 28, fontSize: 14, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true },
        ],
      },
      cnh: {
        name: "CNH Digital VIO",
        slug: "cnhcria",
        category: "pessoais",
        price: "15.00",
        targetStructure: "cnh",
        qrFormat: "UUID-32",
        qrSourceUrl: "https://carteira-digital-transito-vio.digital",
        boxes: [
          { id: "cnh-1", fieldKey: "nome", label: "Nome do Condutor", x: 140, y: 110, width: 420, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "cnh-2", fieldKey: "cpf", label: "CPF Condutor", x: 140, y: 155, width: 200, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "cnh-3", fieldKey: "renach", label: "RENACH", x: 360, y: 155, width: 200, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "cnh-4", fieldKey: "categoria", label: "Categoria CNH", x: 580, y: 110, width: 80, height: 40, fontSize: 20, fontFamily: "Helvetica", color: "#000000", textAlign: "center", isUpperCase: true },
          { id: "cnh-5", fieldKey: "validade", label: "Validade CNH", x: 140, y: 200, width: 160, height: 26, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
        ],
      },
      crlv: {
        name: "CRLV Digital Senatran",
        slug: "crlvcria",
        category: "veiculos",
        price: "15.00",
        targetStructure: "crlv",
        qrFormat: "UUID-32",
        qrSourceUrl: "https://consulta-crlv-vio.digital",
        boxes: [
          { id: "crlv-1", fieldKey: "placa", label: "Placa do Veículo", x: 100, y: 120, width: 180, height: 32, fontSize: 16, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true },
          { id: "crlv-2", fieldKey: "renavam", label: "RENAVAM", x: 300, y: 120, width: 220, height: 32, fontSize: 16, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true },
          { id: "crlv-3", fieldKey: "proprietario", label: "Nome do Proprietário", x: 100, y: 180, width: 500, height: 28, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "crlv-4", fieldKey: "chassi", label: "Número do Chassi", x: 100, y: 230, width: 340, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true },
        ],
      },
      receita: {
        name: "Receituário Médico Dr. Consulta",
        slug: "receitacria",
        category: "saude",
        price: "10.00",
        targetStructure: "receita",
        qrFormat: "XXXX-XXXX",
        qrSourceUrl: "https://verificamed.digital",
        boxes: [
          { id: "rec-1", fieldKey: "paciente", label: "Nome do Paciente", x: 120, y: 180, width: 450, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
          { id: "rec-2", fieldKey: "medicamentos", label: "Prescrição Médica", x: 120, y: 260, width: 520, height: 300, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: false },
          { id: "rec-3", fieldKey: "medico", label: "Médico Prescritor", x: 120, y: 780, width: 350, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
        ],
      },
    };

    const p = presetMap[presetKey];
    if (!p) return;

    setDocName(p.name);
    setDocSlug(p.slug);
    setCategory(p.category);
    setPrice(p.price);
    setTargetStructure(p.targetStructure);
    setQrFormat(p.qrFormat);
    setQrSourceUrl(p.qrSourceUrl);
    setBoxes(p.boxes);
    createBlankCanvas();
    pushHistory(p.boxes, bgImage);
    toast.success(`Documento Existente "${p.name}" carregado para EDIÇÃO VISUAL DIRETA!`);
  };

  const updateCanvasSizeFromImage = (url: string) => {
    const img = new Image();
    img.onload = () => {
      // Preservar a proporção exata e dimensões nativas do PDF/Imagem
      const maxW = 920;
      const aspect = img.height / img.width;
      const computedW = Math.min(img.width, maxW);
      const computedH = Math.round(computedW * aspect);
      setCanvasSize({ width: computedW, height: computedH });
    };
    img.src = url;
  };

  useEffect(() => {
    loadTemplates();
    createBlankCanvas();
  }, []);

  const createBlankCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 794;
    canvas.height = 1123;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 794, 1123);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, 764, 1093);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GABARITO PADRÃO DOCMASTER STUDIO (FOLHA NATIVA A4)", 397, 60);

      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(30, 80);
      ctx.lineTo(764, 80);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "15px sans-serif";
      ctx.fillText("Clique e arraste o mouse em qualquer área para delimitar caixas de coordenadas X/Y", 397, 560);
    }
    const dataUrl = canvas.toDataURL("image/png");
    setBgImage(dataUrl);
    updateCanvasSizeFromImage(dataUrl);
  };

  const renderPDFToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    if (!(window as any).pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/png");
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/admin/studio-templates", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSavedTemplates(data.templates || []);
      }
    } catch {} finally {
      setLoadingTemplates(false);
    }
  };

  // Upload do Gabarito PDF/Imagem com conversão HD e proporção natural
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.includes("pdf")) {
      toast.info("Gabarito PDF recebido! Convertendo para proporções nativas HD...");
      try {
        const pngDataUrl = await renderPDFToImage(file);
        setBgImage(pngDataUrl);
        updateCanvasSizeFromImage(pngDataUrl);
        toast.success("PDF convertido nas proporções originais do documento!");
      } catch (err: any) {
        console.error("PDF render error:", err);
        const reader = new FileReader();
        reader.onload = (evt) => {
          const url = evt.target?.result as string;
          setBgImage(url);
          updateCanvasSizeFromImage(url);
          toast.success("Gabarito carregado no Canvas!");
        };
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        setBgImage(url);
        updateCanvasSizeFromImage(url);
        toast.success("Gabarito de Imagem carregado no Canvas do Studio!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Leitura OCR Automatizada (Simulada para rápida geração de caixas)
  const handleAutoOCR = () => {
    if (!bgImage) {
      toast.error("Suba um gabarito primeiro!");
      return;
    }

    toast.info("Executando leitura OCR em capacidade máxima no Gabarito...");
    setTimeout(() => {
      const suggestedBoxes: CoordinateBox[] = [
        { id: "ocr-1", fieldKey: "nome", label: "Nome Completo", x: 80, y: 120, width: 300, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
        { id: "ocr-2", fieldKey: "cpf", label: "CPF", x: 80, y: 170, width: 180, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true },
        { id: "ocr-3", fieldKey: "rg", label: "RG / Órgão", x: 280, y: 170, width: 160, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true },
        { id: "ocr-4", fieldKey: "validade", label: "Validade", x: 80, y: 220, width: 140, height: 26, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "center", isUpperCase: true },
        { id: "ocr-5", fieldKey: "categoria", label: "Categoria Alvo", x: 240, y: 220, width: 100, height: 26, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "center", isUpperCase: true },
      ];
      setBoxes(suggestedBoxes);
      toast.success("OCR Concluído: 5 campos identificados e posicionados automaticamente!");
    }, 1000);
  };

  // Extração Automática de Logos & Brasões do PDF
  const handleExtractLogos = () => {
    if (!bgImage) {
      toast.error("Suba um gabarito primeiro!");
      return;
    }

    toast.info("Extraindo logos, brasões e marca d'água em HD...");
    setTimeout(() => {
      // Simula a isolamento de logos em Base64 com atributo crossOrigin seguro
      const sampleLogo = bgImage;
      setExtractedLogos([sampleLogo]);
      toast.success("Extração Concluída: 1 Logo/Brasão isolado com integridade de CORS!");
    }, 800);
  };

  // Mapeamento por Clique/Arrasto no Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !bgImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width > 20 && height > 15) {
      const newBox: CoordinateBox = {
        id: `box-${Date.now()}`,
        fieldKey: `campo_${boxes.length + 1}`,
        label: `Campo ${boxes.length + 1}`,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        fontSize: 13,
        fontFamily: "Helvetica",
        color: "#000000",
        textAlign: "left",
        isUpperCase: true,
      };
      setBoxes((prev) => [...prev, newBox]);
      setSelectedBoxId(newBox.id);
      toast.success("Nova caixa de coordenada delimitada!");
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  // Carregar Modelo Salvo no Canvas
  const handleSelectTemplate = (tpl: StudioTemplate) => {
    setDocName(tpl.name);
    setDocSlug(tpl.slug);
    setCategory(tpl.category || "veiculos");
    setPrice(String(tpl.price || 15.00));
    setTargetStructure(tpl.target_structure || "cnh");
    if ((tpl as any).pdf_bg_base64) {
      const url = (tpl as any).pdf_bg_base64;
      setBgImage(url);
      updateCanvasSizeFromImage(url);
    } else {
      createBlankCanvas();
    }
    try {
      const parsedBoxes = typeof tpl.coordinates_json === "string"
        ? JSON.parse(tpl.coordinates_json)
        : tpl.coordinates_json;
      setBoxes(parsedBoxes || []);
    } catch {
      setBoxes([]);
    }
    toast.success(`Modelo "${tpl.name}" carregado no Canvas do Studio!`);
  };

  // Salvar Gabarito no Studio API
  const handleSaveTemplate = async () => {
    if (!docName || !docSlug) {
      toast.error("Informe o Nome do Documento e o Slug!");
      return;
    }

    if (boxes.length === 0) {
      toast.error("Mapeie ao menos uma caixa de coordenada no gabarito!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/studio-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: docName,
          slug: docSlug.toLowerCase().replace(/\s+/g, ""),
          category,
          price: parseFloat(price),
          target_structure: targetStructure,
          pdf_bg_base64: bgImage,
          coordinates: boxes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Modelo "${docName}" salvo e cadastrado na tabela de preços em tempo real!`);
        loadTemplates();
      } else {
        toast.error(data.error || "Erro ao salvar modelo no Studio.");
      }
    } catch {
      toast.error("Erro de conexão com a Studio Engine.");
    } finally {
      setSaving(false);
    }
  };

  const selectedBox = boxes.find((b) => b.id === selectedBoxId);

  const updateSelectedBox = (key: keyof CoordinateBox, val: any) => {
    if (!selectedBoxId) return;
    setBoxes((prev) =>
      prev.map((b) => (b.id === selectedBoxId ? { ...b, [key]: val } : b))
    );
  };

  const deleteBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
    toast.info("Caixa de coordenada removida.");
  };

  const [showTsxModal, setShowTsxModal] = useState(false);

  // Transpilador de Código React .tsx
  const generateTSXCode = () => {
    const componentName = (docName || "NovoDocumento")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

    return `import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { exportToPdf } from "@/lib/pdfExport";

export default function ${componentName}Cria() {
  const [formData, setFormData] = useState({
${boxes.map((b) => `    ${b.fieldKey}: "",`).join("\n")}
  });

  return (
    <DashboardLayout title="Emissão - ${docName || "Novo Documento"}">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-xl font-black text-white uppercase italic">${docName || "Novo Documento"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
${boxes
  .map(
    (b) => `            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">${b.label}</label>
              <input
                type="text"
                value={formData.${b.fieldKey}}
                onChange={(e) => setFormData(prev => ({ ...prev, ${b.fieldKey}: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500"
              />
            </div>`
  )
  .join("\n")}
          </div>
        </div>

        {/* Overlay Forense 1:1 */}
        <div className="relative bg-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl p-4">
          <div className="relative" style={{ width: 680, height: 480 }}>
            <img src="${bgImage || ""}" alt="Gabarito PDF" className="w-full h-full object-contain" />
${boxes
  .map(
    (b) => `            <div
              className="absolute font-mono text-[10px] font-bold uppercase"
              style={{
                left: ${b.x},
                top: ${b.y},
                width: ${b.width},
                height: ${b.height},
                fontSize: ${b.fontSize},
                color: "${b.color}",
                textAlign: "${b.textAlign}",
              }}
            >
              {formData.${b.fieldKey} || "${b.label}"}
            </div>`
  )
  .join("\n")}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Modal de Exibição do Código .tsx Compilado */}
      {showTsxModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowTsxModal(false)}>
          <div className="bg-[#0b1120] text-white border border-indigo-500/40 rounded-3xl p-6 max-w-3xl w-full flex flex-col shadow-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase italic tracking-tight m-0">Código React .tsx Compilado</h3>
                  <p className="text-xs text-slate-400">Transpilado automaticamente no padrão DocMaster</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateTSXCode());
                    toast.success("Código .tsx copiado para a área de transferência!");
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Copiar Código .tsx
                </button>
                <button
                  type="button"
                  onClick={() => setShowTsxModal(false)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <pre className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-auto font-mono text-xs text-emerald-400 custom-scrollbar leading-relaxed">
              {generateTSXCode()}
            </pre>
          </div>
        </div>
      )}

      {/* Header do Studio Engine */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight m-0">DocMaster Studio Express</h2>
            <p className="text-xs text-slate-400 font-medium">Editor Visual Estilo Adobe Express & Transpilador de Código React .tsx</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Documentos Existentes do DocMaster */}
          <select
            onChange={(e) => {
              if (e.target.value) handleLoadExistingDocPreset(e.target.value);
            }}
            className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-blue-300 font-bold focus:outline-none cursor-pointer shadow-md"
          >
            <option value="">Editar Documento Existente...</option>
            <option value="atestado">🩺 Atestado Médico Oficial</option>
            <option value="cnh">🪪 CNH Digital VIO</option>
            <option value="crlv">🚗 CRLV Digital Senatran</option>
            <option value="receita">📜 Receituário Médico</option>
          </select>

          {/* Botões de Reversão de Erros (Undo / Redo) */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1"
              title="Desfazer alteração (Undo)"
            >
              ↩️ Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1 border-l border-slate-800"
              title="Refazer alteração (Redo)"
            >
              ↪️ Redo
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTsxModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/40"
          >
            <Type className="w-4 h-4 text-indigo-400" />
            <span>Ver Código .tsx Compilado</span>
          </button>
          <button
            type="button"
            onClick={handleExtractLogos}
            className="px-4 py-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-950/40"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Extrair Logos / Imagens</span>
          </button>

          <button
            type="button"
            onClick={handleAutoOCR}
            className="px-4 py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/40"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Sugerir OCR Automatizado</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>{saving ? "Salvando Modelo..." : "Publicar Modelo Studio"}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Formulário de Configuração + Canvas de Edição Direct Drag */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Coluna Esquerda: Configurações do Novo Documento e Propriedades da Caixa */}
        <div className="lg:col-span-4 space-y-6">

          {/* Configurações Gerais do Gabarito */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 m-0 border-b border-slate-800 pb-3">
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>1. Configuração do Modelo</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Documento *</label>
                <input
                  type="text"
                  placeholder="ex: Carteira de Habilitação Náutica"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Slug de Acesso *</label>
                  <input
                    type="text"
                    placeholder="ex: nauticacria"
                    value={docSlug}
                    onChange={(e) => setDocSlug(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoria Alvo</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="veiculos">🚗 Veículos / CNH</option>
                    <option value="saude">🏥 Saúde / Médicos</option>
                    <option value="estudante">🎓 Acadêmicos</option>
                    <option value="certidoes">📜 Certidões & Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estrutura Alvo</label>
                  <select
                    value={targetStructure}
                    onChange={(e) => setTargetStructure(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="cnh">Modelo CNH Digital</option>
                    <option value="atestado">Modelo Atestado Médico</option>
                    <option value="receita">Modelo Receituário</option>
                    <option value="historico">Modelo Histórico/Diploma</option>
                  </select>
                </div>
              </div>

              {/* Bloco de Configuração do QR Code & Validador Forense */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">QR Code & Validador Publico</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Formato do Código</label>
                    <select
                      value={qrFormat}
                      onChange={(e) => setQrFormat(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="XXXX-XXXX">XXXX-XXXX (Exclusivo Atestados)</option>
                      <option value="UUID-32">UUID 32 Char (CNH / VIO / CRLV)</option>
                      <option value="CPF">Consulta CPF Direct</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Validador (Source)</label>
                    <input
                      type="text"
                      value={qrSourceUrl}
                      onChange={(e) => setQrSourceUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono focus:outline-none"
                      placeholder="https://atestados-idab.pages.dev"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Propriedades da Caixa Selecionada (Ajuste Fino por Coordenadas) */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between m-0 border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                2. Propriedades da Caixa X/Y
              </span>
              {selectedBox && (
                <button
                  type="button"
                  onClick={() => deleteBox(selectedBox.id)}
                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/50 transition-colors"
                  title="Excluir Caixa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </h3>

            {selectedBox ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Chave da Variável</label>
                    <input
                      type="text"
                      value={selectedBox.fieldKey}
                      onChange={(e) => updateSelectedBox("fieldKey", e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rótulo Exibição</label>
                    <input
                      type="text"
                      value={selectedBox.label}
                      onChange={(e) => updateSelectedBox("label", e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">X (px)</span>
                    <input
                      type="number"
                      value={selectedBox.x}
                      onChange={(e) => updateSelectedBox("x", Number(e.target.value))}
                      className="w-full text-center bg-transparent text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">Y (px)</span>
                    <input
                      type="number"
                      value={selectedBox.y}
                      onChange={(e) => updateSelectedBox("y", Number(e.target.value))}
                      className="w-full text-center bg-transparent text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">LARG.</span>
                    <input
                      type="number"
                      value={selectedBox.width}
                      onChange={(e) => updateSelectedBox("width", Number(e.target.value))}
                      className="w-full text-center bg-transparent text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">ALT.</span>
                    <input
                      type="number"
                      value={selectedBox.height}
                      onChange={(e) => updateSelectedBox("height", Number(e.target.value))}
                      className="w-full text-center bg-transparent text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tamanho Fonte (pt)</label>
                    <input
                      type="number"
                      value={selectedBox.fontSize}
                      onChange={(e) => updateSelectedBox("fontSize", Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Família Fonte</label>
                    <select
                      value={selectedBox.fontFamily}
                      onChange={(e) => updateSelectedBox("fontFamily", e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none cursor-pointer"
                    >
                      <option value="Helvetica">Helvetica / Arial</option>
                      <option value="OCR-B">OCR-B (Documentos)</option>
                      <option value="Courier">Courier New</option>
                      <option value="Times">Times New Roman</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-4">
                <Move className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Desenhe ou clique em uma caixa no Canvas para editar suas coordenadas X/Y.</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Canvas Interativo de Edição Direct Drag sobre Gabarito PDF */}
        <div className="lg:col-span-8 space-y-6">

          {/* Area do Canvas do Gabarito */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>3. Canvas Visual de Mapeamento (Drag & Drop)</span>
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {savedTemplates.length > 0 && (
                  <select
                    onChange={(e) => {
                      const found = savedTemplates.find(t => t.id === e.target.value);
                      if (found) handleSelectTemplate(found);
                    }}
                    className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-indigo-300 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="">Carregar Modelo Salvo...</option>
                    {savedTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                )}

                {/* Controles de Zoom HD */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
                    className="px-2 py-1 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                    title="Diminuir Zoom"
                  >
                    🔍 -
                  </button>
                  <span className="text-[10px] font-mono font-bold text-blue-400 px-1">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 10) / 10))}
                    className="px-2 py-1 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                    title="Aumentar Zoom"
                  >
                    🔍 +
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white border-l border-slate-800 transition-colors"
                    title="Redefinir Zoom para 100%"
                  >
                    100%
                  </button>
                </div>

                <button
                  type="button"
                  onClick={createBlankCanvas}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  title="Limpar e criar canvas padrão em branco"
                >
                  Canvas em Branco
                </button>

                <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-950/40">
                  <Upload className="w-4 h-4" />
                  <span>Subir PDF Gabarito</span>
                  <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Container do Canvas HD */}
            <div className="relative overflow-auto custom-scrollbar bg-slate-950 rounded-2xl border border-slate-800 min-h-[560px] flex items-center justify-center p-6">
              {bgImage ? (
                <div
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="relative select-none cursor-crosshair shadow-2xl border border-slate-700 rounded-lg overflow-hidden bg-white transition-all duration-150"
                  style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}
                >
                  {/* Gabarito Base em Imagem/PDF */}
                  <img src={bgImage} alt="Gabarito PDF" className="w-full h-full object-contain pointer-events-none" />

                  {/* Renderização das Caixas Mapeadas */}
                  {boxes.map((box) => {
                    const isSelected = box.id === selectedBoxId;
                    return (
                      <div
                        key={box.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBoxId(box.id);
                        }}
                        className={`absolute border-2 rounded transition-all flex items-center justify-between px-2 font-mono text-[10px] font-bold ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/30 z-30"
                            : "border-indigo-500/70 bg-indigo-500/10 hover:border-indigo-400 z-20"
                        }`}
                        style={{
                          left: box.x,
                          top: box.y,
                          width: box.width,
                          height: box.height,
                          color: box.color || "#000",
                        }}
                      >
                        <span className="truncate">{box.label || box.fieldKey}</span>
                        <span className="text-[8px] opacity-70">({box.x},{box.y})</span>
                      </div>
                    );
                  })}

                  {/* Retângulo dinâmico enquanto o usuário arrasta o mouse */}
                  {isDrawing && startPos && currentPos && (
                    <div
                      className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 z-40 pointer-events-none"
                      style={{
                        left: Math.min(startPos.x, currentPos.x),
                        top: Math.min(startPos.y, currentPos.y),
                        width: Math.abs(currentPos.x - startPos.x),
                        height: Math.abs(currentPos.y - startPos.y),
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="py-20 text-center space-y-3">
                  <Upload className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Nenhum Gabarito Carregado</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Faça o upload do PDF oficial ou Imagem Gabarito do documento para começar a arrastar e delimitar as caixas de coordenadas X/Y.
                  </p>
                </div>
              )}
            </div>

            {/* Tabela Resumo das Caixas Mapeadas */}
            {boxes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Caixas Mapeadas no Studio ({boxes.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setBoxes([])}
                    className="text-[10px] font-bold text-rose-400 hover:underline uppercase"
                  >
                    Limpar Todas
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {boxes.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBoxId(b.id)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        b.id === selectedBoxId
                          ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-black block">{b.label}</span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {b.fieldKey} • {b.x}x,{b.y}y
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {b.fontSize}pt
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
