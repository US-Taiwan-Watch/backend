export const setSearchOptimization: any = ({ data, originalDoc }) => {
  const en = data?.i18n?.en;
  const zh = data?.i18n?.zh;

  if (en?.name) data.name = en.name;
  else if (zh?.name) data.name = zh.name;

  if (data.i18n && data.i18n.en && data.i18n.en.description) {
    data.description = data.i18n.en.description;
  }

  return data;
}
