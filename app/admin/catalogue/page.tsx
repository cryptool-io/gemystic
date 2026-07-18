import { redirect } from 'next/navigation';

/** Renamed to Listings (owner request). Old links and bookmarks keep working. */
export default function AdminCatalogueRedirect() {
  redirect('/admin/listings');
}
