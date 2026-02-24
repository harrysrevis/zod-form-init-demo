import { forwardRef, InputHTMLAttributes, useId } from "react";

type InputProps = {
  label: string;
  error?: string;
  containerClassName?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, id, className = "", containerClassName = "", ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className={`sm:col-span-4 ${containerClassName}`}>
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}
        </label>

        <div
          className={`mt-2 flex items-center rounded-md bg-white/5 pl-3 outline-1 -outline-offset-1 ${
            error
              ? "outline-red-500 focus-within:outline-red-500"
              : "outline-white/10 focus-within:outline-indigo-500"
          } focus-within:outline-2 focus-within:-outline-offset-2`}
        >
          <input
            ref={ref}
            id={inputId}
            className={`block w-full min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-base  placeholder:text-gray-500 focus:outline-none sm:text-sm ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
