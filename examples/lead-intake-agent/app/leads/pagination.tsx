import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fmt, type Messages } from "@/lib/i18n/messages";

/** Page numbers to show: first, last, and a window around the current page. */
function pageList(page: number, pageCount: number): (number | "gap")[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const p of pages) {
    const prev = out.at(-1);
    if (typeof prev === "number" && p - prev > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
  labels,
}: {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hrefFor: (page: number) => string;
  readonly labels: Messages["leads"];
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label={labels.pageNav} className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted-foreground">
        {fmt(labels.showing, { from, to, total })}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <PageLink disabled={page <= 1} href={hrefFor(page - 1)} label={labels.prevPage}>
            <ChevronLeftIcon className="size-4" />
          </PageLink>
          {pageList(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <span className="px-1 text-muted-foreground" key={`gap-${i}`}>
                …
              </span>
            ) : (
              <Button
                asChild
                key={p}
                size="sm"
                variant={p === page ? "default" : "ghost"}
                className="min-w-8 px-2"
              >
                <Link aria-current={p === page ? "page" : undefined} href={hrefFor(p)}>
                  {p}
                </Link>
              </Button>
            ),
          )}
          <PageLink disabled={page >= pageCount} href={hrefFor(page + 1)} label={labels.nextPage}>
            <ChevronRightIcon className="size-4" />
          </PageLink>
        </div>
      ) : null}
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  readonly href: string;
  readonly disabled: boolean;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button aria-label={label} disabled size="icon-sm" variant="ghost">
        {children}
      </Button>
    );
  }
  return (
    <Button asChild aria-label={label} size="icon-sm" variant="ghost">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
