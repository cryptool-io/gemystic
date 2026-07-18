-- Gemystic platform schema — initial migration
--
-- Postgres 15+. Runs identically on a local container and on RDS, which is the
-- point: nothing here depends on a managed-service feature.
--
-- Conventions (see docs/CODE-STANDARDS.md):
--   * snake_case for tables and columns, plural table names
--   * every table has id / created_at / updated_at
--   * money is NUMERIC(12,2), never float — binary floats cannot represent 0.10
--   * timestamps are TIMESTAMPTZ, always stored UTC
--   * soft delete via archived_at where history matters; hard delete elsewhere
--   * enums as CHECK constraints rather than PG ENUM types, because adding a
--     value to a PG enum is a migration but changing a CHECK is a one-liner

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy product search

-- Keeps updated_at honest without relying on the application to remember.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- Identity
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE,
  email_verified_at TIMESTAMPTZ,
  password_hash   TEXT,                     -- NULL for OAuth-only accounts
  full_name       TEXT,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer', 'staff', 'admin', 'owner')),
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX users_role_idx ON users (role) WHERE archived_at IS NULL;

-- Server-side sessions. Chosen over stateless JWTs so that "log this device out"
-- and "revoke all sessions after a password change" are actually possible.
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,        -- store the hash, never the token
  ip           INET,
  user_agent   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT,
  full_name    TEXT NOT NULL,
  line1        TEXT NOT NULL,
  line2        TEXT,
  city         TEXT NOT NULL,
  region       TEXT,
  postcode     TEXT,
  country_code CHAR(2) NOT NULL,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Taxonomy — admin-managed, arbitrary depth
-- ─────────────────────────────────────────────────────────────────────────────

-- Self-referencing so the shop owner can add a category or a stone type from the
-- admin portal without a deploy. Depth is not fixed: today it is
-- "Faceted Gemstones > Emerald", tomorrow it can be three levels deep.
CREATE TABLE categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID REFERENCES categories(id) ON DELETE RESTRICT,
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  image_url      TEXT,
  position       INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,

  -- Per-category SEO, editable in the admin SEO section
  seo_title       TEXT,
  seo_description TEXT,
  seo_keywords    TEXT[],

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Slug must be unique among siblings, not globally: both
  -- "faceted-gemstones/emerald" and "rough-gemstones/emerald" are valid.
  CONSTRAINT categories_sibling_slug_uniq UNIQUE (parent_id, slug),
  CONSTRAINT categories_no_self_parent CHECK (id <> parent_id)
);
CREATE INDEX categories_parent_idx ON categories (parent_id, position);

