export const setSearchOptimizationContent: any = ({ data, originalDoc }) => {
  if (data.i18n && data.i18n.en && data.i18n.en.name) {
    data.nameEn = data.i18n.en.name;
  }
  if (data.i18n && data.i18n.zh && data.i18n.zh.name) {
    data.nameZh = data.i18n.zh.name;
  }
}
