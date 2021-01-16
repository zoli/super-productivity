import { CalendarOptions } from '@fullcalendar/angular';

export const STATIC_CALENDAR_OPTS: CalendarOptions = {
  events: [],
  headerToolbar: {
    start: 'today prev,next',
    center: 'title',
    end: 'timeGridDay,timeGridWeek,dayGridMonth'
  },
  initialView: 'timeGridDay',
  eventOverlap: true,
  // height: 'auto',
  editable: true,
  droppable: false,
  slotDuration: '00:15:00',
  nowIndicator: true,
  timeZone: 'local', // the default (unnecessary to specify)
};

export const CALENDAR_MIN_TASK_DURATION = 15 * 60 * 1000;
