import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarPageComponent } from './calendar-page.component';
import { CalendarModule } from '../../features/calendar/calendar.module';

@NgModule({
  declarations: [
    CalendarPageComponent
  ],
  imports: [
    CommonModule,
    CalendarModule,
  ]
})
export class CalendarPageModule {
}
