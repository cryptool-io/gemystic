'use client';

import { useEffect, useState } from 'react';

interface Address {
  id: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  phone: string;
}

const KEY = 'gemystic:addresses';

/**
 * Address book, localStorage-backed until the `addresses` table lands. The form
 * fields mirror that table exactly so the swap is a persistence change only.
 */
export function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try {
      setAddresses(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      setAddresses([]);
    }
  }, []);

  function persist(next: Address[]) {
    setAddresses(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const addr: Address = {
      id: crypto.randomUUID(),
      label: String(f.get('label') || 'Home'),
      fullName: String(f.get('fullName') || ''),
      line1: String(f.get('line1') || ''),
      line2: String(f.get('line2') || ''),
      city: String(f.get('city') || ''),
      region: String(f.get('region') || ''),
      postcode: String(f.get('postcode') || ''),
      country: String(f.get('country') || ''),
      phone: String(f.get('phone') || ''),
    };
    persist([...addresses, addr]);
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !adding && (
        <div className="card p-8 text-center">
          <p className="font-display text-lg">No addresses saved</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Add a delivery address to speed up checkout.
          </p>
        </div>
      )}

      {addresses.map((a) => (
        <div key={a.id} className="card flex items-start justify-between gap-4 p-5">
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-fg">{a.label}</span>
            </div>
            <div className="mt-1 leading-relaxed text-muted">
              {a.fullName}<br />
              {a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />
              {a.city}{a.region ? `, ${a.region}` : ''} {a.postcode}<br />
              {a.country}{a.phone ? <><br />{a.phone}</> : null}
            </div>
          </div>
          <button
            onClick={() => persist(addresses.filter((x) => x.id !== a.id))}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Remove
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={onSubmit} className="card p-5 sm:p-6">
          <h2 className="font-display text-lg">New address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="label" label="Label" placeholder="Home / Studio" />
            <Field name="fullName" label="Full name" required />
            <Field name="line1" label="Address line 1" required wide />
            <Field name="line2" label="Address line 2" wide />
            <Field name="city" label="City" required />
            <Field name="region" label="State / region" />
            <Field name="postcode" label="Postcode" />
            <Field name="country" label="Country" required />
            <Field name="phone" label="Phone (for the courier)" wide />
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" className="btn-primary">Save address</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost">
          + Add address
        </button>
      )}
    </div>
  );
}

function Field({
  name, label, placeholder, required = false, wide = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`addr-${name}`} className="label mb-1.5 block">{label}</label>
      <input
        id={`addr-${name}`}
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete={name === 'fullName' ? 'name' : name === 'phone' ? 'tel' : undefined}
        className="field"
      />
    </div>
  );
}
