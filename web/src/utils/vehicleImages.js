export function slugifyModel(modelName) {
  if (!modelName) return null;
  return String(modelName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildVehicleImageUrl(modelName, apiBaseURL) {
  const slug = slugifyModel(modelName);
  if (!slug || !apiBaseURL) return null;
  const origin = new URL(apiBaseURL, typeof window !== "undefined" ? window.location.origin : undefined).origin;
  return `${origin}/images/${slug}.webp`;
}
