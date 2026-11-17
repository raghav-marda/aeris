import { useId, type ReactNode } from "react";
import { inputClass } from "./styles";

interface NumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}

/** Whole-number input that clamps to its range and never yields NaN. */
export function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const id = useId();
  const handle = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    onChange(Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed)));
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => handle(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

interface CheckboxFieldProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-teal-800"
      />
      <label htmlFor={id} className="text-base">
        {label}
      </label>
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FieldsetProps {
  readonly legend: string;
  readonly children: ReactNode;
}

export function Fieldset({ legend, children }: FieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-4">{children}</div>
    </fieldset>
  );
}

interface RadioProps {
  readonly name: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onSelect: () => void;
}

export function RadioOption({ name, label, checked, onSelect }: RadioProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-2">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="h-5 w-5 accent-teal-800"
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
