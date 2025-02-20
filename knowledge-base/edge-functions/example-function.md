# Example Edge Function Implementation

## Basic REST API Function

```typescript
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { name } = await req.json()
    
    // Business logic
    const data = {
      message: `Hello ${name}!`,
      timestamp: new Date().toISOString()
    }

    // Return response
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    // Error handling
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
```

## With Database Integration

```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        }
      }
    )

    // Get data from database
    const { data, error } = await supabaseClient
      .from('my_table')
      .select('*')
      .limit(10)

    if (error) throw error

    return new Response(
      JSON.stringify({ data }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```
