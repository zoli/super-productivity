import {Injectable} from '@angular/core';
import {AppDataComplete} from './sync.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {SnackService} from '../../core/snack/snack.service';
import {ProjectService} from '../../features/project/project.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {ReminderService} from '../../features/reminder/reminder.service';
import {ImexMetaService} from '../imex-meta/imex-meta.service';
import {T} from '../../t.const';
import {TaskService} from '../../features/tasks/task.service';
import {MigrationService} from '../../core/migration/migration.service';
import {DataInitService} from '../../core/data-init/data-init.service';
import {MODEL_VERSION_KEY} from '../../app.constants';
import {isEntityStateConsist} from '../../util/check-fix-entity-state-consistency';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root',
})
export class SyncService {

  constructor(
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _taskService: TaskService,
    private _configService: GlobalConfigService,
    private _reminderService: ReminderService,
    private _imexMetaService: ImexMetaService,
    private _migrationService: MigrationService,
    private _dataInitService: DataInitService,
  ) {
  }

  saveLastLocalSyncModelChange(date: number | string | Date) {
    const d = (typeof date === 'number')
      ? date
      : new Date(date).getTime();
    this._persistenceService.updateLastLocalSyncModelChange(d);
  }

  getLastLocalSyncModelChange(): number {
    return this._persistenceService.getLastLocalSyncModelChange();
  }

  async getCompleteSyncData(): Promise<AppDataComplete> {
    return await this._persistenceService.loadComplete();
  }

  async importCompleteSyncData(data: AppDataComplete, isBackupReload = false) {
    this._snackService.open({msg: T.S.SYNC.IMPORTING, ico: 'cloud_download'});
    this._imexMetaService.setDataImportInProgress(true);

    // get rid of outdated project data
    if (!isBackupReload) {
      await this._persistenceService.saveBackup();
      await this._persistenceService.clearDatabaseExceptBackup();
    }

    if (this._checkData(data)) {
      try {
        const migratedData = this._migrationService.migrateIfNecessary(data);
        // save data to database first then load to store from there
        await this._persistenceService.importComplete(migratedData);
        await this._loadAllFromDatabaseToStore();
        this._imexMetaService.setDataImportInProgress(false);
        this._snackService.open({type: 'SUCCESS', msg: T.S.SYNC.SUCCESS});

      } catch (e) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.S.SYNC.ERROR_FALLBACK_TO_BACKUP,
        });
        console.error(e);
        await this._loadBackup();
        this._imexMetaService.setDataImportInProgress(false);
      }
    } else {
      this._snackService.open({type: 'ERROR', msg: T.S.SYNC.ERROR_INVALID_DATA});
      console.error(data);
      this._imexMetaService.setDataImportInProgress(false);
    }
  }

  // TODO unit test this
  private _checkData(data: AppDataComplete) {
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
      && this._isEntityStatesConsistent(data)
      && this._isTaskIdsConsistent(data)

      : typeof data === 'object'
      ;
  }

  private _isTaskIdsConsistent(data: AppDataComplete) {
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
  }

  private _isEntityStatesConsistent(data: AppDataComplete) {
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
  }

  private async _loadAllFromDatabaseToStore(): Promise<any> {
    return await Promise.all([
      // reload view model from ls
      this._dataInitService.reInit(null, true),
      this._reminderService.reloadFromDatabase(),
    ]);
  }

  private async _loadBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this.importCompleteSyncData(data, true);
  }
}
