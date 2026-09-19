-- Isolated Green Flux quoting application. No demo prices or accounts are seeded here.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.app_members (user_id uuid primary key references auth.users(id) on delete cascade, active boolean not null default true);
create table private.quote_counters (year integer primary key, next_sequence integer not null check (next_sequence between 1 and 999999999));
create table public.gf_categories (id uuid primary key, document jsonb not null);
create table public.gf_catalog (
  id uuid primary key,
  category_id uuid references public.gf_categories(id) on delete restrict,
  document jsonb not null,
  constraint category_matches_document check ((document->>'categoryId')::uuid is not distinct from category_id)
);
create table public.gf_customers (id uuid primary key, document jsonb not null);
create table public.gf_settings (id text primary key check (id = 'company'), document jsonb not null);
create table public.gf_quotes (id uuid primary key, number text not null unique, version integer not null, document jsonb not null, created_by uuid references auth.users(id) on delete set null);
create table public.gf_quote_items (quote_id uuid not null references public.gf_quotes(id) on delete cascade, position integer not null, document jsonb not null, primary key(quote_id, position));
create table public.gf_generations (id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.gf_quotes(id) on delete cascade, version integer not null, created_at timestamptz not null default now(), filename text not null);

create function private.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.app_members where user_id = (select auth.uid()) and active);
$$;
create function private.assert_member() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member() then raise exception 'Accesso non autorizzato: chiedi all’amministratore di abilitare il tuo account.' using errcode='42501'; end if;
end; $$;

-- Strict validation helpers are shared by every write path, including CSV imports.
create function private.fields(d jsonb, names text[]) returns void language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if d is null or jsonb_typeof(d) <> 'object' then raise exception 'Oggetto non valido.'; end if;
  if (select count(*) from jsonb_object_keys(d)) <> cardinality(names) then raise exception 'Campi mancanti o non consentiti.'; end if;
  foreach k in array names loop if not (d ? k) then raise exception 'Campo obbligatorio: %.', k; end if; end loop;
end; $$;
create function private.str(d jsonb, k text, max_len integer, required boolean default false) returns void language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(d->k) is distinct from 'string' or length(d->>k) > max_len or (required and length(btrim(d->>k))=0) then raise exception 'Testo non valido: %.', k; end if;
end; $$;
create function private.num(d jsonb, k text, max_value numeric, min_value numeric default 0) returns void language plpgsql immutable set search_path = '' as $$
declare n numeric;
begin
  if jsonb_typeof(d->k) is distinct from 'number' then raise exception 'Numero non valido: %.', k; end if;
  n := (d->>k)::numeric;
  if n <> trunc(n) or n < min_value or n > max_value then raise exception 'Numero fuori intervallo: %.', k; end if;
end; $$;
create function private.flag(d jsonb, k text) returns void language plpgsql immutable set search_path = '' as $$
begin if jsonb_typeof(d->k) is distinct from 'boolean' then raise exception 'Valore booleano non valido: %.',k; end if; end; $$;
create function private.uid(d jsonb, k text, nullable boolean default false) returns void language plpgsql immutable set search_path = '' as $$
begin
  if nullable and d->k='null'::jsonb then return; end if;
  perform private.str(d,k,36,true);
  if d->>k !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Identificativo UUID non canonico: %.',k; end if;
end; $$;
create function private.email(d jsonb) returns void language plpgsql immutable set search_path = '' as $$
begin
  perform private.str(d,'email',300);
  if d->>'email' <> '' and d->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email non valida.'; end if;
