
import { CalendarEvent } from "@/services/calendarApi";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Phone, Truck, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
  event: CalendarEvent;
}

export function EventCard({ event }: EventCardProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4" />;
      case "delivery": return <Truck className="h-4 w-4" />;
      case "payment": return <DollarSign className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      case "medium": return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "low": return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "call": return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "delivery": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "payment": return "text-purple-600 bg-purple-50 dark:bg-purple-900/20";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getTypeColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{event.title}</h3>
              {event.customerName && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">{event.customerName}</span>
                </div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-2">
            <Badge className={`text-xs ${getPriorityColor(event.priority)}`}>
              {event.priority}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {event.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
