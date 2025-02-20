import { serve } from 'https://deno.land/std@0.204.0/http/server.ts'
import { parseDate } from 'https://esm.sh/chrono-node@2.7.5'
import { addMinutes, formatISO, isValid } from 'https://esm.sh/date-fns@3.3.1'
import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
}

const VAPI_SECRET = Deno.env.get('VAPI_SECRET')

if (!VAPI_SECRET) {
  console.error('Missing VAPI_SECRET environment variable');
}

const MessageSchema = z.object({
  type: z.literal('function-call'),
  functionCall: z.object({
    name: z.string(),
    parameters: z.record(z.any())
  })
})

function parseDateTime(dateTimeStr: string): Date | null {
  const parsed = parseDate(dateTimeStr)
  if (!parsed || !isValid(parsed)) {
    return null
  }
  return parsed
}

function formatAlternativeTimesMessage(alternatives: TimeSlot[]): string {
  if (!alternatives.length) {
    return 'Sorry, no alternative time slots are available in the next 7 days.'
  }

  const times = alternatives
    .map(slot => new Date(slot.start).toLocaleString('en-US', { 
      dateStyle: 'full', 
      timeStyle: 'short' 
    }))
    .join(', ')

  return `The requested time is not available. Here are some alternative times: ${times}`
}

async function handleCalendarFunction(functionCall: {
  name: string
  parameters: Record<string, any>
}): Promise<{ result: string }> {
  switch (functionCall.name) {
    case 'checkAvailability': {
      const { dateTime, duration = 15 } = functionCall.parameters
      
      // Parse natural language date
      const parsedDate = parseDateTime(dateTime)
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return {
          result: "I couldn't understand that date format. Please provide a date like 'tomorrow at 2pm' or '2024-03-20 14:00'."
        }
      }
      
      // Check if the slot is available
      const startTime = formatISO(parsedDate)
      const endTime = formatISO(addMinutes(parsedDate, duration))
      
      const slots = await calendarService.checkAvailability(
        startTime,
        endTime,
        duration
      )
      
      if (!slots.length || !slots[0].available) {
        // If not available, find alternatives
        const alternatives = await calendarService.findAlternativeSlots(
          parsedDate.toISOString()
        )
        
        return {
          result: formatAlternativeTimesMessage(alternatives)
        }
      }
      
      return {
        result: `Yes, that time slot is available! The appointment can be scheduled for ${parsedDate.toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}.`
      }
    }
    
    case 'bookAppointment': {
      const { name, email, phone, preferredTime, duration = 15 } = functionCall.parameters
      
      // Parse natural language date
      const parsedDate = parseDateTime(preferredTime)
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return {
          result: "I couldn't understand that date format. Please provide a date like 'tomorrow at 2pm' or '2024-03-20 14:00'."
        }
      }
      
      // Create the event
      const startTime = formatISO(parsedDate)
      const endTime = formatISO(addMinutes(parsedDate, duration))
      
      const result = await calendarService.createEvent({
        title: `Appointment for ${name}`,
        startTime,
        endTime,
        description: `Phone: ${phone}`,
        clientName: name,
        clientEmail: email,
        clientPhone: phone
      })
      
      if (!result.success) {
        if (result.slot) {
          // Find alternatives if the slot is no longer available
          const alternatives = await calendarService.findAlternativeSlots(
            parsedDate.toISOString()
          )
          return {
            result: formatAlternativeTimesMessage(alternatives)
          }
        }
        return {
          result: `Sorry, I couldn't book the appointment: ${result.error}`
        }
      }
      
      return {
        result: `Great! I've booked your appointment for ${parsedDate.toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short'
        })}. You'll receive a confirmation email at ${email}.`
      }
    }
    
    default:
      return {
        result: 'Unknown function call'
      }
  }
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Generate request ID and log request
    const requestId = crypto.randomUUID();
    console.log('Request received:', {
      id: requestId,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
      timestamp: new Date().toISOString()
    })

    // Verify VAPI secret
    const vapiSecret = req.headers.get('x-vapi-secret')
    if (!vapiSecret || vapiSecret !== VAPI_SECRET) {
      console.error('Invalid or missing VAPI secret')
      const error = 'Unauthorized: Invalid or missing x-vapi-secret header'
      
      return new Response(
        JSON.stringify({ 
          result: 'Unauthorized: Invalid or missing x-vapi-secret header' 
        }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    const { message } = await req.json()
    console.log('Parsed Message:', {
      functionName: message?.functionCall?.name,
      parameters: message?.functionCall?.parameters,
    })
    
    try {
      MessageSchema.parse(message)
    } catch (validationError) {
      console.error('Validation Error:', validationError)
      return new Response(
        JSON.stringify({ 
          result: 'Invalid request format. Please check the message structure.' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json',
            ...corsHeaders }
        }
      )
    }

    const result = await handleCalendarFunction(message.functionCall)
    console.log(`Function Result [${requestId}]:`, {
      success: true,
      timestamp: new Date().toISOString(),
      result
    })
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json',
          ...corsHeaders }
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    const errorDetails = {
      timestamp: new Date().toISOString(),
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
    };
    
    if (error instanceof Error) {
      console.error('Detailed Error Information:', errorDetails);
    }
    
    return new Response(
      JSON.stringify({
        result: 'Sorry, there was an error processing your request.',
        error: errorDetails
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})
