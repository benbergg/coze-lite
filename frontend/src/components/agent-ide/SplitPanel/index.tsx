import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './index.css';

interface SplitPanelProps {
  /** 左侧面板内容 */
  left: ReactNode;
  /** 右侧面板内容 */
  right: ReactNode;
  /** 初始左侧宽度 */
  defaultLeftWidth?: number;
  /** 最小左侧宽度 */
  minLeftWidth?: number;
  /** 最大左侧宽度 */
  maxLeftWidth?: number;
  /** 宽度变化回调 */
  onWidthChange?: (width: number) => void;
  /** 自定义类名 */
  className?: string;
}

export function SplitPanel({
  left,
  right,
  defaultLeftWidth = 480,
  minLeftWidth = 320,
  maxLeftWidth = 800,
  onWidthChange,
  className = '',
}: SplitPanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, startWidthRef.current + delta));
      setLeftWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth, onWidthChange]);

  return (
    <div ref={containerRef} className={`split-panel ${className}`}>
      {/* 左侧面板 */}
      <div className="split-panel-left" style={{ width: leftWidth }}>
        {left}
      </div>

      {/* 分隔条 */}
      <div
        className={`split-panel-divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="split-panel-divider-handle" />
      </div>

      {/* 右侧面板 */}
      <div className="split-panel-right">
        {right}
      </div>

      {/* 拖拽时的遮罩层（防止 iframe 等捕获鼠标事件） */}
      {isDragging && <div className="split-panel-overlay" />}
    </div>
  );
}
