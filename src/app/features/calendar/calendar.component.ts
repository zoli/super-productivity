import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { CalendarOptions, FullCalendarComponent } from '@fullcalendar/angular';
import { Observable } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { EventInput } from '@fullcalendar/common';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskService } from '../tasks/task.service';
import { getWorklogStr } from '../../util/get-work-log-str';
import { TaskWithReminderData } from '../tasks/task.model';
import { msToString } from '../../ui/duration/ms-to-string.pipe';
import { DAY_STARTS_AT } from '../../app.constants';
import { isToday } from '../../util/is-today.util';

const MIN_TASK_DURATION = 15 * 60 * 1000;
const WEIRD_MAGIC_HOUR = 60000 * 60;

@Component({
  // apparently calendar does not work, so we add a prefix
  selector: 'sup-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent {
  @ViewChild('calendar') calendarEl?: FullCalendarComponent;

  private DEFAULT_CAL_OPTS: CalendarOptions = {
    editable: true,
    slotDuration: '00:15:00',
    nowIndicator: true,
    timeZone: 'local', // the default (unnecessary to specify)
    eventResize: (calEvent: any) => {
      const start = calEvent.event._instance.range.start;
      // const start = calEvent.event._instance.range.start;
      const task: TaskWithReminderData = calEvent.event.extendedProps;
      this._taskService.updateReminder(task.id, task.reminderId as string, start.getTime() - WEIRD_MAGIC_HOUR, task.title);

      // console.log(calEvent.endDelta.milliseconds + (task.timeSpent));

      this._taskService.update(task.id, {
        // timeEstimate: calEvent.endDelta.milliseconds + (task.timeSpent)
        timeEstimate: task.timeEstimate + calEvent.endDelta.milliseconds
      });
    },
    eventDrop: (calEvent: any) => {
      const task: TaskWithReminderData = calEvent.event.extendedProps;
      const start = calEvent.event._instance.range.start;

      // TODO understand and fix this
      if (calEvent.event.allDay) {
        if (isToday(start)) {
          this._taskService.removeReminder(task.id, task.reminderId as string);
        } else {
          const dayStartsSplit = DAY_STARTS_AT.split(':');
          start.setHours(dayStartsSplit[0], dayStartsSplit[1], 0, 0);
          const startTime = start.getTime();
          this._taskService.updateReminder(task.id, task.reminderId as string, startTime, task.title);
        }
      } else {
        const startTime = start.getTime() - WEIRD_MAGIC_HOUR;
        this._taskService.updateReminder(task.id, task.reminderId as string, startTime, task.title);
      }
    },
    // should be EventClickArg but not exported :(
    eventClick: (calEvent: any) => {
      console.log(calEvent);
      // this.openDialog(calEvent);
    },
    // dateClick: (arg: any) => {
    //   // console.log('I am here!');
    //   // console.log(arg.date.toUTCString()); // use *UTC* methods on the native Date Object
    //   // will output something like 'Sat, 01 Sep 2018 00:00:00 GMT'
    // },
    // eventReceive: (calEvent: any) => {
    //   console.log(calEvent);
    //   // this.openDialog(calEvent);
    // },
    // eventLeave: (calEvent: any) => {
    //   console.log(calEvent);
    //   // this.openDialog(calEvent);
    // },
    events: [],
    headerToolbar: {
      start: 'today prev,next',
      center: 'title',
      end: 'timeGridDay,timeGridWeek,dayGridMonth'
    },
    // height: 'auto',
    initialView: 'timeGridDay',
    // dateClick: this.handleDateClick.bind(this), // bind is important!
    // events: [{
    // title: 'Asd',
    // start: new Date(),
    // allDay: true,
    // backgroundColor: 'red',
    // end: new Date()
    // display: 'string | null;',
    // startEditable: 'boolean | null;',
    // durationEditable: 'boolean | null;',
    // constraints: 'Constraint[];',
    // overlap: 'boolean | null;',
    // allows: 'AllowFunc[];',
    // backgroundColor: 'string;',
    // borderColor: 'string;',
    // textColor: 'string;',
    // classNames: 'string[];',
    // editable: true,
    // startEditable: true,
    // durationEditable: true,
    // }],
  };

  calOptions$: Observable<CalendarOptions> = this._taskService.plannedTasks$.pipe(
    withLatestFrom(this._workContextService.allWorkContextColors$),
    map(([tasks, colorMap]): CalendarOptions => {
      const TD_STR = getWorklogStr();
      const events: EventInput[] = tasks.map((task) => {
        let timeToGo: number = (task.timeEstimate - task.timeSpent);
        const timeSpentToday = task.timeSpentOnDay[TD_STR] || 0;
        if (timeToGo < timeSpentToday) {
          timeToGo = timeSpentToday;
        }
        timeToGo = ((timeToGo > (MIN_TASK_DURATION))
          ? timeToGo
          : MIN_TASK_DURATION);
        // console.log(timeToGo / 60000, ((timeToGo > (MIN_TASK_DURATION))
        //   ? timeToGo
        //   : MIN_TASK_DURATION) / 60000);

        return {
          title: task.title
            + ' '
            + msToString(task.timeSpent)
            + '/'
            + msToString(task.timeEstimate),
          extendedProps: task,

          backgroundColor: task.projectId
            ? colorMap[task.projectId]
            : colorMap[task.tagIds[0]],

          ...(task.plannedAt
              ? {
                start: task.plannedAt,
                end: (task.isDone && task.doneOn)
                  ? (task.plannedAt as number) + task.timeSpentOnDay[TD_STR]
                  : (task.plannedAt as number) + timeToGo,
              }
              : {
                allDay: true,
                // start: TD_STR,
                duration: 2000000,
                start: Date.now(),
                end: Date.now() + timeToGo
              }
          ),
        };
      });

      return {
        ...this.DEFAULT_CAL_OPTS,
        events,
      };
    })
  );

  constructor(
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
  ) {
    this.calOptions$.subscribe((v) => console.log('calOptions$', v));
  }

  // private handleDateClick(arg: any) {
  //   alert('date click! ' + arg.dateStr);
  // }
}
