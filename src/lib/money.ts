export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;