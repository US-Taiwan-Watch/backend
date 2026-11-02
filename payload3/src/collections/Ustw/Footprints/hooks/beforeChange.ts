export const setSearchOptimization: any = ({ data, originalDoc }) => {
  const en = data?.i18n?.en;
  const zh = data?.i18n?.zh;

  if (en?.title) data.title = en.title;
  else if (zh?.title) data.title = zh.title;

  if (en?.source) data.source = en.source;
  else if (zh?.source) data.source = zh.source;

  return data;
}
