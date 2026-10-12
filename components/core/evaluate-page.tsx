"use client"

import { useRef, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AlertCircle, FileText, UploadCloud, X } from "lucide-react"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type EvaluationRow = {
  line: number
  name: string
  expectedId: string | null
  gotId: string | null
  gotName: string | null
  score: number | null
}

type ThresholdResult = {
  threshold: number
  found: number
  missed: number
  falseAlarms: number
  precision: number
  recall: number
  foundRows: EvaluationRow[]
  missedRows: EvaluationRow[]
  falseAlarmRows: EvaluationRow[]
}

type EvaluationResult = {
  rowsTested: number
  results: ThresholdResult[]
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const EvaluationPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedThreshold, setSelectedThreshold] = useState<number | null>(
    null
  )

  const handleUpload = async () => {
    try {
      setError(null)
      setEvaluation(null)
      setUploading(true)
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile?.name,
          fileType: selectedFile?.type,
          fileSize: selectedFile?.size,
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
          "Content-Type":
            result.contentType || selectedFile?.type || "text/csv",
        },
        body: selectedFile,
      })

      if (!uploadResponse.ok) {
        throw new Error("The file could not be uploaded.")
      }

      const evaluationResponse = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "evaluate",
          key: result.key,
        }),
      })

      const evaluationResult = (await evaluationResponse.json()) as
        EvaluationResult | { error?: string }

      if (!evaluationResponse.ok || !("results" in evaluationResult)) {
        throw new Error(
          "error" in evaluationResult
            ? evaluationResult.error || "The evaluation failed."
            : "The evaluation returned an unexpected response."
        )
      }

      setEvaluation(evaluationResult)
      setSelectedThreshold(
        evaluationResult.results.find((result) => result.threshold === 80)
          ?.threshold ??
          evaluationResult.results[0]?.threshold ??
          null
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "The evaluation failed."
      )
    } finally {
      setUploading(false)
    }
  }

  const summary = evaluation?.results[0]
  const selectedResult = evaluation?.results.find(
    (result) => result.threshold === selectedThreshold
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
          <CardHeader>
            <CardTitle>Rows tested</CardTitle>
            <CardDescription>
              Rows processed from the uploaded file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {evaluation?.rowsTested ?? "--"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle>Matches found</CardTitle>
            <CardDescription>
              Matches found at the first threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summary?.found ?? "--"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle>Precision</CardTitle>
            <CardDescription>
              Accuracy of the identified matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summary ? `${summary.precision}%` : "--"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle>Recall</CardTitle>
            <CardDescription>Coverage of expected matches</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summary ? `${summary.recall}%` : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {evaluation && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation results</CardTitle>
            <CardDescription>
              Compare screening performance at each confidence threshold.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Precision</TableHead>
                  <TableHead>Recall</TableHead>
                  <TableHead>Found</TableHead>
                  <TableHead>Missed</TableHead>
                  <TableHead>False alarms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluation.results.map((result) => (
                  <TableRow key={result.threshold}>
                    <TableCell className="font-medium">
                      {result.threshold}%
                    </TableCell>
                    <TableCell>{result.precision}%</TableCell>
                    <TableCell>{result.recall}%</TableCell>
                    <TableCell>{result.found}</TableCell>
                    <TableCell>{result.missed}</TableCell>
                    <TableCell>{result.falseAlarms}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {evaluation && selectedResult && (
        <Card className="bg-muted/20">
          <CardHeader className="flex-row items-center justify-between gap-4 border-b">
            <CardTitle>What went wrong</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">At threshold</span>
              <Select
                value={selectedThreshold?.toString() ?? ""}
                onValueChange={(value) =>
                  setSelectedThreshold(value ? Number(value) : null)
                }
              >
                <SelectTrigger aria-label="Select threshold" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {evaluation.results.map((result) => (
                    <SelectItem
                      key={result.threshold}
                      value={result.threshold.toString()}
                    >
                      {result.threshold}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <IssueSection
              color="green"
              rows={selectedResult.foundRows}
              title="Found"
            />
            <IssueSection
              color="red"
              rows={selectedResult.missedRows}
              title="Missed"
            />
            <IssueSection
              color="yellow"
              rows={selectedResult.falseAlarmRows}
              title="False alarms"
            />
          </CardContent>
        </Card>
      )}

      <div>
        <Card className="flex-1">
          <CardContent>
            <Field>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel htmlFor="watchlist-file">CSV file</FieldLabel>
                <Button
                  disabled={!selectedFile || uploading}
                  onClick={handleUpload}
                >
                  {uploading && <Spinner data-icon="inline-start" />}
                  Run evaluation
                </Button>
              </div>

              <label
                aria-label="Upload CSV file"
                className="group relative mb-4 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary hover:bg-muted/60"
                htmlFor="watchlist-file"
              >
                <Input
                  accept=".csv,text/csv"
                  className="sr-only"
                  id="watchlist-file"
                  name="file"
                  ref={inputRef}
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border transition-transform group-hover:-translate-y-0.5">
                  <UploadCloud aria-hidden="true" className="size-5" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {selectedFile ? (
                    selectedFile.name
                  ) : (
                    <>
                      Drop your CSV file here, or{" "}
                      <span className="text-primary underline underline-offset-4">
                        browse
                      </span>
                    </>
                  )}
                </p>
                <FieldDescription className="mt-2 text-xs">
                  {selectedFile
                    ? formatFileSize(selectedFile.size)
                    : "CSV only · Maximum file size 50 MB"}
                </FieldDescription>
              </label>

              {selectedFile && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
                  <FileText
                    aria-hidden="true"
                    className="size-5 shrink-0 text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove ${selectedFile.name}`}
                    onClick={() => {
                      setSelectedFile(null)
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
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const IssueSection = ({
  color,
  rows,
  title,
}: {
  color: "green" | "red" | "yellow"
  rows: EvaluationRow[]
  title: string
}) => (
  <section>
    <h3
      className={
        color === "green"
          ? "mb-2 text-sm font-medium text-green-500"
          : color === "red"
            ? "mb-2 text-sm font-medium text-red-500"
            : "mb-2 text-sm font-medium text-yellow-500"
      }
    >
      {title} ({rows.length})
    </h3>
    <div className="overflow-hidden rounded-lg border bg-background">
      {rows.length > 0 ? (
        <div className="divide-y">
          {rows.map((row) => (
            <div
              className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[4.5rem_minmax(10rem,1fr)_minmax(12rem,1fr)_4rem] sm:items-center sm:gap-3"
              key={`${title}-${row.line}-${row.name}`}
            >
              <span className="text-muted-foreground">Line {row.line}</span>
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground">
                {row.expectedId && `Expected ${row.expectedId}`}
                {row.expectedId && (row.gotName || row.gotId) && " · "}
                {row.gotName || row.gotId || "no match"}
              </span>
              <span className="text-right font-medium">
                {row.score === null ? "no match" : row.score}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-3 py-3 text-sm text-muted-foreground">None</p>
      )}
    </div>
  </section>
)

export default EvaluationPage
