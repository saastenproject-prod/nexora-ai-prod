import React from "react";
import { Bell, ChevronDown, Languages } from "../../lib/icons";

export default function Topbar({ step }) {
  const steps = ["Select Platform", "Usecase", "Setup Bot", "Install Bot"];

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {steps.map((item, idx) => (
          <React.Fragment key={item}>
            <span
              className={`px-3 py-1.5 rounded-full ${
                step === idx ? "bg-blue-600 text-white" : ""
              }`}
            >
              {item}
            </span>
            {idx < steps.length - 1 && <span>›</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button className="h-9 px-3 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-sm text-slate-600">
          <Languages size={16} /> English <ChevronDown size={14} />
        </button>

        <button className="h-9 w-9 rounded-full border border-slate-200 bg-white grid place-items-center text-slate-500">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}