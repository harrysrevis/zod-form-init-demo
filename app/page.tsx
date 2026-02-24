"use client";

import React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "./components/form/Input";
import { buildRHFDefaultValues } from "./lib/buildInitValues";
import { ProfileInput, ProfileSchema } from "./schema";
import { toDateInputValue, fromDateInputValue } from "./utils/date-utils";

export default function Home() {
  const defaultValues = buildRHFDefaultValues(ProfileSchema, {
    includeOptional: false,
    overrides: {
      name: "Harry Revisios",
      email: "hrevisios@gmail.com",
      tags: ["aws", "nextjs", "react", "react-native"],
      notes:
        "Hey, I'm Harry! I built this small utility to generate form default values from Zod schemas without the usual boilerplate or type headaches.",
    },
  });

  const form = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setValue,
    reset,
  } = form;

  const tags = useWatch({ control: form.control, name: "tags" }) ?? [];
  const birthday =
    useWatch({ control: form.control, name: "birthday" }) ?? null;

  const values = useWatch({ control: form.control });
  const debugJson = React.useMemo(
    () => JSON.stringify(values, null, 2),
    [values],
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Demo form wired to Zod + React Hook Form + schema-driven defaults.
          </p>
        </div>

        {/* Two-column layout: Form + Debug */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          {/* FORM */}
          <form
            onSubmit={handleSubmit((values) => {
              console.log("submit", values);
            })}
            className="rounded-2xl border border-white/10 bg-white/5 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/10">
              <div>
                <div className="text-sm text-neutral-400">Form state</div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      isValid
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {isValid ? "Valid" : "Needs fixes"}
                  </span>
                  {isSubmitting ? (
                    <span className="text-xs text-neutral-400">
                      Submitting…
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => reset(defaultValues)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 hover:cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="px-6 py-6 space-y-8">
              {/* Section: Basics */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Basics
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Required fields plus a couple of optional preferences.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@domain.com"
                    {...register("email")}
                    error={errors.email?.message}
                  />

                  <Input
                    label="Name"
                    placeholder="Full name"
                    {...register("name")}
                    error={errors.name?.message}
                  />

                  <Input
                    label="Age (optional)"
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 29"
                    {...register("age", { valueAsNumber: true })}
                    error={errors.age?.message as string | undefined}
                  />

                  <div className="flex items-center gap-3 sm:pt-7">
                    <input
                      id="marketingOptIn"
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-white/10"
                      {...register("marketingOptIn")}
                    />
                    <label
                      htmlFor="marketingOptIn"
                      className="text-sm text-neutral-200"
                    >
                      Marketing opt-in
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <fieldset className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <legend className="px-2 text-xs text-neutral-400">
                      Contact method
                    </legend>
                    <div className="mt-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          value="email"
                          {...register("contactMethod")}
                        />
                        Email
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          value="phone"
                          {...register("contactMethod")}
                        />
                        Phone
                      </label>
                    </div>
                    {errors.contactMethod?.message ? (
                      <p className="mt-2 text-sm text-red-500">
                        {errors.contactMethod.message}
                      </p>
                    ) : null}
                  </fieldset>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-neutral-400">
                      Birthday (optional)
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="date"
                        className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                        value={toDateInputValue(birthday)}
                        onChange={(e) => {
                          setValue(
                            "birthday",
                            fromDateInputValue(e.target.value),
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                        onClick={() =>
                          setValue("birthday", null, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        Clear
                      </button>
                    </div>
                    {errors.birthday?.message ? (
                      <p className="mt-2 text-sm text-red-500">
                        {errors.birthday.message as string}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Section: Address */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Address
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Nested object fields (address.*).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Address line 1"
                    placeholder="Street and number"
                    {...register("address.line1")}
                    error={errors.address?.line1?.message}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      placeholder="City"
                      {...register("address.city")}
                      error={errors.address?.city?.message}
                    />

                    <Input
                      label="Postcode (optional)"
                      placeholder="Postal code"
                      {...register("address.postcode")}
                      error={errors.address?.postcode?.message}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium">
                        Country
                      </label>
                      <div
                        className={`mt-2 flex items-center rounded-md bg-white/5 pl-3 outline-1 -outline-offset-1 ${
                          errors.address?.country
                            ? "outline-red-500 focus-within:outline-red-500"
                            : "outline-white/10 focus-within:outline-indigo-500"
                        } focus-within:outline-2 focus-within:-outline-offset-2`}
                      >
                        <select
                          className="block w-full min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-sm focus:outline-none"
                          {...register("address.country")}
                          aria-invalid={!!errors.address?.country}
                        >
                          <option className="bg-neutral-900" value="GR">
                            GR
                          </option>
                          <option className="bg-neutral-900" value="UK">
                            UK
                          </option>
                          <option className="bg-neutral-900" value="DE">
                            DE
                          </option>
                        </select>
                      </div>
                      {errors.address?.country?.message ? (
                        <p className="mt-2 text-sm text-red-500">
                          {errors.address.country.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Tags + Notes */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Metadata
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Array + free-form field examples.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Tags</label>
                    <div className="mt-2 flex items-center rounded-md bg-white/5 pl-3 outline-1 -outline-offset-1 outline-white/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-500">
                      <input
                        className="block w-full min-w-0 grow bg-transparent py-2 pr-3 pl-1 text-sm placeholder:text-gray-500 focus:outline-none"
                        placeholder='Comma-separated: "aws, nextjs"'
                        value={tags.join(", ")}
                        onChange={(e) => {
                          const next = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setValue("tags", next, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </div>

                    {tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-400">
                        No tags yet.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium">
                      Notes (optional)
                    </label>
                    <div className="mt-2 rounded-md bg-white/5 outline-1 -outline-offset-1 outline-white/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-500">
                      <textarea
                        className="block w-full bg-transparent px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none min-h-24"
                        placeholder="Anything relevant…"
                        {...register("notes")}
                      />
                    </div>
                    {errors.notes?.message ? (
                      <p className="mt-2 text-sm text-red-500">
                        {errors.notes.message}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-400">
                        Stored as a simple string.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-5 border-t border-white/10">
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 hover:cursor-pointer disabled:opacity-50 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </form>

          {/* DEBUG PANEL */}
          <aside className="lg:sticky lg:top-10">
            <div className="rounded-2xl border border-white/10 bg-white/5 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div>
                  <div className="text-sm font-semibold">Debug</div>
                  <div className="text-xs text-neutral-400">
                    Live form values
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 hover:cursor-pointer"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(debugJson);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy
                </button>
              </div>

              <div className="p-4">
                <pre className="max-h-[70vh] overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                  {debugJson}
                </pre>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
