import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category, type Garment, type GridSlot } from '../db/database';
import { Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';

const CATEGORIES: Category[] = ['top', 'bottom', 'outerwear', 'footwear'];
const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Superiores',
  bottom: 'Inferiores',
  outerwear: 'Capas',
  footwear: 'Calzado'
};

export default function GridScreen() {
  const gridSlots = useLiveQuery(() => db.gridSlots.toArray());
  const garments = useLiveQuery(() => db.garments.toArray());
  const [selectingFor, setSelectingFor] = useState<{ categoryId: Category, slotIndex: number } | null>(null);

  if (!gridSlots || !garments) {
    return <div className="p-4 text-center text-slate-500">Cargando...</div>;
  }

  const getSlot = (categoryId: Category, slotIndex: number) => {
    return gridSlots.find(s => s.categoryId === categoryId && s.slotIndex === slotIndex);
  };

  const getGarment = (id: number) => garments.find(g => g.id === id);

  return (
    <div className="h-full flex flex-col relative bg-[#F8F7F5]">
      <header className="h-16 px-6 border-b border-slate-200 flex flex-col justify-center bg-white bg-opacity-80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">La Rejilla <span className="text-slate-400 font-light">4x4</span></h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        {CATEGORIES.map(category => (
          <div key={category}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{CATEGORY_LABELS[category]}</h2>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(slotIndex => {
                const slot = getSlot(category, slotIndex);
                const garment = slot ? getGarment(slot.garmentId) : null;
                return (
                  <SlotButton
                    key={slotIndex}
                    garment={garment}
                    onClick={() => setSelectingFor({ categoryId: category, slotIndex })}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectingFor && (
        <GarmentSelector
          category={selectingFor.categoryId}
          slotIndex={selectingFor.slotIndex}
          currentGarmentId={getSlot(selectingFor.categoryId, selectingFor.slotIndex)?.garmentId}
          garments={garments.filter(g => g.category === selectingFor.categoryId)}
          onClose={() => setSelectingFor(null)}
          onSelect={async (garmentId) => {
            const existingSlot = getSlot(selectingFor.categoryId, selectingFor.slotIndex);
            if (existingSlot?.id) {
              await db.gridSlots.delete(existingSlot.id);
            }
            if (garmentId !== null) {
              await db.gridSlots.add({
                categoryId: selectingFor.categoryId,
                slotIndex: selectingFor.slotIndex,
                garmentId
              });
            }
            setSelectingFor(null);
          }}
        />
      )}
    </div>
  );
}

function SlotButton({ garment, onClick }: { garment?: Garment | null, onClick: () => void }) {
  const [imageUrl, setImageUrl] = useState<string>();

  useEffect(() => {
    if (garment?.photo) {
      const url = URL.createObjectURL(garment.photo);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [garment]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "aspect-square rounded-sm overflow-hidden border flex flex-col items-center justify-center transition-all",
        garment ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-slate-100/50 hover:bg-slate-200"
      )}
    >
      {garment && imageUrl ? (
        <img src={imageUrl} alt={garment.name} className="w-full h-full object-cover" />
      ) : (
        <Plus className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
}

function GarmentSelector({
  category,
  slotIndex,
  currentGarmentId,
  garments,
  onClose,
  onSelect
}: {
  category: Category;
  slotIndex: number;
  currentGarmentId?: number;
  garments: Garment[];
  onClose: () => void;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#F8F7F5] z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      <header className="h-16 px-4 border-b border-slate-200 flex justify-between items-center shrink-0 bg-white bg-opacity-80 backdrop-blur-md sticky top-0">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-semibold tracking-tight">Seleccionar prenda</h2>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {currentGarmentId && (
          <button
            onClick={() => onSelect(null)}
            className="w-full py-3 mb-6 border border-red-200 text-red-600 rounded-xl text-sm font-medium bg-red-50 hover:bg-red-100 transition-colors"
          >
            Vaciar hueco
          </button>
        )}

        {garments.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 text-sm">
            No tienes prendas en esta categoría.<br/>Añádelas desde el Catálogo.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {garments.map(g => (
              <SelectorCard
                key={g.id}
                garment={g}
                isSelected={g.id === currentGarmentId}
                onClick={() => g.id && onSelect(g.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectorCard({ garment, isSelected, onClick }: { garment: Garment, isSelected: boolean, onClick: () => void }) {
  const [imageUrl, setImageUrl] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(garment.photo);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [garment.photo]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl overflow-hidden border text-left transition-all relative",
        isSelected ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1" : "border-slate-200 shadow-sm hover:shadow-md"
      )}
    >
      <div className="aspect-[3/4] bg-slate-100">
        {imageUrl && (
          <img src={imageUrl} alt={garment.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-slate-900 truncate">{garment.name}</h3>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )}
    </button>
  );
}
