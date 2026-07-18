-- CreateTable
CREATE TABLE "category_overrides" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "position" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "form_mapping" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_overrides_slug_key" ON "category_overrides"("slug");

