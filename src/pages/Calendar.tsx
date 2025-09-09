
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Clock, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarApi, CalendarEvent } from "@/services/calendarApi";
import { CalendarView } from "@/components/calendar/CalendarView";
import { EventCard } from "@/components/calendar/EventCard";
import { AddEventModal } from "@/components/calendar/AddEventModal";
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [addEventDate, setAddEventDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => calendarApi.getEvents(),
  });

  const events = eventsData?.data.events || [];

  // Today's events
  const todayEvents = events.filter(event => 
    isToday(new Date(event.date))
  );

  // This week's events
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const thisWeekEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= weekStart && eventDate <= weekEnd;
  });

  // Upcoming events (next 7 days excluding today)
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate > today && eventDate <= nextWeek;
  }).slice(0, 5);

  // Stats
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const pendingEvents = events.filter(e => e.status === 'scheduled').length;
  const highPriorityEvents = events.filter(e => e.priority === 'high' && e.status === 'scheduled').length;

  const handleAddEvent = (date?: Date) => {
    setAddEventDate(date || selectedDate);
    setIsAddEventOpen(true);
  };

  const handleEventAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-6 min-h-screen bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-accent rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 md:p-6 space-y-3 min-h-[calc(100vh-65px)] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
   
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              Calendar
            </h1>
            <p className="text-muted-foreground">Manage your schedule and appointments</p>
          </div>
        </div>
        <Button 
          onClick={() => handleAddEvent()} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Events</p>
                <p className="text-2xl font-bold">{todayEvents.length}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{thisWeekEvents.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedEvents}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">{highPriorityEvents}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar View */}
      <CalendarView 
        events={events}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onAddEvent={handleAddEvent}
      />

      {/* Today's Schedule & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Today's Schedule
              <Badge variant="secondary">{todayEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No events scheduled for today</p>
                  <Button 
                    size="sm" 
                    className="mt-2" 
                    onClick={() => handleAddEvent(new Date())}
                  >
                    Add Event for Today
                  </Button>
                </div>
              ) : (
                todayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Upcoming Events
              <Badge variant="secondary">{upcomingEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No upcoming events</p>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-accent rounded-lg border">
                    <div>
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "MMM d")} at {event.time}
                      </p>
                      {event.customerName && (
                        <p className="text-xs text-muted-foreground">{event.customerName}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <Badge 
                        className={`text-xs ${
                          event.priority === 'high' ? 'bg-red-100 text-red-700' :
                          event.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {event.priority}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Event Modal */}
      <AddEventModal 
        open={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        onEventAdded={handleEventAdded}
        selectedDate={addEventDate}
      />
    </div>
  );
};

export default Calendar;
