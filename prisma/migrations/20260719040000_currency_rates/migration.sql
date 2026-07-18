-- CreateTable
CREATE TABLE "currency_rates" (
    "code" CHAR(3) NOT NULL,
    "label" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rate" DECIMAL(14,6) NOT NULL,
    "locale" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("code")
);

