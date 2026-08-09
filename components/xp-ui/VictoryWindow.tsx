"use client";

export function VictoryWindow() {
  return (
    <div className="victory-wrap">
      <div className="window" style={{ width: 360 }}>
        <div className="title-bar">
          <div className="title-bar-text">System Restart</div>
        </div>
        <div className="window-body">
          <p>¡Has derrotado al sistema rival!</p>
          <p style={{ marginTop: 8 }}>
            El proceso ha finalizado correctamente. El sistema se reiniciará.
          </p>
          <div
            className="field-row"
            style={{ marginTop: 12, justifyContent: "center" }}
          >
            <button className="btn" type="button">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
