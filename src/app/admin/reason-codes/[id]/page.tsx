import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReasonCode } from "@/lib/db/types";
import { ReasonCodeForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditReasonCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("reason_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <ReasonCodeForm reason={data as ReasonCode} />;
}
