const ConvertSecondToTime = (second: number | string): string => {
  const totalSeconds = Number(second) || 0;

  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");

  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

export default ConvertSecondToTime;