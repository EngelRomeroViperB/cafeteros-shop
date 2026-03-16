import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdminKey(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_media")
    .insert({
      product_id: body.product_id,
      url: body.url,
      media_type: body.media_type ?? "image",
      sort_order: body.sort_order ?? 0,
      is_primary: body.is_primary ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ media: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  // Unset all other primary flags for this product first
  if (body.is_primary) {
    await supabase
      .from("product_media")
      .update({ is_primary: false })
      .eq("product_id", body.product_id);
  }

  const { data, error } = await supabase
    .from("product_media")
    .update({ is_primary: body.is_primary })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ media: data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("product_media").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
