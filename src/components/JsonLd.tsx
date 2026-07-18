/**
 * Renders a structured-data block. Next inlines this into the server-rendered
 * HTML, which is what crawlers and answer engines actually parse.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