-- Gemmological reference data (hardness, RI, care, birthstone…). Kept separate
-- from categories because the same species appears under several categories.
CREATE TABLE species (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  family            TEXT,
  chemical_formula  TEXT,
  hardness          TEXT,
  refractive_index  TEXT,
  specific_gravity  TEXT,
  crystal_system    TEXT,
  birthstone_months TEXT[],
  zodiac            TEXT[],
  chakra            TEXT,
  anniversary       TEXT,
  metaphysical      TEXT,
  care              TEXT,
  typical_treatment TEXT,
  buying_notes      TEXT,
  price_driver      TEXT,
  faq               JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Catalogue — Etsy field parity plus gemstone specifics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                TEXT UNIQUE,
  slug               TEXT NOT NULL UNIQUE,
  category_id        UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  species_id         UUID REFERENCES species(id) ON DELETE SET NULL,

  -- ── Etsy core ──
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  price              NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price   NUMERIC(12,2) CHECK (compare_at_price >= 0),  -- "was" price
  currency           CHAR(3) NOT NULL DEFAULT 'USD',
  quantity           INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  tags               TEXT[] NOT NULL DEFAULT '{}',   -- Etsy caps at 13
  materials          TEXT[] NOT NULL DEFAULT '{}',   -- Etsy caps at 13
  section            TEXT,                            -- Etsy "shop section"

  -- Etsy's three mandatory listing qualifiers
  who_made           TEXT CHECK (who_made IN ('i_did', 'collective', 'someone_else')),
  when_made          TEXT,       -- e.g. 'made_to_order', '2020_2025'
  is_supply          BOOLEAN NOT NULL DEFAULT FALSE,

  listing_type       TEXT NOT NULL DEFAULT 'physical'
                     CHECK (listing_type IN ('physical', 'digital')),
  auto_renew         BOOLEAN NOT NULL DEFAULT TRUE,

  -- Personalisation
  personalisable          BOOLEAN NOT NULL DEFAULT FALSE,
  personalisation_prompt  TEXT,
  personalisation_required BOOLEAN NOT NULL DEFAULT FALSE,
  personalisation_max_len  INTEGER,

  -- Physical dimensions, needed for shipping quotes and customs paperwork
  weight_grams       NUMERIC(10,3),
  length_mm          NUMERIC(10,2),
  width_mm           NUMERIC(10,2),
  height_mm          NUMERIC(10,2),

  -- ── Gemstone specifics ──
  carat_weight       NUMERIC(10,3),
  cut                TEXT,
  colour             TEXT,
  clarity            TEXT,
  origin_country     TEXT,
  origin_region      TEXT,
  treatment          TEXT NOT NULL DEFAULT 'Not disclosed',
  certified          BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_lab    TEXT,
  certificate_number TEXT,
  certificate_url    TEXT,
  dimensions_text    TEXT,        -- human-readable "10.8 x 9.7 mm"

  -- ── Fulfilment origin: this business ships from two countries ──
  ships_from         TEXT NOT NULL DEFAULT 'PK' CHECK (ships_from IN ('PK', 'TH')),
  hs_code            TEXT NOT NULL DEFAULT '7103',  -- customs classification
  processing_days_min INTEGER NOT NULL DEFAULT 1,
  processing_days_max INTEGER NOT NULL DEFAULT 3,

  -- ── SEO ──
  seo_title          TEXT,
  seo_description    TEXT,
  seo_keywords       TEXT[],
  canonical_url      TEXT,
  noindex            BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Lifecycle ──
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'sold', 'archived')),
  published_at       TIMESTAMPTZ,
  sold_at            TIMESTAMPTZ,
  archived_at        TIMESTAMPTZ,

  -- Provenance: which import created this, so a bad sheet sync can be undone
  source             TEXT NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('manual', 'sheet', 'etsy', 'ai')),
  source_ref         TEXT,        -- sheet row id / etsy listing id
  ai_generated       BOOLEAN NOT NULL DEFAULT FALSE,
  ai_reviewed_at     TIMESTAMPTZ, -- NULL = AI draft a human has not approved

  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX products_category_idx ON products (category_id) WHERE status = 'active';
CREATE INDEX products_species_idx  ON products (species_id)  WHERE status = 'active';
CREATE INDEX products_status_idx   ON products (status, published_at DESC);
CREATE INDEX products_price_idx    ON products (price) WHERE status = 'active';
-- Trigram index powers fuzzy title search without a separate search service.
CREATE INDEX products_title_trgm_idx ON products USING GIN (title gin_trgm_ops);
CREATE INDEX products_tags_idx ON products USING GIN (tags);

CREATE TABLE product_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  alt          TEXT,                       -- required for accessibility and SEO
  position     INTEGER NOT NULL DEFAULT 0, -- Etsy allows 10 per listing
  width        INTEGER,
  height       INTEGER,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX product_images_product_idx ON product_images (product_id, position);
-- At most one primary image per product.
CREATE UNIQUE INDEX product_images_one_primary
  ON product_images (product_id) WHERE is_primary;

