import {Project} from '../../src/app/features/project/project.model';
import {Task} from '../../src/app/features/tasks/task.model';

export interface AwesomeBarDataTransfer {
  currentProject: Project;
  projectList: Project[];
  currentTaskId: string;
  allTasks: Task[];
}
