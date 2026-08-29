-- households.created_by bloquait la suppression d'un utilisateur (auth.users)
-- ayant créé un foyer : la contrainte par défaut (NO ACTION) refuse le delete
-- tant qu'une ligne y référence encore l'utilisateur. C'est un simple champ
-- d'audit, il n'a aucune raison d'empêcher une suppression de compte.
alter table households drop constraint if exists households_created_by_fkey;
alter table households add constraint households_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;
