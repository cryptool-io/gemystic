import { AutoListing } from '@/components/AutoListing';
import { allSpecies } from '@/lib/catalog';

export default function ListingsPage() {
  return (
    <AutoListing species={allSpecies().map(([key, s]) => ({ key, name: s.name }))} />
  );
}
