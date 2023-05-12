const reportsByUser = {
  accountant: [
    "rpt_Early_Bird",
    "rpt_daybalance",
    "rpt_AccountCxC",
    "rpt_dailytransactions2",
    "rpt_guestbalance",
    "rpt_todaychin",
    "rpt_Cajeros_Resum",
    "rpt_cajeros",
    "rpt_cajeroindividual",
    "rpt_cajeros_smart",
    "rpt_depbalance",
    "rpt_deptransferidos",
    "rpt_nad_balance",
    "rpt_CancelAdjust",
    "rpt_RSRV_CXLD",
    "rpt_FoliosVirtuales",
  ],
  manager: [
    "rpt_Early_Bird",
    "rpt_todaychin",
    "rpt_nad_balance",
    "rpt_CancelAdjust",
  ],
  salesManager: ["rpt_Early_Bird", "rpt_todaychin", "rpt_CancelAdjust"],
  extras: ["rpt_guestbalance"],
};

const cashierReports = [""];

module.exports = reportsByUser;
