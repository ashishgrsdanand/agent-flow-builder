/** The little key under the palette that explains the three arrow styles. */
export function Legend() {
  const line = (stroke: string, width: number, dash?: string) => (
    <svg width="34" height="8">
      <line x1="1" y1="4" x2="33" y2="4" stroke={stroke} strokeWidth={width} strokeDasharray={dash} />
    </svg>
  );
  return (
    <div className="howto">
      <p>
        <b>To connect:</b> drag from the right dot of one agent onto another agent.
      </p>
      <div className="legend">{line('var(--ink-3)', 2, '5 4')}Supervisor can route to</div>
      <div className="legend">{line('var(--accent)', 2.5)}Fixed handoff: runs next</div>
      <div className="legend">{line('var(--cond)', 2.5)}Conditional: agent picks a path</div>
      <p style={{ marginTop: 8 }}>
        <b>Click</b> an agent or arrow to see its code. <b>Double-click</b> to edit it, for example to add a condition.
      </p>
    </div>
  );
}
