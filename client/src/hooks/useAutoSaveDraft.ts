import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Hook universal de auto-salvamento automático em tempo real para formulários do DocMaster.
 * Salva o estado do formulário no localStorage com debounce e restaura automaticamente.
 */
export function useAutoSaveDraft<T extends Record<string, any>>(
  draftKey: string,
  initialState: T,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
    onRestore?: (restoredData: T) => void;
  }
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 800;
  const [formData, setFormData] = useState<T>(() => {
    if (typeof window === "undefined" || !enabled) return initialState;
    try {
      const saved = localStorage.getItem(`docmaster_draft_${draftKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialState, ...parsed };
      }
    } catch (e) {
      console.error(`[AutoSave] Erro ao restaurar rascunho de ${draftKey}:`, e);
    }
    return initialState;
  });

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<any>(null);

  // Auto-salvar no localStorage a cada alteração com debounce
  useEffect(() => {
    if (!enabled) return;

    setIsSaving(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`docmaster_draft_${draftKey}`, JSON.stringify(formData));
        const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastSavedAt(timeStr);
      } catch (err) {
        console.error(`[AutoSave] Erro ao salvar rascunho de ${draftKey}:`, err);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [formData, draftKey, enabled, debounceMs]);

  // Função para limpar rascunho após emissão ou ação concluída
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`docmaster_draft_${draftKey}`);
      setLastSavedAt(null);
    } catch {}
  }, [draftKey]);

  return {
    formData,
    setFormData,
    lastSavedAt,
    isSaving,
    clearDraft,
  };
}
