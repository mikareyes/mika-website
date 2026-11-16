import type { Metadata } from "next";

// Wishlists are shared by link with friends and family, not meant for search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WishlistLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
