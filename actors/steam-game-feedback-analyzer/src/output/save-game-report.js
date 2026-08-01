export const saveGameReport = async ({ appId, report, setValue }) => {
  await setValue(`GAME_${appId}_REPORT`, report);
};
