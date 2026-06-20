import React from "react";
import { ListTodo } from "lucide-react";

export const PipelineTab: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-lowest p-8 h-full">
      <ListTodo size={64} className="text-on-surface-variant/30 mb-4" />
      <h2 className="text-2xl font-bold text-on-surface mb-2">Pipeline Architecture</h2>
      <p className="text-on-surface-variant max-w-md text-center">
        The 5-stage pipeline visualization is currently undergoing an upgrade to fully support the RV32IM extensions.
      </p>
      <div className="mt-8 px-6 py-2 rounded-full bg-primary-container/10 border border-primary-container/30 text-primary-container font-status-label tracking-widest font-bold animate-pulse">
        COMING SOON
      </div>
    </div>
  );
};
