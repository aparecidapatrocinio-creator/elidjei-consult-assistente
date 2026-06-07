import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, encryptToken } from "@/lib/crypto-auth";
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve conter ao menos 6 caracteres." },
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

    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Este endereço de e-mail já está cadastrado." },
        { status: 409 }
      );
    }

    // Hash password & register
    const { hash, salt } = hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash: hash,
        salt: salt,
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    // Create secure auth token context
    const token = encryptToken({ userId: newUser.id, email: newUser.email });

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
      user: { id: newUser.id, email: newUser.email },
      dbConfigured: true,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Ocorreu um erro interno durante o cadastro." },
      { status: 500 }
    );
  }
}
