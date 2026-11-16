# Wishlist

`/wishlist/<year>`: gifts rain onto a giant title. Visitors tap one, buy it from
the shop, then mark it as claimed so nobody doubles up. Not indexed (shared by link).

| What | Where |
|---|---|
| The gifts for a year | `src/lib/wishlist/<year>.ts` |
| Which years exist | `WISHLISTS` in `src/lib/wishlist/index.ts` |
| Illustrations | `public/wishlist/<year>/<gift id>.svg` |
| Claims (shared by all visitors) | Neon table `wishlist_claims`, created on first request |
| Page + physics | `src/components/wishlist/WishlistExperience.tsx` |

## Start next year's list

1. Copy `src/lib/wishlist/2026.ts` to `2027.ts`, rename the export, swap the gifts.
2. Add it to `WISHLISTS` in `index.ts`.
3. Put the illustrations in `public/wishlist/2027/`.

Gift `id`s are what claims are saved against. Don't rename one after you share the link.
A gift can have several buy links (Candlelight has one per concert).

## Illustrations

Hand-built SVGs in the Specimen house style
(`company-brain/content/illustration/README.md`): one thin even black outline,
flat fill plus one darker shade tone, white glints, palette colours only. Each
object carries an illustrated version of the brand's name (a flag pick, a
plaque, a badge) so it reads at a glance.

Rules for a new one:

- **Transparent background, object only.** The detail page adds the coloured,
  dotted ground; the pile needs a cut-out.
- **Crop the `viewBox` tight to the object.** The physics hit box is the image's
  rectangle, so empty margins make gifts float apart in the pile.
- Brand names are drawn as text in system fonts (SVGs shown in `<img>` can't load
  the site's fonts). Don't paste in official logo files.
- A PNG from ChatGPT works too: same rules, then point `image` at it.
