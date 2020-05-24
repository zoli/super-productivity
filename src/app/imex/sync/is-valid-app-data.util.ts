import {AppDataComplete} from './sync.model';
import {MODEL_VERSION_KEY} from '../../app.constants';
import {isEntityStateConsist} from '../../util/check-fix-entity-state-consistency';

// TODO unit test this
export const isValidAppData = (data: AppDataComplete): boolean => {
  // TODO remove this later on
  const isCapableModelVersion = data.project && data.project[MODEL_VERSION_KEY] && data.project[MODEL_VERSION_KEY] >= 5;

  return (isCapableModelVersion)

    ? (typeof data === 'object')
    && typeof data.note === 'object'
    && typeof data.bookmark === 'object'
    && typeof data.task === 'object'
    && typeof data.tag === 'object'
    && typeof data.globalConfig === 'object'
    && typeof data.taskArchive === 'object'
    && typeof data.project === 'object'
    && Array.isArray(data.reminders)
    && _isEntityStatesConsistent(data)
    && _isTaskIdsConsistent(data)

    : typeof data === 'object'
    ;
};
const _isTaskIdsConsistent = (data: AppDataComplete): boolean => {
  let allIds = [];

  (data.tag.ids as string[])
    .map(id => data.tag.entities[id])
    .forEach(tag => allIds = allIds.concat(tag.taskIds));

  (data.project.ids as string[])
    .map(id => data.project.entities[id])
    .forEach(project => allIds = allIds
      .concat(project.taskIds)
      .concat(project.backlogTaskIds)
    );

  const notFound = allIds.find(id => !(data.task.ids.includes(id)));

  if (notFound) {
    console.error('Inconsistent Task State: Missing task id ' + notFound);
  }
  return !notFound;
};

const _isEntityStatesConsistent = (data: AppDataComplete): boolean => {
  const entityStates = [
    data.task,
    data.taskArchive,
    data.tag,
    data.project,
    data.note,
    data.bookmark,
  ];
  const brokenItem = entityStates.find(entityState => !isEntityStateConsist(entityState));
  return !brokenItem;
};
