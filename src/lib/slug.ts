/** Must stay in sync with public.slugify() in the database migration. */
export function slugify(value: string): string {
  const lowered = value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
  const from = "áàâãåéèêëíìîïóòôõúùûçñ";
  const to = "aaaaaeeeeiiiioooouuucn";
  let translated = "";
  for (const ch of lowered) {
    const i = from.indexOf(ch);
    translated += i === -1 ? ch : to[i];
  }
  return translated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
