import type { Metadata } from "next";
import { notFound } from "next/navigation";

import WishlistExperience from "@/components/wishlist/WishlistExperience";
import { WISHLISTS, getWishlist } from "@/lib/wishlist";

export const dynamicParams = false;

export function generateStaticParams() {
  return WISHLISTS.map((list) => ({ year: String(list.year) }));
}

export async function generateMetadata(
  props: PageProps<"/wishlist/[year]">,
): Promise<Metadata> {
  const { year } = await props.params;
  return {
    title: `Mika's Wishlist ${year}`,
    description:
      "Pick a gift, buy it, then mark it as claimed so nobody buys the same thing.",
  };
}

export default async function WishlistPage(props: PageProps<"/wishlist/[year]">) {
  const { year } = await props.params;
  const list = getWishlist(year);
  if (!list) notFound();
  return <WishlistExperience list={list} />;
}
