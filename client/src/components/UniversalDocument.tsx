import { forwardRef } from "react";

export interface UniversalTemplate {
  id?: string;
  name?: string;
  slug?: string;
  price?: number;
  base_config: {
    width: number;
    height: number;
    background_url?: string;
    font_family?: string;
  };
  layout_definition: Array<{
    id: string;
    type: "text" | "image" | "qr";
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    value?: string;
    fieldKey?: string;
  }>;
}

interface UniversalDocumentProps {
  template: UniversalTemplate;
  data: Record<string, any>;
  editMode?: boolean;
  selectedElementIndex?: number | null;
  onSelectElement?: (index: number | null) => void;
}

const UniversalDocument = forwardRef<HTMLDivElement, UniversalDocumentProps>(
  ({ template, data, editMode, selectedElementIndex, onSelectElement }, ref) => {
    const { base_config, layout_definition } = template;

    return (
      <div
        ref={ref}
        style={{
          width: `${base_config.width}px`,
          height: `${base_config.height}px`,
          position: "relative",
          backgroundImage: base_config.background_url ? `url(${base_config.background_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          fontFamily: base_config.font_family || "Inter, sans-serif",
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        {layout_definition.map((el, i) => {
          const val = el.fieldKey ? (data[el.fieldKey] ?? el.value ?? "") : (el.value ?? "");
          const isSelected = selectedElementIndex === i;

          return (
            <div
              key={el.id || i}
              onClick={() => editMode && onSelectElement?.(i)}
              style={{
                position: "absolute",
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: el.width ? `${el.width}px` : undefined,
                height: el.height ? `${el.height}px` : undefined,
                fontSize: el.fontSize ? `${el.fontSize}px` : "12px",
                fontWeight: el.fontWeight || "normal",
                color: el.color || "#000000",
                border: editMode && isSelected ? "2px solid #005CA9" : undefined,
                cursor: editMode ? "pointer" : "default",
                userSelect: "none",
              }}
            >
              {val}
            </div>
          );
        })}
      </div>
    );
  }
);

UniversalDocument.displayName = "UniversalDocument";

export default UniversalDocument;
