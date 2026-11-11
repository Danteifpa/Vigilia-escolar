import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

const root = process.argv[2] ?? new URL("../..", import.meta.url).pathname;
const db = new PGlite();
const ok = (m) => console.log('  ✔', m);
const fail = (m) => { console.log('  ✘', m); process.exitCode = 1; };

// Stub mínimo do Supabase (schema auth + roles)
await db.exec(`
  create role authenticated nologin; create role anon nologin; create role supabase_auth_admin nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant usage on schema public to authenticated, anon;
`);
const migrations = readdirSync(`${root}/supabase/migrations`).filter((f) => f.endsWith('.sql')).sort().map((f) => `migrations/${f}`);
for (const f of [...migrations, 'seed.sql']) {
  await db.exec(readFileSync(`${root}/supabase/${f}`, 'utf8'));
  ok(`aplicado ${f}`);
}

const U = { E1: 'a0000000-0000-0000-0000-000000000001', E2: 'a0000000-0000-0000-0000-000000000002',
            D:  'a0000000-0000-0000-0000-000000000003', S:  'a0000000-0000-0000-0000-000000000004' };
await db.exec(`
  insert into auth.users values ('${U.E1}'),('${U.E2}'),('${U.D}'),('${U.S}');
  insert into users (id,nome,email,perfil,escola_id,dre_id) values
   ('${U.E1}','Dir. Escola 1','e1@x','escola','00000000-0000-0000-0000-00000000e501',null),
   ('${U.E2}','Dir. Escola 2','e2@x','escola','00000000-0000-0000-0000-00000000e502',null),
   ('${U.D}','Coord DRE','d@x','dre',null,'00000000-0000-0000-0000-0000000000d6'),
   ('${U.S}','Comitê','s@x','estadual',null,null);
`);

const as = async (who, sql, params = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${U[who]}',false); set role authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
};
const expectErr = async (label, fn, code) => {
  try { await fn(); fail(`${label} — deveria falhar`); }
  catch (e) { (!code || e.code === code) ? ok(`${label} → bloqueado (${e.code}: ${e.message})`) : fail(`${label} → código ${e.code} ${e.message}`); }
};

const M = 'b0000000-0000-0000-0000-000000000001';
console.log('\nFluxo do Memorando Anexo I');
await as('E1', `insert into memorandos_ocorrencia (id, tipos_ameaca) values ($1, '{fumaca_queimadas}')`, [M]);
let r = await as('E1', `select escola_id, dre_id, status, criado_por, numero from memorandos_ocorrencia where id=$1`, [M]);
r.rows[0].status === 'rascunho' && r.rows[0].criado_por === U.E1 ? ok('rascunho criado com vínculos automáticos') : fail(JSON.stringify(r.rows));

await expectErr('escola altera status direto', () => as('E1', `update memorandos_ocorrencia set status='atendido' where id=$1`, [M]), '42501');
await expectErr('"outros" sem descrição', () => as('E1', `insert into memorandos_ocorrencia (tipos_ameaca) values ('{outros}')`), '23514');
await expectErr('enviar incompleto', () => as('E1', `select * from enviar_memorando($1)`, [M]), '23514');

await as('E1', `update memorandos_ocorrencia set descricao_situacao='Fumaça intensa desde 7h', impactos_pedagogicos='Aulas do turno da manhã reduzidas',
  impactos_operacionais='Merenda servida em sala', providencias_tomadas='Janelas fechadas, alunos em salas climatizadas',
  apoio_necessario_dre='Avaliação da Defesa Civil', prioridade='alta' where id=$1`, [M]);
r = await as('E1', `select numero, status from enviar_memorando($1)`, [M]);
r.rows[0].numero === `MEMO-15000001-2026-0001` ? ok(`despachado: ${r.rows[0].numero}`) : fail(JSON.stringify(r.rows));

r = await as('E1', `update memorandos_ocorrencia set impactos_pedagogicos='x' where id=$1 returning id`, [M]);
r.rows.length === 0 ? ok('escola não edita após despacho') : fail('editou após despacho');
r = await as('E2', `select id from memorandos_ocorrencia`);
r.rows.length === 0 ? ok('outra escola não vê o memorando') : fail('vazamento entre escolas');

