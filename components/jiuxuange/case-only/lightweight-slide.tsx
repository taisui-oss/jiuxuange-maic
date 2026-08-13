'use client';

import type {
  PPTChartElement,
  PPTElement,
  PPTTableElement,
  PPTTextElement,
  Slide,
} from '@openmaic/dsl';

function TextElement({ element }: { element: PPTTextElement }) {
  const verticalAlignment =
    element.vAlign === 'middle'
      ? 'center'
      : element.vAlign === 'bottom'
        ? 'flex-end'
        : 'flex-start';

  return (
    <foreignObject
      x={element.left}
      y={element.top}
      width={element.width}
      height={element.height}
      opacity={element.opacity ?? 1}
      transform={
        element.rotate ? `rotate(${element.rotate} ${element.left} ${element.top})` : undefined
      }
    >
      <div
        className="flex size-full overflow-hidden [&_p]:m-0"
        style={{
          alignItems: verticalAlignment,
          color: element.defaultColor,
          fontFamily: element.defaultFontName,
          letterSpacing: element.wordSpace,
          lineHeight: element.lineHeight,
          background: element.fill,
        }}
        dangerouslySetInnerHTML={{ __html: element.content }}
      />
    </foreignObject>
  );
}

function TableElement({ element }: { element: PPTTableElement }) {
  return (
    <foreignObject x={element.left} y={element.top} width={element.width} height={element.height}>
      <div className="size-full overflow-hidden bg-white">
        <table className="size-full table-fixed border-collapse text-[13px] text-slate-700">
          <colgroup>
            {element.colWidths.map((width, index) => (
              <col key={index} style={{ width: `${width * 100}%` }} />
            ))}
          </colgroup>
          <tbody>
            {element.data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell) => (
                  <td
                    key={cell.id}
                    colSpan={cell.colspan}
                    rowSpan={cell.rowspan}
                    className="border border-slate-300 px-2 py-1.5 align-middle"
                    style={{
                      background: cell.style?.backcolor,
                      color: cell.style?.color,
                      fontSize: cell.style?.fontsize,
                      fontWeight: cell.style?.bold ? 700 : 400,
                      fontStyle: cell.style?.em ? 'italic' : undefined,
                      textAlign: cell.style?.align,
                    }}
                  >
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </foreignObject>
  );
}

function ChartElement({ element }: { element: PPTChartElement }) {
  const values = element.data.series.flat();
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const plotLeft = element.left + 36;
  const plotTop = element.top + 20;
  const plotWidth = Math.max(element.width - 54, 1);
  const plotHeight = Math.max(element.height - 54, 1);

  return (
    <g>
      <rect
        x={element.left}
        y={element.top}
        width={element.width}
        height={element.height}
        fill={element.fill ?? '#ffffff'}
      />
      <line
        x1={plotLeft}
        y1={plotTop + plotHeight}
        x2={plotLeft + plotWidth}
        y2={plotTop + plotHeight}
        stroke={element.lineColor ?? '#cbd5e1'}
      />
      {element.data.series.map((series, seriesIndex) => {
        const points = series
          .map((value, index) => {
            const x = plotLeft + (index / Math.max(series.length - 1, 1)) * plotWidth;
            const y = plotTop + plotHeight - ((value - min) / range) * plotHeight;
            return `${x},${y}`;
          })
          .join(' ');
        const color = element.themeColors[seriesIndex] ?? '#0e7490';
        return (
          <g key={seriesIndex}>
            <polyline points={points} fill="none" stroke={color} strokeWidth={3} />
            {series.map((value, index) => {
              const x = plotLeft + (index / Math.max(series.length - 1, 1)) * plotWidth;
              const y = plotTop + plotHeight - ((value - min) / range) * plotHeight;
              return <circle key={index} cx={x} cy={y} r={4} fill={color} />;
            })}
          </g>
        );
      })}
      {element.data.labels.map((label, index) => (
        <text
          key={label}
          x={plotLeft + (index / Math.max(element.data.labels.length - 1, 1)) * plotWidth}
          y={element.top + element.height - 12}
          textAnchor="middle"
          fontSize={11}
          fill={element.textColor ?? '#64748b'}
        >
          {label}
        </text>
      ))}
    </g>
  );
}

function CanvasElement({ element }: { element: PPTElement }) {
  switch (element.type) {
    case 'text':
      return <TextElement element={element} />;
    case 'shape':
      return (
        <rect
          x={element.left}
          y={element.top}
          width={element.width}
          height={element.height}
          fill={element.fill}
          opacity={element.opacity ?? 1}
          stroke={element.outline?.color}
          strokeWidth={element.outline?.width}
          transform={
            element.rotate
              ? `rotate(${element.rotate} ${element.left + element.width / 2} ${element.top + element.height / 2})`
              : undefined
          }
        />
      );
    case 'table':
      return <TableElement element={element} />;
    case 'chart':
      return <ChartElement element={element} />;
    default:
      return null;
  }
}

export function LightweightSlide({ slide }: { slide: Slide }) {
  const width = slide.viewportSize;
  const height = width * slide.viewportRatio;
  const background = slide.background?.type === 'solid' ? slide.background.color : undefined;

  return (
    <svg
      role="img"
      aria-label="案例课件"
      viewBox={`0 0 ${width} ${height}`}
      className="block size-full bg-white"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={width} height={height} fill={background ?? slide.theme.backgroundColor} />
      {slide.elements.map((element) => (
        <CanvasElement key={element.id} element={element} />
      ))}
    </svg>
  );
}
