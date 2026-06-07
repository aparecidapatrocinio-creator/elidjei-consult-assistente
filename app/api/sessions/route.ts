import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/crypto-auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ sessions: [], dbConfigured: true, error: "Usuário não autenticado." });
    }

    let db;
    try {
      db = getDb();
    } catch (e) {
      return NextResponse.json({ sessions: [], dbConfigured: false });
    }

    try {
      const allSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, user.userId))
        .orderBy(desc(sessions.createdAt))
        .limit(30);

      return NextResponse.json({ sessions: allSessions, dbConfigured: true });
    } catch (queryError: any) {
      console.warn("Database query failed (possibly schema not initialized or invalid credentials):", queryError);
      return NextResponse.json({ sessions: [], dbConfigured: false, error: queryError?.message });
    }
  } catch (error: any) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ sessions: [], dbConfigured: false, error: error?.message });
  }
}