end; $$;
create function private.validate_doc(kind text, d jsonb) returns void language plpgsql immutable set search_path = '' as $$
declare k text; row_data jsonb; line_ids text[] := '{}';
begin
  if kind='category' then
    perform private.fields(d,array['id','name']); perform private.uid(d,'id'); perform private.str(d,'name',120,true);
  elsif kind='customer' or kind='customer_snapshot' then
    perform private.fields(d,array['id','firstName','lastName','company','email','phone','address','postalCode','city','province']);
    perform private.uid(d,'id'); perform private.str(d,'firstName',200); perform private.str(d,'lastName',200); perform private.str(d,'company',300);
    perform private.email(d); perform private.str(d,'phone',80); perform private.str(d,'address',500); perform private.str(d,'postalCode',20); perform private.str(d,'city',150); perform private.str(d,'province',80);
    if kind='customer' and length(btrim((d->>'firstName')||(d->>'lastName')||(d->>'company')))=0 then raise exception 'Inserisci il nome del cliente o la ragione sociale.'; end if;
  elsif kind='settings' then
    perform private.fields(d,array['id','legalName','phone','email','website','address','vatNumber','representative','validityDays','paymentTerms','deliveryTerms','warrantyTerms','notes','defaultVatBps','numberPrefix','nextSequence']);
    if d->>'id' is distinct from 'company' then raise exception 'Impostazioni non valide.'; end if;
    perform private.str(d,'legalName',300,true); perform private.str(d,'phone',80); perform private.email(d); perform private.str(d,'website',500);
    if d->>'website' <> '' and d->>'website' !~* '^https?://' then raise exception 'URL sito non valido.'; end if;
    perform private.str(d,'address',500); perform private.str(d,'vatNumber',40); perform private.str(d,'representative',200); perform private.num(d,'validityDays',3650,1);
    foreach k in array array['paymentTerms','deliveryTerms','warrantyTerms'] loop perform private.str(d,k,30000); end loop;
    perform private.str(d,'notes',50000); perform private.num(d,'defaultVatBps',10000); perform private.num(d,'nextSequence',999999999,1); perform private.str(d,'numberPrefix',16,true);
    if d->>'numberPrefix' !~ '^[A-Za-z0-9_-]{1,16}$' then raise exception 'Prefisso non valido.'; end if;
  elsif kind='catalog' or kind='line' then
    if kind='catalog' then
      perform private.fields(d,array['id','categoryId','sku','name','brand','model','description','unit','priceCents','vatBps','active','notes','kind','featured','imageUrl']);
      perform private.uid(d,'categoryId',true); perform private.num(d,'priceCents',1000000000000); perform private.flag(d,'active'); perform private.str(d,'notes',10000);
    else
      perform private.fields(d,array['id','catalogItemId','kind','sku','name','brand','model','description','unit','quantityMilli','unitPriceCents','discountBps','vatBps','featured','includeInScope','imageUrl']);
      perform private.uid(d,'catalogItemId',true); perform private.num(d,'quantityMilli',1000000000,1); perform private.num(d,'unitPriceCents',1000000000000); perform private.num(d,'discountBps',10000); perform private.flag(d,'includeInScope');
    end if;
    perform private.uid(d,'id'); perform private.str(d,'sku',120); perform private.str(d,'name',300,true); perform private.str(d,'brand',200); perform private.str(d,'model',200); perform private.str(d,'description',30000); perform private.str(d,'unit',40,true);
    perform private.num(d,'vatBps',10000); perform private.flag(d,'featured'); perform private.str(d,'imageUrl',2000);
    if d->>'kind' not in ('product','service') or d->>'kind' is null then raise exception 'Tipo voce non valido.'; end if;
    if d->>'imageUrl' <> '' and d->>'imageUrl' !~* '^(https?://|/assets/)' then raise exception 'URL immagine non valido.'; end if;
  elsif kind='adjustment' then
    perform private.fields(d,array['kind','value']); perform private.num(d,'value',1000000000000);
    if d->>'kind' not in ('percent','amount') or d->>'kind' is null then raise exception 'Tipo adeguamento non valido.'; end if;
  elsif kind='quote' then
    perform private.fields(d,array['id','number','version','status','date','validityDays','representative','customerId','customer','project','lines','discount','surcharge','conditions','companySnapshot','totals','createdAt','updatedAt','generatedAt','generatedVersion','isDemo']);
    perform private.uid(d,'id'); perform private.uid(d,'customerId',true); perform private.str(d,'number',100); perform private.num(d,'version',999999999); perform private.num(d,'validityDays',3650,1); perform private.str(d,'representative',200); perform private.flag(d,'isDemo');
    if d->>'status' not in ('draft','generated','sent','accepted','rejected') or d->>'status' is null then raise exception 'Stato non valido.'; end if;
    perform private.str(d,'date',10,true);
    if d->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data non valida.'; end if;
    perform (d->>'date')::date;
    perform private.str(d,'createdAt',100); perform private.str(d,'updatedAt',100);
    if d->'generatedAt' <> 'null'::jsonb then perform private.str(d,'generatedAt',100); end if;
    if d->'generatedVersion' <> 'null'::jsonb then perform private.num(d,'generatedVersion',999999999); end if;
    perform private.validate_doc('customer_snapshot',d->'customer'); perform private.validate_doc('settings',d->'companySnapshot');
    perform private.fields(d->'project',array['address','propertyType','areaSqm','type','notes']);
    perform private.str(d->'project','address',500); perform private.str(d->'project','propertyType',200); perform private.str(d->'project','type',300); perform private.str(d->'project','notes',50000);
    if d->'project'->'areaSqm' <> 'null'::jsonb then
      if jsonb_typeof(d->'project'->'areaSqm') is distinct from 'number' or (d->'project'->>'areaSqm')::numeric < 0 or (d->'project'->>'areaSqm')::numeric > 1000000000 then raise exception 'Superficie non valida.'; end if;
    end if;
    perform private.fields(d->'conditions',array['paymentTerms','deliveryTerms','warrantyTerms','notes']);
    foreach k in array array['paymentTerms','deliveryTerms','warrantyTerms'] loop perform private.str(d->'conditions',k,30000); end loop; perform private.str(d->'conditions','notes',50000);
    perform private.validate_doc('adjustment',d->'discount'); perform private.validate_doc('adjustment',d->'surcharge');
    if jsonb_typeof(d->'lines') is distinct from 'array' or jsonb_array_length(d->'lines') > 1000 then raise exception 'Elenco righe non valido (massimo 1000).'; end if;
    for row_data in select value from jsonb_array_elements(d->'lines') loop
      perform private.validate_doc('line',row_data);
      if row_data->>'id'=any(line_ids) then raise exception 'Identificativo riga duplicato.'; end if;
      line_ids := array_append(line_ids,row_data->>'id');
    end loop;
  else raise exception 'Tipo oggetto non valido.';
  end if;
