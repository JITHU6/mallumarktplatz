-- INSERT ... RETURNING evaluates the SELECT policy against the new row. The
-- can_manage_business() lookup cannot see a row inserted in the same statement,
-- so owners need a direct column check in the SELECT/UPDATE policies.

drop policy "Businesses: public read approved" on public.businesses;
create policy "Businesses: public read approved" on public.businesses
  for select to anon, authenticated
  using (
    status = 'approved'
    or owner_id = (select auth.uid())
    or public.can_manage_business(id)
  );

drop policy "Businesses: managers update" on public.businesses;
create policy "Businesses: managers update" on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid()) or public.can_manage_business(id))
  with check (owner_id = (select auth.uid()) or public.can_manage_business(id));
