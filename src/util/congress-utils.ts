export abstract class CongressUtils {

  public static getCurrentCongress(): number {
    return 117;
  }

  public static getCongress(dateString: string): number {
    const date = new Date(dateString);
    let year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDay();
    if (month === 1 && day < 3) {
      year -= 1;
    }
    if (year < 1935) {
      throw Error(`[CongressUtils.getCongress()] Does not support `
        + `congresses earlier than 1935 (74th). date: ${JSON.stringify(date)}`);
    }
    return Math.floor((year - 1935) / 2) + 74;
  }
}