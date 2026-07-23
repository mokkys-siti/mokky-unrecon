-- 0000_init_extensions.sql
-- Base extensions. Supabase provides these in the `extensions` schema.
-- pgcrypto -> gen_random_uuid(); citext -> case-insensitive email/text.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
