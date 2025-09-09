
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/services/calendarApi";
import { format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddEvent: (date: Date) => void;
}

export function CalendarView({ events, selectedDate, onSelectDate, onAddEvent }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get events for selected date
  const selectedDateEvents = events.filter(event => 
    isSameDay(new Date(event.date), selectedDate)
  );

  // Get events count for each date to show indicators
  const getEventCountForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.date), date)
    ).length;
  };

  const modifiers = {
    hasEvents: (date: Date) => getEventCountForDate(date) > 0,
  };

  const modifiersStyles = {
    hasEvents: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Calendar - {format(currentMonth, "MMMM yyyy")}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onSelectDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
            onDayClick={(date) => {
              onSelectDate(date);
            }}
          />
          <div className="mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span>Has events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/20 border-2 border-primary rounded-full"></div>
                <span>Selected date</span>
              </div>
            </div>
            <p className="mt-2 text-xs">Click on a date to view events, double-click to add an event</p>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {format(selectedDate, "EEEE, MMM d")}
            <Badge variant="secondary" className="ml-2">
              {selectedDateEvents.length} events
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">No events scheduled</div>
                <Button 
                  size="sm" 
                  onClick={() => onAddEvent(selectedDate)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Event
                </Button>
              </div>
            ) : (
              <>
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-accent rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <p className="text-xs text-muted-foreground">{event.time}</p>
                        {event.customerName && (
                          <p className="text-xs text-muted-foreground">{event.customerName}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <Badge 
                          className={`text-xs ${
                            event.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                            event.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-green-100 text-green-700 border-green-200'
                          }`}
                        >
                          {event.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onAddEvent(selectedDate)}
                  className="w-full"
                >
                  Add Another Event
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
