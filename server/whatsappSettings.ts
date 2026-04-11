import { db } from "./db";
import { whatsappSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function getWhatsappSettings(arenaId: string) {
  const result = await db
    .select()
    .from(whatsappSettings)
    .where(eq(whatsappSettings.arenaId, arenaId))
    .limit(1);

  return result[0] || null;
}

export async function saveWhatsappSettings(data: {
  arenaId: string;
  whatsapp_number?: string;
  default_message?: string;
}) {
  const existing = await getWhatsappSettings(data.arenaId);

  if (existing) {
    await db
      .update(whatsappSettings)
      .set({
        whatsapp_number: data.whatsapp_number,
        default_message: data.default_message,
      })
      .where(eq(whatsappSettings.arenaId, data.arenaId));

    return getWhatsappSettings(data.arenaId);
  }

  const inserted = await db
    .insert(whatsappSettings)
    .values(data)
    .returning();

  return inserted[0];
}