CREATE TABLE product_videos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  poster_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Variations (ring size, chain length…). Loose stones are one-of-one and simply
-- have no rows here.
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- 'Ring size'
  value       TEXT NOT NULL,           -- 'M'
  sku         TEXT,
  price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, name, value)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       TEXT NOT NULL UNIQUE,   -- human-facing, e.g. GEM-2026-0001
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email        CITEXT,                 -- checkout without an account

  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','processing','shipped',
                                       'delivered','cancelled','refunded')),

  currency           CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal           NUMERIC(12,2) NOT NULL,
  shipping_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total        NUMERIC(12,2) NOT NULL,

  -- Addresses are COPIED, not referenced: if a customer edits their address in
  -- 2027 the 2026 invoice must still show where the parcel actually went.
  shipping_address   JSONB NOT NULL,
  billing_address    JSONB,

  customer_note      TEXT,
  internal_note      TEXT,

  placed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at            TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_has_contact CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);
CREATE INDEX orders_user_idx ON orders (user_id, placed_at DESC);
CREATE INDEX orders_status_idx ON orders (status, placed_at DESC);

CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id     UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Snapshot of what was sold. A one-of-a-kind stone gets archived after sale,
  -- so the order must not depend on the product row still being readable.
  title_snapshot TEXT NOT NULL,
  sku_snapshot   TEXT,
  image_snapshot TEXT,
  specs_snapshot JSONB,          -- carat, cut, treatment, certificate at time of sale

  unit_price     NUMERIC(12,2) NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total     NUMERIC(12,2) NOT NULL,
  personalisation TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider          TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'manual')),
  provider_ref      TEXT,          -- payment_intent id / paypal capture id
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','authorised','captured','failed',
                                      'refunded','partially_refunded')),
  amount            NUMERIC(12,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  fee               NUMERIC(12,2),      -- processor fee, feeds the finance module
  net               NUMERIC(12,2),
  error_message     TEXT,
  raw_response      JSONB,              -- keep the provider payload for disputes
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency: a retried webhook must not create a second payment row.
  CONSTRAINT payments_provider_ref_uniq UNIQUE (provider, provider_ref)
);
CREATE INDEX payments_order_idx ON payments (order_id);

CREATE TABLE refunds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount       NUMERIC(12,2) NOT NULL,
  reason       TEXT,
  provider_ref TEXT,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Shipping and export documentation (Pakistan and Thailand → worldwide)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ships_from        TEXT NOT NULL CHECK (ships_from IN ('PK', 'TH')),
  carrier           TEXT,            -- DHL, FedEx, EMS
  service_level     TEXT,
  tracking_number   TEXT,
  tracking_url      TEXT,

  status            TEXT NOT NULL DEFAULT 'preparing'
                    CHECK (status IN ('preparing','docs_pending','ready',
                                      'dispatched','in_transit','customs',
                                      'delivered','exception','returned')),

  weight_grams      NUMERIC(10,3),
  declared_value    NUMERIC(12,2),   -- must be the true value; see policy docs
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  insured           BOOLEAN NOT NULL DEFAULT TRUE,

  dispatched_at     TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX shipments_order_idx ON shipments (order_id);
CREATE INDEX shipments_status_idx ON shipments (status);

-- Export paperwork. Gemstones out of Pakistan and Thailand need a commercial
-- invoice and packing list at minimum; some destinations want a certificate of
-- origin, and Thai exports of certain goods need additional permits.
CREATE TABLE shipment_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL CHECK (doc_type IN (
                  'commercial_invoice','packing_list','certificate_of_origin',
                  'export_permit','gem_certificate','airway_bill','customs_declaration',
                  'insurance_certificate','other')),
  reference     TEXT,
  file_url      TEXT,
  issued_at     DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX shipment_documents_shipment_idx ON shipment_documents (shipment_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Operations: notifications, imports, audit
-- ─────────────────────────────────────────────────────────────────────────────

-- Every outbound email, so "did the customer get the invoice?" is answerable.
CREATE TABLE email_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template      TEXT NOT NULL,       -- order_confirmation, shipping_notice…
  to_address    CITEXT NOT NULL,
  subject       TEXT NOT NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  driver        TEXT NOT NULL,       -- file | smtp | ses
  provider_ref  TEXT,
  status        TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','sent','failed','bounced','complained')),
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX email_log_order_idx ON email_log (order_id);
CREATE INDEX email_log_status_idx ON email_log (status, created_at DESC);

-- Which team members get told about what.
CREATE TABLE notification_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event      TEXT NOT NULL CHECK (event IN (
               'order_placed','payment_failed','order_shipped','low_stock',
               'contact_enquiry','sheet_import_failed','refund_issued')),
  channel    TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event)
);

