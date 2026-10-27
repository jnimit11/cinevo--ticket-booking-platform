export function formatTicketPrice(priceInPaise) {
  if (!Number.isFinite(priceInPaise) || priceInPaise < 0) return "";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(priceInPaise / 100);
}
