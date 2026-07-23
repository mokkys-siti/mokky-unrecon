-- 0017_classification_rule_key.sql
-- Adds a stable machine key to classification_rules. The rule OUTCOMES
-- (classification, fault_owner, outlet_visible, auto_close), priority, and
-- is_active stay editable config; rule_key binds each row to its condition
-- handler in code (conditions aren't a DSL, so matching logic lives in code
-- while what-to-do-on-match stays in the DB).

alter table public.classification_rules add column if not exists rule_key text;

update public.classification_rules set rule_key = case name
  when 'Grab auto-routing GF to GP' then 'GRAB_GF_TO_GP'
  when 'Within tolerance rounding'  then 'WITHIN_TOLERANCE'
  when 'Over tolerance, same tender' then 'OVER_TOLERANCE'
  when 'Tender mismatch'            then 'TENDER_MISMATCH'
  when 'No counterparty found'      then 'NO_COUNTERPARTY'
  else rule_key
end
where rule_key is null;

create unique index if not exists classification_rules_rule_key_uniq
  on public.classification_rules (rule_key)
  where rule_key is not null;

comment on column public.classification_rules.rule_key is
  'Stable key binding a rule to its code condition handler (outcomes stay in DB).';
