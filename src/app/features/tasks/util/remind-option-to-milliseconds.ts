import { TaskReminderOptionId } from '../task.model';

export const remindOptionToMilliseconds = (plannedAt: number, remindOptId: TaskReminderOptionId): number | undefined => {
  switch (remindOptId) {
    case TaskReminderOptionId.m10 : {
      return plannedAt - 10 * 60 * 1000;
    }
    case TaskReminderOptionId.m15 : {
      return plannedAt - 15 * 60 * 1000;
    }
    case TaskReminderOptionId.m30 : {
      return plannedAt - 30 * 60 * 1000;
    }
    case TaskReminderOptionId.h1 : {
      return plannedAt - 60 * 60 * 1000;
    }
  }
  return undefined;
};
