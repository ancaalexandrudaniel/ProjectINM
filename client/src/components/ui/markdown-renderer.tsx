import { AlertTriangle } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer that handles tables, headers, and paragraphs.
 * Used for rendering AI-generated explanations and structured legal content.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let tableLines: string[] = [];
  let inTable = false;
  let keyIndex = 0;

  const processTable = (tLines: string[]) => {
    if (tLines.length < 2) return null;

    const rows = tLines
      .filter((line) => !line.match(/^[\s\-|]+$/))
      .map((line) =>
        line
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0)
      )
      .filter((row) => row.length > 0);

    if (rows.length === 0) return null;

    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    return (
      <div key={keyIndex++} className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-cyan-500/30">
              {headerRow.map((cell, i) => (
                <th
                  key={i}
                  className="text-left py-2 px-3 text-cyan-300 font-semibold whitespace-nowrap"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-cyan-500/10 hover:bg-cyan-500/5"
              >
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="py-2 px-3 text-foreground/80">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = line.includes("|") || line.match(/^[\s\-|]+$/);

    if (isTableLine) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      if (inTable) {
        const table = processTable(tableLines);
        if (table) elements.push(table);
        tableLines = [];
        inTable = false;
      }

      if (line.trim()) {
        if (line.match(/^#+\s/)) {
          const headerText = line.replace(/^#+\s*/, "");
          elements.push(
            <h4
              key={keyIndex++}
              className="font-semibold text-cyan-300 mt-3 mb-2 flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {headerText}
            </h4>
          );
        } else if (line.match(/^\*\*(.+)\*\*$/)) {
          // Bold line
          elements.push(
            <p key={keyIndex++} className="font-semibold text-foreground my-1">
              {line.replace(/^\*\*|\*\*$/g, "")}
            </p>
          );
        } else if (line.match(/^[-•]\s/)) {
          // Bullet point
          elements.push(
            <p key={keyIndex++} className="text-foreground/80 my-0.5 pl-4">
              {line}
            </p>
          );
        } else {
          elements.push(
            <p key={keyIndex++} className="text-foreground/80 my-1">
              {line}
            </p>
          );
        }
      }
    }
  }

  if (inTable && tableLines.length > 0) {
    const table = processTable(tableLines);
    if (table) elements.push(table);
  }

  return <div className={`space-y-1 ${className || ""}`}>{elements}</div>;
}
