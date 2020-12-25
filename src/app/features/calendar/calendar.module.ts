import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from './calendar.component';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid'; // a plugin
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// import interactionPlugin from '@fullcalendar/interaction'; // a plugin
FullCalendarModule.registerPlugins([ // register FullCalendar plugins
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
]);

@NgModule({
  declarations: [
    CalendarComponent,
  ],
  imports: [
    CommonModule,
    FullCalendarModule // register FullCalendar with you app
  ],
  exports: [
    CalendarComponent,
  ],
})
export class CalendarModule {
}
