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
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ media: data }, { status: 201 });
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
