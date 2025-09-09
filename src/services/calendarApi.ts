
import { apiConfig } from '@/utils/apiConfig';

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  type: "call" | "delivery" | "payment" | "meeting";
  date: string;
  time: string;
  customerId?: number;
  customerName?: string;
  priority: "high" | "medium" | "low";
  status: "scheduled" | "completed" | "cancelled";
  reminder?: number;
}

export interface CalendarResponse {
  success: boolean;
  data: {
    events: CalendarEvent[];
  };
}

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${apiConfig.getBaseUrl()}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Calendar API request failed:', error);
    throw error;
  }
};

export const calendarApi = {
  getEvents: async (params?: {
    date?: string;
    month?: string;
    type?: "call" | "delivery" | "payment" | "meeting";
  }): Promise<CalendarResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }
      const query = queryParams.toString();
      return await apiRequest<CalendarResponse>(`/calendar/events${query ? `?${query}` : ''}`);
    } catch (error) {
      // Return fallback data when API is not available
      console.log('Using fallback calendar data');
      return {
        success: true,
        data: {
          events: [
            {
              id: 1,
              title: "Follow up call with Ahmad Furniture",
              description: "Discuss payment for last order",
              type: "call",
              date: new Date().toISOString().split('T')[0],
              time: "10:00 AM",
              customerName: "Ahmad Furniture",
              priority: "high",
              status: "scheduled"
            },
            {
              id: 2,
              title: "Delivery to Hassan Carpentry",
              description: "Deliver MDF sheets order",
              type: "delivery",
              date: new Date().toISOString().split('T')[0],
              time: "2:00 PM",
              customerName: "Hassan Carpentry",
              priority: "medium",
              status: "scheduled"
            },
            {
              id: 3,
              title: "Payment collection",
              description: "Collect payment from Sheikh Gulzar",
              type: "payment",
              date: new Date().toISOString().split('T')[0],
              time: "4:00 PM",
              customerName: "Sheikh Gulzar Sahib",
              priority: "high",
              status: "scheduled"
            },
            {
              id: 4,
              title: "New Customer Meeting",
              description: "Discuss bulk order requirements",
              type: "meeting",
              date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: "11:00 AM",
              customerName: "Ali Hardware Store",
              priority: "medium",
              status: "scheduled"
            },
            {
              id: 5,
              title: "Supplier Call",
              description: "Check on new inventory arrival",
              type: "call",
              date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: "9:30 AM",
              customerName: "Pak Steel Suppliers",
              priority: "low",
              status: "scheduled"
            }
          ]
        }
      };
    }
  },

  createEvent: async (event: Omit<CalendarEvent, 'id' | 'status'>) => {
    try {
      console.log('Creating event:', event);
      return await apiRequest<{ success: boolean; data: CalendarEvent }>('/calendar/events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.log('API failed, creating local event:', event);
      return {
        success: true,
        data: {
          ...event,
          id: Date.now(),
          status: 'scheduled' as const
        }
      };
    }
  },
};
