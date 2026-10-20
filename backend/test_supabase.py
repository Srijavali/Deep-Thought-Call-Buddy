
from supabase_client import supabase

try:
    result = (
        supabase.table("prospects")
        .select("id")
        .limit(1)
        .execute()
    )
    print("Supabase connection successful!")
    print("Prospects table is accessible.")
except Exception as error:
    print("Supabase connection failed.")
    print(type(error).__name__, str(error))
