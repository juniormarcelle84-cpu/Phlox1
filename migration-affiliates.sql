-- =====================================================================
-- MIGRATION SUPABASE : SYSTEME D'AFFILIATION & SUIVI DES PARRAINAGES
-- Tables 'affiliates' et 'affiliate_clicks', RLS, index et fonctions.
-- A executer dans Supabase > SQL Editor > New query > Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE PUBLIC.AFFILIATES
-- ---------------------------------------------------------------------
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  referral_code text not null unique,
  name text,
  email text,
  phone text,
  payout_network text check (payout_network is null or payout_network in ('TMONEY', 'FLOOZ')),
  payout_phone text,
  commission_rate numeric not null default 7.0 check (commission_rate >= 0 and commission_rate <= 100),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  total_sales_count int not null default 0 check (total_sales_count >= 0),
  total_sales_amount int not null default 0 check (total_sales_amount >= 0),
  total_commission_earned int not null default 0 check (total_commission_earned >= 0),
  available_balance int not null default 0 check (available_balance >= 0),
  pending_balance int not null default 0 check (pending_balance >= 0),
  withdrawn_balance int not null default 0 check (withdrawn_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour accelerer les recherches de parrainage et de statut
create index if not exists idx_affiliates_referral_code on public.affiliates (upper(referral_code));
create index if not exists idx_affiliates_user_id on public.affiliates (user_id);
create index if not exists idx_affiliates_status on public.affiliates (status);

-- ---------------------------------------------------------------------
-- 2. TABLE PUBLIC.AFFILIATE_CLICKS
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referral_code text not null,
  ip_hash text not null,
  user_agent text,
  clicked_at timestamptz not null default now()
);

-- Index pour les statistiques et la prevention du spam de clics
create index if not exists idx_affiliate_clicks_affiliate_id on public.affiliate_clicks (affiliate_id, clicked_at desc);
create index if not exists idx_affiliate_clicks_ip_hash on public.affiliate_clicks (ip_hash, clicked_at desc);
create index if not exists idx_affiliate_clicks_referral_code on public.affiliate_clicks (upper(referral_code));

-- ---------------------------------------------------------------------
-- 3. SECURITE ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
alter table public.affiliates enable row level security;
alter table public.affiliate_clicks enable row level security;

-- Politiques RLS pour 'affiliates'
drop policy if exists "Admins can manage all affiliates" on public.affiliates;
create policy "Admins can manage all affiliates"
  on public.affiliates
  for all
  using (public.is_admin());

drop policy if exists "Affiliates can view own profile" on public.affiliates;
create policy "Affiliates can view own profile"
  on public.affiliates
  for select
  using (auth.uid() = user_id);

drop policy if exists "Public can check active referral codes" on public.affiliates;
create policy "Public can check active referral codes"
  on public.affiliates
  for select
  using (status = 'active');

-- Politiques RLS pour 'affiliate_clicks'
drop policy if exists "Admins can view all clicks" on public.affiliate_clicks;
create policy "Admins can view all clicks"
  on public.affiliate_clicks
  for select
  using (public.is_admin());

drop policy if exists "Affiliates can view own clicks" on public.affiliate_clicks;
create policy "Affiliates can view own clicks"
  on public.affiliate_clicks
  for select
  using (
    exists (
      select 1 from public.affiliates
      where public.affiliates.id = public.affiliate_clicks.affiliate_id
      and public.affiliates.user_id = auth.uid()
    )
  );

drop policy if exists "Anyone can record clicks" on public.affiliate_clicks;
create policy "Anyone can record clicks"
  on public.affiliate_clicks
  for insert
  with check (true);

-- ---------------------------------------------------------------------
-- 4. FONCTION SECURISEE POUR ENREGISTRER UN CLIC (AVEC ANTI-SPAM)
-- ---------------------------------------------------------------------
create or replace function public.record_affiliate_click(
  p_referral_code text,
  p_ip_hash text,
  p_user_agent text default null,
  p_debounce_minutes int default 30
) returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_affiliate record;
  v_last_click_at timestamptz;
  v_recorded boolean := false;
begin
  -- 1. Recherche de l'affilie actif
  select * into v_affiliate
  from public.affiliates
  where upper(referral_code) = upper(trim(p_referral_code))
    and status = 'active'
  limit 1;

  if v_affiliate.id is null then
    return json_build_object(
      'success', false,
      'message', 'Code de parrainage introuvable ou inactif.',
      'recorded', false
    );
  end if;

  -- 2. Verification anti-spam / debounce par IP hash
  select clicked_at into v_last_click_at
  from public.affiliate_clicks
  where affiliate_id = v_affiliate.id
    and ip_hash = p_ip_hash
    and clicked_at > (now() - (p_debounce_minutes || ' minutes')::interval)
  order by clicked_at desc
  limit 1;

  if v_last_click_at is not null then
    return json_build_object(
      'success', true,
      'message', 'Clic déjà comptabilisé récemment.',
      'recorded', false,
      'affiliate_code', v_affiliate.referral_code
    );
  end if;

  -- 3. Insertion du clic
  insert into public.affiliate_clicks (affiliate_id, referral_code, ip_hash, user_agent, clicked_at)
  values (v_affiliate.id, v_affiliate.referral_code, p_ip_hash, p_user_agent, now());

  return json_build_object(
    'success', true,
    'message', 'Clic enregistré avec succès.',
    'recorded', true,
    'affiliate_id', v_affiliate.id,
    'affiliate_code', v_affiliate.referral_code,
    'affiliate_name', v_affiliate.name
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. TRIGGER AUTOMATIQUE POUR UPDATED_AT
-- ---------------------------------------------------------------------
create or replace function public.set_affiliate_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_affiliates_updated_at on public.affiliates;
create trigger trg_affiliates_updated_at
before update on public.affiliates
for each row execute function public.set_affiliate_updated_at();
