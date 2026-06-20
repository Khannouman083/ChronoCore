import React from "react";
import { useChronoStore } from "../store";
import { 
  Code, 
  Cpu, 
  Database, 
  GitBranch, 
  ListTodo, 
  Settings
} from "lucide-react";

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useChronoStore();

  const tabs = [
    { id: "editor", name: "Editor", icon: Code },
    { id: "cpu", name: "CPU State", icon: Cpu },
    { id: "memory", name: "Memory", icon: Database },
    { id: "datapath", name: "Datapath", icon: GitBranch },
    { id: "pipeline", name: "Pipeline", icon: ListTodo },
    { id: "processor", name: "Processor", icon: Settings },
  ] as const;

  return (
    <aside className="flex flex-col h-full w-16 lg:w-sidebar-width bg-surface-container-low border-r border-outline-variant z-40 fixed left-0 top-header-height transition-all duration-200">
      {/* Branding Header inside sidebar */}
      <div className="p-3 lg:p-4 border-b border-outline-variant/30 flex items-center justify-center lg:justify-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
          <Cpu size={18} />
        </div>
        <div className="hidden lg:block">
          <p className="font-headline-sm text-sm text-primary-container leading-none font-bold">Simulation</p>
          <p className="font-status-label text-[10px] text-on-surface-variant opacity-60 mt-1">v4.2.0-Alpha</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 flex items-center justify-center lg:justify-start gap-3 transition-all text-left relative ${
                isActive 
                  ? "bg-surface-container-high text-primary-container border-l-4 border-primary-container" 
                  : "text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface border-l-4 border-transparent"
              }`}
              title={tab.name}
            >
              <Icon size={16} className={isActive ? "text-primary-container" : "text-on-surface-variant"} />
              <span className="font-nav-item text-nav-item font-semibold hidden lg:inline">{tab.name}</span>
            </button>
          );
        })}
      </nav>

    </aside>
  );
};
