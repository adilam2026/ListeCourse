-- Catalogue initial (foyer marocain) — voir spec §10/§18.
-- Les produits n'ont pas de photo au départ : l'admin les ajoute depuis
-- l'application (Administration → Catalogue → fiche produit).

create or replace function seed_default_catalog(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_id uuid;
  v_categories jsonb := $json$[
    {"name": "Légumes", "icon": "legumes", "products": ["Tomates","Pommes de terre","Oignons","Carottes","Courgettes","Aubergines","Poivrons","Concombres","Laitue","Coriandre","Persil","Menthe","Ail","Citron","Navets","Petits pois","Haricots verts","Chou","Chou-fleur","Brocoli"]},
    {"name": "Fruits", "icon": "fruits", "products": ["Bananes","Pommes","Oranges","Mandarines","Fraises","Raisins","Pastèque","Melon","Pêches","Nectarines","Poires","Kiwi","Mangue","Avocat","Dattes"]},
    {"name": "Produits laitiers", "icon": "dairy", "products": ["Lait","Yaourts","Fromage","Beurre","Crème fraîche","Fromage à tartiner"]},
    {"name": "Épicerie", "icon": "grocery", "products": ["Farine","Sucre","Sel","Riz","Pâtes","Couscous","Semoule","Huile","Huile d'olive","Vinaigre","Concentré de tomate","Thon","Lentilles","Pois chiches","Haricots secs","Thé","Café","Chocolat","Céréales"]},
    {"name": "Petit-déjeuner", "icon": "breakfast", "products": ["Pain","Pain de mie","Msemen","Harcha","Confiture","Miel"]},
    {"name": "Viandes et volailles", "icon": "meat", "products": ["Poulet","Escalopes de poulet","Viande hachée","Viande de bœuf","Viande pour tajine","Saucisses","Foie"]},
    {"name": "Poissons", "icon": "fish", "products": ["Sardines","Filet de poisson","Crevettes","Calamars","Saumon","Poisson blanc"]},
    {"name": "Boissons", "icon": "drinks", "products": ["Eau","Eau gazeuse","Jus d'orange","Jus","Sodas"]},
    {"name": "Produits ménagers", "icon": "household", "products": ["Liquide vaisselle","Tablettes lave-vaisselle","Produit sol","Eau de Javel","Lessive","Adoucissant","Nettoyant vitres","Éponges","Sacs-poubelle","Papier aluminium","Film alimentaire","Papier cuisson"]},
    {"name": "Hygiène", "icon": "hygiene", "products": ["Papier toilette","Mouchoirs","Savon mains","Gel douche","Shampooing","Dentifrice","Brosses à dents","Déodorant","Coton","Lingettes"]},
    {"name": "Enfants", "icon": "children", "products": ["Couches","Lait enfant","Compotes","Biscuits","Yaourts enfants","Céréales enfants","Goûters"]}
  ]$json$::jsonb;
  v_cat jsonb;
  v_product text;
  v_cat_order integer := 0;
  v_prod_order integer;
begin
  if not is_household_admin(p_household_id) then
    raise exception 'not an admin of this household';
  end if;

  for v_cat in select * from jsonb_array_elements(v_categories)
  loop
    v_cat_order := v_cat_order + 1;
    insert into categories (household_id, name, icon, sort_order)
      values (p_household_id, v_cat->>'name', v_cat->>'icon', v_cat_order)
      returning id into v_cat_id;

    v_prod_order := 0;
    for v_product in select * from jsonb_array_elements_text(v_cat->'products')
    loop
      v_prod_order := v_prod_order + 1;
      insert into products (household_id, category_id, name, sort_order)
        values (p_household_id, v_cat_id, v_product, v_prod_order);
    end loop;
  end loop;
end;
$$;

-- Peuple automatiquement le catalogue par défaut à la création d'un foyer.
create or replace function create_household(p_name text, p_display_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
begin
  insert into households (name) values (p_name) returning * into v_household;
  insert into household_members (household_id, user_id, display_name, can_prepare, is_admin)
    values (v_household.id, auth.uid(), p_display_name, true, true);
  perform seed_default_catalog(v_household.id);
  return v_household;
end;
$$;
