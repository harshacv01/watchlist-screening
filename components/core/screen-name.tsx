"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"

const screenNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
  dob: z.date().optional(),
  threshold: z
    .number()
    .min(0, "Minimum score must be at least 0.")
    .max(100, "Minimum score must be at most 100."),
})

type ScreenNameFormValues = z.infer<typeof screenNameSchema>

type ScreeningMatch = {
  id: string
  type: string
  score: number
  nameScore: number
  dobResult: string
  matchedName: string
  reason: string
  dobs: string[]
}

type ScreeningResponse = {
  query: { original: string; normalized: string }
  threshold: number
  totalMatches: number
  matches: ScreeningMatch[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isScreeningResponse(value: unknown): value is ScreeningResponse {
  if (!isRecord(value)) return false
  const response = value
  const query = response.query
  return (
    isRecord(query) &&
    typeof query.original === "string" &&
    typeof query.normalized === "string" &&
    typeof response.threshold === "number" &&
    typeof response.totalMatches === "number" &&
    Array.isArray(response.matches) &&
    response.matches.every((match) => {
      if (!isRecord(match)) return false
      return (
        typeof match.id === "string" &&
        typeof match.type === "string" &&
        typeof match.score === "number" &&
        typeof match.nameScore === "number" &&
        typeof match.dobResult === "string" &&
        typeof match.matchedName === "string" &&
        typeof match.reason === "string" &&
        Array.isArray(match.dobs) &&
        match.dobs.every((dob) => typeof dob === "string")
      )
    })
  )
}

function unwrapScreeningResponse(value: unknown): unknown {
  if (!isRecord(value) || !("body" in value)) return value

  if (typeof value.body === "string") {
    try {
      return JSON.parse(value.body)
    } catch {
      return value
    }
  }

  return value.body
}

export function ScreenNamePage() {
  const [screeningResult, setScreeningResult] =
    useState<ScreeningResponse | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = React.useState(false)
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ScreenNameFormValues>({
    resolver: zodResolver(screenNameSchema),
    defaultValues: { name: "", dob: undefined, threshold: 75 },
  })

  async function onSubmit(values: ScreenNameFormValues) {
    setIsSubmitting(true)
    setRequestError(null)
    setScreeningResult(null)
    try {
      const response = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          ...(values.dob ? { dob: formatDateForApi(values.dob) } : {}),
          threshold: values.threshold,
          action: "screen",
        }),
      })
      const result = unwrapScreeningResponse(await response.json())
      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to screen the name"
        )
      }
      if (!isScreeningResponse(result)) {
        throw new Error("The screening service returned an invalid response")
      }
      setScreeningResult(result)
    } catch (error) {
      console.error("Error screening name:", error)
      setRequestError(
        error instanceof Error ? error.message : "Unable to screen the name"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Screen Name</FieldLegend>
                  <FieldDescription>
                    This is a form to collect user information, including full
                    name and minimum score. Please fill out the required fields
                    and submit the form.
                  </FieldDescription>
                  <FieldGroup>
                    <div className="flex flex-row gap-3">
                      <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                          Name
                        </FieldLabel>
                        <Input
                          id="checkout-7j9-card-name-43j"
                          placeholder="Enter name to screen"
                          aria-invalid={!!errors.name}
                          aria-describedby={
                            errors.name ? "full-name-error" : undefined
                          }
                          {...register("name")}
                        />
                        <FieldError id="full-name-error">
                          {errors.name?.message}
                        </FieldError>
                      </Field>

                      <Controller
                        control={control}
                        name="dob"
                        render={({ field }) => (
                          <Field
                            className="mx-auto w-44"
                            data-invalid={!!errors.dob}
                          >
                            <FieldLabel htmlFor="date">
                              Date of birth
                            </FieldLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger
                                render={
                                  <Button
                                    variant="outline"
                                    id="date"
                                    className="justify-start font-normal"
                                    aria-invalid={!!errors.dob}
                                    aria-describedby={
                                      errors.dob
                                        ? "date-of-birth-error"
                                        : undefined
                                    }
                                  >
                                    {field.value
                                      ? field.value.toLocaleDateString()
                                      : "Select date"}
                                  </Button>
                                }
                              />
                              <PopoverContent
                                className="w-auto overflow-hidden p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  defaultMonth={field.value}
                                  captionLayout="dropdown"
                                  onSelect={(selectedDate) => {
                                    field.onChange(selectedDate)
                                    setOpen(false)
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                            <FieldError id="date-of-birth-error">
                              {errors.dob?.message}
                            </FieldError>
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      control={control}
                      name="threshold"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.threshold}>
                          <FieldLabel
                            className="flex items-center justify-between"
                            htmlFor="minimum-score"
                          >
                            <span>Minimum Score</span>
                            <span>{field.value}</span>
                          </FieldLabel>
                          <Slider
                            aria-label="Minimum score"
                            id="minimum-score"
                            value={[field.value]}
                            onValueChange={(value) =>
                              field.onChange(
                                typeof value === "number"
                                  ? value
                                  : (value[0] ?? 0)
                              )
                            }
                            onBlur={field.onBlur}
                            max={100}
                            step={1}
                            className="w-full"
                            aria-invalid={!!errors.threshold}
                            aria-describedby={
                              errors.threshold
                                ? "minimum-score-error"
                                : undefined
                            }
                          />
                          <FieldError id="minimum-score-error">
                            {errors.threshold?.message}
                          </FieldError>
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>
                <Field>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Screening..." : "Screen"}
                  </Button>
                </Field>
                {requestError ? <FieldError>{requestError}</FieldError> : null}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {screeningResult ? (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Screening Results</h2>
                <p className="text-sm text-muted-foreground">
                  {screeningResult.totalMatches} match
                  {screeningResult.totalMatches === 1 ? "" : "es"} found for{" "}
                  <span className="font-medium text-foreground">
                    {screeningResult.query.original}
                  </span>
                  {screeningResult.matches.length !==
                  screeningResult.totalMatches ? (
                    <>
                      {" "}
                      (showing {screeningResult.matches.length})
                    </>
                  ) : null}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Minimum score:{" "}
                <span className="font-medium text-foreground">
                  {screeningResult.threshold}
                </span>
              </p>
            </div>
            <div className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-md border">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Name Score</TableHead>
                    <TableHead>Matched Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>DOB Result</TableHead>
                    <TableHead>DOBs</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screeningResult.matches.length > 0 ? (
                    screeningResult.matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="font-medium">
                          {match.id}
                        </TableCell>
                        <TableCell>{match.score}</TableCell>
                        <TableCell>{match.nameScore}</TableCell>
                        <TableCell>{match.matchedName}</TableCell>
                        <TableCell>{match.type}</TableCell>
                        <TableCell>{match.dobResult}</TableCell>
                        <TableCell>
                          {match.dobs.length > 0 ? match.dobs.join(", ") : "—"}
                        </TableCell>
                        <TableCell className="min-w-80 whitespace-normal">
                          {match.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No matches found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
