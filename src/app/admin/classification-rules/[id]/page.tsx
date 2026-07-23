import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClassificationRule } from "@/lib/db/types";
import { ClassificationRuleForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("classification_rules")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <ClassificationRuleForm rule={data as ClassificationRule} />;
}
