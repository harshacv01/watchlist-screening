"use client"

import { useRef, useState } from "react"
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
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

const MAX_FILE_SIZE = 50 * 1024 * 1024

type WatchlistLoadResult = {
  loaded: number
  entries: number
  notLoaded: number
  duplicatesRemoved: number
  rows?: Array<{
    line: number
    id: string
    reason: string
  }>
  warnings?: Array<{
    line: number
    id: string
    reason: string
  }>
  data?: Array<{
    id: string
    type: string
    names: string[]
    dobs?: string[]
  }>
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const WatchlistUploadPage = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isUploaded, setIsUploaded] = useState(false)
  const [loadResult, setLoadResult] = useState<WatchlistLoadResult | null>(null)

  function showError(message: string) {
    setError(message)
    toast.add({
      description: message,
      title: "Watchlist upload error",
      type: "error",
    })
  }

  function selectFile(nextFile?: File) {
    setError("")

    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null)
      showError("Please choose a CSV file.")
      return
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null)
      showError("File size must be 50 MB or smaller.")
      return
    }

    setFile(nextFile)
    setIsUploaded(false)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      showError("Please choose a CSV file before submitting.")
      return
    }

    setError("")
    setIsUploading(true)

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
      await loadWatchlist(key)
    } catch (uploadError) {
      showError(
        uploadError instanceof Error
          ? uploadError.message
          : "The file could not be uploaded."
      )
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  const loadWatchlist = async (key: string) => {
    try {
      const response = await fetch("/api/watchlist/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "load",
          key: key,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load the watchlist.")
      }

      setLoadResult(result as WatchlistLoadResult)
    } catch (error) {
      console.error("Error loading watchlist:", error)
      showError(
        error instanceof Error
          ? error.message
          : "Failed to load the watchlist.",
      )
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
            <CardHeader>
              <CardTitle>Loaded</CardTitle>
              <CardDescription>
                Records loaded from the source response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {loadResult ? loadResult.loaded.toLocaleString() : "-"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle>Entries</CardTitle>
              <CardDescription>
                Unique entries in the loaded response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {loadResult ? loadResult.entries.toLocaleString() : "-"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
            <CardHeader>
              <CardTitle>Not loaded</CardTitle>
              <CardDescription>
                Rows that could not be loaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {loadResult ? loadResult.notLoaded.toLocaleString() : "-"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/30">
            <CardHeader>
              <CardTitle>Duplicates removed</CardTitle>
              <CardDescription>
                Duplicate records removed during loading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {loadResult
                  ? loadResult.duplicatesRemoved.toLocaleString()
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
            <CardHeader>
              <CardTitle>Warnings</CardTitle>
              <CardDescription>Rows loaded with a warning</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {loadResult
                  ? (loadResult.warnings?.length ?? 0).toLocaleString()
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30">
            <CardHeader>
              <CardTitle>Data entries</CardTitle>
              <CardDescription>
                Entries returned in the data array
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {loadResult
                  ? (loadResult.data?.length ?? 0).toLocaleString()
                  : "-"}
              </p>
            </CardContent>
          </Card>
        </div>
        {loadResult &&
          (loadResult.notLoaded > 0 ||
            (loadResult.warnings?.length ?? 0) > 0) && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <AlertCircle aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <CardTitle>Load details</CardTitle>
                      <CardDescription className="mt-1">
                        Review warnings and rows that could not be loaded.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {loadResult.warnings &&
                    loadResult.warnings.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium">Warnings</h3>
                        <div className="mt-2 max-h-60 overflow-auto rounded-lg border border-amber-200 dark:border-amber-900/50">
                          <div className="min-w-[36rem] divide-y divide-amber-200 text-sm dark:divide-amber-900/50">
                            {loadResult.warnings.map((warning) => (
                              <div
                                className="grid grid-cols-[5rem_9rem_minmax(0,1fr)] gap-3 bg-amber-50 px-3 py-3 dark:bg-amber-950/20"
                                key={`${warning.line}-${warning.id}-${warning.reason}`}
                              >
                                <span className="font-medium tabular-nums">
                                  Line {warning.line}
                                </span>
                                <span>{warning.id}</span>
                                <span className="text-muted-foreground">
                                  {warning.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  {loadResult.rows && loadResult.rows.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium">Rows not loaded</h3>
                      <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-destructive/20">
                        <div className="min-w-[42rem] divide-y divide-border text-sm">
                          {loadResult.rows.map((row) => (
                            <div
                              className="grid grid-cols-[5rem_14rem_minmax(0,1fr)] gap-3 px-3 py-3"
                              key={`${row.line}-${row.id}-${row.reason}`}
                            >
                              <span className="font-medium tabular-nums">
                                Line {row.line}
                              </span>
                              <span className="text-destructive">
                                {row.id}
                              </span>
                              <span className="text-muted-foreground">
                                {row.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        <Card>
          <CardHeader className="gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-primary">
              <FileSpreadsheet aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle>Upload the list</CardTitle>
              <CardDescription className="mt-1.5">
                Download the CSV from GOV.UK, then upload it here. It goes
                straight to secure storage.
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
                disabled={!file || isUploading || isUploaded}
                type="submit"
              >
                {isUploading
                  ? "Uploading"
                  : isUploaded
                    ? "Uploaded"
                    : "Upload sanctions list"}
                {isUploading ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : isUploaded ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
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

export default WatchlistUploadPage
