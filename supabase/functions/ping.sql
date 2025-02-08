
create or replace function ping()
returns boolean
language plpgsql
security definer
as $$
begin
  return true;
end;
$$;
