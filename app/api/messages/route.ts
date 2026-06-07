import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages, sessions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/crypto-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId parameter is required" }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ messages: [], dbConfigured: true, error: "Usuário não autenticado." });
    }

    let db;
    try {
      db = getDb();
    } catch (e) {
      return NextResponse.json({ messages: [], dbConfigured: false });
    }

    try {
      // Check session ownership
      const sessionData = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (sessionData.length > 0 && sessionData[0].userId && sessionData[0].userId !== user.userId) {
        return NextResponse.json({ messages: [], dbConfigured: true, error: "Acesso negado a este histórico." }, { status: 403 });
      }

      const sessionMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(asc(messages.createdAt));

      // Map to camelCase format expected by the frontend
      const mappedMessages = sessionMessages.map((msg) => ({
        id: msg.id,
        sessionId: msg.sessionId,
        role: msg.role as "user" | "tutor",
        text: msg.text,
        translation: msg.translation || undefined,
        correction: msg.correction || undefined,
        audioBase64: msg.audioBase64 || undefined,
        isSpoken: msg.isSpoken || undefined,
        createdAt: msg.createdAt,
      }));

      return NextResponse.json({ messages: mappedMessages, dbConfigured: true });
    } catch (queryError: any) {
      console.warn("Database query failed (messages table not initialized or credentials incorrect):", queryError);
      return NextResponse.json({ messages: [], dbConfigured: false, error: queryError?.message });
    }
  } catch (error: any) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json({ messages: [], dbConfigured: false, error: error?.message });
  }
}
