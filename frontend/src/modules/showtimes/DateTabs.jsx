import { formatShowtimeDateParts } from "../../core/utils/date.js";

export function DateTabs({ dateKeys, selectedDateKey, onSelectDate }) {
  if (!dateKeys.length) return null;

  return (
    <div className="date-tabs-container" role="tablist" aria-label="Select screening date">
      {dateKeys.map((dateKey) => {
        const { relativeLabel, dayName, dayMonth } = formatShowtimeDateParts(dateKey);
        const isSelected = dateKey === selectedDateKey;

        return (
          <button
            key={dateKey}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`date-tab ${isSelected ? "selected" : ""}`}
            onClick={() => onSelectDate(dateKey)}
          >
            <span className="date-tab-kicker">{relativeLabel}</span>
            <span className="date-tab-day">{dayName}</span>
            <span className="date-tab-date">{dayMonth}</span>
          </button>
        );
      })}
    </div>
  );
}
