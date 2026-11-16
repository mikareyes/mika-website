import "server-only";

import { neon } from "@neondatabase/serverless";

// One row per claimed gift. `claimer` is a random id the visitor's browser
// keeps in localStorage, so only the person who claimed a gift can undo it.
// Nobody signs in; this is a courtesy system between friends, not a lock.

let tableReady: Promise<void> | undefined;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  const sql = neon(databaseUrl);

  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS wishlist_claims (
      year INTEGER NOT NULL,
      gift_id TEXT NOT NULL,
      claimer TEXT NOT NULL,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (year, gift_id)
    )
  `.then(() => undefined).catch((error) => {
    tableReady = undefined;
    throw error;
  });

  return { sql, ready: tableReady };
}

export async function listClaims(year: number, claimer?: string) {
  const { sql, ready } = getSql();
  await ready;
  const rows = (await sql`
    SELECT gift_id, claimer FROM wishlist_claims WHERE year = ${year}
  `) as { gift_id: string; claimer: string }[];
  return {
    claimed: rows.map((row) => row.gift_id),
    mine: claimer ? rows.filter((row) => row.claimer === claimer).map((row) => row.gift_id) : [],
  };
}

/** False when someone else got there first. */
export async function claimGift(year: number, giftId: string, claimer: string) {
  const { sql, ready } = getSql();
  await ready;
  const rows = await sql`
    INSERT INTO wishlist_claims (year, gift_id, claimer)
    VALUES (${year}, ${giftId}, ${claimer})
    ON CONFLICT (year, gift_id) DO NOTHING
    RETURNING gift_id
  `;
  return rows.length > 0;
}

/** Only the browser that claimed a gift can release it. */
export async function unclaimGift(year: number, giftId: string, claimer: string) {
  const { sql, ready } = getSql();
  await ready;
  const rows = await sql`
    DELETE FROM wishlist_claims
    WHERE year = ${year} AND gift_id = ${giftId} AND claimer = ${claimer}
    RETURNING gift_id
  `;
  return rows.length > 0;
}
