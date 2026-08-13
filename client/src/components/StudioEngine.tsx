import React, { useState, useRef, useEffect } from "react";
import { 
  Wand2, Upload, Move, Type, Trash2, Plus, CheckCircle, 
  DollarSign, Layers, Eye, RefreshCw, Sparkles, Tag, Shield, Sliders, ArrowLeft, Folder, QrCode, Save, Undo2, Redo2, FileText, Crop, FileCode, Image as ImageIcon, File
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { saveActiveCNHLayout, CNH_DEFAULT_LAYOUT } from "@/config/cnhLayout";
import { drawCNHToCanvas } from "@/components/CNHDocument";

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
  type?: "text" | "qrcode" | "logo";
  qrFormat?: "XXXX-XXXX" | "UUID-32" | "CPF" | "NUMERICO-11";
  qrSourceUrl?: string;
  qrPattern?: string;
  pageIndex?: number;
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
  const [qrFormat, setQrFormat] = useState<"XXXX-XXXX" | "UUID-32" | "CPF" | "NUMERICO-11">("UUID-32");
  const [qrSourceUrl, setQrSourceUrl] = useState("https://atestados-idab.pages.dev");
  const [qrPattern, setQrPattern] = useState("{sourceUrl}/validar?code={code}");
  const [extractedLogos, setExtractedLogos] = useState<string[]>([]);

  // Multi-Páginas PDF & Crop de Logos
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropStartPos, setCropStartPos] = useState<{ x: number; y: number } | null>(null);
  const [cropCurrentPos, setCropCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 794, height: 1123 }); // Proporção nativa A4 / PDF
  const [zoom, setZoom] = useState(1);
  const [boxes, setBoxes] = useState<CoordinateBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<"presets" | "boxes" | "form" | "qr" | "pricing" | "logos">("boxes");

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const [savedTemplates, setSavedTemplates] = useState<StudioTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Renderizador em HD do Gabarito Base Oficial para os Documentos Nativos do DocMaster
  const renderOfficialDocumentBaseCanvas = (presetKey: string): string => {
    const isHorizontal = presetKey === "cnh" || presetKey === "crlv";
    const width = 794;
    const height = isHorizontal ? 530 : 1123;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Fundo Base Absoluto Branco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (presetKey === "atestado") {
      // Borda e Estrutura Oficial Atestado IDAB
      ctx.strokeStyle = "#005CA9";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Linha do Cabeçalho
      ctx.beginPath();
      ctx.moveTo(40, 110);
      ctx.lineTo(width - 40, 110);
      ctx.strokeStyle = "#005CA9";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Marca d'água de Fundo Saúde IDAB
      ctx.fillStyle = "rgba(0, 92, 169, 0.03)";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ATESTADO MÉDICO IDAB", width / 2, height / 2);

      // Linha de Assinatura do Médico
      ctx.beginPath();
      ctx.moveTo(200, 895);
      ctx.lineTo(594, 895);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Moldura de Validação IDAB no Rodapé
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(40, 960, width - 80, 120);
      ctx.setLineDash([]);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("VERIFICAÇÃO DE AUTENTICIDADE FORENSE IDAB - DIGITAL", 60, 985);
    } else if (presetKey === "cnh") {
      // CNH Digital VIO - Verde Oficial Trânsito
      ctx.fillStyle = "#edf5f2";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#1b4d3e";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, width - 30, height - 30);

      // Cabeçalho CNH
      ctx.fillStyle = "#1b4d3e";
      ctx.fillRect(15, 15, width - 30, 50);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("REPÚBLICA FEDERATIVA DO BRASIL - SENATRAN", width / 2, 36);
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("CARTEIRA NACIONAL DE HABILITAÇÃO", width / 2, 52);

      // Moldura da Foto do Condutor
      ctx.strokeStyle = "#1b4d3e";
      ctx.lineWidth = 2;
      ctx.strokeRect(35, 80, 140, 180);
      ctx.fillStyle = "#d1e2dd";
      ctx.fillRect(36, 81, 138, 178);

      // Caixa Categoria CNH
      ctx.fillStyle = "#1b4d3e";
      ctx.fillRect(width - 120, 80, 85, 60);

      // Linhas Guia CNH
      ctx.strokeStyle = "#1b4d3e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(190, 115); ctx.lineTo(width - 130, 115);
      ctx.moveTo(190, 155); ctx.lineTo(width - 35, 155);
      ctx.moveTo(190, 195); ctx.lineTo(width - 35, 195);
      ctx.stroke();
    } else if (presetKey === "crlv") {
      // CRLV Senatran - Verde Veicular
      ctx.fillStyle = "#f0f7f4";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#144e36";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, width - 30, height - 30);

      ctx.fillStyle = "#144e36";
      ctx.fillRect(15, 15, width - 30, 50);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("REPÚBLICA FEDERATIVA DO BRASIL - SENATRAN", width / 2, 35);
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEÍCULO - DIGITAL", width / 2, 52);

      // Tabela de Dados CRLV
      ctx.strokeStyle = "#144e36";
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 75, width - 60, 380);
    } else if (presetKey === "receita") {
      // Receituário Dr. Consulta
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RECEITUARIO MÉDICO ESPECIAL", width / 2, 65);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 90); ctx.lineTo(width - 40, 90);
      ctx.moveTo(40, 750); ctx.lineTo(width - 40, 750);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(220, 920); ctx.lineTo(574, 920);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (presetKey === "historico_sp" || presetKey === "historico_uninter") {
      // Históricos Escolares A4
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.strokeRect(25, 25, width - 50, height - 50);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(25, 25, width - 50, 65);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(presetKey === "historico_sp" ? "SECRETARIA DA EDUCAÇÃO DO ESTADO DE SÃO PAULO" : "CENTRO UNIVERSITÁRIO INTERNACIONAL UNINTER", width / 2, 55);
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("HISTÓRICO ESCOLAR DE CONCLUINTE DE CURSO", width / 2, 75);

      // Tabela Matriz de Notas
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 300, width - 80, 480);
    } else if (presetKey === "toxicologico") {
      // Laudo Toxicológico Sodré
      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      ctx.fillStyle = "#047857";
      ctx.fillRect(20, 20, width - 40, 60);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SODRÉ LABORATÓRIO TOXICOLÓGICO", width / 2, 50);
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("RELATÓRIO DE ANÁLISE TOXICOLÓGICA DE LARGA LARGA LARGURA", width / 2, 68);

      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 280, width - 80, 420);
    } else {
      // Outros Documentos A4 Genericos
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);
    }

    return canvas.toDataURL("image/png");
  };

  // Carregar Documento Existente do DocMaster para Edição Direta com Coordenadas 1:1
  const handleLoadExistingDocPreset = (presetKey: string) => {
    const presetMap: Record<string, any> = {
      atestado: {
        name: "Atestado Médico Oficial IDAB",
        slug: "atestadocria",
        category: "saude",
        price: "10.00",
        targetStructure: "atestado",
        qrFormat: "XXXX-XXXX",
        qrSourceUrl: "https://atestados-idab.pages.dev",
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "atest-1", fieldKey: "instituicao", label: "Prefeitura / UPA 24h", x: 180, y: 45, width: 440, height: 26, fontSize: 15, fontFamily: "Helvetica", color: "#005CA9", textAlign: "center", isUpperCase: true, inputType: "text", section: "Emitente" },
          { id: "atest-2", fieldKey: "unidade", label: "Unidade Básica de Saúde", x: 180, y: 75, width: 440, height: 20, fontSize: 11, fontFamily: "Helvetica", color: "#475569", textAlign: "center", isUpperCase: true, inputType: "text", section: "Emitente" },
          { id: "atest-3", fieldKey: "paciente", label: "Nome do Paciente", x: 56, y: 220, width: 682, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Dados do Paciente", gridWidth: "full" },
          { id: "atest-4", fieldKey: "cpf", label: "CPF Paciente", x: 56, y: 255, width: 330, height: 24, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "cpf", section: "Dados do Paciente", gridWidth: "half" },
          { id: "atest-5", fieldKey: "nascimento_sexo", label: "Data Nasc. / Sexo", x: 410, y: 255, width: 328, height: 24, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Dados do Paciente", gridWidth: "half" },
          { id: "atest-6", fieldKey: "texto_atestado", label: "Corpo do Atestado Médico", x: 56, y: 320, width: 682, height: 260, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "justify", isUpperCase: false, inputType: "textarea", section: "Atendimento Médico", gridWidth: "full" },
          { id: "atest-7", fieldKey: "cid", label: "Código CID-10", x: 56, y: 610, width: 300, height: 24, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Atendimento Médico", gridWidth: "half" },
          { id: "atest-8", fieldKey: "data_emissao_extenso", label: "Data de Emissão Por Extenso", x: 56, y: 700, width: 682, height: 24, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "right", isUpperCase: true, inputType: "date", section: "Atendimento Médico", gridWidth: "half" },
          { id: "atest-9", fieldKey: "medico", label: "Nome do Médico Prescritor", x: 200, y: 895, width: 394, height: 24, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "center", isUpperCase: true, inputType: "text", section: "Médico Prescritor", gridWidth: "half" },
          { id: "atest-10", fieldKey: "crm", label: "CRM / Especialidade", x: 200, y: 920, width: 394, height: 20, fontSize: 11, fontFamily: "Helvetica", color: "#475569", textAlign: "center", isUpperCase: true, inputType: "crm", section: "Médico Prescritor", gridWidth: "half" },
          { id: "atest-11", fieldKey: "qrcode_validacao", label: "[QR CODE] Validador Oficial", x: 56, y: 965, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "XXXX-XXXX", qrSourceUrl: "https://atestados-idab.pages.dev", qrPattern: "{sourceUrl}/validar?code={code}" },
        ],
      },
      cnh: {
        name: "CNH Digital VIO",
        slug: "cnhcria",
        category: "veiculos",
        price: "15.00",
        targetStructure: "cnh",
        qrFormat: "UUID-32",
        qrSourceUrl: "https://carteira-digital-transito-vio.digital",
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "cnh-1", fieldKey: "nome", label: "Nome do Condutor", x: 195, y: 80, width: 440, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Identificação", gridWidth: "full" },
          { id: "cnh-2", fieldKey: "cpf", label: "CPF Condutor", x: 195, y: 125, width: 200, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "cpf", section: "Identificação", gridWidth: "half" },
          { id: "cnh-3", fieldKey: "renach", label: "RENACH", x: 410, y: 125, width: 220, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Identificação", gridWidth: "half" },
          { id: "cnh-4", fieldKey: "rg_ssp", label: "Doc Identidade / Órgão Emissor", x: 195, y: 165, width: 260, height: 26, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Documentos", gridWidth: "half" },
          { id: "cnh-5", fieldKey: "data_nascimento", label: "Data de Nascimento", x: 465, y: 165, width: 170, height: 26, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "date", section: "Documentos", gridWidth: "half" },
          { id: "cnh-6", fieldKey: "categoria", label: "ACC / CAT CNH", x: 674, y: 88, width: 85, height: 44, fontSize: 24, fontFamily: "Helvetica", color: "#ffffff", textAlign: "center", isUpperCase: true, inputType: "select", options: "A, B, AB, C, D, E, ACC", section: "Habilitação", gridWidth: "half" },
          { id: "cnh-7", fieldKey: "validade", label: "Validade CNH", x: 195, y: 210, width: 160, height: 26, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "date", section: "Habilitação", gridWidth: "half" },
          { id: "cnh-8", fieldKey: "qrcode_validacao", label: "[QR CODE] Validador VIO", x: 650, y: 380, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "UUID-32", qrSourceUrl: "https://carteira-digital-transito-vio.digital", qrPattern: "{sourceUrl}/validar?code={code}" },
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
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "crlv-1", fieldKey: "placa", label: "Placa do Veículo", x: 40, y: 90, width: 200, height: 32, fontSize: 16, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, inputType: "text", section: "Veículo", gridWidth: "half" },
          { id: "crlv-2", fieldKey: "renavam", label: "RENAVAM", x: 260, y: 90, width: 260, height: 32, fontSize: 16, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, inputType: "text", section: "Veículo", gridWidth: "half" },
          { id: "crlv-3", fieldKey: "ano_fabricacao", label: "Ano Fab/Mod", x: 540, y: 90, width: 200, height: 32, fontSize: 14, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, inputType: "text", section: "Veículo", gridWidth: "half" },
          { id: "crlv-4", fieldKey: "proprietario", label: "Nome do Proprietário", x: 40, y: 150, width: 700, height: 28, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Proprietário", gridWidth: "full" },
          { id: "crlv-5", fieldKey: "chassi", label: "Número do Chassi", x: 40, y: 195, width: 440, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Veículo", gridWidth: "half" },
          { id: "crlv-6", fieldKey: "qrcode_validacao", label: "[QR CODE] Validador CRLV", x: 630, y: 340, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "UUID-32", qrSourceUrl: "https://consulta-crlv-vio.digital", qrPattern: "{sourceUrl}/validar?code={code}" },
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
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "rec-1", fieldKey: "paciente", label: "Nome do Paciente", x: 120, y: 180, width: 450, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Paciente", gridWidth: "full" },
          { id: "rec-2", fieldKey: "medicamentos", label: "Prescrição Médica", x: 120, y: 260, width: 520, height: 300, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: false, inputType: "textarea", section: "Prescrição", gridWidth: "full" },
          { id: "rec-3", fieldKey: "medico", label: "Médico Prescritor", x: 120, y: 780, width: 350, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Médico", gridWidth: "half" },
          { id: "rec-4", fieldKey: "crm", label: "CRM Médico", x: 480, y: 780, width: 190, height: 26, fontSize: 12, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "crm", section: "Médico", gridWidth: "half" },
          { id: "rec-5", fieldKey: "qrcode_validacao", label: "[QR CODE] Validador Receita", x: 630, y: 940, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "XXXX-XXXX", qrSourceUrl: "https://verificamed.digital", qrPattern: "{sourceUrl}/validar?code={code}" },
        ],
      },
      historico_sp: {
        name: "Histórico Escolar SP (SED)",
        slug: "historico-sp",
        category: "estudantes",
        price: "15.00",
        targetStructure: "historico",
        qrFormat: "UUID-32",
        qrSourceUrl: "https://sed.educacao.sp.gov.br",
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "hsp-1", fieldKey: "aluno", label: "Nome do Aluno", x: 140, y: 160, width: 450, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Aluno", gridWidth: "full" },
          { id: "hsp-2", fieldKey: "ra", label: "Registro do Aluno (RA)", x: 140, y: 200, width: 220, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Aluno", gridWidth: "half" },
          { id: "hsp-3", fieldKey: "escola", label: "Nome da Escola Estadual", x: 140, y: 240, width: 480, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Escola", gridWidth: "full" },
          { id: "hsp-4", fieldKey: "qrcode_validacao", label: "[QR CODE] SED SP", x: 630, y: 940, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "UUID-32", qrSourceUrl: "https://sed.educacao.sp.gov.br", qrPattern: "{sourceUrl}/validar?code={code}" },
        ],
      },
      historico_uninter: {
        name: "Histórico Escolar UNINTER",
        slug: "historicocria",
        category: "estudantes",
        price: "15.00",
        targetStructure: "historico",
        qrFormat: "UUID-32",
        qrSourceUrl: "https://uninter.com/validacao",
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "huni-1", fieldKey: "aluno", label: "Nome do Aluno UNINTER", x: 140, y: 150, width: 450, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Aluno", gridWidth: "full" },
          { id: "huni-2", fieldKey: "ru", label: "RU do Aluno", x: 140, y: 190, width: 180, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Aluno", gridWidth: "half" },
          { id: "huni-3", fieldKey: "curso", label: "Nome do Curso Superior", x: 140, y: 230, width: 480, height: 26, fontSize: 13, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Curso", gridWidth: "full" },
          { id: "huni-4", fieldKey: "qrcode_validacao", label: "[QR CODE] UNINTER", x: 630, y: 940, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "UUID-32", qrSourceUrl: "https://uninter.com/validacao", qrPattern: "{sourceUrl}/validar?code={code}" },
        ],
      },
      toxicologico: {
        name: "Laudo Toxicológico Sodré",
        slug: "toxicria",
        category: "saude",
        price: "15.00",
        targetStructure: "toxicologico",
        qrFormat: "UUID-32",
        qrSourceUrl: "https://sodrelab.com.br/validacao",
        qrPattern: "{sourceUrl}/validar?code={code}",
        boxes: [
          { id: "toxi-1", fieldKey: "doador", label: "Nome do Doador", x: 140, y: 160, width: 450, height: 28, fontSize: 14, fontFamily: "Helvetica", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Doador", gridWidth: "full" },
          { id: "toxi-2", fieldKey: "cpf", label: "CPF do Doador", x: 140, y: 200, width: 220, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "cpf", section: "Doador", gridWidth: "half" },
          { id: "toxi-3", fieldKey: "amostra", label: "Código da Amostra", x: 400, y: 200, width: 200, height: 26, fontSize: 13, fontFamily: "OCR-B", color: "#000000", textAlign: "left", isUpperCase: true, inputType: "text", section: "Amostra", gridWidth: "half" },
          { id: "toxi-4", fieldKey: "qrcode_validacao", label: "[QR CODE] Sodré Lab", x: 630, y: 940, width: 110, height: 110, fontSize: 10, fontFamily: "OCR-B", color: "#000000", textAlign: "center", isUpperCase: true, type: "qrcode", qrFormat: "UUID-32", qrSourceUrl: "https://sodrelab.com.br/validacao", qrPattern: "{sourceUrl}/validar?code={code}" },
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
    if (p.qrPattern) setQrPattern(p.qrPattern);
    setBoxes(p.boxes);

    // Gerar e Carregar o Gabarito Base Oficial em HD no Canvas
    if (presetKey === "cnh") {
      const baseImgUrl = "/assets/cnh_base_template.png";
      setPdfPages([baseImgUrl]);
      setCurrentPageIndex(0);
      setBgImage(baseImgUrl);
      updateCanvasSizeFromImage(baseImgUrl);
      pushHistory(p.boxes, baseImgUrl);
      setActiveTool("boxes");
      toast.success(`Documento "${p.name}" carregado com BACKGROUND LIMPO (cnh_base) e textos arrastáveis!`);
    } else {
      const baseImgUrl = renderOfficialDocumentBaseCanvas(presetKey);
      setPdfPages([baseImgUrl]);
      setCurrentPageIndex(0);
      setBgImage(baseImgUrl);
      updateCanvasSizeFromImage(baseImgUrl);
      pushHistory(p.boxes, baseImgUrl);
      setActiveTool("boxes");
      toast.success(`Documento "${p.name}" carregado no Canvas com GABARITO OFICIAL HD e COORDENADAS 1:1!`);
    }
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
    }
    const dataUrl = canvas.toDataURL("image/png");
    setPdfPages([dataUrl]);
    setCurrentPageIndex(0);
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

  // Upload e Renderização de PDF Multi-Páginas (Folha 1, Folha 2, etc.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      toast.info("Processando PDF e gerando todas as folhas...");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const pagesData: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            pagesData.push(canvas.toDataURL("image/png"));
          }
        }

        if (pagesData.length > 0) {
          setPdfPages(pagesData);
          setCurrentPageIndex(0);
          setBgImage(pagesData[0]);
          updateCanvasSizeFromImage(pagesData[0]);
          toast.success(`PDF com ${pagesData.length} folha(s) renderizado com sucesso!`);
        }
      } catch (err: any) {
        console.error("PDF Multi-page render error:", err);
        const reader = new FileReader();
        reader.onload = (evt) => {
          const url = evt.target?.result as string;
          setPdfPages([url]);
          setCurrentPageIndex(0);
          setBgImage(url);
          updateCanvasSizeFromImage(url);
          toast.success("Gabarito PDF carregado!");
        };
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        setPdfPages([url]);
        setCurrentPageIndex(0);
        setBgImage(url);
        updateCanvasSizeFromImage(url);
        toast.success("Gabarito de Imagem carregado no Canvas do Studio!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Pré-processador de Imagem para OCR (Conversão para Escala de Cinza e Alto Contraste)
  const preprocessImageForOCR = (srcUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = img.width;
        cvs.height = img.height;
        const ctx = cvs.getContext("2d");
        if (!ctx) return resolve(srcUrl);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        const d = imgData.data;

        // Binarização Adaptativa para destacar caracteres escuros sobre fundos coloridos
        for (let i = 0; i < d.length; i += 4) {
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          const bw = lum < 150 ? 0 : 255;
          d[i] = bw;
          d[i + 1] = bw;
          d[i + 2] = bw;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(cvs.toDataURL("image/png"));
      };
      img.onerror = () => resolve(srcUrl);
      img.src = srcUrl;
    });
  };

  // Detector Estrutural de Linhas de Texto por Análise de Pixels (Blob Fallback OCR)
  const detectTextBlobsFromCanvas = (srcUrl: string): Promise<CoordinateBox[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = img.width;
        cvs.height = img.height;
        const ctx = cvs.getContext("2d");
        if (!ctx) return resolve([]);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        const { width, height, data } = imgData;

        const rowDarkPixels = new Array(height).fill(0);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            if (lum < 100) rowDarkPixels[y]++;
          }
        }

        const scaleX = canvasSize.width / width;
        const scaleY = canvasSize.height / height;
        const boxesFound: CoordinateBox[] = [];
        let inLine = false;
        let startY = 0;

        for (let y = 0; y < height; y++) {
          if (rowDarkPixels[y] > width * 0.02) {
            if (!inLine) {
              inLine = true;
              startY = y;
            }
          } else {
            if (inLine) {
              inLine = false;
              const h = y - startY;
              if (h >= 10 && h <= 60) {
                let minX = width;
                let maxX = 0;
                for (let ly = startY; ly < y; ly++) {
                  for (let lx = 0; lx < width; lx++) {
                    const idx = (ly * width + lx) * 4;
                    const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                    if (lum < 100) {
                      if (lx < minX) minX = lx;
                      if (lx > maxX) maxX = lx;
                    }
                  }
                }
                const w = maxX - minX;
                if (w > 30) {
                  boxesFound.push({
                    id: `blob-${Date.now()}-${boxesFound.length}`,
                    fieldKey: `linha_${boxesFound.length + 1}`,
                    label: `Linha de Texto ${boxesFound.length + 1}`,
                    x: Math.round(minX * scaleX),
                    y: Math.round(startY * scaleY),
                    width: Math.round(w * scaleX),
                    height: Math.round(h * scaleY),
                    fontSize: 12,
                    fontFamily: "Helvetica",
                    color: "#000000",
                    textAlign: "left",
                    isUpperCase: true,
                    pageIndex: currentPageIndex,
                  });
                }
              }
            }
          }
        }
        resolve(boxesFound.slice(0, 35));
      };
      img.onerror = () => resolve([]);
      img.src = srcUrl;
    });
  };

  // Reconhecimento de Texto OCR IA Avançado Híbrido (Tesseract + Preprocessing + Blob Fallback)
  const runOCRScan = async () => {
    if (!bgImage) {
      toast.error("Suba um gabarito primeiro!");
      return;
    }

    setOcrLoading(true);
    toast.info("Processando imagem e executando OCR IA avançado...");

    try {
      // 1. Pré-processar imagem (Alto contraste e binarização)
      const processedImgUrl = await preprocessImageForOCR(bgImage);

      // 2. Tentar Tesseract.js com fallback de idioma
      let lines: any[] = [];
      let imgW = canvasSize.width;
      let imgH = canvasSize.height;

      try {
        const { createWorker } = await import("tesseract.js");
        let worker: any = null;
        try {
          worker = await createWorker("por");
        } catch {
          worker = await createWorker("eng");
        }
        if (worker) {
          const ret = await worker.recognize(processedImgUrl);
          await worker.terminate();
          if (ret.data) {
            lines = ret.data.lines || [];
            imgW = ret.data.width || canvasSize.width;
            imgH = ret.data.height || canvasSize.height;
          }
        }
      } catch (e) {
        console.warn("Tesseract offline/network fallback:", e);
      }

      const scaleX = canvasSize.width / imgW;
      const scaleY = canvasSize.height / imgH;

      let detectedBoxes: CoordinateBox[] = lines
        .filter(l => l.text.trim().length > 1 && (l.confidence === undefined || l.confidence > 10))
        .slice(0, 35)
        .map((line, idx) => {
          const { x0, y0, x1, y1 } = line.bbox;
          const cleanText = line.text.trim();
          const key = cleanText.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15) || `campo_${idx + 1}`;
          
          return {
            id: `ocr-${Date.now()}-${idx}`,
            fieldKey: key,
            label: cleanText,
            x: Math.round(x0 * scaleX),
            y: Math.round(y0 * scaleY),
            width: Math.max(70, Math.round((x1 - x0) * scaleX)),
            height: Math.max(22, Math.round((y1 - y0) * scaleY)),
            fontSize: 12,
            fontFamily: "Helvetica",
            color: "#000000",
            textAlign: "left",
            isUpperCase: true,
            pageIndex: currentPageIndex,
          };
        });

      // 3. Se o Tesseract não retornou linhas suficientes, executar o Detector de Blobs de Pixels
      if (detectedBoxes.length === 0) {
        toast.info("Executando leitura estrutural de pixels de texto (Blob Scanner)...");
        detectedBoxes = await detectTextBlobsFromCanvas(bgImage);
      }

      if (detectedBoxes.length > 0) {
        setBoxes(prev => [...prev, ...detectedBoxes]);
        toast.success(`OCR IA HÍBRIDO: ${detectedBoxes.length} caixas de texto detectadas no documento!`);
      } else {
        toast.error("Não foi possível detectar blocos de texto. Tente desenhar a caixa manualmente.");
      }
    } catch (err: any) {
      console.error("Erro no OCR Híbrido:", err);
      toast.error("Falha ao executar OCR IA.");
    } finally {
      setOcrLoading(false);
    }
  };
  // Ativação do Modo Cortar Logo/Brasão
  const handleExtractLogos = () => {
    if (!bgImage) {
      toast.error("Suba um gabarito primeiro!");
      return;
    }

    setIsCropMode(true);
    toast.info("Modo Cortar Logo Ativado: Arraste o mouse sobre qualquer logo/brasão na tela para isolá-lo!");
  };

  // Posicionamento e Configuração de Caixa de QR Code no Canvas
  const handleAddOrUpdateQRCodeBox = () => {
    const existingIndex = boxes.findIndex(b => b.type === "qrcode");
    const sampleCode = qrFormat === "XXXX-XXXX" ? "A8F9-2041" : qrFormat === "CPF" ? "94598940468" : "9b3a7c9d-8e4f-4a12-98ab-34cd56ef7890";
    const previewUrl = qrPattern.replace("{sourceUrl}", qrSourceUrl).replace("{code}", sampleCode);

    const qrBox: CoordinateBox = {
      id: existingIndex >= 0 ? boxes[existingIndex].id : `qr-${Date.now()}`,
      fieldKey: "qrcode_validacao",
      label: "[QR CODE] Validador Oficial",
      type: "qrcode",
      x: existingIndex >= 0 ? boxes[existingIndex].x : Math.round(canvasSize.width - 140),
      y: existingIndex >= 0 ? boxes[existingIndex].y : 40,
      width: existingIndex >= 0 ? boxes[existingIndex].width : 110,
      height: existingIndex >= 0 ? boxes[existingIndex].height : 110,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#000000",
      textAlign: "center",
      isUpperCase: false,
      qrFormat,
      qrSourceUrl,
      qrPattern,
      pageIndex: currentPageIndex,
    };

    if (existingIndex >= 0) {
      setBoxes(prev => prev.map(b => b.type === "qrcode" ? qrBox : b));
      toast.success("Configuração do QR Code atualizada na caixa de coordenadas!");
    } else {
      setBoxes(prev => [...prev, qrBox]);
      toast.success("QR Code inserido no Canvas! Arraste-o para posicionar onde desejar.");
    }
    setSelectedBoxId(qrBox.id);
    pushHistory(existingIndex >= 0 ? boxes.map(b => b.type === "qrcode" ? qrBox : b) : [...boxes, qrBox], bgImage);
  };

  // Cortar e Extrair Logo Selecionada pelo Usuário (Canvas Pixel Crop)
  const cropLogoFromCanvas = (x: number, y: number, width: number, height: number) => {
    if (!bgImage || width <= 10 || height <= 10) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = width;
      cropCanvas.height = height;
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) return;

      const scaleX = img.naturalWidth / canvasSize.width;
      const scaleY = img.naturalHeight / canvasSize.height;

      ctx.drawImage(
        img,
        x * scaleX,
        y * scaleY,
        width * scaleX,
        height * scaleY,
        0,
        0,
        width,
        height
      );

      const croppedUrl = cropCanvas.toDataURL("image/png");
      setExtractedLogos((prev) => [croppedUrl, ...prev]);

      // Adiciona como elemento flutuante no Canvas
      const newLogoBox: CoordinateBox = {
        id: `logo-${Date.now()}`,
        fieldKey: `logo_${extractedLogos.length + 1}`,
        label: `[LOGO] Elemento ${extractedLogos.length + 1}`,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#000000",
        textAlign: "center",
        isUpperCase: false,
      };

      setBoxes((prev) => [...prev, newLogoBox]);
      setSelectedBoxId(newLogoBox.id);
      setActiveTool("logos");
      toast.success("Logo isolada, extraída e adicionada como elemento arrastável!");
    };
    img.src = bgImage;
  };

  // Mapeamento e Desenho de Coordenadas com Ajuste de Escala Zoom In/Out
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !bgImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (isCropMode) {
      setCropStartPos({ x, y });
      setCropCurrentPos({ x, y });
      return;
    }

    // Se clicar no fundo do Canvas, desmarcar seleção anterior e iniciar novo desenho
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (isCropMode && cropStartPos) {
      setCropCurrentPos({ x, y });
      return;
    }

    if (isDrawing) {
      setCurrentPos({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (isCropMode && cropStartPos && cropCurrentPos) {
      const x = Math.min(cropStartPos.x, cropCurrentPos.x);
      const y = Math.min(cropStartPos.y, cropCurrentPos.y);
      const width = Math.abs(cropCurrentPos.x - cropStartPos.x);
      const height = Math.abs(cropCurrentPos.y - cropStartPos.y);

      cropLogoFromCanvas(x, y, width, height);
      setIsCropMode(false);
      setCropStartPos(null);
      setCropCurrentPos(null);
      return;
    }

    if (!isDrawing || !startPos || !currentPos) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width > 15 && height > 12) {
      const newBox: CoordinateBox = {
        id: `box-${Date.now()}`,
        fieldKey: `campo_${boxes.length + 1}`,
        label: `Campo ${boxes.length + 1}`,
        pageIndex: currentPageIndex,
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
      pushHistory([...boxes, newBox], bgImage);
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

  // Sincronizar Coordenadas Visuais com o Módulo da CNH (/cnhcria) em Tempo Real
  const handleSyncCNHLayout = () => {
    const fieldsMap: Record<string, any> = { ...CNH_DEFAULT_LAYOUT.fields };

    boxes.forEach((box) => {
      const k = box.fieldKey.toLowerCase();
      if (k.includes("nome") && !k.includes("pai") && !k.includes("mae") && !k.includes("estado")) {
        fieldsMap.nome = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("primeira") || k.includes("hab")) {
        fieldsMap.primeiraHabilitacao = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("nasc")) {
        fieldsMap.nascimento = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("cpf")) {
        fieldsMap.cpf = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("rg") || k.includes("identidade")) {
        fieldsMap.docIdentidade = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("reg") || k.includes("registro")) {
        fieldsMap.registro = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("cat") || k.includes("categoria")) {
        fieldsMap.categoria = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("valida")) {
        fieldsMap.validade = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("emiss") && !k.includes("local")) {
        fieldsMap.dataEmissao = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("local")) {
        fieldsMap.localEmissao = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("pai")) {
        fieldsMap.nomePai = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("mae")) {
        fieldsMap.nomeMae = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (k.includes("obs") || k.includes("ear")) {
        fieldsMap.observacoes = { x: box.x, y: box.y, fontSize: box.fontSize, color: box.color, maxWidth: box.width };
      } else if (box.type === "qrcode" || k.includes("qr")) {
        fieldsMap.qrCode = { x: box.x, y: box.y, size: box.width };
      }
    });

    saveActiveCNHLayout({ fields: fieldsMap });
    toast.success("✨ Coordenadas aplicadas na CNH (/cnhcria) em TEMPO REAL!");
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
    <div className="fixed inset-0 z-[9990] bg-[#070a12] text-slate-100 flex flex-col h-screen w-screen overflow-hidden select-none font-sans">
      
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

      {/* Header Superior Estilo Adobe Express - Clean Monocromático */}
      <header className="h-14 bg-[#090d16] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.hash = "/admin"}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Voltar ao Painel Admin"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Nome do Documento..."
                className="bg-transparent font-bold text-sm text-white tracking-tight focus:outline-none border-b border-transparent focus:border-slate-500 transition-colors w-48 md:w-64"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">{docSlug || "slug-nao-definido"}</span>
                <span className="px-2 py-0.2 rounded-md text-[9px] font-bold uppercase bg-slate-900 text-slate-300 border border-slate-800">
                  {category}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controles de Zoom Centrais Clean */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-slate-300">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors px-1"
            title="Diminuir Zoom"
          >
            -
          </button>
          <span className="text-[11px] font-mono font-bold text-white px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 10) / 10))}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors px-1"
            title="Aumentar Zoom"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-[10px] font-bold text-slate-500 hover:text-white border-l border-slate-800 pl-2 transition-colors"
            title="Redefinir Zoom para 100%"
          >
            100%
          </button>
        </div>

        {/* Barra de Ações Rápidas à Direita com Ícones Sólidos e Limpos */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Desfazer / Refazer */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 transition-colors flex items-center gap-1.5"
              title="Desfazer"
            >
              <Undo2 className="w-3.5 h-3.5 text-slate-300" />
              <span>Desfazer</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 border-l border-slate-800 transition-colors flex items-center gap-1.5"
              title="Refazer"
            >
              <Redo2 className="w-3.5 h-3.5 text-slate-300" />
              <span>Refazer</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTsxModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-all"
          >
            <Type className="w-3.5 h-3.5 text-slate-300" />
            <span>.tsx</span>
          </button>

          <button
            type="button"
            onClick={handleAutoOCR}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-300" />
            <span>OCR IA</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="px-5 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
            <span>{saving ? "Salvando..." : "Publicar Modelo"}</span>
          </button>
        </div>
      </header>

      {/* Corpo Principal da Suite: Barra Lateral de Ferramentas + Inspetor + Canvas */}
      <div className="flex-1 flex overflow-hidden">

        {/* 1. Barra de Ferramentas Vertical Esquerda (60px - Clean Monocromático) */}
        <aside className="w-16 bg-[#090d16] border-r border-slate-800 flex flex-col items-center py-4 space-y-4 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setActiveTool("boxes")}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[9px] font-bold transition-all ${
              activeTool === "boxes"
                ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Coordenadas & Texto"
          >
            <Sliders className="w-5 h-5 text-white" />
            <span>Texto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("presets")}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[9px] font-bold transition-all ${
              activeTool === "presets"
                ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Documentos Existentes / Modelos"
          >
            <Folder className="w-5 h-5 text-white" />
            <span>Modelos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("form")}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[9px] font-bold transition-all ${
              activeTool === "form"
                ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Layout do Formulário do Usuário"
          >
            <FileText className="w-5 h-5 text-white" />
            <span>Formulário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("qr")}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[9px] font-bold transition-all ${
              activeTool === "qr"
                ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="QR Code & Validador"
          >
            <QrCode className="w-5 h-5 text-white" />
            <span>QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("pricing")}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[9px] font-bold transition-all ${
              activeTool === "pricing"
                ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Preço & Categorias"
          >
            <Tag className="w-5 h-5 text-white" />
            <span>Config</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("logos")}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 text-[9px] font-bold transition-all ${
              activeTool === "logos"
                ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Extração de Logos & Imagens"
          >
            <Layers className="w-5 h-5 text-white" />
            <span>Logos</span>
          </button>
        </aside>

        {/* 2. Gaveta Inspetora de Propriedades Clean Monocromática (300px) */}
        <div className="w-80 bg-[#0d1322] border-r border-slate-800 p-4 space-y-4 overflow-y-auto custom-scrollbar shrink-0 z-10">

          {/* Aba: Coordenadas & Texto */}
          {activeTool === "boxes" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between m-0 border-b border-slate-800 pb-3">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-white" />
                  Propriedades da Caixa X/Y
                </span>
                {selectedBox && (
                  <button
                    type="button"
                    onClick={() => deleteBox(selectedBox.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Chave Variável</label>
                      <input
                        type="text"
                        value={selectedBox.fieldKey}
                        onChange={(e) => updateSelectedBox("fieldKey", e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Rótulo Exibição</label>
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tamanho Fonte (pt)</label>
                      <input
                        type="number"
                        value={selectedBox.fontSize}
                        onChange={(e) => updateSelectedBox("fontSize", Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Família Fonte</label>
                      <select
                        value={selectedBox.fontFamily}
                        onChange={(e) => updateSelectedBox("fontFamily", e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Helvetica">Helvetica / Arial</option>
                        <option value="OCR-B">OCR-B (Documentos)</option>
                        <option value="Courier">Courier New</option>
                        <option value="Times">Times New Roman</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cor da Fonte (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBox.color || "#000000"}
                          onChange={(e) => updateSelectedBox("color", e.target.value)}
                          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedBox.color || "#000000"}
                          onChange={(e) => updateSelectedBox("color", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alinhamento Texto</label>
                      <select
                        value={selectedBox.textAlign}
                        onChange={(e) => updateSelectedBox("textAlign", e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centralizado</option>
                        <option value="right">Direita</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-4">
                  <Move className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Clique em qualquer caixa no Canvas para editar suas propriedades de fonte e coordenadas.</p>
                </div>
              )}

              {/* Lista de Caixas Mapeadas */}
              {boxes.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Camadas Mapeadas ({boxes.length})</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {boxes.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBoxId(b.id)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          b.id === selectedBoxId
                            ? "bg-slate-800 border-slate-600 text-white font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="truncate">{b.label}</span>
                        <span className="text-[9px] font-mono text-slate-500">({b.x},{b.y})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba: Modelos Existentes */}
          {activeTool === "presets" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <Folder className="w-4 h-4 text-white" />
                <span>Carregar Documento Existente</span>
              </h3>

              <select
                onChange={(e) => {
                  if (e.target.value) handleLoadExistingDocPreset(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none cursor-pointer shadow-md"
              >
                <option value="">Selecione um Documento Nativo...</option>
                <option value="atestado">Atestado Médico Oficial IDAB</option>
                <option value="cnh">CNH Digital VIO</option>
                <option value="crlv">CRLV Digital Senatran</option>
                <option value="receita">Receituário Médico Dr. Consulta</option>
                <option value="historico_sp">Histórico Escolar SP (SED)</option>
                <option value="historico_uninter">Histórico UNINTER</option>
                <option value="toxicologico">Laudo Toxicológico Sodré</option>
              </select>

              {(targetStructure === "cnh" || docSlug === "cnhcria") && (
                <button
                  type="button"
                  onClick={handleSyncCNHLayout}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Aplicar Coordenadas na CNH (/cnhcria)</span>
                </button>
              )}

              {savedTemplates.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modelos Publicados ({savedTemplates.length})</span>
                  <div className="space-y-1.5">
                    {savedTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTemplate(t)}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 text-left text-xs font-medium text-slate-200 transition-all flex items-center justify-between"
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="text-[9px] font-mono text-slate-400">R$ {t.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba: Layout do Formulário de Criação */}
          {activeTool === "form" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between m-0">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white" />
                  Formulário do Usuário
                </span>
                <span className="text-[9px] bg-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded-full font-bold">
                  {boxes.length} campos
                </span>
              </h3>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                Ordene os campos, defina os tipos de input (Select, CPF, Data, Texto), placeholders e grupos do formulário final do emissor.
              </p>

              {boxes.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Mapeie caixas no Canvas primeiro para ordenar o formulário.
                </div>
              ) : (
                <div className="space-y-3">
                  {boxes.map((box, idx) => (
                    <div
                      key={box.id}
                      className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                        selectedBoxId === box.id
                          ? "bg-slate-900 border-blue-500 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                      onClick={() => setSelectedBoxId(box.id)}
                    >
                      {/* Header do Campo + Ordenação */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[170px]">
                          {box.label || box.fieldKey}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx > 0) {
                                const newArr = [...boxes];
                                const temp = newArr[idx];
                                newArr[idx] = newArr[idx - 1];
                                newArr[idx - 1] = temp;
                                setBoxes(newArr);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 text-[10px] font-bold"
                            title="Mover para cima"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === boxes.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx < boxes.length - 1) {
                                const newArr = [...boxes];
                                const temp = newArr[idx];
                                newArr[idx] = newArr[idx + 1];
                                newArr[idx + 1] = temp;
                                setBoxes(newArr);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 text-[10px] font-bold"
                            title="Mover para baixo"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Configuração de Tipo de Input */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tipo de Campo</label>
                          <select
                            value={box.inputType || "text"}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, inputType: val } : b));
                            }}
                            className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none cursor-pointer"
                          >
                            <option value="text">Texto Simples</option>
                            <option value="cpf">CPF (Máscara 000.000...)</option>
                            <option value="date">Data (Calendário)</option>
                            <option value="select">Dropdown (Seleção)</option>
                            <option value="crm">CRM / Registro</option>
                            <option value="textarea">Área de Texto Longa</option>
                            <option value="number">Número Inteiro</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Largura da Coluna</label>
                          <select
                            value={box.gridWidth || "full"}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, gridWidth: val } : b));
                            }}
                            className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none cursor-pointer"
                          >
                            <option value="full">Tela Cheia (100%)</option>
                            <option value="half">Metade (50%)</option>
                          </select>
                        </div>
                      </div>

                      {/* Opções caso seja Dropdown (select) */}
                      {box.inputType === "select" && (
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Opções da Lista (Separadas por vírgula)</label>
                          <input
                            type="text"
                            placeholder="Ex: Categoria A, Categoria B, Categoria AB"
                            value={box.options || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, options: val } : b));
                            }}
                            className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                          />
                        </div>
                      )}

                      {/* Grupo de Seção no Formulário */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Sessão / Grupo (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: Dados do Condutor, Identificação..."
                          value={box.section || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, section: val } : b));
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba: QR Code & Validador */}
          {activeTool === "qr" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-white" />
                <span>QR Code & Validação Pública</span>
              </h3>

              <button
                type="button"
                onClick={handleAddOrUpdateQRCodeBox}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>{boxes.some(b => b.type === "qrcode") ? "Atualizar QR Code no Canvas" : "Posicionar QR Code no Canvas"}</span>
              </button>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Formato do Código</label>
                <select
                  value={qrFormat}
                  onChange={(e) => setQrFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none cursor-pointer"
                >
                  <option value="XXXX-XXXX">XXXX-XXXX (Exclusivo Atestados Médicos)</option>
                  <option value="UUID-32">UUID 32 Char (CNH / VIO / CRLV Senatran)</option>
                  <option value="CPF">Consulta CPF Direct (painel?cpf=...)</option>
                  <option value="NUMERICO-11">Chave Numérica 11 Dígitos</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Domínio Validador (Source URL)</label>
                <input
                  type="text"
                  value={qrSourceUrl}
                  onChange={(e) => setQrSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono focus:outline-none"
                  placeholder="https://atestados-idab.pages.dev"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Padrão da Rota de Validação</label>
                <input
                  type="text"
                  value={qrPattern}
                  onChange={(e) => setQrPattern(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono focus:outline-none text-[11px]"
                  placeholder="{sourceUrl}/validar?code={code}"
                />
                <p className="text-[9px] text-slate-400 mt-1">Variáveis: <code className="text-emerald-400">{"{sourceUrl}"}</code> e <code className="text-emerald-400">{"{code}"}</code></p>
              </div>

              {/* Ajuste de Coordenadas Numéricas do QR Code */}
              {boxes.some(b => b.type === "qrcode") && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Coordenadas do QR Code (X, Y, W, H)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Posição X (px)</label>
                      <input
                        type="number"
                        value={boxes.find(b => b.type === "qrcode")?.x || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setBoxes(prev => prev.map(b => b.type === "qrcode" ? { ...b, x: val } : b));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Posição Y (px)</label>
                      <input
                        type="number"
                        value={boxes.find(b => b.type === "qrcode")?.y || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setBoxes(prev => prev.map(b => b.type === "qrcode" ? { ...b, y: val } : b));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Largura (px)</label>
                      <input
                        type="number"
                        value={boxes.find(b => b.type === "qrcode")?.width || 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 50;
                          setBoxes(prev => prev.map(b => b.type === "qrcode" ? { ...b, width: val, height: val } : b));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">Altura (px)</label>
                      <input
                        type="number"
                        value={boxes.find(b => b.type === "qrcode")?.height || 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 50;
                          setBoxes(prev => prev.map(b => b.type === "qrcode" ? { ...b, height: val, width: val } : b));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBoxes(prev => prev.filter(b => b.type !== "qrcode"));
                      toast.info("Caixa de QR Code removida do documento!");
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remover QR Code do Documento</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Aba: Preço & Configurações do Modelo */}
          {activeTool === "pricing" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-white" />
                <span>Configurações Gerais</span>
              </h3>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nome do Documento *</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Slug de Acesso *</label>
                <input
                  type="text"
                  value={docSlug}
                  onChange={(e) => setDocSlug(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Categoria Alvo</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none cursor-pointer"
                >
                  <option value="veiculos">Veículos / CNH</option>
                  <option value="saude">Saúde / Médicos</option>
                  <option value="estudante">Acadêmicos</option>
                  <option value="certidoes">Certidões & Outros</option>
                </select>
              </div>
            </div>
          )}

          {/* Aba: Extração de Logos & Elementos */}
          {activeTool === "logos" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-white" />
                <span>Logos & Elementos do PDF</span>
              </h3>

              <button
                type="button"
                onClick={handleExtractLogos}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Layers className="w-4 h-4 text-white" />
                <span>Extrair Logos do PDF</span>
              </button>

              {extractedLogos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {extractedLogos.map((url, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[60px]">
                      <img src={url} alt={`Logo ${i}`} className="max-h-12 max-w-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 3. Estágio Central de Trabalho (Adobe Express Stage Viewport) */}
        <main className="flex-1 bg-[#060911] flex flex-col overflow-hidden relative">

          {/* Sub-Header do Canvas Clean com Suporte a Multi-Páginas Isolado */}
          <div className="h-11 bg-[#090d16] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-white" />
                <span>Página Ativa:</span>
              </span>

              {/* Seletor de Páginas (Folha 1, Folha 2, etc.) com Badges de Caixas Salvas */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
                {(pdfPages.length > 0 ? pdfPages : [bgImage]).map((_, pIdx) => {
                  const countForPage = boxes.filter(b => (b.pageIndex ?? 0) === pIdx).length;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setCurrentPageIndex(pIdx);
                        if (pdfPages[pIdx]) {
                          setBgImage(pdfPages[pIdx]);
                          updateCanvasSizeFromImage(pdfPages[pIdx]);
                        }
                        toast.info(`Alternou para Folha ${pIdx + 1} (${countForPage} caixas salvas nesta página).`);
                      }}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        currentPageIndex === pIdx
                          ? "bg-white text-slate-950 shadow-md ring-1 ring-slate-400"
                          : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <span>Folha {pIdx + 1}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                        currentPageIndex === pIdx ? "bg-slate-900 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        {countForPage}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 794;
                    canvas.height = 1123;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, 794, 1123);
                    }
                    const newPageUrl = canvas.toDataURL("image/png");
                    const newPages = [...(pdfPages.length > 0 ? pdfPages : [bgImage || newPageUrl]), newPageUrl];
                    setPdfPages(newPages);
                    const newIdx = newPages.length - 1;
                    setCurrentPageIndex(newIdx);
                    setBgImage(newPageUrl);
                    updateCanvasSizeFromImage(newPageUrl);
                    toast.success(`Nova Folha ${newIdx + 1} adicionada ao documento!`);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  title="Adicionar nova página ao documento"
                >
                  <Plus className="w-3 h-3" />
                  <span>Folha</span>
                </button>
              </div>
            </div>

            {/* Barra de Ferramentas Rápidas de Captura (Crop, Desenhar, OCR, QR Code) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runOCRScan}
                disabled={ocrLoading}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                title="Detectar e extrair todas as linhas de texto da folha ativa com OCR IA"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>{ocrLoading ? "Lendo Pixels..." : "OCR IA"}</span>
              </button>

              <button
                type="button"
                onClick={handleExtractLogos}
                className={`px-3 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isCropMode
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/30 animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
                title="Cortar e isolar qualquer logo do documento"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{isCropMode ? "Modo Cortar..." : "Cortar Logo"}</span>
              </button>

              <button
                type="button"
                onClick={handleAddOrUpdateQRCodeBox}
                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Posicionar QR Code oficial de validação na página ativa"
              >
                <QrCode className="w-3.5 h-3.5 text-white" />
                <span>+ QR Code</span>
              </button>

              <label className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-[10px] font-medium tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>Subir PDF</span>
                <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Container do Canvas Stage HD */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-[#060911] flex items-center justify-center p-0 m-0 relative">
            {bgImage ? (
              <div
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`relative select-none shadow-2xl border border-slate-700 rounded-lg overflow-hidden bg-white transition-all duration-150 my-auto ${
                  isCropMode ? "cursor-crosshair ring-2 ring-cyan-400" : "cursor-crosshair"
                }`}
                style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}
              >
                {/* Gabarito Base em Imagem/PDF */}
                <img src={bgImage} alt="Gabarito PDF" className="w-full h-full object-contain pointer-events-none" />

                {/* Renderização das Caixas Mapeadas Filtadas por Folha Ativa */}
                {boxes
                  .filter((box) => (box.pageIndex ?? 0) === currentPageIndex)
                  .map((box) => {
                  const isSelected = box.id === selectedBoxId;

                  if (box.type === "qrcode") {
                    const sampleCode = box.qrFormat === "XXXX-XXXX" ? "A8F9-2041" : box.qrFormat === "CPF" ? "94598940468" : "9b3a7c9d-8e4f-4a12-98ab-34cd56ef7890";
                    const qrVal = (box.qrPattern || "{sourceUrl}/validar?code={code}")
                      .replace("{sourceUrl}", box.qrSourceUrl || "https://atestados-idab.pages.dev")
                      .replace("{code}", sampleCode);

                    return (
                      <div
                        key={box.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBoxId(box.id);
                          setActiveTool("qr");
                        }}
                        className={`absolute border-2 rounded-xl transition-all flex flex-col items-center justify-center p-1 bg-white/95 shadow-2xl cursor-pointer ${
                          isSelected
                            ? "border-emerald-400 shadow-emerald-500/50 z-30 ring-4 ring-emerald-400/40 animate-pulse"
                            : "border-emerald-600 hover:border-emerald-400 z-20"
                        }`}
                        style={{
                          left: box.x * zoom,
                          top: box.y * zoom,
                          width: box.width * zoom,
                          height: box.height * zoom,
                        }}
                      >
                        <QRCodeSVG
                          value={qrVal}
                          size={Math.max(16, Math.min(box.width * zoom - 10, box.height * zoom - 14))}
                          level="M"
                        />
                        <span className="text-[7px] font-mono font-black text-emerald-900 uppercase tracking-widest mt-0.5 truncate max-w-full">
                          QR CODE ({box.x},{box.y})
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={box.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBoxId(box.id);
                        setActiveTool("boxes");
                      }}
                      className={`absolute border-2 rounded transition-all flex items-center justify-between px-2 font-mono text-[10px] font-bold ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/30 z-30 ring-2 ring-emerald-400/40"
                          : "border-indigo-500/70 bg-indigo-500/10 hover:border-indigo-400 z-20"
                      }`}
                      style={{
                        left: box.x * zoom,
                        top: box.y * zoom,
                        width: box.width * zoom,
                        height: box.height * zoom,
                        color: box.color || "#000",
                      }}
                    >
                      <span className="truncate">{box.label || box.fieldKey}</span>
                      <span className="text-[8px] opacity-70">({box.x},{box.y})</span>
                    </div>
                  );
                })}

                {/* Retângulo dinâmico enquanto o usuário arrasta o mouse para desenhar caixas */}
                {isDrawing && startPos && currentPos && (
                  <div
                    className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 z-40 pointer-events-none"
                    style={{
                      left: Math.min(startPos.x, currentPos.x) * zoom,
                      top: Math.min(startPos.y, currentPos.y) * zoom,
                      width: Math.abs(currentPos.x - startPos.x) * zoom,
                      height: Math.abs(currentPos.y - startPos.y) * zoom,
                    }}
                  />
                )}

                {/* Retângulo de Seleção de Crop de Logo */}
                {isCropMode && cropStartPos && cropCurrentPos && (
                  <div
                    className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/25 z-50 pointer-events-none shadow-xl"
                    style={{
                      left: Math.min(cropStartPos.x, cropCurrentPos.x) * zoom,
                      top: Math.min(cropStartPos.y, cropCurrentPos.y) * zoom,
                      width: Math.abs(cropCurrentPos.x - cropStartPos.x) * zoom,
                      height: Math.abs(cropCurrentPos.y - cropStartPos.y) * zoom,
                    }}
                  >
                    <span className="absolute -top-6 left-0 text-[10px] font-black bg-cyan-400 text-black px-1.5 py-0.5 rounded shadow">
                      Isolar Logo / Imagem
                    </span>
                  </div>
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

        </main>

      </div>

    </div>
  );
}
