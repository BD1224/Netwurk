"use client";
// One white pill with five typed fields and a round submit button. Enter submits.
// Below 860px ("bar" breakpoint) the fields stack and the button goes full width.
// Each field is keyed by its SearchCriteria list (the parent splits commas into the list).
import { cn } from "@/lib/utils";
import type { SearchCriteria } from "@/types";
import { ArrowRightIcon, Spinner } from "@/components/shared/icons";

export type FilterField = Exclude<keyof SearchCriteria, "freeText">;
export type FilterValues = Record<FilterField, string>;

export const EMPTY_FILTERS: FilterValues = { roles: "", companies: "", universities: "", states: "", researchAreas: "" };

const FIELDS: { key: FilterField; label: string; placeholder: string }[] = [
  { key: "roles", label: "Title", placeholder: "Any title" },
  { key: "companies", label: "Company", placeholder: "Any company" },
  { key: "universities", label: "University", placeholder: "Any school" },
  { key: "states", label: "Location", placeholder: "City or state" },
  { key: "researchAreas", label: "Research", placeholder: "Any topic" },
];

type Props = {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onSubmit: () => void;
  running: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function FilterBar({ values, onChange, onSubmit, running, inputRef }: Props) {
  const hasValue = Object.values(values).some((v) => v.trim().length > 0);
  const disabled = !hasValue || running;

  return (
    <form
      role="search"
      aria-label="Find people"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
      className={cn(
        "mx-auto grid w-full max-w-[1040px] grid-cols-1 gap-1 rounded-[28px] border border-line bg-surface p-2",
        "bar:grid-cols-[repeat(5,minmax(0,1fr))_64px] bar:items-center bar:gap-0 bar:rounded-full",
        "shadow-[0_18px_48px_-20px_rgba(9,9,11,0.18),0_2px_6px_rgba(9,9,11,0.04)] transition-[box-shadow,border-color]",
        "focus-within:border-accent-border focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.12),0_18px_48px_-20px_rgba(79,70,229,0.25)]",
      )}
    >
      {FIELDS.map((field, i) => (
        <div
          key={field.key}
          className={cn(
            "relative rounded-[20px] px-5 py-2.5 transition-colors focus-within:bg-accent-soft bar:rounded-full bar:px-6",
            // thin vertical divider between fields (wide layout only)
            i > 0 &&
              "bar:before:absolute bar:before:top-1/2 bar:before:left-0 bar:before:h-9 bar:before:w-px bar:before:-translate-y-1/2 bar:before:bg-line",
          )}
        >
          <label htmlFor={`filter-${field.key}`} className="block text-[13px] font-semibold text-ink">
            {field.label}
          </label>
          <input
            id={`filter-${field.key}`}
            ref={i === 0 ? inputRef : undefined}
            name={field.key}
            type="text"
            autoComplete="off"
            maxLength={120}
            value={values[field.key]}
            onChange={(e) => onChange({ ...values, [field.key]: e.target.value })}
            placeholder={field.placeholder}
            className="mt-0.5 h-7 w-full truncate bg-transparent text-[17px] text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={disabled}
        aria-label={running ? "Searching" : "Search"}
        className={cn(
          "mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-ink text-white transition-[background-color,transform]",
          "bar:mt-0 bar:size-16 bar:rounded-full",
          "enabled:hover:bg-[#27272A] enabled:active:scale-95 disabled:cursor-not-allowed",
          !hasValue && !running && "bg-[#D4D4D8] text-[#52525B]",
        )}
      >
        {running ? <Spinner size={22} /> : <ArrowRightIcon size={22} />}
        <span className="text-[15px] font-medium bar:sr-only" aria-hidden="true">
          {running ? "Searching…" : "Search"}
        </span>
      </button>
    </form>
  );
}
