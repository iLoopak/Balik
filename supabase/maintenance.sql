-- Run once in the hosted project's SQL Editor (or schedule this call in Dashboard > Cron).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('balik-cleanup', '17 * * * *', 'select public.balik_cleanup()');