r = await as('D', `select status from tramitar_memorando($1,'receber')`, [M]);
ok(`DRE recebeu → ${r.rows[0].status}`);
await expectErr('DRE encaminha sem parecer', () => as('D', `select * from tramitar_memorando($1,'encaminhar_estadual')`, [M]), '23514');
await expectErr('DRE ação inválida (arquivar em análise)', () => as('D', `select * from tramitar_memorando($1,'arquivar')`, [M]), '55000');
r = await as('D', `select status from tramitar_memorando($1,'encaminhar_estadual','Pedido de purificadores de ar')`, [M]);
ok(`DRE encaminhou → ${r.rows[0].status}`);
r = await as('S', `select status from tramitar_memorando($1,'atender','Equipamentos enviados')`, [M]);
ok(`Gestão Estadual atendeu → ${r.rows[0].status}`);
r = await as('E1', `select acao, de_status, para_status, ator_perfil from memorando_tramitacoes where memorando_id=$1 order by id`, [M]);
ok('trilha: ' + r.rows.map(x => `${x.acao}(${x.ator_perfil})`).join(' → '));

console.log('\nBandeiras');
await expectErr('escola decreta bandeira', () => as('E1', `insert into historico_bandeiras (escopo, municipio_id, cor, justificativa, decretada_por) values ('municipio',1501402,'amarela','tentativa indevida','${U.E1}')`), '42501');
await expectErr('DRE decreta bandeira', () => as('D', `insert into historico_bandeiras (escopo, municipio_id, cor, justificativa, decretada_por) values ('municipio',1501402,'amarela','tentativa indevida','${U.D}')`), '42501');
await expectErr('amarela com regime não presencial', () => as('S', `insert into historico_bandeiras (escopo, municipio_id, cor, regime_pedagogico, justificativa, decretada_por) values ('municipio',1501402,'amarela','nao_presencial','focos de calor elevados','${U.S}')`), '23514');
await as('S', `insert into historico_bandeiras (escopo, municipio_id, cor, justificativa, ato_referencia, decretada_por, vigente_desde) values ('municipio',1501402,'amarela','Focos de calor acima da média e umidade baixa','Ata CC 12/2026','${U.S}', now() - interval '2 days')`);
await as('S', `insert into historico_bandeiras (escopo, escola_id, cor, regime_pedagogico, justificativa, decretada_por) values ('escola','00000000-0000-0000-0000-00000000e502','vermelha','cemep','Acesso fluvial interrompido pela estiagem','${U.S}')`);
r = await as('E1', `select escola_id, cor, origem, regime_pedagogico from vw_bandeira_vigente`);
r.rows.length === 1 && r.rows[0].cor === 'amarela' && r.rows[0].origem === 'municipio' ? ok('E1 vê só a sua: amarela (município)') : fail(JSON.stringify(r.rows));
r = await as('S', `select escola_id, cor, origem, regime_pedagogico from vw_bandeira_vigente order by escola_id`);
r.rows[1].cor === 'vermelha' && r.rows[1].origem === 'escola' ? ok('E2: vermelha/cemep por decreto da escola prevalece') : fail(JSON.stringify(r.rows));
await as('S', `insert into historico_bandeiras (escopo, municipio_id, cor, justificativa, decretada_por) values ('municipio',1501402,'vermelha','Qualidade do ar crítica em Belém','${U.S}')`);
r = await as('S', `select cor, vigente_ate is null as aberta from historico_bandeiras where escopo='municipio' order by vigente_desde`);
!r.rows[0].aberta && r.rows[1].aberta ? ok('nova decretação encerrou a anterior') : fail(JSON.stringify(r.rows));

console.log('\nChecklist e snapshot');
await as('E1', `insert into checklists_diarios (escola_id, data, bandeira_cor, situacao_agua, reservatorio_percentual, nivel_fumaca, situacao_acesso, acoes, preenchido_por)
  values ('00000000-0000-0000-0000-00000000e502', current_date, 'verde', 'reduzida', 40, 'moderada', 'normal', '{"VRD-AGUA":true}', '${U.E2}')`);
