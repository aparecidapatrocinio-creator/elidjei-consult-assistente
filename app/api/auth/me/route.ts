import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/crypto-auth";
import { getDb } from "@/db";

export async function GET() {
  try {
    const userSession = await getSessionUser();

    let dbConfigured = false;
    try {
      getDb();
      dbConfigured = true;
    } catch (_) {}

    return NextResponse.json({
      authenticated: !!userSession,
      user: userSession,
      dbConfigured,
    });
  } catch (error: any) {
    console.error("Auth status checking error:", error);
    return NextResponse.json({ authenticated: false, dbConfigured: false });
  }
}
