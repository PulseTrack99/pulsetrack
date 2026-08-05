import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// POST — Enable public sharing (generates a share ID)
// DELETE — Disable public sharing (removes the share ID)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id, public_share_id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // If already has a share ID, return it
    if (site.public_share_id) {
      return NextResponse.json({ share_id: site.public_share_id });
    }

    // Generate a unique short share ID
    const shareId = randomBytes(6).toString("base64url");

    const { error } = await supabase
      .from("sites")
      .update({ public_share_id: shareId })
      .eq("id", siteId);

    if (error) {
      console.error("Enable share error:", error);
      return NextResponse.json(
        { error: "Failed to enable sharing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ share_id: shareId });
  } catch (err) {
    console.error("Share enable error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("sites")
      .update({ public_share_id: null })
      .eq("id", siteId);

    if (error) {
      console.error("Disable share error:", error);
      return NextResponse.json(
        { error: "Failed to disable sharing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Share disable error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
