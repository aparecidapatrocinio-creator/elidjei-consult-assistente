import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("gem_auth_token");

    return NextResponse.json({
      success: true,
      message: "Logout efetuado com sucesso.",
    });
  } catch (error: any) {
    console.error("Logout process error:", error);
    return NextResponse.json(
      { error: "Erro interno durante o logout." },
      { status: 500 }
    );
  }
}
