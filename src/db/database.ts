import Dexie, { type Table } from 'dexie';

export type Category = 'top' | 'bottom' | 'outerwear' | 'footwear';
export type Formality = 1 | 2 | 3;

export interface Garment {
  id?: number;
  name: string;
  category: Category;
  formality: Formality;
  colorHex?: string;
  photo: Blob; // Compressed JPEG
  createdAt: number;
}

export interface GridSlot {
  id?: number;
  categoryId: Category;
  garmentId: number;
  slotIndex: number; // 0 to 3
}

export interface OutfitMeta {
  key: string; // "topId-bottomId-outerwearId-footwearId"
  favorite: boolean;
  wornDates: string[]; // ISO Dates "YYYY-MM-DD"
}

export class SudokPrendasDB extends Dexie {
  garments!: Table<Garment>;
  gridSlots!: Table<GridSlot>;
  outfitMeta!: Table<OutfitMeta>;

  constructor() {
    super('SudokPrendasDB');
    this.version(1).stores({
      garments: '++id, category, formality, createdAt',
      gridSlots: '++id, [categoryId+slotIndex], categoryId, garmentId',
      outfitMeta: 'key, favorite'
    });
  }
}

export const db = new SudokPrendasDB();
