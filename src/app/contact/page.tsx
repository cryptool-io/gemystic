import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { SITE, breadcrumbJsonLd, moneyWhole } from '@/lib/seo';
import { allProducts } from '@/lib/catalog';
import { ContactForm } from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Talk to the cutters directly. Questions about a stone, custom cutting, wholesale parcels or a bespoke setting — email, WhatsApp or call our Peshawar workshop.',
  alternates: { canonical: '/contact' },
};

const REASONS = [
  {
    h: 'A question about a specific stone',
    p: 'Ask for extra photographs under different lighting, a video, or a second opinion on whether a stone suits what you have in mind. We would rather talk you out of the wrong stone than process a return.',
  },
  {
    h: 'Custom cutting',
    p: 'We cut to order from our own rough. Tell us the species, rough size and shape you want and we will quote before any stone is touched.',
  },
  {
    h: 'Bespoke setting',
    p: 'Our workshop fabricates in sterling silver and 21K brand. Send a reference image and the stone you have chosen and we will come back with a sketch and a price.',
  },
  {
    h: 'Wholesale and parcels',
    p: 'Designers and dealers buying by the parcel get sorted, matched-tone material and trade pricing. Tell us your volume and the tones you work in.',
  },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />

      <div className="wrap">
        <header className="max-w-2xl">
          <div className="label">Contact</div>
          <h1 className="mt-2 font-display text-4xl">Talk to the cutters</h1>
          <p className="mt-4 leading-relaxed text-muted">
            Not a call centre. Messages reach the workshop in Peshawar, and the people
            who answer are the people who cut the stones. We reply within one working
            day, usually sooner.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="card h-fit p-6">
            <dl className="space-y-5">
              <div>
                <dt className="label">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${SITE.email}`} className="text-brand hover:text-brand-dark">
                    {SITE.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="label">Phone &amp; WhatsApp</dt>
                <dd className="mt-1">
                  <a href={`tel:${SITE.phoneRaw}`} className="text-brand hover:text-brand-dark">
                    {SITE.phone}
                  </a>
                </dd>
                <dd className="mt-1 text-xs text-muted">
                  Pakistan Standard Time (UTC+5). We are five hours ahead of London and
                  ten ahead of New York.
                </dd>
              </div>
              <div>
                <dt className="label">Workshop</dt>
                <dd className="mt-1 text-muted">Peshawar, Khyber Pakhtunkhwa, Pakistan</dd>
              </div>
              <div>
                <dt className="label">Follow</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(SITE.social).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip capitalize hover:border-brand/60 hover:text-brand-dark"
                    >
                      {name}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>

            <a
              href={`mailto:${SITE.email}?subject=${encodeURIComponent('Enquiry from gemysticgems.com')}`}
              className="btn-primary mt-7 w-full"
            >
              Send an email
            </a>
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              {REASONS.map((r) => (
                <div key={r.h} className="card p-6">
                  <h2 className="font-display text-lg text-brand">{r.h}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{r.p}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <ContactForm fallbackEmail={SITE.email} />
            </div>

            <div className="card mt-6 p-6">
              <h2 className="font-display text-lg">Before you write</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The assistant at the bottom right answers most questions instantly and can
                search all {allProducts().length} stones in stock by colour, weight, budget
                or intended use. It is a faster route to an answer than email for anything
                about availability, gemmology or care.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Shipping is free worldwide over {moneyWhole(SITE.policy.freeShippingOver)},
                returns run {SITE.policy.returnDays} days, and every piece carries an
                international warranty. Full terms are on the{' '}
                <a href="/policies/shipping" className="text-brand hover:text-brand-dark">
                  shipping
                </a>{' '}
                and{' '}
                <a href="/policies/returns" className="text-brand hover:text-brand-dark">
                  returns
                </a>{' '}
                pages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
