import React from "react";

export interface ConsultasTabItem {
  id: string;
  label: string;
  placeholder?: string;
  emoji: string;
  headerTitle?: string;
  headerDesc?: string;
}

interface ConsultasTabsProps {
  tabs: ConsultasTabItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
}

export const ConsultasTabs: React.FC<ConsultasTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar justify-start sm:justify-center touch-pan-x">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 border ${
              isActive
                ? "bg-violet-600 text-white border-violet-300 shadow-lg shadow-violet-600/40 scale-105"
                : "bg-[#090b1f] text-slate-400 hover:text-white hover:bg-slate-900 border-violet-500/20"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
