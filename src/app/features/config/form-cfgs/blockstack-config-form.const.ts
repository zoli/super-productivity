import {ConfigFormSection, GoogleDriveSyncConfig} from '../global-config.model';
import {T} from '../../../t.const';

export const BLOCKSTACK_CONFIG_FORM: ConfigFormSection<GoogleDriveSyncConfig> = {
  title: T.F.BLOCKSTACK.FORM.TITLE,
  key: 'keyboard',
  // help: T.GCF.GOOGLE_DRIVE_SYNC.HELP,
  customSection: 'BLOCKSTACK_SYNC',
};
