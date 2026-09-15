import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passwordIssue, isWeakPasswordError } from "@/lib/password-policy";

// PUT — Change password
export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await req.json();

    const issue = typeof password === "string" ? passwordIssue(password) : "length";
    if (issue) {
      return NextResponse.json(
        {
          error:
            issue === "length"
              ? "Le mot de passe doit contenir au moins 10 caractères"
              : "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (isWeakPasswordError(error)) {
      // Refusé par Supabase malgré la vérification ci-dessus : la règle
      // du tableau de bord a changé sans ce fichier.
      return NextResponse.json(
        { error: "Ce mot de passe est trop faible, choisissez-en un autre" },
        { status: 400 }
      );
    }
    if (error) {
      console.error("Password update error:", error);
      return NextResponse.json(
        { error: "Impossible de modifier le mot de passe" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Password change error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