r = await as('E1', `select escola_id, bandeira_cor, preenchido_por from checklists_diarios`);
r.rows[0].escola_id.endsWith('e501') && r.rows[0].bandeira_cor === 'vermelha' && r.rows[0].preenchido_por === U.E1
  ? ok('checklist: vínculo forçado à própria escola e snapshot da bandeira (vermelha)') : fail(JSON.stringify(r.rows));
await as('E1', `insert into memorandos_ocorrencia (tipos_ameaca, ameaca_outros_descricao) values ('{estiagem_agua,outros}','Calor extremo em sala')`);
r = await as('E1', `select bandeira_cor_no_registro from memorandos_ocorrencia where status='rascunho'`);
r.rows[0].bandeira_cor_no_registro === 'vermelha' ? ok('memorando registra a bandeira vigente') : fail(JSON.stringify(r.rows));
r = await as('D', `select count(*)::int n from memorandos_ocorrencia`);
r.rows[0].n === 1 ? ok('DRE não vê rascunhos') : fail(JSON.stringify(r.rows));
r = await as('E1', `select a.codigo from protocolo_acoes a, vw_bandeira_vigente b where a.ativo and a.cor <= b.cor order by a.cor desc, a.ordem`);
ok(`ações cumulativas na vermelha: ${r.rows.length}`);
await as('E1', `insert into checklists_diarios (id, data, bandeira_cor, situacao_agua, nivel_fumaca, situacao_acesso, preenchido_por)
  values ('c0000000-0000-0000-0000-000000000009', current_date, 'verde', 'critica', 'intensa', 'restrito', '${U.E1}')
  on conflict (escola_id, data) do update set id = excluded.id, situacao_agua = excluded.situacao_agua`);
r = await as('E1', `select id, situacao_agua, count(*) over ()::int n from checklists_diarios`);
r.rows[0].n === 1 && r.rows[0].situacao_agua === 'critica' && r.rows[0].id !== 'c0000000-0000-0000-0000-000000000009'
  ? ok('upsert do checklist (outro aparelho) atualiza sem duplicar nem trocar PK') : fail(JSON.stringify(r.rows));

console.log('\nPerfil no JWT (custom access token hook)');
const hook = async (uid) => (await db.query(
  `select public.custom_access_token_hook($1::jsonb) as ev`,   // executado como supabase_auth_admin
  [JSON.stringify({ user_id: uid, claims: { sub: uid, role: 'authenticated' } })])).rows[0].ev.claims;
// Mesmo ambiente do serviço de Auth: role supabase_auth_admin com search_path = auth
await db.exec('set role supabase_auth_admin; set search_path = auth');
let c = await hook(U.E1);
c.app_perfil === 'escola' && c.app_escola_id.endsWith('e501') && c.app_dre_id.endsWith('0d6') && c.sub === U.E1
  ? ok('escola: perfil, escola e DRE do polo nas claims') : fail(JSON.stringify(c));
c = await hook(U.D);
c.app_perfil === 'dre' && c.app_escola_id === null && c.app_dre_id.endsWith('0d6') ? ok('DRE: claims corretas') : fail(JSON.stringify(c));
c = await hook(U.S);
c.app_perfil === 'estadual' && c.app_dre_id === null ? ok('Gestão Estadual: claims corretas') : fail(JSON.stringify(c));
await db.exec('reset role; set search_path to "$user", public');
await db.exec(`update users set ativo = false where id = '${U.E2}'`);
await db.exec('set role supabase_auth_admin; set search_path = auth');
c = await hook(U.E2);
!('app_perfil' in c) && c.sub === U.E2 ? ok('usuário desativado fica sem perfil') : fail(JSON.stringify(c));
await db.exec('reset role; set search_path to "$user", public');
await expectErr('usuário comum executa o hook', () => as('E1', `select public.custom_access_token_hook('{}'::jsonb)`), '42501');
r = await as('E2', `select count(*)::int n from memorandos_ocorrencia`);
r.rows[0].n === 0 ? ok('desativado perde acesso imediato via RLS') : fail(JSON.stringify(r.rows));

console.log(process.exitCode ? '\nFALHOU' : '\nTODOS OS TESTES PASSARAM');
