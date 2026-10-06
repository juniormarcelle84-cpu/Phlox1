-- =====================================================================
-- PHLOX TOGO : schema initial Supabase
-- Tables, securite RLS, audit, stockage photos, donnees de depart.
-- A coller dans Supabase > SQL Editor > New query > Run (une seule fois).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ADMINS ET ROLES
-- ---------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','delivery')),
  created_at timestamptz not null default now()
);

create or replace function public.admin_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.admins where user_id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- ---------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------
create table public.categories (
  id text primary key,
  name_fr text not null,
  name_en text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category_id text references public.categories(id) on update cascade,
  description_fr text,
  description_en text,
  price int not null check (price > 0),
  original_price int check (original_price is null or original_price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  variants jsonb not null default '[]'::jsonb,
  promo_text text,
  is_popular boolean not null default false,
  is_new boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  url text not null,
  position int not null default 0
);
create index on public.product_images(product_id);

create table public.delivery_zones (
  city text primary key,
  fee int not null check (fee >= 0),
  is_active boolean not null default true
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id text primary key default ('PHX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_id uuid references public.customers(id),
  customer_name text not null,
  customer_phone text not null,
  debit_phone text,
  city text not null,
  address text,
  landmark text,
  gps text,
  network text check (network in ('TMONEY','FLOOZ')),
  subtotal int not null check (subtotal >= 0),
  delivery_fee int not null default 0 check (delivery_fee >= 0),
  discount int not null default 0 check (discount >= 0),
  total_amount int not null check (total_amount > 0),
  promo_code text,
  status text not null default 'pending' check (status in
    ('pending','paid','preparing','shipped','delivered','cancelled','refunded','failed','expired')),
  wa_sent boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  paid_at timestamptz
);
create index on public.orders(status, created_at desc);
create index on public.orders(customer_phone);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  unit_price int not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  variants jsonb not null default '{}'::jsonb
);
create index on public.order_items(order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  attempt int not null default 1,
  identifier text not null unique,
  network text not null check (network in ('TMONEY','FLOOZ')),
  phone_masked text,
  amount int not null check (amount > 0),
  tx_reference text,
  payment_reference text,
  paygate_status int,
  paygate_message text,
  status text not null default 'initiated' check (status in ('initiated','pending','paid','failed','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments(order_id);
create unique index payments_tx_reference_key on public.payments(tx_reference) where tx_reference is not null;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value int not null check (discount_value > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  product_ids text[] not null default '{}',
  category_ids text[] not null default '{}',
  stock_limit int check (stock_limit is null or stock_limit > 0),
  per_customer_limit int check (per_customer_limit is null or per_customer_limit > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (discount_type <> 'percent' or discount_value <= 90)
);

create table public.promo_codes (
  code text primary key check (code = upper(code)),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value int not null check (discount_value > 0),
  min_amount int not null default 0,
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 90)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bar','popup','hero')),
  title text,
  text_fr text,
  text_en text,
  link text,
  color text,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log(created_at desc);

-- ---------------------------------------------------------------------
-- 3. TRIGGERS : date de mise a jour, statut "payee" reserve au serveur, audit
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- Aucun admin (ni personne depuis le navigateur) ne peut passer une commande a "payee".
-- Seul le serveur de paiement (cle service_role des Edge Functions) le peut.
create or replace function public.guard_order_status() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if new.status = 'paid' and old.status is distinct from 'paid' then
      raise exception 'Le statut "payee" ne peut etre pose que par le serveur de paiement';
    end if;
    if new.status in ('preparing','shipped','delivered')
       and old.status in ('pending','failed','expired','cancelled') then
      raise exception 'Une commande non payee ne peut pas etre preparee ou expediee';
    end if;
  end if;
  return new;
end $$;

create trigger orders_guard_status before update on public.orders
  for each row execute function public.orders_guard_status();

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r jsonb;
  rid text;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  rid := coalesce(r->>'id', r->>'code', r->>'city', r->>'key', r->>'user_id');
  insert into public.audit_log (user_id, action, entity, entity_id, details)
  values (
    auth.uid(), tg_op, tg_table_name, rid,
    case when tg_op = 'UPDATE'
      then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
      else r end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_trigger();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_trigger();
create trigger audit_delivery_zones after insert or update or delete on public.delivery_zones
  for each row execute function public.audit_trigger();
create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.audit_trigger();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.audit_trigger();
create trigger audit_promo_codes after insert or update or delete on public.promo_codes
  for each row execute function public.audit_trigger();
create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function public.audit_trigger();
create trigger audit_admins after insert or update or delete on public.admins
  for each row execute function public.audit_trigger();
create trigger audit_orders after update or delete on public.orders
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- 4. SECURITE (RLS) : tout est ferme par defaut
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.delivery_zones  enable row level security;
alter table public.customers       enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.payments        enable row level security;
alter table public.promotions      enable row level security;
alter table public.promo_codes     enable row level security;
alter table public.announcements   enable row level security;
alter table public.settings        enable row level security;
alter table public.audit_log       enable row level security;

-- Admins
create policy "admins self read" on public.admins
  for select to authenticated using (user_id = auth.uid());
create policy "admins owner manage" on public.admins
  for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- Categories
create policy "categories public read" on public.categories
  for select to anon, authenticated using (is_active);
create policy "categories staff manage" on public.categories
  for all to authenticated
  using (public.admin_role() in ('owner','manager'))
  with check (public.admin_role() in ('owner','manager'));

-- Produits : le public ne voit que les produits publies
create policy "products public read" on public.products
  for select to anon, authenticated using (status = 'published');
create policy "products staff manage" on public.products
  for all to authenticated
  using (public.admin_role() in ('owner','manager'))
  with check (public.admin_role() in ('owner','manager'));

create policy "product_images public read" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "product_images staff manage" on public.product_images
  for all to authenticated
  using (public.admin_role() in ('owner','manager'))
  with check (public.admin_role() in ('owner','manager'));

-- Livraison : lecture publique, modification par le proprietaire
create policy "delivery_zones public read" on public.delivery_zones
  for select to anon, authenticated using (is_active);
create policy "delivery_zones owner manage" on public.delivery_zones
  for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- Annonces
create policy "announcements public read" on public.announcements
  for select to anon, authenticated
  using (is_active
         and (starts_at is null or starts_at <= now())
         and (ends_at is null or ends_at >= now()));
create policy "announcements staff manage" on public.announcements
  for all to authenticated
  using (public.admin_role() in ('owner','manager'))
  with check (public.admin_role() in ('owner','manager'));

-- Promotions (Black Friday) : affichage public, gestion par le proprietaire
create policy "promotions public read" on public.promotions
  for select to anon, authenticated
  using (is_active and starts_at <= now() and ends_at >= now());
create policy "promotions owner manage" on public.promotions
  for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- Codes promo : AUCUN acces public (verifies par le serveur)
create policy "promo_codes owner manage" on public.promo_codes
  for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- Parametres
create policy "settings public read" on public.settings
  for select to anon, authenticated using (is_public);
create policy "settings owner manage" on public.settings
  for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- Clients, commandes, paiements : aucun acces public. Ecriture par le serveur uniquement.
create policy "customers staff read" on public.customers
  for select to authenticated using (public.admin_role() in ('owner','manager'));

create policy "orders staff read" on public.orders
  for select to authenticated
  using (public.admin_role() in ('owner','manager')
         or (public.admin_role() = 'delivery' and status in ('preparing','shipped')));
create policy "orders staff update" on public.orders
  for update to authenticated
  using (public.admin_role() in ('owner','manager'))
  with check (public.admin_role() in ('owner','manager'));

create policy "order_items staff read" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

create policy "payments staff read" on public.payments
  for select to authenticated using (public.admin_role() in ('owner','manager'));

create policy "audit_log owner read" on public.audit_log
  for select to authenticated using (public.admin_role() = 'owner');

-- ---------------------------------------------------------------------
-- 5. STOCKAGE DES PHOTOS PRODUITS
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product images staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.admin_role() in ('owner','manager'));
create policy "product images staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.admin_role() in ('owner','manager'));
create policy "product images staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.admin_role() in ('owner','manager'));

-- ---------------------------------------------------------------------
-- 6. TEMPS REEL : alerte admin a chaque changement de commande (soumis a la RLS)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object or undefined_object then
  null;
end $$;

-- ---------------------------------------------------------------------
-- 7. DONNEES DE DEPART (catalogue actuel du site)
-- ---------------------------------------------------------------------
insert into public.categories (id, name_fr, name_en, sort_order) values
  ('earphone', 'Écouteurs', 'Earphones', 1),
  ('watch', 'Montres connectées', 'Smartwatches', 2),
  ('laptop', 'Ordinateurs', 'Laptops', 3),
  ('console', 'Consoles de jeux', 'Gaming consoles', 4),
  ('vr', 'Casques VR', 'VR headsets', 5),
  ('speaker', 'Enceintes Bluetooth', 'Bluetooth speakers', 6);

insert into public.delivery_zones (city, fee) values
  ('Lomé', 1000), ('Kpalimé', 2500), ('Atakpamé', 2500),
  ('Sokodé', 3000), ('Kara', 3500), ('Dapaong', 4000);

insert into public.settings (key, value, is_public) values
  ('whatsapp_number', '"+22893206003"'::jsonb, true),
  ('payment_networks', '{"mixx": true, "flooz": true}'::jsonb, true),
  ('maintenance_mode', 'false'::jsonb, true);

insert into public.products
  (id, name, category_id, description_fr, description_en, price, original_price, stock, variants, promo_text, is_popular, status)
values
  ('headphone-1', 'Beats Solo Wireless Pro', 'earphone', 'Découvrez un son de qualité supérieure grâce à la réduction active du bruit pure adaptative, aux deux micros de formation de faisceaux et à une autonomie allant jusqu''à 40 heures. Conçu pour un confort professionnel.', 'Experience premium sound with pure adaptive noise cancelling, dual-beam forming mics, and up to 40 hours of battery life. Designed with professional comfort for music creators and tech lovers.', 145000, 185000, 12, '[{"name_fr": "Couleur", "name_en": "Color", "values": [{"label": "Carbon Black", "extra": 0}, {"label": "Flame Red", "extra": 0}, {"label": "Premium Silver", "extra": 0}]}]'::jsonb, 'Summer Sale -20%', true, 'published'),
  ('earphone-1', 'Phlox Earphone Gaming TWS', 'earphone', 'Écouteurs de jeu sans fil à faible latence avec son surround, double microphone, conception étanche et boîtier de jeu futuriste rouge/noir.', 'Low latency wireless gaming earbuds with surround sound, dual microphone, waterproof design and custom red/black futuristic gaming box.', 25000, 35000, 25, '[{"name_fr": "Édition", "name_en": "Edition", "values": [{"label": "Standard Red", "extra": 0}, {"label": "Shadow Black", "extra": 0}]}]'::jsonb, null, true, 'published'),
  ('watch-1', 'Phlox Smartwatch Active V2', 'watch', 'Montre connectée de nouvelle génération dotée d''un écran AMOLED jaune à fort contraste, d''un suivi complet de la condition physique, du rythme cardiaque, du sommeil et de notifications d''appels WhatsApp. Résistante à l''eau.', 'Next-gen smartwatch featuring high-contrast AMOLED yellow glow, full fitness tracking, heart rate, sleep monitor, and WhatsApp call notifications. Water resistant.', 49000, 65000, 18, '[{"name_fr": "Bracelet", "name_en": "Strap", "values": [{"label": "Neon Yellow Silicone", "extra": 0}, {"label": "Sport Black Fabric", "extra": 0}]}]'::jsonb, 'Exclusivité', true, 'published'),
  ('laptop-1', 'Phlox Extreme Gaming Laptop', 'laptop', 'Monstre de haute performance équipé d''une RTX 4070, Core i9, 32 Go de RAM, 1 To SSD, et un écran 240Hz ultra-réactif. Boîtier en métal ultra-fin avec rétroéclairage rouge.', 'High-performance monster packed with RTX 4070, Core i9, 32GB RAM, 1TB SSD, and responsive 240Hz screen. Sleek ultra-slim metal case with customized red backlighting.', 950000, 1100000, 5, '[{"name_fr": "Disposition Clavier", "name_en": "Keyboard Layout", "values": [{"label": "AZERTY (FR)", "extra": 0}, {"label": "QWERTY (US)", "extra": 0}]}]'::jsonb, null, true, 'published'),
  ('console-1', 'Phlox Play Console 5 Pro', 'console', 'Découvrez un gameplay 4K fluide, des temps de chargement ultra-rapides grâce à un SSD ultra-haute vitesse, et une immersion profonde grâce au retour haptique.', 'Experience real 4K gameplay, lightning-fast loading speed with ultra-high-speed SSD, deep immersion with support for haptic feedback, and breathtaking next-gen gaming catalog.', 420000, null, 8, '[{"name_fr": "Pack", "name_en": "Bundle", "values": [{"label": "1 Controller Solo", "extra": 0}, {"label": "2 Controllers + FIFA 26", "extra": 0}]}]'::jsonb, null, true, 'published'),
  ('vr-1', 'Phlox VR Vision Quest', 'vr', 'Casque de réalité virtuelle autonome. Lentilles ultra-nettes, son surround immersif, suivi des mains en temps réel et sangle ergonomique pour le jeu.', 'Stand-alone Virtual Reality Headset. Crystal clear lenses, immersive surround sound, real-time hand-tracking, and ergonomic strap for extreme gaming and movies.', 295000, 350000, 14, '[{"name_fr": "Stockage", "name_en": "Storage", "values": [{"label": "128 Go", "extra": 0}, {"label": "256 Go", "extra": 35000}]}]'::jsonb, 'Top Technologie', false, 'published'),
  ('speaker-1', 'Phlox Cylindrical smart Bass Pro', 'speaker', 'Enceinte Bluetooth étanche avec basses puissantes et profondes, anneaux lumineux synchronisés avec le rythme, et jusqu''à 24h d''autonomie.', 'Waterproof Bluetooth speaker with deep powerful bass, colorful light rings sync to music beat, and up to 24 hours playtime. Premium metallic mesh.', 35000, null, 30, '[{"name_fr": "Couleur", "name_en": "Color", "values": [{"label": "Sapphire Blue", "extra": 0}, {"label": "Obsidian Black", "extra": 0}]}]'::jsonb, null, false, 'published');

-- ---------------------------------------------------------------------
-- 8. ETAPE FINALE : te donner le role "owner"
-- 1) Supabase > Authentication > Users > Add user (ton e-mail + mot de passe fort)
-- 2) Retire les deux tirets ci-dessous, remplace l'e-mail, puis lance uniquement cette ligne :
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id, role) select id, 'owner' from auth.users where email = 'TON-EMAIL@exemple.com';
