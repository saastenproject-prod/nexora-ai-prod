import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, User } from "../../lib/icons";
import { supabase } from "../../lib/supabaseClient";

export default function AccountMenu({ workspaceName, onLogout }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email || "");
    };

    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const initial = email?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-10 rounded-2xl border border-slate-200 bg-white pl-2 pr-3 flex items-center gap-2 hover:bg-slate-50 transition shadow-sm"
      >
        <div className="h-8 w-8 rounded-xl bg-slate-950 text-white grid place-items-center text-xs font-black">
          {initial}
        </div>

        <div className="hidden xl:block text-left max-w-[170px]">
          <p className="text-xs font-black text-slate-950 leading-4 truncate">
            {workspaceName || "Workspace"}
          </p>
          <p className="text-[11px] text-slate-500 leading-4 truncate">
            {email || "Signed in"}
          </p>
        </div>

        <ChevronDown
          size={15}
          className={`text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-2xl z-[80]">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-slate-950 text-white grid place-items-center font-black">
                {initial}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950 truncate">
                  {workspaceName || "Workspace"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {email || "No email"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <button
              className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-3"
              type="button"
            >
              <User size={16} className="text-slate-400" />
              Account Settings
            </button>

            <button
              onClick={onLogout}
              className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-3"
              type="button"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}