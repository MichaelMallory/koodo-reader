import React from "react";
import "./matrixSpeedReader.css";

interface MatrixToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  t: (title: string) => string;
}

const MatrixToggleButton: React.FC<MatrixToggleButtonProps> = ({
  isActive,
  onToggle,
  t,
}) => {
  return (
    <div
      className="matrix-toggle-button"
      onClick={onToggle}
      data-tooltip-id="my-tooltip"
      data-tooltip-content={t("Matrix Speed Reader")}
      style={{ opacity: isActive ? 1 : 0.4 }}
    >
      <span className="icon-matrix"></span>
    </div>
  );
};

export default MatrixToggleButton; 