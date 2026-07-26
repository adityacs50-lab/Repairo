import { NextResponse } from "next/server";
import { listVendors } from "@/lib/catalog/vendors";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ vendors: listVendors() });
}
