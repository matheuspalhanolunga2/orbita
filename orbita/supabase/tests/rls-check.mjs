// Security test for supabase/schema.sql on a throwaway local Postgres.
// Run: npm i -D embedded-postgres && node supabase/tests/rls-check.mjs
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
const pg = new EmbeddedPostgres({ databaseDir: process.env.PGTEST_DIR ?? '/tmp/orbita-pgtest', user: 'postgres', password: 'pw', port: 5499, persistent: false });
await pg.initialise(); await pg.start();
const c = pg.getPgClient(); await c.connect();
const q = (s, p) => c.query(s, p);
const ok = (n, v) => console.log((v ? 'PASS ' : 'FAIL ') + n);
// minimal Supabase auth stub
await q(`create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;`);
await q(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
await q(`grant select, insert, update, delete on public.items to authenticated;`);
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
await q(`insert into auth.users values ($1),($2)`, [A, B]);
const as = async (uid, fn) => { await q('begin'); await q(`set local role authenticated`); await q(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]); try { return await fn(); } finally { await q('rollback'); } };
const asCommit = async (uid, fn) => { await q('begin'); await q(`set local role authenticated`); await q(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]); try { const r = await fn(); await q('commit'); return r; } catch (e) { await q('rollback'); throw e; } };

// A writes 2 rows via upsert (like PostgREST)
await asCommit(A, () => q(`insert into public.items (user_id, collection, id, data) values ($1,'tasks','t1','{"title":"a"}'),($1,'meta','settings','{}')
  on conflict (user_id, collection, id) do update set data = excluded.data, deleted = excluded.deleted`, [A]));
const t0 = (await q(`select updated_at from public.items where id='t1'`)).rows[0].updated_at;
await asCommit(A, () => q(`insert into public.items (user_id, collection, id, data, deleted) values ($1,'tasks','t1','{"title":"x"}', true)
  on conflict (user_id, collection, id) do update set data = excluded.data, deleted = excluded.deleted`, [A]));
const r = (await q(`select data, deleted, updated_at from public.items where id='t1'`)).rows[0];
ok('upsert updates and trigger nulls data on delete', r.deleted === true && r.data === null && r.updated_at > t0);
ok('A sees own rows', (await as(A, () => q('select * from public.items'))).rows.length === 2);
ok('B sees nothing of A', (await as(B, () => q('select * from public.items'))).rows.length === 0);
let blocked = false; try { await as(B, () => q(`insert into public.items (user_id, collection, id, data) values ($1,'tasks','evil','{}')`, [A])); } catch { blocked = true; }
ok('B cannot write as A', blocked);
const upd = await as(B, () => q(`update public.items set data='{"hack":1}' where user_id=$1`, [A]));
ok('B cannot update A rows', upd.rowCount === 0);
blocked = false; try { await as(A, () => q(`insert into public.items (collection, id, data) values ('hacker','x','{}')`)); } catch { blocked = true; }
ok('invalid collection rejected', blocked);
const def = await as(B, () => q(`insert into public.items (collection, id, data) values ('tasks','b1','{}') returning user_id`));
ok('user_id defaults to auth.uid()', def.rows[0].user_id === B);
blocked = false; try { await q('begin'); await q('set local role anon'); await q('select * from public.items'); } catch { blocked = true; } finally { await q('rollback'); }
ok('anon has no access', blocked);
await asCommit(A, () => q(`select public.delete_my_account()`));
ok('delete_my_account removes user and cascades items', (await q(`select count(*)::int n from public.items where user_id=$1`, [A])).rows[0].n === 0 && (await q(`select count(*)::int n from auth.users where id=$1`, [A])).rows[0].n === 0);
blocked = false; try { await q('begin'); await q('set local role anon'); await q('select public.delete_my_account()'); } catch { blocked = true; } finally { await q('rollback'); }
ok('anon cannot call delete_my_account', blocked);
await c.end(); await pg.stop();
