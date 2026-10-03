import { defineTask } from "nitro/task";

import { runMonthlyReportScheduler } from "../../src/lib/monthly-report-scheduler.server";

export default defineTask({
  meta: {
    name: "monthly-report",
    description: "Send automatic 30-day reports to Teachers and School Admins",
  },

  async run({ payload }) {
    const scheduledTime =
      typeof payload.scheduledTime === "number" ? payload.scheduledTime : Date.now();

    const result = await runMonthlyReportScheduler(scheduledTime);

    return {
      result,
    };
  },
});