end; $$;

create function private.allocate_cents(amount numeric, weights numeric[]) returns numeric[] language plpgsql immutable set search_path = '' as $$
declare total numeric := 0; result numeric[] := '{}'; i integer; missing integer; allocated numeric := 0;
begin
  for i in 1..coalesce(array_length(weights,1),0) loop total:=total+weights[i]; end loop;
  if amount=0 then for i in 1..coalesce(array_length(weights,1),0) loop result:=array_append(result,0::numeric); end loop; return result; end if;
  if total=0 then raise exception 'Con un imponibile pari a zero, inserisci la maggiorazione come voce personalizzata e scegli l’IVA.'; end if;
  for i in 1..array_length(weights,1) loop result:=array_append(result,trunc(amount*weights[i]/total)); allocated:=allocated+result[i]; end loop;
  missing := (amount-allocated)::integer;
  for i in select x from generate_subscripts(weights,1) x order by mod(amount*weights[x],total) desc,x limit missing loop result[i]:=result[i]+1; end loop;
  return result;
end; $$;

create function private.calculate_quote(lines jsonb, discount jsonb, surcharge jsonb) returns jsonb language plpgsql immutable set search_path = '' as $$
declare bases numeric[] := '{}'; discounts numeric[]; afters numeric[] := '{}'; surcharges numeric[]; finals numeric[] := '{}'; rates integer[] := '{}';
  subtotal numeric := 0; d numeric; m numeric; taxable numeric := 0; vat numeric := 0; line_data jsonb; line_totals jsonb := '[]'; groups jsonb := '[]'; i integer := 0; r integer; b numeric; tax numeric;
