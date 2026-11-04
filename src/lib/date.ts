// បម្លែង Date → "YYYY-MM-DD" តាមម៉ោងក្នុងម៉ាស៊ីន (មិនមែន UTC)
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;