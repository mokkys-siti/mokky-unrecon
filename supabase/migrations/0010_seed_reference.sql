-- 0010_seed_reference.sql
-- Idempotent reference/config seed. Lives in a migration (not seed.sql) so it
-- deploys to the hosted DB via `db push`. Migrations run once, so later admin
-- edits through the UI are NOT overwritten on redeploy. `on conflict do update`
-- only matters if this migration is re-run against the same data (local reset).

-- ---------------------------------------------------------------------------
-- Entities (6)
-- ---------------------------------------------------------------------------
insert into public.entities (name) values
  ('MOKKY BUKIT JELUTONG SDN. BHD.'),
  ('MOKKY SETAPAK SDN. BHD.'),
  ('PIZZA PASTRY PEOPLE SDN. BHD.'),
  ('MOKKY BUKIT KIARA SDN. BHD.'),
  ('MOKKY ZENDERS GLO SDN. BHD.'),
  ('MOKKY ARA DAMANSARA SDN. BHD.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Outlets (10; 06 is closed and intentionally not seeded)
-- ---------------------------------------------------------------------------
insert into public.outlets (code, zeoniq_name, brand, entity_id, status) values
  ('OBJ', '01-Bukit Jelutong', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY BUKIT JELUTONG SDN. BHD.'), 'active'),
  ('OBT', '02-Bukit Tunku', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY BUKIT JELUTONG SDN. BHD.'), 'active'),
  ('OSP', '03-Subang', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY BUKIT JELUTONG SDN. BHD.'), 'active'),
  ('OST', '04-Setapak', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY SETAPAK SDN. BHD.'), 'active'),
  ('OIP', '05-IOI Putrajaya', 'Mokky''s',
     (select id from public.entities where name = 'PIZZA PASTRY PEOPLE SDN. BHD.'), 'active'),
  ('OBK', '07-KLGCC', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY BUKIT KIARA SDN. BHD.'), 'active'),
  ('OGD', '08-Glo Damansara', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY ZENDERS GLO SDN. BHD.'), 'active'),
  ('OPT', '09-Bukit Bintang', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY ARA DAMANSARA SDN. BHD.'), 'active'),
  ('OEB', '10-Seksyen 14', 'Mokky''s',
     (select id from public.entities where name = 'MOKKY BUKIT KIARA SDN. BHD.'), 'active'),
  ('ZGD', 'ZEN01-Zenders - Glo Damansara', 'Zenders',
     (select id from public.entities where name = 'MOKKY ZENDERS GLO SDN. BHD.'), 'active')
on conflict (code) do update set
  zeoniq_name = excluded.zeoniq_name,
  brand       = excluded.brand,
  entity_id   = excluded.entity_id,
  status      = excluded.status;

-- ---------------------------------------------------------------------------
-- Payment gateways (8; all default tolerance -0.05 / +0.05)
-- ---------------------------------------------------------------------------
insert into public.payment_gateways (code, name, sort_order) values
  ('MBBQR',      'Maybank QR PayBiz', 1),
  ('MMP',        'Maybank card',      2),
  ('ODR_GKASH',  'Odaring/GKash',     3),
  ('GRABPAY',    'GrabPay',           4),
  ('GRABFOOD',   'GrabFood',          5),
  ('FOODPANDA',  'FoodPanda',         6),
  ('SHOPEEFOOD', 'ShopeeFood',        7),
  ('REVMONSTER', 'Revenue Monster',   8)
on conflict (code) do update set
  name = excluded.name, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Reason codes (28). requires_evidence on refunds/cancel/void/chargeback/voucher.
-- FD button scoped to OGD + ZGD only.
-- ---------------------------------------------------------------------------
insert into public.reason_codes
  (code, label, group_name, requires_evidence, applies_to_outlets, sort_order) values
  -- Outlet recording error
  ('OE_WRONG_TENDER',       'Wrong tender selected',              'Outlet recording error', false, null, 1),
  ('OE_BILL_NOT_CLOSED',    'Bill not closed in POS',             'Outlet recording error', false, null, 2),
  ('OE_DUPLICATE_BILL',     'Duplicate bill',                     'Outlet recording error', false, null, 3),
  ('OE_WRONG_AMOUNT',       'Wrong amount keyed',                 'Outlet recording error', false, null, 4),
  ('OE_NOT_RUNG_UP',        'Sale not rung up',                   'Outlet recording error', false, null, 5),
  -- Split / partial
  ('SP_QR_MULTIPLE',        'Customer paid QR more than once',    'Split / partial',        false, null, 6),
  ('SP_ONE_BILL_MANY_PAY',  'One bill, several payments',         'Split / partial',        false, null, 7),
  ('SP_ONE_PAY_MANY_BILL',  'One payment, several bills',         'Split / partial',        false, null, 8),
  ('SP_PARTIAL',            'Partial payment received',           'Split / partial',        false, null, 9),
  -- Price adjustment
  ('PA_VOUCHER',            'Voucher redeemed',                   'Price adjustment',       true,  null, 10),
  ('PA_DISCOUNT',           'Discount or promo',                  'Price adjustment',       false, null, 11),
  ('PA_STAFF_MEAL',         'Staff meal / complimentary',         'Price adjustment',       false, null, 12),
  ('PA_PRICE_OVERRIDE',     'Price override',                     'Price adjustment',       false, null, 13),
  -- Reversal
  ('RV_FULL_REFUND',        'Full refund',                        'Reversal',               true,  null, 14),
  ('RV_PARTIAL_REFUND',     'Partial refund',                     'Reversal',               true,  null, 15),
  ('RV_ORDER_CANCELLED',    'Order cancelled',                    'Reversal',               true,  null, 16),
  ('RV_BILL_VOIDED',        'Bill voided',                        'Reversal',               true,  null, 17),
  ('RV_CHARGEBACK',         'Chargeback',                         'Reversal',               true,  null, 18),
  -- Timing
  ('TM_LATER_PERIOD',       'Settled in a later period',          'Timing',                 false, null, 19),
  ('TM_PRIOR_PERIOD',       'Prior period adjustment',            'Timing',                 false, null, 20),
  -- Gateway / system
  ('GS_GRAB_AUTOROUTE',     'Grab auto-routing (GF to GP)',       'Gateway / system',       false, null, 21),
  ('GS_MERCHANT_DEDUCTION', 'Merchant deduction / eater compensation', 'Gateway / system',  false, null, 22),
  ('GS_TERMINAL_OFFLINE',   'Terminal offline / manual key-in',   'Gateway / system',       false, null, 23),
  ('GS_PENDING_SETTLEMENT', 'Pending settlement',                 'Gateway / system',       false, null, 24),
  ('GS_FD_BUTTON',          'FD button',                          'Gateway / system',       false, array['OGD','ZGD'], 25),
  ('GS_CASH_VIA_GRAB',      'Cash order via Grab',                'Gateway / system',       false, null, 26),
  -- Other
  ('OT_ROUNDING',           'Rounding',                           'Other',                  false, null, 27),
  ('OT_UNKNOWN',            'Unknown, needs finance help',        'Other',                  false, null, 28)
on conflict (code) do update set
  label              = excluded.label,
  group_name         = excluded.group_name,
  requires_evidence  = excluded.requires_evidence,
  applies_to_outlets = excluded.applies_to_outlets,
  sort_order         = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Classification rules (5). Evaluated ascending by priority, first match wins.
-- ---------------------------------------------------------------------------
insert into public.classification_rules
  (priority, name, condition, classification, fault_owner, outlet_visible, auto_close) values
  (10, 'Grab auto-routing GF to GP',
       'tender GF-Grab Food -> adj tender GP-Grab Pay',            'SYSTEM',       'GATEWAY', false, false),
  (20, 'Within tolerance rounding',
       'tender = adj tender AND |variance| <= gateway tolerance',  'ROUNDING',     'FINANCE', false, true),
  (30, 'Over tolerance, same tender',
       'tender = adj tender AND |variance| > gateway tolerance',   'OPEN',         'OUTLET',  true,  false),
  (40, 'Tender mismatch',
       'tender <> adj tender',                                     'OUTLET_ERROR', 'OUTLET',  true,  false),
  (99, 'No counterparty found',
       'no counterparty found',                                    'OPEN',         'OUTLET',  true,  false)
on conflict (name) do update set
  priority       = excluded.priority,
  condition      = excluded.condition,
  classification = excluded.classification,
  fault_owner    = excluded.fault_owner,
  outlet_visible = excluded.outlet_visible,
  auto_close     = excluded.auto_close;
