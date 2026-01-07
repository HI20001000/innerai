const PENDING_STATUS_NAME = '待處理'

export const countPendingFollowUps = (items = []) =>
  items.reduce((total, item) => {
    const followUps = Array.isArray(item?.follow_ups) ? item.follow_ups : []
    const pendingCount = followUps.filter((followUp) => {
      const statusName = String(followUp?.status_name || '')
      return statusName === PENDING_STATUS_NAME
    }).length
    return total + pendingCount
  }, 0)
