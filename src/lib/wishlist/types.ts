/**
 * One wishlist per year lives at /wishlist/<year>. Each year is a single data
 * file in this folder (see `2026.ts`), registered in `index.ts`. To start next
 * year's list, copy the file, swap the gifts, and add it to `WISHLISTS`.
 */

/** Accent ground behind a gift on its detail page. Never red: the buy button is. */
export type WishlistGround = "yellow" | "aqua" | "green";

export type WishlistLink = {
  /** Button label, e.g. "Buy at Lady M". */
  label: string;
  url: string;
};

export type WishlistGift = {
  /** Kebab-case, stable forever: claims are stored against it. */
  id: string;
  /** Full name on the detail page. */
  name: string;
  /** Shown as written. Free text so "Any amount" works. */
  price: string;
  /** Mika's note. `[label](https://…)` becomes a link. */
  blurb: string;
  links: WishlistLink[];
  /**
   * Path under /public, e.g. `/wishlist/2026/<id>.svg`. Transparent
   * background, object only, cropped tight: the pile needs cut-outs, and
   * empty space around the object makes gifts float apart.
   */
  image: string;
  ground: WishlistGround;
  /** Something to do rather than own: adds an invite to come along. */
  experience?: boolean;
};

export type Wishlist = {
  year: number;
  /** Shown in the top bar. */
  hint: string;
  gifts: WishlistGift[];
};
