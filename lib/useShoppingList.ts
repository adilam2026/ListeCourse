import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Category, ListItem, Product, ShoppingList } from './database.types';

export function useShoppingList(householdId: string | undefined) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!householdId) return;
    setError(null);
    const { data: listRow, error: listErr } = await supabase.rpc('get_or_create_today_list', {
      p_household_id: householdId,
    });
    if (listErr || !listRow) {
      setError(listErr?.message ?? 'Impossible de charger la liste du jour.');
      setLoading(false);
      return;
    }
    setList(listRow);

    const [{ data: cats }, { data: prods }, { data: listItems }] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('household_id', householdId)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('products')
        .select('*')
        .eq('household_id', householdId)
        .eq('active', true)
        .order('sort_order'),
      supabase.from('list_items').select('*').eq('list_id', listRow.id),
    ]);
    setCategories(cats ?? []);
    setProducts(prods ?? []);
    setItems(listItems ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!list) return;
    const channel = supabase
      .channel(`list_items:${list.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${list.id}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as Partial<ListItem>).id;
              return prev.filter((i) => i.id !== oldId);
            }
            const row = payload.new as ListItem;
            const exists = prev.some((i) => i.id === row.id);
            return exists ? prev.map((i) => (i.id === row.id ? row : i)) : [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.id]);

  return { list, categories, products, items, loading, error, reload: loadAll, setList, setItems };
}
