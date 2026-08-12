import { Download, Pencil, Eye, Loader2, Trash2, MessageCircle, CalendarPlus, FileText } from "lucide-react";

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
    <div className="flex items-center justify-end gap-1.5 flex-nowrap">
      {/* Botão 1: Renovação (Ficar mais meses no painel) - Borda Laranja/Âmbar (Estilo Imagem 01 e 02) */}
      <button
        type="button"
        title="Ficar mais meses no painel"
        aria-label="Ficar mais meses no painel"
        onClick={onRenew}
        className="w-8 h-8 rounded-lg border border-amber-600/70 bg-slate-900/90 text-amber-500 hover:bg-amber-600/20 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
      >
        <CalendarPlus className="w-4 h-4" />
      </button>

      {/* Botão 2: Editar (Borda Amarela/Laranja) */}
      {onEdit && (
        <button
          type="button"
          title="Editar Registro"
          aria-label="Editar Registro"
          onClick={onEdit}
          className="w-8 h-8 rounded-lg border border-yellow-500/70 bg-slate-900/90 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Botão 3: Baixar PDF / Visualizar (Borda Azul) */}
      {(onDownload || onView) && (
        <button
          type="button"
          title="Baixar PDF Direto"
          aria-label="Baixar PDF Direto"
          disabled={isDownloading}
          onClick={onDownload || onView}
          className="w-8 h-8 rounded-lg border border-blue-500/70 bg-slate-900/90 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs disabled:opacity-50"
        >
          {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Botão 4: Enviar WhatsApp (Borda Verde) */}
      {onWhatsApp && (
        <button
          type="button"
          title="Enviar via WhatsApp"
          aria-label="Enviar via WhatsApp"
          onClick={onWhatsApp}
          className="w-8 h-8 rounded-lg border border-emerald-500/70 bg-slate-900/90 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Botão 5: Excluir Registro (Borda Vermelha) */}
      {onDelete && (
        <button
          type="button"
          title="Apagar Registro"
          aria-label="Apagar Registro"
          onClick={onDelete}
          className="w-8 h-8 rounded-lg border border-red-500/70 bg-slate-900/90 text-red-400 hover:bg-red-500/20 hover:border-red-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
