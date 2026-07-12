import { useState } from 'react';
import { Shirt, LayoutGrid, Layers } from 'lucide-react';
import { cn } from './lib/utils';
import CatalogScreen from './screens/CatalogScreen';
import GridScreen from './screens/GridScreen';
import OutfitsScreen from './screens/OutfitsScreen';

type Tab = 'catalog' | 'grid' | 'outfits';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  return (
    <div className="flex flex-col h-screen bg-[#F8F7F5] text-slate-900 pb-[env(safe-area-inset-bottom)] font-sans">
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'catalog' && <CatalogScreen />}
        {activeTab === 'grid' && <GridScreen />}
        {activeTab === 'outfits' && <OutfitsScreen />}
      </main>

      <nav className="h-20 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center shrink-0 z-50">
        <button
          onClick={() => setActiveTab('catalog')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'catalog' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Shirt className="w-6 h-6" strokeWidth={activeTab === 'catalog' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Catálogo</span>
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'grid' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutGrid className="w-6 h-6" strokeWidth={activeTab === 'grid' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Rejilla</span>
        </button>
        <button
          onClick={() => setActiveTab('outfits')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'outfits' ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Layers className="w-6 h-6" strokeWidth={activeTab === 'outfits' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Outfits</span>
        </button>
      </nav>
    </div>
  );
}
