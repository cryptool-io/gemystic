import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { SITE, faqJsonLd, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Customer Help',
  description:
    'Answers on ordering, shipping, customs, returns and payment for natural gemstones from Gemystic Gems. Delivery in 1 to 7 days, 30-day money-back guarantee.',
  alternates: { canonical: '/help' },
};

/**
 * Customer help centre, mirroring the sections on the current
 * gemysticgems.com/customer-help page. Several answers there were literally
 * marked "To be answered"; this page answers them from our actual policies so
 * no question a customer clicks is left blank.
 */
const SECTIONS: { title: string; faqs: [string, string][] }[] = [
  {
    title: 'Orders and shipping',
    faqs: [
      [
        'How long does delivery take?',
        'Orders are dispatched within 1 to 3 working days and typically arrive within 1 to 7 days depending on destination (excluding Sundays and public holidays). Every parcel is tracked and insured, and you receive the tracking number the moment it ships.',
      ],
      [
        'Where do you ship from?',
        'Most stones ship from our workshop in Peshawar, Pakistan. Some pieces ship from Thailand; each listing states its dispatch origin. We ship worldwide either way.',
      ],
      [
        'Do I pay sales tax or customs charges?',
        'We charge no sales tax. Loose gemstones enter the United States duty-free with no import VAT. EU and UK buyers pay import VAT at their national rate, collected by the courier before delivery. We always declare parcels at their true value.',
      ],
      [
        'Can I change my shipping address after ordering?',
        'Yes, if the order has not been dispatched. Contact us immediately via WhatsApp or email with your order number and the corrected address. Once a parcel is with the courier the address cannot be changed.',
      ],
      [
        'Do I need an account to order?',
        'No. You can order as a guest. An account lets you track orders, save stones and check out faster.',
      ],
    ],
  },
  {
    title: 'Returns and exchanges',
    faqs: [
      [
        'What is your return policy?',
        'A 30-day money-back guarantee on every stone and piece of jewellery: return it unworn, unset and in its original packaging within 30 days of delivery for a full refund of the item price. Custom-cut stones and bespoke settings are excluded unless faulty.',
      ],
      [
        'What if my item arrives damaged?',
        'Photograph the parcel and the item before anything else, then contact us within 48 hours. Every shipment is insured for its full value, so a damaged arrival is refunded in full or replaced where a comparable stone exists. You will not be out of pocket.',
      ],
      [
        'I received the wrong item. What do I do?',
        'Contact support immediately with your order number and a photo. We pay return shipping both ways and send the correct item, or refund you in full, your choice.',
      ],
      [
        'What address do I return items to?',
        'Contact us first and we confirm the correct return address for your region along with a reference number. Do not ship a return unannounced; unannounced parcels can be refused by customs.',
      ],
      [
        'Can I cancel or change my order after placing it?',
        'Yes, at no cost any time before dispatch. After dispatch, the 30-day return window applies instead.',
      ],
    ],
  },
  {
    title: 'Payment',
    faqs: [
      [
        'Which payment methods do you accept?',
        'Visa, Mastercard, Maestro and Discover cards plus PayPal once online checkout opens. Today orders are confirmed through WhatsApp or email with secure payment by card link or PayPal invoice.',
      ],
      [
        'Which currencies can I pay in?',
        'Prices display in US dollars, euros or Pakistani rupees, switch any time from the currency selector in the header. Payment is settled in USD; your bank converts at its own rate.',
      ],
      [
        'Is my payment information safe?',
        'We never see or store card numbers. Payment is processed by the card network or PayPal over an encrypted connection, and our platform holds only the order details.',
      ],
    ],
  },
  {
    title: 'The stones',
    faqs: [
      [
        'Are your gemstones natural?',
        'Yes, every stone is natural and most are cut in our own workshop from rough we sourced ourselves. Treatment is disclosed in plain words on every listing: heated, oiled, glass-filled or untreated.',
      ],
      [
        'Can I request a video of a stone before buying?',
        'Absolutely, and for higher-value stones we encourage it. Message us with the listing name and we will send a video under daylight so you can judge the colour honestly.',
      ],
      [
        'Are certificates available?',
        'Stones marked certified ship with their laboratory report (GUILD, GRS or similar). For uncertified stones we can arrange certification before dispatch at cost; ask before ordering.',
      ],
    ],
  },
];

export default function HelpPage() {
  const allFaqs = SECTIONS.flatMap((s) => s.faqs);

  return (
    <>
      <JsonLd data={faqJsonLd(allFaqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Customer help', path: '/help' },
        ])}
      />

      <div className="wrap max-w-3xl">
        <header>
          <div className="label">Help centre</div>
          <h1 className="mt-2 font-display text-4xl">How can we help?</h1>
          <p className="mt-3 leading-relaxed text-muted">
            Answers to the questions we hear most. Not covered here? A real person answers
            on WhatsApp within the working day.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={SITE.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary">
              WhatsApp us
            </a>
            <Link href="/contact" className="btn-ghost">Contact form</Link>
          </div>
        </header>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 font-display text-2xl text-brand-deep">{section.title}</h2>
              <div className="space-y-3">
                {section.faqs.map(([q, a]) => (
                  <details key={q} className="card p-5">
                    <summary className="cursor-pointer font-medium text-fg marker:content-['']">
                      {q}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="card mt-12 bg-brand-tint p-6 text-center">
          <h2 className="font-display text-lg text-brand-deep">Still stuck?</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Email {SITE.email} or call {SITE.phone}. We reply within one working day.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <Link href="/policies/shipping" className="chip hover:border-brand-ring">Shipping policy</Link>
            <Link href="/policies/returns" className="chip hover:border-brand-ring">Returns policy</Link>
            <Link href="/policies/privacy" className="chip hover:border-brand-ring">Privacy</Link>
            <Link href="/policies/terms" className="chip hover:border-brand-ring">Terms</Link>
          </div>
        </div>
      </div>
    </>
  );
}
