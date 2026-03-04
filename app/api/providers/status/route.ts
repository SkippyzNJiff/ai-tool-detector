import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/providers";

export const runtime = "nodejs";

export async function GET() {
  const statuses = await getProviderStatuses();
  return NextResponse.json({ providers: statuses });
}
