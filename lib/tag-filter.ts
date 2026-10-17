type TaggedElement = {
  id: string;
  title: string;
  category: string;
  tags: readonly string[];
};
export const normalizeTag = (tag: string) =>
  tag.trim().normalize("NFKC").toLocaleLowerCase("en");
export function filterTaggedElements<T extends TaggedElement>(
  items: readonly T[],
  {
    tag = "",
    query = "",
    category = "All elements",
    savedOnly = false,
    saved = [],
  }: {
    tag?: string;
    query?: string;
    category?: string;
    savedOnly?: boolean;
    saved?: readonly string[];
  },
) {
  const selected = normalizeTag(tag),
    search = query.trim().toLocaleLowerCase("en");
  return items.filter(
    (item) =>
      (category === "All elements" || item.category === category) &&
      (!savedOnly || saved.includes(item.id)) &&
      (!selected ||
        item.tags.some((value) => normalizeTag(value) === selected)) &&
      `${item.title} ${item.tags.join(" ")} ${item.category}`
        .toLocaleLowerCase("en")
        .includes(search),
  );
}
