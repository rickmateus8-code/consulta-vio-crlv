import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { AddressMap } from "../../UnifiedProfileView";

export interface AddressItemRecord {
  type?: string;
  tipologradouro?: string;
  street?: string;
  logradouro?: string;
  LOGRADOURO?: string;
  number?: string | number;
  numero?: string | number;
  NUMERO?: string | number;
  complement?: string;
  complemento?: string;
  neighborhood?: string;
  bairro?: string;
  BAIRRO?: string;
  city?: string;
  cidade?: string;
  CIDADE?: string;
  state?: string;
  uf?: string;
  UF?: string;
  zip_code?: string;
  cep?: string;
  CEP?: string;
}

interface AddressesSectionProps {
  enderecosList: Array<AddressItemRecord | string>;
  enderecoPrincipal: string;
  leafletLoaded: boolean;
}

export const AddressesSection: React.FC<AddressesSectionProps> = ({
  enderecosList,
  enderecoPrincipal,
  leafletLoaded,
}) => {
  const totalCount = enderecosList.length || (enderecoPrincipal !== "Não informado" ? 1 : 0);

  return (
    <div id="secao-enderecos" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-400" />
          <span>Endereços Registrados</span>
        </div>
        <span className="text-xs text-violet-300 font-medium">Total: {totalCount}</span>
      </div>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {enderecosList.length > 0 ? (
            enderecosList.map((end, i) => {
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
  );
};
