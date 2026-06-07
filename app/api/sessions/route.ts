import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    let db;
    try {
      db = getDb();
    } catch (e) {
      return NextResponse.json({ sessions: [], dbConfigured: false });
    }

    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(30);

    return NextResponse.json({ sessions: allSessions, dbConfigured: true });
  } catch (error: any) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred fetching historical sessions." },
      { status: 500 }
    );
  }
}