begin
  perform private.validate_doc('adjustment',discount); perform private.validate_doc('adjustment',surcharge);
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines)>1000 then raise exception 'Righe non valide.'; end if;
  for line_data in select value from jsonb_array_elements(lines) loop
    perform private.validate_doc('line',line_data);
    b:=round((line_data->>'quantityMilli')::numeric*(line_data->>'unitPriceCents')::numeric*(10000-(line_data->>'discountBps')::numeric)/10000000,0);
    bases:=array_append(bases,b); rates:=array_append(rates,(line_data->>'vatBps')::integer); subtotal:=subtotal+b;
  end loop;
  if subtotal>1000000000000 then raise exception 'Importo troppo elevato.'; end if;
  if discount->>'kind'='percent' then
    if (discount->>'value')::numeric>10000 then raise exception 'Lo sconto non può superare il 100%%.'; end if;
    d:=round(subtotal*(discount->>'value')::numeric/10000,0);
  else d:=(discount->>'value')::numeric; end if;
  if d>subtotal then raise exception 'Lo sconto complessivo non può superare l’imponibile.'; end if;
  discounts:=private.allocate_cents(d,bases);
  for i in 1..coalesce(array_length(bases,1),0) loop afters:=array_append(afters,bases[i]-discounts[i]); end loop;
  if surcharge->>'kind'='percent' then
    if (surcharge->>'value')::numeric>1000000 then raise exception 'Maggiorazione percentuale non valida.'; end if;
    m:=round((subtotal-d)*(surcharge->>'value')::numeric/10000,0);
  else m:=(surcharge->>'value')::numeric; end if;
  if m>1000000000000 then raise exception 'Importo troppo elevato.'; end if;
  surcharges:=private.allocate_cents(m,case when subtotal-d>0 then afters else bases end);
  for i in 1..coalesce(array_length(bases,1),0) loop
    finals:=array_append(finals,afters[i]+surcharges[i]); taxable:=taxable+finals[i];
    line_totals:=line_totals||jsonb_build_array(jsonb_build_object('id',lines->(i-1)->>'id','baseCents',bases[i],'discountCents',discounts[i],'surchargeCents',surcharges[i],'netCents',finals[i]));
  end loop;
  for r in select distinct unnest(rates) order by 1 loop
    b:=0; for i in 1..array_length(rates,1) loop if rates[i]=r then b:=b+finals[i]; end if; end loop;
    tax:=round(b*r/10000,0); vat:=vat+tax; groups:=groups||jsonb_build_array(jsonb_build_object('rateBps',r,'taxableCents',b,'vatCents',tax));
  end loop;
  if taxable+vat>1000000000000 then raise exception 'Importo troppo elevato.'; end if;
  return jsonb_build_object('subtotalCents',subtotal,'discountCents',d,'surchargeCents',m,'taxableCents',taxable,'vatCents',vat,'totalCents',taxable+vat,'lines',line_totals,'vatGroups',groups);
end; $$;

insert into public.gf_settings(id,document) values ('company','{"id":"company","legalName":"GREEN FLUX srls","phone":"+39 375 552 1420","email":"info@green-flux.com","website":"https://www.green-flux.com","address":"Via Trieste, 19 · 35121 Padova (PD)","vatNumber":"","representative":"","validityDays":30,"paymentTerms":"","deliveryTerms":"","warrantyTerms":"","notes":"","defaultVatBps":2200,"numberPrefix":"GF","nextSequence":1}'::jsonb);

create function private.load_data() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare settings jsonb; next_value integer; year_value integer := extract(year from now() at time zone 'Europe/Rome');
begin
  perform private.assert_member();
  select document into settings from public.gf_settings where id='company';
  select next_sequence into next_value from private.quote_counters where year=year_value;
  settings:=jsonb_set(settings,'{nextSequence}',to_jsonb(coalesce(next_value,1)));
  return jsonb_build_object('categories',coalesce((select jsonb_agg(document order by document->>'name') from public.gf_categories),'[]'::jsonb),'catalog',coalesce((select jsonb_agg(document order by document->>'name') from public.gf_catalog),'[]'::jsonb),'customers',coalesce((select jsonb_agg(document order by document->>'lastName') from public.gf_customers),'[]'::jsonb),'quotes',coalesce((select jsonb_agg(document order by document->>'updatedAt' desc) from public.gf_quotes),'[]'::jsonb),'settings',settings);
end; $$;

