-- CreateTable
CREATE TABLE "listing_overrides" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "price_usd" DECIMAL(12,2),
    "treatment" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "etsy_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "listed_on_etsy" BOOLEAN NOT NULL DEFAULT false,
    "etsy_listing_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listing_overrides_slug_key" ON "listing_overrides"("slug");

-- CreateIndex
CREATE INDEX "listing_overrides_status_idx" ON "listing_overrides"("status");

