interface Props {
  zoom: number;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
}

export function ZoomBar({ zoom, onZoomIn, onZoomOut, onFit }: Props) {
  return (
    <div className="zoombar">
      <button aria-label="Zoom out" title="Zoom out" onClick={onZoomOut}>
        &minus;
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" title="Zoom in" onClick={onZoomIn}>
        +
      </button>
      <button title="Fit everything in view" onClick={onFit}>
        Fit
      </button>
    </div>
  );
}
