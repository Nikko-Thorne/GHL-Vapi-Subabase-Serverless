import { calendarService } from './calendar';
import type { TimeSlot } from './calendar';
import { parseDate } from 'chrono-node';
import { isValid, addMinutes, formatISO } from 'date-fns';

const VAPI_TOOL_ID = '80da12cb-fc09-4ce2-a7a9-2682e1c5249e';

function parseDateTime(dateTimeStr: string): Date | null {
  const parsed = parseDate(dateTimeStr);
  if (!parsed || !isValid(parsed)) {
    return null;
  }
  return parsed;
}

export async function handleCalendarFunction(functionCall: {
  name: string;
  parameters: Record<string, any>;
}): Promise<{ result: string }> {
  switch (functionCall.name) {
    case 'checkAvailability': {
      const { dateTime, duration = 30 } = functionCall.parameters;
      
      // Parse natural language date
      const parsedDate = parseDateTime(dateTime);
      if (isNaN(parsedDate.getTime())) {
        return {
          result: "I couldn't understand that date format. Please provide a date like 'tomorrow at 2pm' or '2024-03-20 14:00'."
        };
      }
      
      // First check if the slot is available
      const startTime = formatISO(parsedDate);
      const endTime = formatISO(addMinutes(parsedDate, duration));
      
      const slots = await calendarService.checkAvailability(
        startTime,
        endTime,
        duration
      );
      
      if (!slots.length || !slots[0].available) {
        // If not available, find alternatives
        const alternatives = await calendarService.findAlternativeSlots(parsedDate.toISOString());
        
        return {
          result: formatAlternativeTimesMessage(alternatives)
        };
      }
      
      return {
        result: `Yes, that time slot is available! The appointment can be scheduled for ${parsedDate.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.`
      };
    }
    
    default:
      return {
        result: 'Unknown function call'
      };
  }
}

function formatAlternativeTimesMessage(alternatives: TimeSlot[]): string {
  if (!alternatives.length) {
    return 'Sorry, no alternative time slots are available in the next 7 days.';
  }

  const times = alternatives
    .map(slot => new Date(slot.start).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }))
    .join(', ');

  return `The requested time is not available. Here are some alternative times: ${times}`;
}
