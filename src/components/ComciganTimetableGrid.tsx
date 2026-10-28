import type {
  ComciganClassLabelMode,
  ComciganTimetableView,
} from "@/types/state";
import {
  cellChips,
  cellHasSubstitute,
  cellHasVacated,
  dayOfMonthFromYmd,
} from "@/utils/comciganTimetable";
import { formatLessonForDisplay } from "@/utils/jeilClassLabels";
import { canEditManualSlot } from "@/utils/timetableManual";
import { TIMETABLE_DAY_LABELS } from "@/utils/timetableSubstitute";

type Props = {
  periodCount: number;
  view: ComciganTimetableView;
  classLabelMode?: ComciganClassLabelMode;
  todayDayIndex: number;
  onManualCellClick?: (dayIndex: number, periodIndex: number) => void;
};

export function ComciganTimetableGrid({
  periodCount,
  view,
  classLabelMode = "jeil",
  todayDayIndex,
  onManualCellClick,
}: Props) {
  const highlightToday = todayDayIndex >= 0 && todayDayIndex <= 4;

  return (
    <div className="tt-scroll tt-comcigan-scroll">
      <table className="tt-grid tt-comcigan-grid">
        <thead>
          <tr>
            <th className="tt-comcigan-period-head">교시</th>
            {TIMETABLE_DAY_LABELS.map((label, di) => {
              const ymd = view.weekDates[di] ?? "";
              const dom = dayOfMonthFromYmd(ymd);
              const isToday = highlightToday && di === todayDayIndex;
              return (
                <th
                  key={label}
                  className={isToday ? "tt-comcigan-day--today" : undefined}
                >
                  <span className="tt-comcigan-day-label">
                    {label}
                    {dom > 0 ? `(${dom})` : ""}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: periodCount }, (_, pi) => {
            const time = view.periodTimes[pi] ?? "";
            return (
              <tr key={pi}>
                <th className="tt-comcigan-period">
                  <span className="tt-comcigan-period-num">{pi + 1}</span>
                  {time ? (
                    <span className="tt-comcigan-period-time">{time}</span>
                  ) : null}
                </th>
                {TIMETABLE_DAY_LABELS.map((_, di) => {
                  const chips = cellChips(view, di, pi);
                  const isSub = cellHasSubstitute(view, di, pi);
                  const isVacated = cellHasVacated(view, di, pi);
                  const isTodayCol = highlightToday && di === todayDayIndex;
                  const editable =
                    onManualCellClick && canEditManualSlot(chips);
                  const classNames = [
                    isTodayCol ? "tt-comcigan-col--today" : "",
                    isSub ? "tt-comcigan-cell--substitute" : "",
                    isVacated && !isSub ? "tt-comcigan-cell--vacated" : "",
                    editable ? "tt-comcigan-cell--editable" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <td
                      key={di}
                      className={classNames || undefined}
                      role={editable ? "button" : undefined}
                      tabIndex={editable ? 0 : undefined}
                      onClick={
                        editable
                          ? () => onManualCellClick(di, pi)
                          : undefined
                      }
                      onKeyDown={
                        editable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onManualCellClick(di, pi);
                              }
                            }
                          : undefined
                      }
                    >
                      {chips.length === 0 ? (
                        <span className="tt-comcigan-empty">
                          {editable ? "+" : "—"}
                        </span>
                      ) : (
                        <div className="tt-comcigan-chips">
                          {chips.map((chip, ci) => (
                            <div
                              key={`${chip.classCode}-${chip.subject}-${ci}-${chip.vacated ? "v" : chip.manual ? "m" : "n"}`}
                              className={
                                chip.changed
                                  ? "tt-comcigan-chip tt-comcigan-chip--sub"
                                  : chip.vacated
                                    ? "tt-comcigan-chip tt-comcigan-chip--vacated"
                                    : chip.manual
                                      ? "tt-comcigan-chip tt-comcigan-chip--manual"
                                      : "tt-comcigan-chip"
                              }
                            >
                              {chip.changed ? (
                                <span className="tt-comcigan-chip-badge">교체</span>
                              ) : null}
                              {chip.vacated ? (
                                <span className="tt-comcigan-chip-badge tt-comcigan-chip-badge--vacated">
                                  빠짐
                                </span>
                              ) : null}
                              {chip.manual ? (
                                <span className="tt-comcigan-chip-badge tt-comcigan-chip-badge--manual">
                                  {chip.manualWeekly === false ? "이번주" : "매주"}
                                </span>
                              ) : null}
                              <span className="tt-comcigan-chip-main">
                                {formatLessonForDisplay(
                                  chip.classCode,
                                  chip.subject,
                                  classLabelMode,
                                )}
                              </span>
                              {chip.changed && chip.originalSubject ? (
                                <span className="tt-comcigan-chip-orig">
                                  원 {chip.originalSubject}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
