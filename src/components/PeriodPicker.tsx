import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  currentPeriodKey,
  MONTH_LABELS,
  parsePeriod,
  periodKey,
} from "../lib/period";

type PeriodPickerProps = {
  value: string;
  label: string;
  onChange: (period: string) => void;
};

export function PeriodPicker({ value, label, onChange }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(() => parsePeriod(value).year);
  const rootRef = useRef<HTMLDivElement>(null);
  const currentPeriod = currentPeriodKey();
  const currentYear = parsePeriod(currentPeriod).year;
  const selected = parsePeriod(value);

  useEffect(() => {
    setVisibleYear(selected.year);
  }, [selected.year]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    rootRef.current?.querySelector<HTMLButtonElement>("[aria-current='date']")?.focus();
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, visibleYear]);

  const choosePeriod = (nextPeriod: string) => {
    if (nextPeriod > currentPeriod) return;
    onChange(nextPeriod);
    setOpen(false);
  };

  return (
    <div className="period-picker" ref={rootRef}>
      <button
        className="period-control"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Выбрать период. Сейчас ${label}`}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </button>
      {open ? (
        <div className="period-popover" role="dialog" aria-label="Выбор месяца">
          <header>
            <button
              className="period-arrow"
              type="button"
              aria-label="Предыдущий год"
              onClick={() => setVisibleYear((year) => year - 1)}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <strong>{visibleYear}</strong>
            <button
              className="period-arrow"
              type="button"
              aria-label="Следующий год"
              disabled={visibleYear >= currentYear}
              onClick={() => setVisibleYear((year) => Math.min(currentYear, year + 1))}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </header>
          <div className="period-month-grid">
            {MONTH_LABELS.map((monthLabel, index) => {
              const monthValue = periodKey(visibleYear, index + 1);
              const isSelected = monthValue === value;
              return (
                <button
                  className={isSelected ? "period-month-selected" : ""}
                  type="button"
                  aria-current={isSelected ? "date" : undefined}
                  disabled={monthValue > currentPeriod}
                  onClick={() => choosePeriod(monthValue)}
                  key={monthValue}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>
          {value !== currentPeriod ? (
            <button className="period-current" type="button" onClick={() => choosePeriod(currentPeriod)}>
              Текущий месяц
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
