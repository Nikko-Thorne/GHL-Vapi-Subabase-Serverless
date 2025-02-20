import { z } from 'zod';
import { supabase } from './supabase';

const API_KEY = 'cal_live_641ea655d3f32a198ce9f82769a2fe98';
const BASE_URL = 'https://api.cal.com/v1';

// Validation schemas
const TimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
  available: z.boolean(),
});

const AvailabilityResponseSchema = z.object({
  slots: z.array(TimeSlotSchema),
});

const EventSchema = z.object({
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional(),
  clientName: z.string(),
  clientEmail: z.string().email(),
  clientPhone: z.string(),
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type Event = z.infer<typeof EventSchema>;

export class CalendarService {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    };
  }

  /**
   * Check availability for a given time range
   */
  async checkAvailability(
    startTime: string,
    endTime: string,
    duration: number = 15,
    userId?: string
  ): Promise<TimeSlot[]> {
    try {
      const { data, error } = await supabase
        .rpc('fn_check_availability', {
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration
        });

      if (error) {
        throw error;
      }

      return data.map(slot => ({
        start: slot.start_time,
        end: slot.end_time,
        available: slot.is_available
      }));
    } catch (error) {
      console.error('Failed to check availability:', error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: Event): Promise<{ success: boolean; id?: string; error?: string; slot?: TimeSlot }> {
    const url = `${BASE_URL}/scheduler`;

    try {
      // First check if the slot is still available
      const slots = await this.checkAvailability(
        event.startTime,
        event.endTime,
        15 // Default duration
      );

      if (!slots.length || !slots[0].available) {
        return { 
          success: false, 
          error: 'The requested time slot is no longer available',
          slot: slots[0]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, id: data.id, slot: slots[0] };

    } catch (error) {
      console.error('Failed to create event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Find alternative time slots
   */
  async findAlternativeSlots(
    preferredDate: string,
    duration: number = 15,
    numberOfAlternatives: number = 3
  ): Promise<TimeSlot[]> {
    // Look for slots in the next 7 days
    const startTime = new Date(preferredDate);
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 7);

    const slots = await this.checkAvailability(
      startTime.toISOString(),
      endTime.toISOString(),
      duration
    );

    return slots
      .filter(slot => slot.available)
      .slice(0, numberOfAlternatives);
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
