export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const riel = (n: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)} ៛`;