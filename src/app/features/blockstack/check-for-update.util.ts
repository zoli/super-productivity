export enum UpdateCheckResult {
  InSync = 'InSync',
  LocalUpdateRequired = 'LocalUpdateRequired',
  RemoteUpdateRequired = 'RemoteUpdateRequired',
  DataDiverged = 'DataDiverged',
}

export const checkForUpdate = ({remote, local, lastSyncTo}: { remote: number, local: number, lastSyncTo: number }) => {
  if (local === remote) {
    return UpdateCheckResult.InSync;
  } else if (local > remote) {
    if (lastSyncTo < remote) {
      return UpdateCheckResult.DataDiverged;
    } else if (lastSyncTo < local) {
      return UpdateCheckResult.RemoteUpdateRequired;
    }
  } else if (local < remote) {
    return UpdateCheckResult.LocalUpdateRequired;
  }

  throw new Error('Inconclusive state. This should not happen');
};
