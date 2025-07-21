export const dateToX = (date: Date, timelineStart: Date, pan: number, zoom: number): number => {
  const timeDiff = date.getTime() - timelineStart.getTime()
  const dayDiff = timeDiff / (1000 * 3600 * 24)
  return dayDiff * zoom + pan
}
