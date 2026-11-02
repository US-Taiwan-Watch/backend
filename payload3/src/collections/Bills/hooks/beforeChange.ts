

export const setLatestActionTime: any = ({ data, originalDoc }) => {
  if (data.i18n && data.i18n.en) {
    const allActions = [
      ...(data.i18n.en?.actionsAll || []),
      ...(data.i18n.en?.actionsOverview || []),
    ];

    if (allActions.length > 0) {
      const latestActionTime = allActions
        .map((action) => new Date(action.actionAt.datetime))
        .sort((a: any, b: any) => b - a)[0];

      data.latestActionTime = latestActionTime;
    } else {
      data.latestActionTime = null;
    }
  }
}

export const setSearchOptimizationContent: any = ({ data, originalDoc }) => {
  if (data.i18n && data.i18n.en && data.i18n.en.title) {
    data.title = data.i18n.en.title;
  }
  if (data.i18n && data.i18n.en && data.i18n.en.summary) {
    // data.summary = data.i18n.en.summary.map((node) => Node.string(node)).join('\n');
    data.summary = data.i18n.en.summary;
  }
}
