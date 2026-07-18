export type Form = 'faceted' | 'cabochon' | 'specimen' | 'rough' | 'parcel' | 'ring' | 'pendant';
export type Category = 'loose-stones' | 'specimens' | 'rough' | 'parcels' | 'jewellery';

export interface Product {
  id: string;
  etsyId: string;
  etsyUrl: string;
  slug: string;
  title: string;
  originalTitle: string;
  description: string;
  species: string;
  variety: string | null;
  form: Form;
  formLabel: string;
  category: Category;
  cut: string | null;
  style: string | null;
  gender: string | null;
  color: string;
  caratWeight: number | null;
  gramWeight: number | null;
  dimensions: string | null;
  origin: string;
  treatment: string;
  certified: boolean;
  priceUsd: number;
  /**
   * The pre-discount price, when this listing is on sale. Set by an owner
   * discount in admin (or imported from the legacy shop's sale price); absent
   * on a full-price stone. Drives the strikethrough.
   */
  compareAtUsd?: number | null;
  image: string;
  imageLarge: string;
  stock: number;
  shipsFrom: 'PK' | 'TH';
  soldAt?: string | null;
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
}

export interface Species {
  name: string;
  family: string;
  formula: string;
  hardness: string;
  refractiveIndex: string;
  specificGravity: string;
  crystalSystem: string;
  colors: string[];
  birthstone: string[];
  zodiac: string[];
  anniversary: string;
  chakra: string;
  metaphysical: string;
  care: string;
  typicalTreatment: string;
  buyingNotes: string;
  priceDriver: string;
  faq: [string, string][];
}

export interface Catalog {
  generatedAt: string;
  source: string;
  count: number;
  currency: string;
  facets: Record<string, Record<string, number>>;
  products: Product[];
}
