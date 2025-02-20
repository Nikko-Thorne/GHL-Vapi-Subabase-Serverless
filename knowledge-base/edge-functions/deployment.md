# Deploying Supabase Edge Functions

## Deployment Steps

1. Login to CLI:
```bash
supabase login
```

2. Get project ID:
```bash
supabase projects list
```

3. Link project:
```bash
supabase link --project-ref your-project-id
```

4. Deploy functions:
```bash
# Deploy all functions
supabase functions deploy

# Deploy single function
supabase functions deploy my-function

# Deploy without JWT verification
supabase functions deploy my-function --no-verify-jwt
```

## Testing Deployed Functions

Test with curl:
```bash
curl --request POST 'https://<project_id>.supabase.co/functions/v1/my-function' \
  --header 'Authorization: Bearer ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{ "name":"Functions" }'
```

## Important Notes

1. Docker Desktop required for deployment
2. Functions require valid JWT by default
3. Use `--no-verify-jwt` for public endpoints (e.g., webhooks)
4. ANON_KEY found in API settings of Supabase Dashboard
