import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ConsultaErrorDetails } from "@/lib/consultas/types";

interface ConsultaErrorPanelProps {
  errorDetails: ConsultaErrorDetails;
}

export const ConsultaErrorPanel: React.FC<ConsultaErrorPanelProps> = ({
  errorDetails,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border flex items-center gap-3 text-sm transition-all ${
        errorDetails.type === "NO_RESULTS"
          ? "bg-slate-900/90 border-slate-800 text-slate-300"
          : errorDetails.type === "LIMIT_ERROR"
          ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
          : errorDetails.type === "AUTH_ERROR"
          ? "bg-violet-950/60 border-violet-500/40 text-violet-300"
          : "bg-red-950/60 border-red-500/40 text-red-300"
      }`}
    >
      <AlertTriangle
        className={`w-5 h-5 flex-shrink-0 ${
          errorDetails.type === "NO_RESULTS"
            ? "text-slate-400"
            : errorDetails.type === "LIMIT_ERROR"
            ? "text-amber-400"
            : errorDetails.type === "AUTH_ERROR"
            ? "text-violet-400"
            : "text-red-400"
        }`}
      />
      <div>
        <strong className="block text-xs uppercase tracking-wider font-bold">
          {errorDetails.title}
        </strong>
        <span className="text-xs">{errorDetails.message}</span>
      </div>
    </div>
  );
};
