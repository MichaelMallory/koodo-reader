import React from "react";
import "./speedReader.css";
import { SpeedReaderProps, SpeedReaderState } from "./interface";
import { WithTranslation } from "react-i18next";

class SpeedReader extends React.Component<SpeedReaderProps & WithTranslation, SpeedReaderState> {
  constructor(props: SpeedReaderProps & WithTranslation) {
    super(props);
    this.state = {};
  }

  render(): React.ReactNode {
    const { t } = this.props;
    return (
      <div className="speed-reader-container">
        <h1>{t("Speed Reader")}</h1>
        <p>{t("Coming soon...")}</p>
      </div>
    );
  }
}

export default SpeedReader; 