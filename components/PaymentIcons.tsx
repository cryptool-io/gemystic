/**
 * Accepted-payment brand marks, drawn as compact inline SVGs (no external
 * requests, crisp at any DPI). Simplified marks in each brand's colours: the
 * standard checkout-footer treatment.
 */
function Badge({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="flex h-7 w-11 items-center justify-center rounded-sm border border-line bg-white"
    >
      {children}
    </span>
  );
}

export function PaymentIcons() {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {/* Visa */}
      <Badge label="Visa">
        <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true">
          <text x="0" y="10" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" fontStyle="italic" fill="#1A1F71">
            VISA
          </text>
        </svg>
      </Badge>

      {/* Mastercard */}
      <Badge label="Mastercard">
        <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
          <circle cx="11" cy="9" r="8" fill="#EB001B" />
          <circle cx="19" cy="9" r="8" fill="#F79E1B" fillOpacity="0.92" />
          <path d="M15 2.7a8 8 0 010 12.6 8 8 0 010-12.6z" fill="#FF5F00" />
        </svg>
      </Badge>

      {/* Maestro */}
      <Badge label="Maestro">
        <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
          <circle cx="11" cy="9" r="8" fill="#0099DF" />
          <circle cx="19" cy="9" r="8" fill="#ED0006" fillOpacity="0.92" />
          <path d="M15 2.7a8 8 0 010 12.6 8 8 0 010-12.6z" fill="#6C6BBD" />
        </svg>
      </Badge>

      {/* PayPal */}
      <Badge label="PayPal">
        <svg width="38" height="12" viewBox="0 0 38 12" aria-hidden="true">
          <text x="0" y="10" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="800" fontStyle="italic">
            <tspan fill="#003087">Pay</tspan>
            <tspan fill="#009CDE">Pal</tspan>
          </text>
        </svg>
      </Badge>

      {/* Discover */}
      <Badge label="Discover">
        <svg width="40" height="14" viewBox="0 0 40 14" aria-hidden="true">
          <text x="0" y="10" fontFamily="Arial, sans-serif" fontSize="7.5" fontWeight="800" fill="#231F20">
            DISC
          </text>
          <circle cx="21.5" cy="7" r="3.6" fill="#F76B1C" />
          <text x="26" y="10" fontFamily="Arial, sans-serif" fontSize="7.5" fontWeight="800" fill="#231F20">
            VER
          </text>
        </svg>
      </Badge>
    </span>
  );
}
