import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, encryptToken } from "@/lib/crypto-auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Por favor, preencha o e-mail e a senha." },
        { status: 400 }
      );
    }

    let db;
    try {
      db = getDb();
    } catch (e: any) {
      return NextResponse.json(
        { error: "O banco de dados não está configurado ainda. Insira DATABASE_URL nos segredos." },
        { status: 500 }
      );
    }

    // Attempt retrieval
    const matchedUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (matchedUsers.length === 0) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    const verifiedUser = matchedUsers[0];
    const passwordMatchResult = verifyPassword(password, verifiedUser.passwordHash, verifiedUser.salt);

    if (!passwordMatchResult) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    // Seal secure session
    const token = encryptToken({ userId: verifiedUser.id, email: verifiedUser.email });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("gem_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: { id: verifiedUser.id, email: verifiedUser.email },
      dbConfigured: true,
    });
  } catch (error: any) {
    console.error("Login verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Ocorreu um erro interno ao realizar login." },
      { status: 500 }
    );
  }
}
