import React from "react";
import { Settings } from "lucide-react";

export const ProcessorTab: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-lowest p-8 h-full">
      <Settings size={64} className="text-on-surface-variant/30 mb-4" />
      <h2 className="text-2xl font-bold text-on-surface mb-2">Processor Control Unit</h2>
      <p className="text-on-surface-variant max-w-md text-center">
        The processor heat signature and hardware block grid are currently undergoing an upgrade to fully support the RV32IM extensions.
      </p>
      <div className="mt-8 px-6 py-2 rounded-full bg-primary-container/10 border border-primary-container/30 text-primary-container font-status-label tracking-widest font-bold animate-pulse">
        COMING SOON
      </div>
    </div>
  );
};
