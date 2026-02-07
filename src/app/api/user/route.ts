import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth";

function buildLegacyContent(profile: any | null): string {
  if (!profile) return "";
  const riskTolerance = profile.risk_tolerance || profile.riskTolerance || "Medium";
  const age = profile.age ?? "";
  const location = profile.location ?? "";
  const debtProfile = profile.debt_profile ?? "";
  const incomeStatus = profile.income_status ?? "";
  const customRequest = profile.custom_request ?? "";

  // Keep the legacy `- **Risk Tolerance**: ...` line for budgetStore parsing.
  return [
    `- **Age**: ${age}`,
    `- **Location**: ${location}`,
    `- **Risk Tolerance**: ${riskTolerance}`,
    `- **Debt Profile**: ${debtProfile}`,
    `- **Income Status**: ${incomeStatus}`,
    `- **Custom Request**: ${customRequest}`,
  ].join("\n");
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      // Keep old behavior (no hard auth requirement) so callers can safely probe.
      return NextResponse.json({ profile: null, content: "" });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("uuid_user_id, age, location, risk_tolerance, debt_profile, income_status, custom_request, allocation, onboarding_complete, created_at, updated_at")
      .eq("uuid_user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json({ profile: null, content: "" }, { status: 500 });
    }

    return NextResponse.json({
      profile,
      content: buildLegacyContent(profile),
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json({ profile: null, content: "" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as any;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const record = {
      uuid_user_id: userId,
      age: body.age ? Number(body.age) : null,
      location: body.location ?? null,
      risk_tolerance: body.riskTolerance ?? body.risk_tolerance ?? null,
      debt_profile: body.debtProfile ?? body.debt_profile ?? null,
      income_status: body.incomeStatus ?? body.income_status ?? null,
      custom_request: body.customRequest ?? body.custom_request ?? null,
      allocation: body.allocation ?? null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(record, { onConflict: "uuid_user_id" })
      .select("uuid_user_id, age, location, risk_tolerance, debt_profile, income_status, custom_request, allocation, onboarding_complete, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error saving user profile:", error);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: saved,
      content: buildLegacyContent(saved),
    });
  } catch (error) {
    console.error("Error handling user data:", error);
    return NextResponse.json({ error: "Failed to handle data" }, { status: 500 });
  }
}
