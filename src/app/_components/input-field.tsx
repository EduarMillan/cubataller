"use client";

import { useId, useState } from "react";
import { InfoTip } from "./tooltip";

export function InputField({
  id,
  label,
  tip,
  type = "text",
  required,
  placeholder,
  defaultValue,
  min,
  max,
  step,
  datalistOptions,
  onValueChange,
}: {
  id: string;
  label: string;
  tip?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: string;
  datalistOptions?: string[];
  onValueChange?: (value: string) => void;
}) {
  const reactId = useId();
  const hasDatalist = !!datalistOptions;
  const listId = hasDatalist ? `${id}-${reactId}-list` : undefined;

  const [value, setValue] = useState(defaultValue ?? "");
  const query = value.trim().toLowerCase();
  const filteredOptions =
    hasDatalist && query.length > 0
      ? datalistOptions!.filter((option) => option.toLowerCase().includes(query))
      : [];

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center text-sm font-medium">
        {label}
        {tip && <InfoTip content={tip} />}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={hasDatalist ? value : undefined}
        defaultValue={hasDatalist ? undefined : defaultValue}
        min={min}
        max={max}
        step={step}
        list={listId}
        autoComplete="off"
        onChange={(e) => {
          if (hasDatalist) setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
      />
      {hasDatalist && listId && (
        <datalist id={listId}>
          {filteredOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
}
