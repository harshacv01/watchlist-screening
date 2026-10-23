"use client"

import { Fragment, useRef, useState } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card"
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  FileSpreadsheet,
  SearchCheck,
  UploadCloud,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToastManager } from "@/components/ui/toast"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const MAX_FILE_SIZE = 50 * 1024 * 1024
const BATCH_TOAST_ID = "batch-screen-upload"

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

type BatchResultRow = {
  row: number
  name: string
  dob: string
  matchCount: number
  matches: ScreeningMatch[]
}

type BatchProblem = {
  row: number
  reason: string
}

type BatchScreenResult = {
  rowsScreened: number
  rowsWithMatches: number
  problems: BatchProblem[]
  results: BatchResultRow[]
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const BatchScreenPage = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploaded, setIsUploaded] = useState(false)
  const [loadResult, setLoadResult] = useState<BatchScreenResult | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  // const toastManager = useToastManager()

  function toggleRow(rowNumber: number) {
    setExpandedRows((current) => {
      const next = new Set(current)
      if (next.has(rowNumber)) {
        next.delete(rowNumber)
      } else {
        next.add(rowNumber)
      }
      return next
    })
  }

  function selectFile(nextFile?: File) {
    setError("")

    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null)
      setError("Please choose a CSV file.")
      // toastManager.add({
      //   type: "error",
      //   title: "Invalid file",
      //   description: "Please choose a CSV file.",
      // })
      return
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setError("File size must be 50 MB or smaller.")
      // toastManager.add({
      //   type: "error",
      //   title: "File is too large",
      //   description: "File size must be 50 MB or smaller.",
      // })
      return
    }

    setFile(nextFile)
    setIsUploaded(false)
    setLoadResult(null)
    setExpandedRows(new Set())
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError("Please choose a CSV file before submitting.")
      // toastManager.add({
      //   type: "error",
      //   title: "No file selected",
      //   description: "Please choose a CSV file before submitting.",
      // })
      return
    }

    setError("")
    setIsUploading(true)
    // toastManager.add({
    //   id: BATCH_TOAST_ID,
    //   type: "loading",
    //   title: "Uploading batch file",
    //   description: "Preparing your CSV for screening...",
    //   timeout: 0,
    // })

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          action: "presign",
          purpose: "batch",
        }),
      })
      const result = (await response.json()) as {
        error?: string
        url?: string
        contentType?: string
        key?: string
      }

      if (!response.ok || !result.url || !result.key) {
        throw new Error(result.error || "The file could not be uploaded.")
      }

      const uploadResponse = await fetch(result.url, {
        method: "PUT",
        headers: {
          "Content-Type": result.contentType || file.type || "text/csv",
        },
        body: file,
      })

      console.log("Upload response:", uploadResponse)

      if (!uploadResponse.ok) {
        throw new Error("The file could not be uploaded to storage.")
      }

      const key = result.key

      setIsUploaded(true)
      setIsUploading(false)
      setIsProcessing(true)
      // toastManager.update(BATCH_TOAST_ID, {
      //   type: "loading",
      //   title: "Screening batch file",
      //   description: "Checking each row against the watchlist...",
      //   timeout: 0,
      // })
      const processed = await runBatch(key)
      if (processed) {
        // toastManager.update(BATCH_TOAST_ID, {
        //   type: "success",
        //   title: "Batch screening complete",
        //   description: "Your screening results are ready below.",
        //   timeout: 5000,
        // })
      } else {
        // toastManager.update(BATCH_TOAST_ID, {
        //   type: "error",
        //   title: "Batch screening failed",
        //   description: "The file was uploaded, but screening could not be completed.",
        //   timeout: 5000,
        // })
      }
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "The file could not be uploaded."
      setError(message)
      // toastManager.update(BATCH_TOAST_ID, {
      //   type: "error",
      //   title: "Upload failed",
      //   description: message,
      //   timeout: 5000,
      // })
    } finally {
      setIsUploading(false)
      setIsProcessing(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  const runBatch = async (key: string) => {
    try {
      const response = await fetch("/api/watchlist/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "screen_batch",
          key: key,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load the watchlist.")
      }

      setLoadResult(result as BatchScreenResult)
      return true
    } catch (error) {
      console.error("Error loading watchlist:", error)
      setError(
        error instanceof Error ? error.message : "Failed to load the watchlist."
      )
      return false
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Rows screened",
              value: loadResult?.rowsScreened,
              description: "Rows processed from the uploaded CSV",
              className:
                "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30",
            },
            {
              title: "Rows with matches",
              value: loadResult?.rowsWithMatches,
              description: "Rows with one or more potential matches",
              className:
                "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30",
            },
            {
              title: "Problems",
              value: loadResult?.problems.length,
              description: "Rows that could not be screened",
              className:
                "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
            },
          ].map(({ title, value, description, className }) => (
            <Card key={title} className={className}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {value ?? "-"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {loadResult && (
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SearchCheck aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <CardTitle>Screening results</CardTitle>
                  <CardDescription className="mt-1">
                    {loadResult.results.length.toLocaleString()} results
                    returned from {loadResult.rowsScreened.toLocaleString()}{" "}
                    screened rows.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadResult.problems.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-medium">Rows needing attention</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {loadResult.problems.map((problem) => (
                      <li key={`${problem.row}-${problem.reason}`}>
                        Row {problem.row}: {problem.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="max-h-[32rem] overflow-y-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Potential matches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadResult.results.map((row) => {
                      const isExpanded = expandedRows.has(row.row)

                      return (
                        <Fragment key={row.row}>
                          <TableRow
                            aria-expanded={row.matches.length > 0 ? isExpanded : undefined}
                          >
                            <TableCell>{row.row}</TableCell>
                            <TableCell className="font-medium">
                              {row.name || "Empty name"}
                            </TableCell>
                            <TableCell>{row.dob || "-"}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                  row.matchCount > 0
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {row.matchCount > 0 ? (
                                  <AlertCircle
                                    aria-hidden="true"
                                    className="size-3"
                                  />
                                ) : (
                                  <CircleCheck
                                    aria-hidden="true"
                                    className="size-3"
                                  />
                                )}
                                {row.matchCount > 0 ? "Match" : "Clear"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {row.matches.length > 0 ? (
                                <Button
                                  aria-controls={`matches-${row.row}`}
                                  aria-expanded={isExpanded}
                                  onClick={() => toggleRow(row.row)}
                                  size="sm"
                                  variant="outline"
                                >
                                  {isExpanded ? (
                                    <ChevronUp aria-hidden="true" />
                                  ) : (
                                    <ChevronDown aria-hidden="true" />
                                  )}
                                  {row.matches.length} potential{" "}
                                  {row.matches.length === 1 ? "match" : "matches"}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow id={`matches-${row.row}`}>
                              <TableCell
                                className="bg-muted/30 p-0"
                                colSpan={5}
                              >
                                <div className="px-4 py-3">
                                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Potential matches for{" "}
                                    {row.name || "Empty name"}
                                  </p>
                                  <div className="overflow-x-auto rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Matched name</TableHead>
                                          <TableHead>ID</TableHead>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Score</TableHead>
                                          <TableHead>Reason</TableHead>
                                          <TableHead>DOB result</TableHead>
                                          <TableHead>Listed DOB</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {row.matches.map((match) => (
                                          <TableRow key={match.id}>
                                            <TableCell className="font-medium">
                                              {match.matchedName}
                                            </TableCell>
                                            <TableCell>{match.id}</TableCell>
                                            <TableCell>{match.type}</TableCell>
                                            <TableCell className="font-medium">
                                              {match.score}
                                            </TableCell>
                                            <TableCell className="min-w-64 whitespace-normal text-muted-foreground">
                                              {match.reason || "—"}
                                            </TableCell>
                                            <TableCell>
                                              {match.dobResult || "—"}
                                            </TableCell>
                                            <TableCell>
                                              {match.dobs.length > 0
                                                ? match.dobs.join(", ")
                                                : "—"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-primary">
              <FileSpreadsheet aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle>Upload the batch</CardTitle>
              <CardDescription className="mt-1.5">
                Upload a CSV file containing the names you want to screen. The
                file will be validated and processed, and you will receive a
                summary of the results.
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="watchlist-file">CSV file</FieldLabel>
                <div
                  aria-describedby={error ? "file-error" : undefined}
                  aria-label="Upload CSV file"
                  className={`group relative flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-accent"
                      : "border-border bg-muted/30 hover:border-primary hover:bg-muted/60"
                  }`}
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    if (event.currentTarget === event.target)
                      setIsDragging(false)
                  }}
                  onDrop={handleDrop}
                >
                  <Input
                    ref={inputRef}
                    accept=".csv,text/csv"
                    aria-invalid={!!error}
                    className="sr-only"
                    id="watchlist-file"
                    name="file"
                    onChange={(event) => selectFile(event.target.files?.[0])}
                    type="file"
                  />
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border transition-transform group-hover:-translate-y-0.5">
                    <UploadCloud aria-hidden="true" className="size-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Drop your CSV file here, or{" "}
                    <span className="text-primary underline underline-offset-4">
                      browse
                    </span>
                  </p>
                  <FieldDescription className="mt-2 text-xs">
                    CSV only · Maximum file size 50 MB
                  </FieldDescription>
                </div>
                <FieldError id="file-error">{error}</FieldError>
              </Field>

              {file && (
                <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
                  <FileSpreadsheet
                    aria-hidden="true"
                    className="size-5 shrink-0 text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove ${file.name}`}
                    onClick={() => {
                      setFile(null)
                      if (inputRef.current) inputRef.current.value = ""
                    }}
                    size="icon-sm"
                    type="button"
                    variant="destructive"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="mt-2 justify-center">
              <Button
                disabled={!file || isUploading || isProcessing || isUploaded}
                type="submit"
              >
                {isUploading || isProcessing ? (
                  <>
                    <Spinner />
                    {isUploading ? "Uploading..." : "Screening..."}
                  </>
                ) : isUploaded ? (
                  "Uploaded"
                ) : (
                  "Upload batch file"
                )}
                {isUploaded && !isUploading && !isProcessing ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : isUploading || isProcessing ? null : (
                  <ArrowUp aria-hidden="true" className="size-4" />
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default BatchScreenPage