create function private.save_entity(entity text, payload jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare record_id uuid; year_value integer := extract(year from now() at time zone 'Europe/Rome'); next_value integer;
begin
  perform private.assert_member(); perform private.validate_doc(entity,payload);
  if entity='settings' then
    -- All number allocation and settings changes share this lock ordering.
    perform 1 from public.gf_settings where id='company' for update;
    insert into private.quote_counters(year,next_sequence) values(year_value,1) on conflict(year) do nothing;
    select next_sequence into next_value from private.quote_counters where year=year_value for update;
    if (payload->>'nextSequence')::integer<next_value then raise exception 'Il prossimo progressivo deve essere almeno %.',next_value; end if;
    update private.quote_counters set next_sequence=(payload->>'nextSequence')::integer where year=year_value;
    update public.gf_settings set document=payload where id='company';
    return;
  end if;
  record_id:=(payload->>'id')::uuid;
  if entity='category' then insert into public.gf_categories(id,document) values(record_id,payload) on conflict(id) do update set document=excluded.document;
  elsif entity='catalog' then
    if payload->>'categoryId' is not null and not exists(select 1 from public.gf_categories where id=(payload->>'categoryId')::uuid) then raise exception 'La categoria selezionata non esiste più.'; end if;
    insert into public.gf_catalog(id,category_id,document) values(record_id,(payload->>'categoryId')::uuid,payload) on conflict(id) do update set document=excluded.document,category_id=excluded.category_id;
  elsif entity='customer' then insert into public.gf_customers(id,document) values(record_id,payload) on conflict(id) do update set document=excluded.document;
  else raise exception 'Operazione non consentita.'; end if;
end; $$;

create function private.import_catalog(payload jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb; ids uuid[] := '{}'; item_id uuid;
begin
  perform private.assert_member();
  if jsonb_typeof(payload) is distinct from 'array' or jsonb_array_length(payload)>5000 then raise exception 'Importazione non valida (massimo 5000 voci).'; end if;
  for item in select value from jsonb_array_elements(payload) loop
    perform private.validate_doc('catalog',item);
    item_id := (item->>'id')::uuid;
    if item_id=any(ids) then raise exception 'L’importazione contiene identificativi duplicati.'; end if;
    ids:=array_append(ids,item_id);
    perform private.save_entity('catalog',item);
  end loop;
end; $$;

create function private.save_quote(payload jsonb, expected_version integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.gf_quotes%rowtype; qid uuid; saved jsonb; settings jsonb; quote_number text; next_value integer; year_value integer := extract(year from now() at time zone 'Europe/Rome'); stamp text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); row_data jsonb; pos integer:=0;
begin
  perform private.assert_member(); perform private.validate_doc('quote',payload);
  if expected_version is null or expected_version<0 or expected_version>=999999999 then raise exception 'Versione non valida.'; end if;
  qid:=(payload->>'id')::uuid;
  -- Serializes concurrent creation of the same UUID and every edit of that quote.
  perform pg_advisory_xact_lock(hashtextextended(qid::text,0));
  select * into existing from public.gf_quotes where id=qid for update;
  if coalesce(existing.version,0)<>expected_version then raise exception 'Il preventivo è stato modificato da un altro utente. Riaprilo per caricare la versione aggiornata.' using errcode='40001'; end if;
  quote_number:=existing.number;
  if quote_number is null then
    select document into settings from public.gf_settings where id='company' for update;
    insert into private.quote_counters(year,next_sequence) values(year_value,1) on conflict(year) do nothing;
    update private.quote_counters set next_sequence=next_sequence+1 where year=year_value and next_sequence<999999999 returning next_sequence-1 into next_value;
    if next_value is null then raise exception 'Progressivo esaurito.'; end if;
    quote_number:=(settings->>'numberPrefix')||'-'||year_value||'-'||lpad(next_value::text,greatest(4,length(next_value::text)),'0');
    update public.gf_settings set document=jsonb_set(document,'{nextSequence}',to_jsonb(next_value+1)) where id='company';
  end if;
  saved:=payload||jsonb_build_object('number',quote_number,'version',expected_version+1,'totals',private.calculate_quote(payload->'lines',payload->'discount',payload->'surcharge'),'createdAt',coalesce(existing.document->>'createdAt',stamp),'updatedAt',stamp,'generatedAt',existing.document->'generatedAt','generatedVersion',existing.document->'generatedVersion','isDemo',false);
  insert into public.gf_quotes(id,number,version,document,created_by) values(qid,quote_number,expected_version+1,saved,auth.uid()) on conflict(id) do update set version=excluded.version,document=excluded.document;
  delete from public.gf_quote_items where quote_id=qid;
  for row_data in select value from jsonb_array_elements(saved->'lines') loop insert into public.gf_quote_items values(qid,pos,row_data); pos:=pos+1; end loop;
  return saved;
end; $$;

create function private.delete_entity(entity text, record_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_member();
  if entity='category' then
    update public.gf_catalog set category_id=null,document=jsonb_set(document,'{categoryId}','null'::jsonb) where category_id=record_id;
    delete from public.gf_categories where id=record_id;
  elsif entity='catalog' then
    delete from public.gf_catalog where id=record_id;
    -- Snapshots intentionally remain unchanged; source ids are optional historical links.
  elsif entity='customer' then delete from public.gf_customers where id=record_id;
  elsif entity='quote' then
    perform pg_advisory_xact_lock(hashtextextended(record_id::text,0));
    delete from public.gf_quotes where id=record_id;
  else raise exception 'Operazione non consentita.'; end if;
end; $$;

create function private.mark_generated(record_id uuid, expected_version integer, filename text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare q public.gf_quotes%rowtype; stamp text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); saved jsonb;
begin
  perform private.assert_member();
  if filename is null or length(filename)=0 or length(filename)>250 or filename ~ '[/\\[:cntrl:]]' then raise exception 'Nome file non valido.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(record_id::text,0));
  select * into q from public.gf_quotes where id=record_id for update;
  if q.id is null or q.version is distinct from expected_version then raise exception 'Il preventivo è cambiato durante la generazione. Riaprilo e genera nuovamente.' using errcode='40001'; end if;
  perform private.validate_doc('customer',q.document->'customer');
  if jsonb_array_length(q.document->'lines')=0 or length(btrim(q.document->'project'->>'type'))=0 then raise exception 'Inserisci le righe e la tipologia di progetto prima di generare.'; end if;
  saved:=q.document||jsonb_build_object('status',case when q.document->>'status'='draft' then 'generated' else q.document->>'status' end,'generatedAt',stamp,'generatedVersion',expected_version,'updatedAt',stamp);
  update public.gf_quotes set document=saved where id=record_id;
  insert into public.gf_generations(quote_id,version,filename) values(record_id,expected_version,filename);
  return saved;
end; $$;

-- Only invoker wrappers are exposed via PostgREST. All privileged bodies live in private.
create function public.gf_load() returns jsonb language sql security invoker set search_path = '' as $$ select private.load_data(); $$;
create function public.gf_save_entity(entity text,payload jsonb) returns void language sql security invoker set search_path = '' as $$ select private.save_entity(entity,payload); $$;
create function public.gf_import_catalog(payload jsonb) returns void language sql security invoker set search_path = '' as $$ select private.import_catalog(payload); $$;
create function public.gf_save_quote(payload jsonb,expected_version integer) returns jsonb language sql security invoker set search_path = '' as $$ select private.save_quote(payload,expected_version); $$;
create function public.gf_delete_entity(entity text,record_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.delete_entity(entity,record_id); $$;
create function public.gf_mark_generated(record_id uuid,expected_version integer,filename text) returns jsonb language sql security invoker set search_path = '' as $$ select private.mark_generated(record_id,expected_version,filename); $$;

alter table private.app_members enable row level security;
alter table private.quote_counters enable row level security;
revoke all on private.app_members,private.quote_counters from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['gf_categories','gf_catalog','gf_customers','gf_settings','gf_quotes','gf_quote_items','gf_generations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy members_read on public.%I for select to authenticated using ((select private.is_member()))',t);
  end loop;
end $$;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_member(),private.load_data(),private.save_entity(text,jsonb),private.import_catalog(jsonb),private.save_quote(jsonb,integer),private.delete_entity(text,uuid),private.mark_generated(uuid,integer,text) to authenticated;
revoke all on function public.gf_load(),public.gf_save_entity(text,jsonb),public.gf_import_catalog(jsonb),public.gf_save_quote(jsonb,integer),public.gf_delete_entity(text,uuid),public.gf_mark_generated(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.gf_load(),public.gf_save_entity(text,jsonb),public.gf_import_catalog(jsonb),public.gf_save_quote(jsonb,integer),public.gf_delete_entity(text,uuid),public.gf_mark_generated(uuid,integer,text) to authenticated;
alter default privileges in schema private revoke execute on functions from public;
commit;
