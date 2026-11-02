export const getCurrentCongress = (): number => {
  const now = new Date();
  const year = now.getFullYear();

  // Congress numbers advance every 2 years starting in 1789
  let congress = Math.floor((year - 1789) / 2) + 1;

  // If it's an odd year and before Jan 3, it still belongs to the previous Congress
  if (year % 2 !== 0 && now.getMonth() === 0 && now.getDate() < 3) {
    congress -= 1;
  }

  return congress;
};
