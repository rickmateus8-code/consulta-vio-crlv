import DocumentosSalvos from "@/components/DocumentosSalvos";
import { useSettings } from "@/hooks/useSettings";

const FIELDS = [
  { key: "nome", label: "Nome do Proprietário" },
  { key: "cpfCnpj", label: "CPF / CNPJ", locked: true },
  { key: "renavam", label: "RENAVAM" },
  { key: "placa", label: "Placa" },
  { key: "exercicio", label: "Exercício" },
  { key: "marcaModeloVersao", label: "Marca / Modelo / Versão" },
  { key: "chassi", label: "Chassi" },
  { key: "corPredominante", label: "Cor" },
  { key: "combustivel", label: "Combustível" },
  { key: "local", label: "Local" },
  { key: "dataEmissaoDoc", label: "Data Emissão" },
  { key: "observacoesVeiculo", label: "Observações", type: "textarea" as const },
];

export default function CRLVSalvos() {
  const { validityDays } = useSettings();
  return (
    <DocumentosSalvos
      title="CRLVs Salvos"
      apiEndpoint="/api/documents/crlv"
      docType="crlv"
      validityDays={validityDays}
      fields={FIELDS}
      nameField="nome"
      nameLabel="Proprietário"
      cpfField="cpfCnpj"
      cpfLabel="CPF/CNPJ"
      idLabel="Código de Validação"
      idField="codigo_qr"
      dateLabel="Data Emissão"
      dateField="dataEmissaoDoc"
      extraColumns={[
        { key: "placa", label: "Placa" },
        { key: "renavam", label: "RENAVAM" },
        {
          key: "created_at",
          label: "Criação (Painel)",
          render: (doc) => {
            const date = new Date(doc.created_at);
            return (
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {date.toLocaleDateString("pt-BR")}
                </span>
                <span className="text-[10px] text-gray-400">
                  {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          },
        },
      ]}
      editRoute="/crlv/editar"
    />
  );
}
