import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Garment, type OutfitMeta } from '../db/database';
import { useInView } from 'react-intersection-observer';
import { Heart, Calendar, AlertTriangle, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

export default function OutfitsScreen() {
  const gridSlots = useLiveQuery(() => db.gridSlots.toArray());
  const garments = useLiveQuery(() => db.garments.toArray());
  const outfitMetas = useLiveQuery(() => db.outfitMeta.toArray());

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [hideIncompatible, setHideIncompatible] = useState(false);

  const outfits = useMemo(() => {
    if (!gridSlots || !garments) return null;

    const getAssignedGarments = (categoryId: string) =>
      gridSlots
        .filter(s => s.categoryId === categoryId)
        .map(s => garments.find(g => g.id === s.garmentId))
        .filter((g): g is Garment => !!g);

    const tops = getAssignedGarments('top');
    const bottoms = getAssignedGarments('bottom');
    const outerwears = getAssignedGarments('outerwear');
    const footwears = getAssignedGarments('footwear');

    if (!tops.length || !bottoms.length || !outerwears.length || !footwears.length) {
      return []; // Incomplete grid
    }

    const combinations: Array<{ items: Garment[], key: string, spread: number, isIncompatible: boolean }> = [];

    for (const t of tops) {
      for (const b of bottoms) {
        for (const o of outerwears) {
          for (const f of footwears) {
            const items = [t, b, o, f];
            const formalities = items.map(i => i.formality);
            const spread = Math.max(...formalities) - Math.min(...formalities);
            const isIncompatible = spread === 2;
            const key = `${t.id}-${b.id}-${o.id}-${f.id}`;
            combinations.push({ items, key, spread, isIncompatible });
          }
        }
      }
    }
    return combinations;
  }, [gridSlots, garments]);

  if (!outfits || !outfitMetas) {
    return <div className="p-4 text-center text-slate-500">Cargando...</div>;
  }

  if (outfits.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#F8F7F5]">
        <h2 className="text-lg font-medium text-slate-900 mb-2">Rejilla incompleta</h2>
        <p className="text-sm text-slate-500">Asegúrate de asignar al menos una prenda en cada categoría de la Rejilla para generar combinaciones.</p>
      </div>
    );
  }

  // Map metas for quick access
  const metaMap = new Map(outfitMetas.map(m => [m.key, m]));

  const filteredOutfits = outfits.filter(outfit => {
    const meta = metaMap.get(outfit.key);
    if (showFavoritesOnly && !meta?.favorite) return false;
    if (hideIncompatible && outfit.isIncompatible) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5]">
      <header className="px-6 py-4 border-b border-slate-200 bg-white bg-opacity-80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex justify-between items-end mb-4">
          <h1 className="text-2xl font-light tracking-tight text-slate-900">Combinaciones</h1>
          <span className="text-sm text-slate-400 font-medium">{filteredOutfits.length} sugeridas</span>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
              showFavoritesOnly ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
            )}
          >
            Solo Favoritos
          </button>
          <button
            onClick={() => setHideIncompatible(!hideIncompatible)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
              hideIncompatible ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
            )}
          >
            Ocultar Incompatibles
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {filteredOutfits.map(outfit => (
          <OutfitCard
            key={outfit.key}
            outfit={outfit}
            meta={metaMap.get(outfit.key)}
          />
        ))}
        {filteredOutfits.length === 0 && (
          <div className="text-center text-slate-500 mt-10">No hay combinaciones con los filtros actuales.</div>
        )}
      </div>
    </div>
  );
}

function OutfitCard({
  outfit,
  meta
}: {
  outfit: { items: Garment[], key: string, isIncompatible: boolean };
  meta?: OutfitMeta;
}) {
  const { ref, inView } = useInView({ rootMargin: '400px 0px' });
  const isFavorite = meta?.favorite ?? false;
  const wornCount = meta?.wornDates?.length ?? 0;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const wornToday = meta?.wornDates?.includes(todayDateStr) ?? false;

  const toggleFavorite = async () => {
    const existing = await db.outfitMeta.get(outfit.key);
    if (existing) {
      await db.outfitMeta.put({ ...existing, favorite: !existing.favorite });
    } else {
      await db.outfitMeta.add({ key: outfit.key, favorite: true, wornDates: [] });
    }
  };

  const markWornToday = async () => {
    if (wornToday) return; // Already worn today
    const existing = await db.outfitMeta.get(outfit.key);
    if (existing) {
      await db.outfitMeta.put({ ...existing, wornDates: [...existing.wornDates, todayDateStr] });
    } else {
      await db.outfitMeta.add({ key: outfit.key, favorite: false, wornDates: [todayDateStr] });
    }
  };

  return (
    <div ref={ref} className={cn(
      "group relative flex flex-col gap-3",
      outfit.isIncompatible && "opacity-60 grayscale-[0.5]"
    )}>
      {!inView ? (
        <div className="h-[300px] animate-pulse bg-slate-100 rounded-2xl" />
      ) : (
        <>
          <div className={cn(
            "aspect-[3/4] bg-white rounded-2xl overflow-hidden border p-3 grid grid-cols-2 grid-rows-2 gap-2 shadow-sm transition-shadow hover:shadow-md",
            outfit.isIncompatible ? "border-dashed border-slate-300" : "border-slate-200"
          )}>
            {outfit.items.map(g => (
              <GarmentImage key={g.id} garment={g} isIncompatible={outfit.isIncompatible} />
            ))}
          </div>

          <div className="flex justify-between items-start px-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">
                  {outfit.isIncompatible ? 'Outfit Mixto' : 'Combinación'}
                </span>
                {outfit.isIncompatible && <span className="text-xs">⚠</span>}
              </div>
              <span className={cn(
                "text-xs",
                outfit.isIncompatible ? "text-slate-500" : wornCount > 0 ? "text-slate-500" : "text-slate-400 italic"
              )}>
                {outfit.isIncompatible ? 'Salto de formalidad detectado' : wornCount > 0 ? `Usado ${wornCount} veces` : 'Nunca usado'}
              </span>
            </div>
            
            <div className="flex gap-2 items-center">
              <button
                onClick={toggleFavorite}
                className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                  isFavorite ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-300 hover:border-slate-300"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              </button>
              <button
                onClick={markWornToday}
                disabled={wornToday}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  wornToday ? "bg-slate-200 text-slate-500 cursor-default" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
                title={wornToday ? "Usado hoy" : "Marcar usado"}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GarmentImage({ garment, isIncompatible }: { garment: Garment, isIncompatible: boolean }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const objectUrl = URL.createObjectURL(garment.photo);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [garment.photo]);

  return (
    <div className="rounded-lg overflow-hidden bg-slate-100 relative">
      {url ? (
        <img src={url} alt={garment.name} className="w-full h-full object-cover" />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/20 to-transparent">
        <div className="text-[8px] uppercase tracking-tighter text-white opacity-80">{garment.category}</div>
      </div>
    </div>
  );
}
