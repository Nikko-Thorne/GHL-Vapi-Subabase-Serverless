import express from 'express';
import { z } from 'zod';
import { supabase } from './lib/supabase';
import { handleCalendarFunction } from './lib/vapi';

const app = express();
app.use(express.json());

const MessageSchema = z.object({
  type: z.literal('function-call'),
  functionCall: z.object({
    name: z.string(),
    parameters: z.record(z.any())
  })
});

app.post('/webhook/calendar', async (req, res) => {
  try {
    const { message } = req.body;
    const requestId = crypto.randomUUID();
    
    try {
      MessageSchema.parse(message);
    } catch (validationError) {
      return res.status(400).json({ 
        result: 'Invalid request format. Please check the message structure.' 
      });
    }

    const result = await handleCalendarFunction(message.functionCall);
    
    // Capture VAPI interaction data
    await supabase.rpc('fn_capture_vapi_data', {
      p_request_id: requestId,
      p_function_name: message.functionCall.name,
      p_parameters: message.functionCall.parameters,
      p_response: result
    });
    
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      result: 'Sorry, there was an error processing your request.' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
