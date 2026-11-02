export const setSearchOptimization: any = ({ data, originalDoc }) => {
  if (data.i18n && data.i18n.en && data.i18n.en.title) {
    data.title = data.i18n.en.title;
  }
  if (data.i18n && data.i18n.en && data.i18n.en.description) {
    data.description = data.i18n.en.description;
  }
}
