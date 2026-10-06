import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Order, Product } from '../types';
import { Lang, formatPrice, translations } from '../services/i18n';
import brandConfig from '../brand.config.json';

interface CategorySalesChartProps {
  orders: Order[];
  products: Product[];
  lang: Lang;
}

interface ChartDataPoint {
  id: string;
  category: string;
  revenue: number;
  color: string;
  itemCount: number;
}

export const CategorySalesChart: React.FC<CategorySalesChartProps> = ({
  orders,
  products,
  lang
}) => {
  const t = translations[lang];

  // Tooltip interactive state
  const [hoveredBar, setHoveredBar] = useState<{
    id: string;
    category: string;
    revenue: number;
    itemCount: number;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // Group sales strictly in the last 30 days
  const { chartData, totalSales, isDemoData } = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Grouping structure
    const salesMap: Record<string, { revenue: number; count: number }> = {};
    brandConfig.categories.forEach((cat) => {
      salesMap[cat.id] = { revenue: 0, count: 0 };
    });

    let realSalesCount = 0;

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      if (
        orderDate >= thirtyDaysAgo &&
        (order.status === 'paid' || order.status === 'completed')
      ) {
        order.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const catId = prod?.category || 'earphone';
          const itemRevenue = (item.price || 0) * (item.quantity || 1);

          if (salesMap[catId]) {
            salesMap[catId].revenue += itemRevenue;
            salesMap[catId].count += item.quantity || 1;
            realSalesCount += itemRevenue;
          }
        });
      }
    });

    const hasRealSales = realSalesCount > 0;

    const finalData: ChartDataPoint[] = brandConfig.categories.map((cat) => {
      const categoryName = lang === 'fr' ? cat.frName : cat.enName;
      let revenue = salesMap[cat.id]?.revenue || 0;
      let itemCount = salesMap[cat.id]?.count || 0;

      // Realistic mockup data for presentation if no orders are present in database yet
      if (!hasRealSales) {
        /*
          Placeholder values for demonstration when the local storage/SQLite DB has no transactions.
          These allow immediate visualization of the D3.js chart in sandbox.
        */
        const placeholderValues: Record<string, { revenue: number; count: number }> = {
          earphone: { revenue: 175000, count: 7 },
          watch: { revenue: 245000, count: 5 },
          laptop: { revenue: 950000, count: 1 },
          console: { revenue: 420000, count: 1 },
          vr: { revenue: 590000, count: 2 },
          speaker: { revenue: 105000, count: 3 }
        };
        revenue = placeholderValues[cat.id]?.revenue || 0;
        itemCount = placeholderValues[cat.id]?.count || 0;
      }

      return {
        id: cat.id,
        category: categoryName,
        revenue,
        color: cat.color || '#007AFF',
        itemCount
      };
    });

    const sum = finalData.reduce((acc, d) => acc + d.revenue, 0);

    return {
      chartData: finalData,
      totalSales: sum,
      isDemoData: !hasRealSales
    };
  }, [orders, products, lang]);

  // Chart Layout dimensions
  const width = 640;
  const height = 300;
  const margin = { top: 25, right: 20, bottom: 45, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // D3 Scales calculation
  const xScale = useMemo(() => {
    return d3.scaleBand()
      .domain(chartData.map((d) => d.category))
      .range([0, innerWidth])
      .padding(0.35);
  }, [chartData, innerWidth]);

  const yScale = useMemo(() => {
    const maxVal = d3.max(chartData, (d) => d.revenue) || 100000;
    return d3.scaleLinear()
      .domain([0, maxVal * 1.1]) // Add 10% headroom
      .range([innerHeight, 0])
      .nice();
  }, [chartData, innerHeight]);

  const yTicks = useMemo(() => {
    return yScale.ticks(5);
  }, [yScale]);

  return (
    <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-6 sm:p-7 space-y-6 text-[#1D1D1F]">
      {/* Title & Legend Metadata */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1 text-left">
          <h3 className="text-base sm:text-lg font-black text-[#1D1D1F] uppercase tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-[#007AFF] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span>
              {lang === 'fr'
                ? 'Analyse des Ventes par Catégorie'
                : 'Category Sales Analysis'}
            </span>
          </h3>
          <p className="text-xs text-[#6E6E73] leading-normal">
            {lang === 'fr'
              ? 'Répartition du chiffre d’affaires sur les 30 derniers jours'
              : 'Revenue breakdown over the last 30 days'}
          </p>
        </div>

        {/* Demo Indicator / Label */}
        <div className="flex items-center gap-2">
          {isDemoData ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF9500]/10 text-[#FF9500] text-[10px] sm:text-xs font-bold rounded-full border border-[#FF9500]/30">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a3 3 0 11-6 0v5.25m6-5.25h6m-6 5.25h6M12 9h.008v.008H12V9z" />
              </svg>
              <span>{lang === 'fr' ? 'Données de démonstration' : 'Demonstration Data'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#34C759]/15 text-[#34C759] text-[10px] sm:text-xs font-bold rounded-full border border-[#34C759]/30">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>{lang === 'fr' ? 'Données de production' : 'Live Production Data'}</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Render D3.js SVG Chart (Lg 8 columns) */}
        <div className="lg:col-span-8 relative overflow-x-auto w-full select-none">
          <div className="min-w-[580px] relative">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              className="overflow-visible"
            >
              {/* Outer boundary */}
              <g transform={`translate(${margin.left}, ${margin.top})`}>
                
                {/* Horizontal D3 Grid Lines */}
                {yTicks.map((tick) => (
                  <g key={tick} className="opacity-10">
                    <line
                      x1={0}
                      x2={innerWidth}
                      y1={yScale(tick)}
                      y2={yScale(tick)}
                      stroke="#1D1D1F"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  </g>
                ))}

                {/* Y Axis Ticks (Labels format in FCFA) */}
                {yTicks.map((tick) => (
                  <g key={tick} transform={`translate(-12, ${yScale(tick)})`}>
                    <text
                      textAnchor="end"
                      alignmentBaseline="middle"
                      className="text-[10px] font-mono tabular-nums font-bold text-[#6E6E73] fill-current"
                    >
                      {formatPrice(tick).replace(' FCFA', '')}
                    </text>
                  </g>
                ))}

                {/* X Axis Ticks (Category Labels) */}
                {chartData.map((d) => {
                  const x = xScale(d.category);
                  if (x === undefined) return null;
                  const xCenter = x + xScale.bandwidth() / 2;
                  return (
                    <g key={d.id} transform={`translate(${xCenter}, ${innerHeight + 15})`}>
                      <text
                        textAnchor="middle"
                        className="text-[10px] font-bold text-[#1D1D1F] fill-current"
                      >
                        {d.category}
                      </text>
                    </g>
                  );
                })}

                {/* Draw SVG Bars with exact layout coordinates & colors */}
                {chartData.map((d) => {
                  const x = xScale(d.category);
                  const y = yScale(d.revenue);
                  if (x === undefined) return null;

                  const barWidth = xScale.bandwidth();
                  const barHeight = innerHeight - y;

                  return (
                    <g key={d.id}>
                      {/* Bar Background Track */}
                      <rect
                        x={x}
                        y={0}
                        width={barWidth}
                        height={innerHeight}
                        fill="#F5F5F7"
                        rx={8}
                      />

                      {/* Foreground Revenue Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(1, barHeight)}
                        fill="#007AFF"
                        rx={8}
                        className="transition-all duration-300 hover:brightness-95 cursor-pointer"
                        onMouseEnter={(e) => {
                          const rectBox = (e.target as SVGRectElement).getBoundingClientRect();
                          const svgContainer = (e.target as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
                          if (svgContainer) {
                            setHoveredBar({
                              id: d.id,
                              category: d.category,
                              revenue: d.revenue,
                              itemCount: d.itemCount,
                              color: '#007AFF',
                              x: rectBox.left - svgContainer.left + barWidth / 2,
                              y: rectBox.top - svgContainer.top - 12
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                    </g>
                  );
                })}

                {/* X Axis Base Line */}
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={innerHeight}
                  y2={innerHeight}
                  stroke="#AAAAAA"
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                />

                {/* Y Axis Left Line */}
                <line
                  x1={0}
                  x2={0}
                  y1={0}
                  y2={innerHeight}
                  stroke="#AAAAAA"
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                />

              </g>
            </svg>

            {/* Gorgeous HTML Interactive Hover Tooltip */}
            {hoveredBar && (
              <div
                className="absolute z-30 pointer-events-none bg-[#1D1D1F] text-white rounded-xl p-3 shadow-lg flex flex-col space-y-1 text-xs border border-[#AAAAAA]/30 -translate-x-1/2 transition-all duration-150 animate-fadeIn"
                style={{
                  left: `${hoveredBar.x}px`,
                  top: `${hoveredBar.y - 12}px`
                }}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#007AFF]"
                  />
                  <span>{hoveredBar.category}</span>
                </div>
                <div className="font-mono text-[11px] text-[#AAAAAA]">
                  {lang === 'fr' ? 'Chiffre d’affaires :' : 'Revenue:'}{' '}
                  <strong className="text-white font-extrabold text-xs">
                    {formatPrice(hoveredBar.revenue)}
                  </strong>
                </div>
                <div className="text-[10px] text-[#AAAAAA]">
                  {hoveredBar.itemCount} {lang === 'fr' ? 'articles vendus' : 'items sold'}{' '}
                  {totalSales > 0 && (
                    <span>
                      ({Math.round((hoveredBar.revenue / totalSales) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend & Breakdown columns (Lg 4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#F5F5F7] border border-[#AAAAAA]/20 rounded-2xl p-4 space-y-3.5 text-left">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider block">
                {lang === 'fr' ? 'Total des ventes (30j)' : 'Total Sales (30d)'}
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-[#007AFF] font-mono tabular-nums">
                {formatPrice(totalSales)}
              </h4>
            </div>

            {/* List and Category Fill Bars */}
            <div className="space-y-3 pt-2 border-t border-[#AAAAAA]/20">
              {chartData.map((d) => {
                const percent = totalSales > 0 ? Math.round((d.revenue / totalSales) * 100) : 0;
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#1D1D1F] truncate">{d.category}</span>
                      <span className="font-mono tabular-nums text-[#6E6E73] text-[11px]">
                        {formatPrice(d.revenue).replace(' FCFA', '')} <strong className="text-[#1D1D1F]">({percent}%)</strong>
                      </span>
                    </div>

                    {/* Compact Horizontal Progress Bar */}
                    <div className="w-full h-1.5 bg-[#AAAAAA]/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
