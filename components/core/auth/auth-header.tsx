export function AuthHeader({
  title,
  description,
}: {
  title: string
  description: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-balance text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
