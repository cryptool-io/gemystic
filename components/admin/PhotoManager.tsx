'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PhotoRow {
  id: string;
  url: string;
  isPrimary: boolean;
}

/**
 * Photographs for one stone, stored on our own server.
 *
 * Drive folders were how the team tracked photos before; they are no longer the
 * source. A folder shared from someone's account can lose its permissions or be
 * reorganised, and the shop's pictures go with it. These upload straight into
 * our storage, so the only thing that can take them away is us.
 */
export function PhotoManager({
  productId,
  photos,
  driveFolder,
}: {
  productId: string;
  photos: PhotoRow[];
  driveFolder?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setBusy(true);
    setError(null);
    setNotes([]);

    const body = new FormData();
    body.append('productId', productId);
    for (const f of list) body.append('files', f);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok || (data.error && !data.saved?.length)) {
        setError(data.error ?? 'Upload failed.');
      } else {
        if (data.rejected?.length) setNotes(data.rejected);
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function act(imageId: string, action: 'delete' | 'make-primary') {
    setBusy(true);
    try {
      await fetch('/api/admin/upload', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageId, action }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg">Photographs ({photos.length})</h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-ghost text-xs disabled:opacity-40"
        >
          {busy ? 'Uploading…' : 'Choose files'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => e.target.files && upload(e.target.files)}
        className="sr-only"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`mt-4 rounded-lg border-2 border-dashed p-6 text-center text-sm transition ${
          dragging ? 'border-brand bg-brand-tint' : 'border-line text-muted'
        }`}
      >
        Drop photographs here, or use Choose files.
        <span className="mt-1 block text-xs text-subtle">
          JPEG, PNG, WebP or AVIF, up to 15 MB each. The first one becomes the main image.
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}
      {notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-accent-dark">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-2">
                <Image src={p.url} alt="" fill sizes="120px" className="object-cover" />
              </span>
              {p.isPrimary && (
                <span className="absolute left-1 top-1 chip-brand text-[10px]">Main</span>
              )}
              <div className="mt-1 flex justify-between gap-1 text-[10px]">
                {!p.isPrimary && (
                  <button
                    onClick={() => act(p.id, 'make-primary')}
                    disabled={busy}
                    className="text-muted hover:text-brand disabled:opacity-40"
                  >
                    Make main
                  </button>
                )}
                <button
                  onClick={() => act(p.id, 'delete')}
                  disabled={busy}
                  className="ml-auto text-muted hover:text-accent-dark disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {driveFolder && (
        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
          This stone still has a Drive folder recorded from the old sheet.
          {' '}
          <a href={driveFolder} target="_blank" rel="noreferrer" className="text-brand hover:text-brand-dark">
            Open it
          </a>{' '}
          and upload the photographs here; Drive is no longer where the shop reads them from.
        </p>
      )}
    </div>
  );
}
