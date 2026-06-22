import { sidebarItems } from '../../data/dummyData';

export default function Sidebar({ active, setActive }) {
  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-[84px] shrink-0 border-r border-slate-200 bg-white flex flex-col items-center py-5 gap-4">
      {/* <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 grid place-items-center shadow-sm">
        <span className="text-white font-black text-lg">S</span>
      </div> */}

      <div className="h-11 w-11 grid place-items-center overflow-hidden">
        <img
          src="../../saia-64.png"
          alt="Logo"
          className="h-11 w-11 rounded-xl object-cover"
        />
      </div>

      <nav className="mt-4 w-full space-y-1 px-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full rounded-2xl py-3 flex flex-col items-center gap-1 text-[11px] transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
