import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Garment, type Category, type Formality } from '../db/database';
import { compressImage } from '../lib/imageUtils';
import { Plus, X, Upload, Trash2, Pencil, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import CameraCapture from '../components/CameraCapture';

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
  const [showMainCamera, setShowMainCamera] = useState(false);
  const [pendingBlobs, setPendingBlobs] = useState<Blob[]>([]);

  return (
    <div className="h-full flex flex-col relative bg-[#F8F7F5]">
      {showMainCamera && (
        <CameraCapture 
          onComplete={(blobs) => {
            setShowMainCamera(false);
            if (blobs.length > 0) {
              setPendingBlobs(blobs);
            }
          }}
          onCancel={() => setShowMainCamera(false)}
        />
      )}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white bg-opacity-80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Armario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMainCamera(true)}
            className="p-2 text-slate-900 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1.5"
            title="Cámara por voz"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="p-2 -mr-2 text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            title="Añadir manual"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {garments === undefined ? (
          <div className="text-center text-slate-500 mt-10">Cargando...</div>
        ) : garments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-medium text-slate-900 mb-2">Tu armario está vacío</h2>
            <p className="text-sm text-slate-500 mb-6">Usa la cámara por voz para añadir prendas rápidamente.</p>
            <button
              onClick={() => setShowMainCamera(true)}
              className="bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-md"
            >
              <Camera className="w-4 h-4" />
              Capturar por voz
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-4 text-slate-500 hover:text-slate-900 text-sm font-medium underline underline-offset-4"
            >
              Añadir manualmente
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

      {(isAdding || editingGarment || pendingBlobs.length > 0) && (
        <GarmentForm 
          initialGarment={editingGarment || undefined}
          initialBlobs={pendingBlobs}
          onClose={() => {
            setIsAdding(false);
            setEditingGarment(null);
            setPendingBlobs([]);
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

function GarmentForm({ onClose, initialGarment, initialBlobs = [] }: { onClose: () => void, initialGarment?: Garment, initialBlobs?: Blob[] }) {
  const [photo, setPhoto] = useState<File | Blob | null>(initialBlobs.length > 0 ? initialBlobs[0] : null);
  const [queue, setQueue] = useState<Blob[]>(initialBlobs.slice(1));
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [showCamera, setShowCamera] = useState(false);
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
    } else {
      setPhotoPreview(undefined);
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
      
      if (queue.length > 0) {
        setPhoto(queue[0]);
        setQueue(prev => prev.slice(1));
        setName('');
        setIsSubmitting(false);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error saving garment', err);
      alert('Error al guardar la prenda. La imagen podría ser inválida.');
      setIsSubmitting(false);
    }
  };

  const totalInBatch = initialBlobs.length;
  const currentInBatch = totalInBatch - queue.length;

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      {showCamera && (
        <CameraCapture 
          onComplete={(blobs) => {
            if (blobs.length > 0) {
              setPhoto(blobs[0]);
              setQueue(blobs.slice(1));
            }
            setShowCamera(false);
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}
      <header className="border-b border-gray-200 px-4 py-3 flex justify-between items-center shrink-0 bg-[#F8F7F5]">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-base font-medium">{initialGarment ? 'Editar prenda' : 'Nueva prenda'}</h2>
          {totalInBatch > 1 && (
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
              Foto {currentInBatch} de {totalInBatch}
            </span>
          )}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Foto {initialGarment ? '' : '(Obligatoria)'}</label>
          {photoPreview ? (
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 group">
              <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity">
                 <button type="button" onClick={() => setShowCamera(true)} className="p-4 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors shadow-lg"><Camera className="w-6 h-6" /></button>
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors shadow-lg"><Upload className="w-6 h-6" /></button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 flex flex-col items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
              >
                <Camera className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Cámara por voz</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70 mt-1">Di "Foto"</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 flex flex-col items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
              >
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Subir foto</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70 mt-1">Galería</span>
              </button>
            </div>
          )}
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
            {isSubmitting ? 'Guardando...' : queue.length > 0 ? 'Guardar y siguiente' : 'Guardar prenda'}
          </button>
        </div>
      </form>
    </div>
  );
}
