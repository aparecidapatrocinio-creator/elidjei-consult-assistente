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
    
    // Friendly error parsing to guide the user on database setup
    const msg = String(error?.message || "").toLowerCase();
    let friendlyMessage = error?.message || "Ocorreu um erro interno ao realizar login.";
    
    if (msg.includes("users") && (msg.includes("does not exist") || msg.includes("não existe") || msg.includes("relation"))) {
      friendlyMessage = "A tabela 'users' ainda não existe no seu banco de dados Supabase.\n\n" +
        "Para corrigir, por favor abra o SQL Editor no painel do Supabase e execute a seguinte query SQL:\n\n" +
        "-------------------------------------\n" +
        "CREATE TABLE \"users\" (\n" +
        "  \"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n" +
        "  \"email\" text NOT NULL UNIQUE,\n" +
        "  \"password_hash\" text NOT NULL,\n" +
        "  \"salt\" text NOT NULL,\n" +
        "  \"created_at\" timestamp DEFAULT now() NOT NULL\n" +
        ");\n\n" +
        "ALTER TABLE \"sessions\" ADD COLUMN \"user_id\" uuid;\n" +
        "ALTER TABLE \"sessions\" ADD CONSTRAINT \"sessions_user_id_users_id_fk\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE cascade;\n" +
        "-------------------------------------";
    } else if (msg.includes("password authentication failed") || msg.includes("autenticação falhou")) {
      friendlyMessage = "Sua DATABASE_URL está configurada com a senha de banco de dados incorreta. Certifique-se de preencher a senha real do seu projeto do Supabase nos Segredos (Secrets) do seu app.";
    } else if (msg.includes("enotfound") || msg.includes("econnrefused")) {
      friendlyMessage = "Não foi possível conectar ao servidor do seu banco de dados. Verifique se o seu Host no Supabase está ativo ou se a DATABASE_URL nos Segredos está correta.";
    }

    return NextResponse.json(
      { error: friendlyMessage },
      { status: 500 }
    );
  }
}
