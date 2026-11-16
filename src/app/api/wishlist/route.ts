import { NextResponse } from "next/server";
import { z } from "zod";

import { getWishlist } from "@/lib/wishlist";
import { claimGift, listClaims, unclaimGift } from "@/lib/wishlist/claims";

const claimerSchema = z.string().trim().regex(/^[a-zA-Z0-9-]{16,64}$/);

const postSchema = z.object({
  year: z.number().int(),
  giftId: z.string().trim().min(1).max(100),
  claimer: claimerSchema,
  action: z.enum(["claim", "unclaim"]),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const list = getWishlist(params.get("year") ?? "");
  if (!list) return NextResponse.json({ error: "Wishlist not found." }, { status: 404 });

  const claimer = claimerSchema.safeParse(params.get("claimer"));
  try {
    const claims = await listClaims(list.year, claimer.success ? claimer.data : undefined);
    return NextResponse.json(claims, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[wishlist] list failed", error);
    return NextResponse.json({ error: "Could not load claims." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { year, giftId, claimer, action } = parsed.data;
  const list = getWishlist(year);
  if (!list?.gifts.some((gift) => gift.id === giftId)) {
    return NextResponse.json({ error: "Gift not found." }, { status: 404 });
  }

  try {
    if (action === "claim") {
      const ok = await claimGift(year, giftId, claimer);
      if (!ok) return NextResponse.json({ error: "Someone already claimed this one." }, { status: 409 });
    } else {
      const ok = await unclaimGift(year, giftId, claimer);
      if (!ok) return NextResponse.json({ error: "Only the person who claimed it can undo that." }, { status: 403 });
    }
    return NextResponse.json(await listClaims(year, claimer));
  } catch (error) {
    console.error("[wishlist] update failed", error);
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  }
}
