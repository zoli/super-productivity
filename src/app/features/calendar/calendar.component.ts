import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/angular';

@Component({
  // apparently calendar does not work, so we add a prefix
  selector: 'sup-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent {

  calOptions: CalendarOptions = {
    // initialView: 'daygrid'
  };

  constructor() {
  }
}
