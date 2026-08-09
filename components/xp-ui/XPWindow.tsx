"use client";

import type { CSSProperties, ReactNode } from "react";

type XPWindowProps = {
  title: string;
  fill?: boolean;
  style?: CSSProperties;
  children: ReactNode;
};

export function XPWindow({
  title,
  fill = false,
  style,
  children,
}: XPWindowProps) {
  return (
    <div className={`window ${fill ? "fill" : ""}`} style={style}>
      <div className="title-bar">
        <div className="title-bar-text">{title}</div>
      </div>
      <div className="window-body">{children}</div>
    </div>
  );
}
