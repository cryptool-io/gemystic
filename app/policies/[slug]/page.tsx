import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { SITE, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';

type Params = Promise<{ slug: string }>;

interface Policy {
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: { h: string; p: string[] }[];
  faq?: [string, string][];
}

/**
 * Policy copy is written to be genuinely informative rather than defensive, * international gemstone buyers have real questions about customs, insurance and
 * what happens when a stone looks different in person. These pages answer them.
 */
const POLICIES: Record<string, Policy> = {
  shipping: {
    title: 'Shipping & Delivery',
    metaTitle: 'Shipping & Delivery. Worldwide Gemstone Shipping',
    metaDescription:
      'Free worldwide shipping over $500, fully tracked and insured from Peshawar. Delivery times, customs duties and import VAT explained by destination.',
    intro:
      'Every parcel leaves our workshop in Peshawar tracked and insured for its full value. We ship worldwide and have sent stones to more than twenty countries without a loss.',
    sections: [
      {
        h: 'Cost and free shipping',
        p: [
          `Shipping is free worldwide on orders over ${SITE.policy.freeShippingOver} US dollars. Below that, a flat insured rate is calculated at checkout based on destination, typically $18 to $32.`,
          'Loose stones ship in sealed gem jars inside a padded box. Jewellery ships in a presentation box. Mineral specimens are packed individually in foam, since a bruised termination destroys most of a specimen\'s value.',
        ],
      },
      {
        h: 'Dispatch and delivery times',
        p: [
          'Orders are dispatched within one to three working days. Custom cutting and bespoke settings take longer and are quoted individually before work starts.',
          'Transit is typically five to twelve working days depending on destination and customs. You receive a tracking number as soon as the parcel is handed over.',
        ],
      },
      {
        h: 'Customs, duty and import VAT',
        p: [
          'Prices exclude destination taxes. What you owe on arrival depends entirely on where you are, and we would rather you knew before ordering than be surprised by the courier.',
          'United States: loose unmounted gemstones enter duty-free under HTS heading 7103, and there is no federal import VAT. Most US buyers pay nothing on arrival.',
          'European Union: gemstones are duty-free, but import VAT applies at your national rate, commonly 19 to 25 percent, and the courier will collect it before delivery.',
          'United Kingdom: duty-free under the UK Global Tariff, with import VAT at 20 percent above the consignment threshold.',
          'Elsewhere: duty and tax vary. We declare every parcel accurately at its true value. We will not under-declare a shipment or mark an order as a gift, it is customs fraud, it voids the insurance, and it leaves you unprotected if the parcel goes missing.',
        ],
      },
    ],
    faq: [
      [
        'Do you ship worldwide?',
        'Yes, tracked and insured, with free shipping on orders over $500. A small number of destinations are excluded where couriers will not insure gemstones; if yours is one, we will tell you before taking payment.',
      ],
      [
        'Will I have to pay customs charges?',
        'It depends on your country. Loose gemstones enter the United States duty-free with no import VAT. EU and UK buyers pay import VAT at their national rate, collected by the courier. We declare every parcel at its true value.',
      ],
      [
        'Is my parcel insured?',
        'Yes, every shipment is insured for its full value at no extra cost. If a parcel is lost or damaged in transit, you are refunded in full or the piece is replaced where possible, though with one-of-a-kind stones, replacement usually is not.',
      ],
    ],
  },

  returns: {
    title: 'Refunds & Returns',
    metaTitle: 'Refunds & Returns, 30-Day Gemstone Return Policy',
    metaDescription:
      '30-day returns on all gemstones and jewellery. How to return, what is excluded, and what we do if a stone does not match its description.',
    intro:
      'Buying a gemstone from a photograph asks for trust. The return policy exists so that trust is not a gamble: if the stone is not what you expected, send it back.',
    sections: [
      {
        h: 'The 30-day window',
        p: [
          `You may return any stone or piece within ${SITE.policy.returnDays} days of delivery for a full refund of the item price, provided it comes back unworn, unset and in its original packaging.`,
          'Tell us before you ship it back so we can watch for the parcel. Return postage is the buyer\'s responsibility unless the stone was misdescribed, in which case we cover it both ways.',
          'Refunds are issued to the original payment method within five working days of the stone arriving and being checked.',
        ],
      },
      {
        h: 'If a stone was misdescribed',
        p: [
          'If a stone differs materially from its listing, wrong weight, undisclosed treatment, a fracture not shown in the photographs, that is our error, not a change of mind. We pay return shipping both ways and refund in full, or replace the stone if you would rather.',
          'Colour is the one genuine grey area. Every stone is photographed under daylight-balanced light without retouching, but gems shift under warm indoor lighting, and screens vary. A stone that looks different under your kitchen bulb has not been misdescribed. If you are unsure, ask for a video before ordering.',
        ],
      },
      {
        h: 'What is excluded',
        p: [
          'Custom-cut stones and bespoke settings are made to your specification and cannot be returned unless faulty.',
          'Stones that have been set, re-cut, polished or otherwise altered cannot be returned, because we can no longer sell them as what they were.',
          'Wholesale parcels are sold as sorted lots and are final sale. We are happy to send detailed photographs of any parcel before purchase.',
        ],
      },
    ],
    faq: [
      [
        'How long do I have to return a gemstone?',
        '30 days from delivery, unworn, unset and in original packaging. Contact us first so we can expect the parcel.',
      ],
      [
        'Who pays return shipping?',
        'The buyer, for a change of mind. We pay both ways if the stone was misdescribed, wrong weight, undisclosed treatment, or damage not shown in the listing photographs.',
      ],
      [
        'What if the colour looks different than the photos?',
        'Ask for a video before you order if colour is critical. Stones are photographed under daylight-balanced light without retouching, but coloured gems genuinely shift under warm indoor lighting and screens are not calibrated. You can still return within 30 days either way.',
      ],
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    metaTitle: 'Privacy Policy',
    metaDescription:
      'What data Gemystic Gems collects, why, how long it is kept, and your rights under GDPR. Plain language, no boilerplate.',
    intro:
      'The short version: we collect what is needed to send you a gemstone and answer your questions, and nothing else. We do not sell data.',
    sections: [
      {
        h: 'What we collect',
        p: [
          'To fulfil an order: your name, delivery address, email and phone number. Payment card details go directly to our payment processor and never reach our servers.',
          'If you contact us: whatever you choose to put in the message, kept so we can follow up on your enquiry.',
          'If you use the on-site assistant: the text of your questions, used to answer them and to see which questions come up often enough to answer properly on the site.',
        ],
      },
      {
        h: 'How long we keep it',
        p: [
          'Order records are kept for seven years, as tax law requires. Enquiry correspondence is kept for two years. Assistant conversations are kept for ninety days.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'If you are in the EU or UK, you may request a copy of your data, ask for corrections, ask for deletion, or object to processing. Email us and we will action it within thirty days.',
          `Requests go to ${SITE.email}.`,
        ],
      },
    ],
  },

  terms: {
    title: 'Terms & Conditions',
    metaTitle: 'Terms & Conditions',
    metaDescription:
      'Terms of sale for Gemystic Gems: pricing, availability, treatment disclosure, certification and governing law.',
    intro:
      'These terms govern purchases from Gemystic Gems. They are written to be read, not to be impenetrable.',
    sections: [
      {
        h: 'Stock and uniqueness',
        p: [
          'Every listing is a single physical stone with a stock quantity of one. When it sells, the listing is removed. There is no equivalent second stone, and we will not substitute one without asking you first.',
          'Occasionally a stone sells in the workshop or at a trade show at the same time as an online order. If that happens we refund immediately and in full.',
        ],
      },
      {
        h: 'Treatment disclosure',
        p: [
          'We disclose treatment on every listing. Emeralds are typically oiled, rubies and sapphires are typically heated, blue topaz is irradiated, and garnet, peridot and spinel are generally untreated. Where a stone is glass-filled or otherwise materially altered, we say so explicitly.',
          'Where a listing says a stone is unheated or untreated, that reflects either laboratory certification or our direct knowledge of the stone from rough to finish.',
        ],
      },
      {
        h: 'Certification',
        p: [
          'Stones marked as certified carry a report from a recognised laboratory such as GUILD, GRS or SSEF, and the report travels with the stone.',
          'Uncertified stones are described from our own assessment. We are experienced, but an in-house opinion is not a laboratory report. If certification matters to you, ask before purchase and we will arrange it at cost.',
        ],
      },
      {
        h: 'Pricing and value',
        p: [
          'Prices are in US dollars and exclude destination duty and taxes.',
          'We make no claim that any stone will hold or increase in value. Gemstones are bought to be enjoyed and worn. Anyone telling you a coloured stone is an investment is selling you something.',
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) return {};
  return {
    title: policy.metaTitle,
    description: policy.metaDescription,
    alternates: { canonical: `/policies/${slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: policy.title, path: `/policies/${slug}` },
        ])}
      />
      {policy.faq && <JsonLd data={faqJsonLd(policy.faq)} />}

      <article className="wrap max-w-3xl">
        <div className="label">Policy</div>
        <h1 className="mt-2 font-display text-4xl">{policy.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{policy.intro}</p>

        <div className="mt-12 space-y-10">
          {policy.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-2xl text-brand">{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-3 leading-relaxed text-muted">{para}</p>
              ))}
            </section>
          ))}
        </div>

        {policy.faq && (
          <section className="mt-14">
            <h2 className="mb-5 font-display text-2xl">Common questions</h2>
            <div className="space-y-3">
              {policy.faq.map(([q, a]) => (
                <details key={q} className="card p-5" open>
                  <summary className="cursor-pointer font-display text-base marker:content-['']">
                    {q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <nav className="mt-14 flex flex-wrap gap-2 border-t border-line pt-6">
          {Object.entries(POLICIES)
            .filter(([k]) => k !== slug)
            .map(([k, v]) => (
              <Link key={k} href={`/policies/${k}`} className="chip hover:border-brand/60 hover:text-brand-dark">
                {v.title}
              </Link>
            ))}
          <Link href="/contact" className="chip hover:border-brand/60 hover:text-brand-dark">
            Contact us
          </Link>
        </nav>
      </article>
    </>
  );
}
