# Edge Function Configuration

## config.toml Settings

Basic configuration:
```toml
[functions.my-function]
verify_jwt = false
import_map = './import_map.json'
```

## JWT Verification

- Default: JWT required
- Disable with `verify_jwt = false`
- Or use `--no-verify-jwt` flag during deployment

## Import Maps

Configure shared imports:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.7",
    "std/": "https://deno.land/std@0.204.0/"
  }
}
```

## Environment Variables

Access in functions:
```typescript
const VAPI_SECRET = Deno.env.get('VAPI_SECRET')
```

Set locally:
```bash
supabase secrets set VAPI_SECRET=your-secret-value
```
