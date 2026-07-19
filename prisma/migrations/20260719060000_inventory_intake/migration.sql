-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cost_price" DECIMAL(12,2),
ADD COLUMN     "diameter_mm" DECIMAL(10,2),
ADD COLUMN     "intake_notes" TEXT,
ADD COLUMN     "intake_status" TEXT NOT NULL DEFAULT 'pending_images',
ADD COLUMN     "media_folder" TEXT,
ADD COLUMN     "price_unit" TEXT,
ADD COLUMN     "shape" TEXT,
ADD COLUMN     "stone_type" TEXT NOT NULL DEFAULT 'cut',
ADD COLUMN     "unit_price" DECIMAL(12,2),
ADD COLUMN     "weight_from_g" DECIMAL(10,3),
ADD COLUMN     "weight_to_g" DECIMAL(10,3);

-- CreateTable
CREATE TABLE "product_channels" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_listed',
    "listing_id" TEXT,
    "listing_url" TEXT,
    "listed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_channels_channel_status_idx" ON "product_channels"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_channels_product_id_channel_key" ON "product_channels"("product_id", "channel");

-- AddForeignKey
ALTER TABLE "product_channels" ADD CONSTRAINT "product_channels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

