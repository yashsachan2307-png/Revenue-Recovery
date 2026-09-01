import * as React from "react"
import { cn } from "../../lib/utils"

interface DataTableProps extends React.HTMLAttributes<HTMLTableElement> {
  columns: {
    header: string
    accessorKey: string
    align?: "left" | "right" | "center"
    cell?: (row: any) => React.ReactNode
  }[]
  data: any[]
}

export function DataTable({ columns, data, className, ...props }: DataTableProps) {
  return (
    <div className="w-full overflow-auto border border-[var(--color-border-subtle)] bg-[var(--color-paper)]">
      <table className={cn("w-full text-sm", className)} {...props}>
        <thead className="border-b border-[var(--color-border-subtle)]">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                className={cn(
                  "h-10 px-4 align-middle font-bold uppercase tracking-wider text-[var(--color-ink)]/70",
                  {
                    "text-left": col.align === "left" || !col.align,
                    "text-center": col.align === "center",
                    "text-right": col.align === "right",
                  }
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center">
                NO DATA AVAILABLE
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-ink)]/5 last:border-0"
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      "p-4 align-middle",
                      {
                        "text-left": col.align === "left" || !col.align,
                        "text-center": col.align === "center",
                        "text-right": col.align === "right",
                      }
                    )}
                  >
                    {col.cell ? col.cell(row) : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
