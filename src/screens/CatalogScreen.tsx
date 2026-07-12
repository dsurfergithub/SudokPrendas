import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Garment, type Category, type Formality } from '../db/database';
import { compressImage } from '../lib/imageUtils';
import { Plus, X, Upload, Trash2, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Superior',
  bottom: 'Inferior',
  outerwear: 'Capa',
  footwear: 'Calzado'
};

export default function CatalogScreen() {
  const garments = useLiveQuery(() => db.garments.orderBy('createdAt').reverse().toArray());
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="h-full flex flex-col relative bg-[#F8F7F5]">
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white bg-opacity-80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Armario</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 -mr-2 text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {garments === undefined ? (
          <div className="text-center text-slate-500 mt-10">Cargando...</div>
        ) : garments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-medium text-slate-900 mb-2">Tu armario está vacío</h2>
            <p className="text-sm text-slate-500 mb-6">Añade tu primera prenda para empezar a crear combinaciones.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Añadir prenda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {garments.map(g => (
              <GarmentCard key={g.id} garment={g} onEdit={() => setEditingGarment(g)} />
            ))}
          </div>
        )}
      </div>

      {(isAdding || editingGarment) && (
        <GarmentForm 
          initialGarment={editingGarment || undefined}
          onClose={() => {
            setIsAdding(false);
            setEditingGarment(null);
          }} 
        />
      )}
    </div>
  );
}

function GarmentCard({ garment, onEdit }: { garment: Garment, onEdit: () => void }) {
  const [imageUrl, setImageUrl] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(garment.photo);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [garment.photo]);

  const handleDelete = async () => {
    if (confirm('¿Eliminar esta prenda?')) {
      if (garment.id) {
        await db.garments.delete(garment.id);
        // Also remove from grid slots
        await db.gridSlots.where('garmentId').equals(garment.id).delete();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200 relative group flex flex-col transition-shadow">
      <div className="aspect-[3/4] bg-slate-100 relative">
        {imageUrl && (
          <img src={imageUrl} alt={garment.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 bg-white/80 backdrop-blur text-slate-700 rounded-full hover:bg-white"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-white/80 backdrop-blur text-red-600 rounded-full hover:bg-white"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-slate-900 truncate">{garment.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{CATEGORY_LABELS[garment.category]}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map(level => (
              <div
                key={level}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  level <= garment.formality ? "bg-slate-900" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GarmentForm({ onClose, initialGarment }: { onClose: () => void, initialGarment?: Garment }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [name, setName] = useState(initialGarment?.name || '');
  const [category, setCategory] = useState<Category>(initialGarment?.category || 'top');
  const [formality, setFormality] = useState<Formality>(initialGarment?.formality || 2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photo) {
      const url = URL.createObjectURL(photo);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (initialGarment) {
      const url = URL.createObjectURL(initialGarment.photo);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [photo, initialGarment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!photo && !initialGarment) return; // Require photo only for new

    try {
      setIsSubmitting(true);
      const garmentData: any = {
        name: name.trim(),
        category,
        formality,
        createdAt: initialGarment ? initialGarment.createdAt : Date.now()
      };
      
      if (photo) {
        garmentData.photo = await compressImage(photo);
      } else if (initialGarment) {
        garmentData.photo = initialGarment.photo;
      }

      if (initialGarment?.id) {
        await db.garments.update(initialGarment.id, garmentData);
      } else {
        await db.garments.add(garmentData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving garment', err);
      alert('Error al guardar la prenda. La imagen podría ser inválida.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      <header className="border-b border-gray-200 px-4 py-3 flex justify-between items-center shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-base font-medium">{initialGarment ? 'Editar prenda' : 'Nueva prenda'}</h2>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Foto (Obligatoria)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors",
              photoPreview ? "border-transparent bg-gray-100" : "border-gray-300 hover:border-gray-400 bg-gray-50"
            )}
          >
            {photoPreview ? (
              <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Tocar para subir</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setPhoto(e.target.files[0]);
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Nombre</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej. Camiseta básica blanca"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Categoría</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCategory(val)}
                className={cn(
                  "py-3 rounded-xl text-sm font-medium border transition-colors",
                  category === val
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Formalidad (1 a 3)</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setFormality(level as Formality)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium border transition-colors",
                  formality === level
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}
              >
                Nivel {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">1 = Casual, 2 = Smart Casual, 3 = Formal</p>
        </div>

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={!photo || !name.trim() || isSubmitting}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-medium disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar prenda'}
          </button>
        </div>
      </form>
    </div>
  );
}
