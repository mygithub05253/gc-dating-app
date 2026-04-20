interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Ember Signal v1.0 PageHeader
 * - 타이틀: Pretendard 2xl/600
 * - 하단 1px border (DESIGN.md §11)
 */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between border-b border-border pb-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="ml-4 flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
