import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId parameter is required" }, { status: 400 });
    }

    let db;
    try {
      db = getDb();
    } catch (e) {
      return NextResponse.json({ messages: [], dbConfigured: false });
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
  } catch (error: any) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred fetching session messages." },
      { status: 500 }
    );
  }
}
