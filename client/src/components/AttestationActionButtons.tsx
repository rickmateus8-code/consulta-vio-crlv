import { Download, Pencil, Eye, Loader2, Trash2, MessageCircle, Clock, Smartphone, QrCode } from "lucide-react";

interface AttestationActionButtonsProps {
  onView?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
  onWhatsApp?: () => void;
  onRenew?: () => void;
  isDownloading?: boolean;
}

export default function AttestationActionButtons({
  onView,
  onDelete,
  onEdit,
  onDownload,
  onWhatsApp,
  onRenew,
  isDownloading = false,
}: AttestationActionButtonsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {/* Botão 1: Baixar PDF / Visualizar (Borda Laranja/Amarela - Estilo EliteDoc) */}
      {(onDownload || onView) && (
        <button
          type="button"
          title="Baixar PDF / Visualizar Documento"
          aria-label="Baixar PDF / Visualizar Documento"
          disabled={isDownloading}
          onClick={onDownload || onView}
          className="w-8 h-8 rounded-lg border border-amber-500/50 bg-slate-900/80 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs disabled:opacity-50"
        >
          {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Botão 2: Editar (Borda Amarela/Laranja - Estilo EliteDoc) */}
      {onEdit && (
        <button
          type="button"
          title="Editar Registro"
          aria-label="Editar Registro"
          onClick={onEdit}
          className="w-8 h-8 rounded-lg border border-yellow-500/50 bg-slate-900/80 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Botão 3: Visualizar no Modal / Dados / App (Borda Azul - Estilo EliteDoc) */}
      {onView && (
        <button
          type="button"
          title="Visualizar Detalhes"
          aria-label="Visualizar Detalhes"
          onClick={onView}
          className="w-8 h-8 rounded-lg border border-blue-500/50 bg-slate-900/80 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Botão 4: Enviar WhatsApp (Borda Verde - Estilo EliteDoc) */}
      {onWhatsApp && (
        <button
          type="button"
          title="Enviar via WhatsApp"
          aria-label="Enviar via WhatsApp"
          onClick={onWhatsApp}
          className="w-8 h-8 rounded-lg border border-emerald-500/50 bg-slate-900/80 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Botão 5: Excluir Registro (Borda Vermelha - Estilo EliteDoc) */}
      {onDelete && (
        <button
          type="button"
          title="Apagar Registro"
          aria-label="Apagar Registro"
          onClick={onDelete}
          className="w-8 h-8 rounded-lg border border-red-500/50 bg-slate-900/80 text-red-400 hover:bg-red-500/20 hover:border-red-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