-- Google Sheet ingestion. Each run is recorded so a bad import is traceable and
-- reversible rather than silently corrupting the catalogue.
CREATE TABLE import_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source         TEXT NOT NULL DEFAULT 'google_sheet',
  sheet_id       TEXT,
  sheet_range    TEXT,
  status         TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','completed','failed','partial')),
  rows_total     INTEGER NOT NULL DEFAULT 0,
  rows_created   INTEGER NOT NULL DEFAULT 0,
  rows_updated   INTEGER NOT NULL DEFAULT 0,
  rows_skipped   INTEGER NOT NULL DEFAULT 0,
  rows_failed    INTEGER NOT NULL DEFAULT 0,
  errors         JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ
);

CREATE TABLE import_rows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  row_number    INTEGER NOT NULL,
  raw           JSONB NOT NULL,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  action        TEXT CHECK (action IN ('created','updated','skipped','failed')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX import_rows_run_idx ON import_rows (run_id);

-- Who changed what. Needed the first time an order total is disputed.
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,          -- product.updated, order.refunded
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  before      JSONB,
  after       JSONB,
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics and attribution
-- ─────────────────────────────────────────────────────────────────────────────

-- First-party analytics. Kept in our own database rather than sent to a third
-- party, which sidesteps consent-banner complexity and ad-blocker gaps, and
-- means attribution survives even when GA is blocked.
CREATE TABLE visitor_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id         TEXT NOT NULL,      -- first-party cookie, not personal data
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Attribution captured on first touch and held for the session
  referrer        TEXT,
  referrer_host   TEXT,
  landing_path    TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_term        TEXT,
  utm_content     TEXT,
  channel         TEXT,               -- organic | direct | social | ai | paid | referral
  country_code    CHAR(2),
  device_type     TEXT CHECK (device_type IN ('mobile','tablet','desktop','bot')),
  user_agent      TEXT,

  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_views      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX visitor_sessions_anon_idx ON visitor_sessions (anon_id);
CREATE INDEX visitor_sessions_channel_idx ON visitor_sessions (channel, started_at DESC);

CREATE TABLE page_views (
  id            BIGSERIAL PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX page_views_session_idx ON page_views (session_id);
CREATE INDEX page_views_product_idx ON page_views (product_id, viewed_at DESC);
CREATE INDEX page_views_path_idx ON page_views (path, viewed_at DESC);

-- Ties revenue back to the session that produced it — the whole point of the
-- analytics section: "where do buyers, not just visitors, come from".
CREATE TABLE order_attribution (
  order_id        UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES visitor_sessions(id) ON DELETE SET NULL,
  first_touch_channel TEXT,
  first_touch_source  TEXT,
  last_touch_channel  TEXT,
  last_touch_source   TEXT,
  touch_count     INTEGER NOT NULL DEFAULT 1,
  days_to_convert NUMERIC(6,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Editable global SEO settings, surfaced in the admin SEO section.
CREATE TABLE seo_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   TEXT NOT NULL UNIQUE,
  to_path     TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  hits        BIGINT NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','addresses','categories','species','products','orders',
    'payments','shipments'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

COMMIT;
