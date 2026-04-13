/**
 * Centralized dayjs configuration.
 * Import dayjs from this file everywhere — never directly from "dayjs".
 *
 * Plugins registered:
 *  - utc              → dayjs.utc(), .utc(), .local()
 *  - customParseFormat → dayjs(value, "HH:mm") / "DD/MM/YYYY" etc.
 *  - isBetween        → day.isBetween(start, end)
 *  - relativeTime     → dayjs(date).from(dayjs()) / .fromNow()
 *  - localeData       → locale-aware helpers
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import relativeTime from "dayjs/plugin/relativeTime";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/fr";

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(relativeTime);
dayjs.extend(localeData);

export default dayjs;
