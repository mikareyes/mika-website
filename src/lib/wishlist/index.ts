import { WISHLIST_2026 } from "./2026";
import type { Wishlist } from "./types";

/** Every published year. Add next year's file here. */
export const WISHLISTS: Wishlist[] = [WISHLIST_2026];

export function getWishlist(year: number | string): Wishlist | undefined {
  return WISHLISTS.find((list) => String(list.year) === String(year));
}

export type { Wishlist, WishlistGift, WishlistGround, WishlistLink } from "./types";
