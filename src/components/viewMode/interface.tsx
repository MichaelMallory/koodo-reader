import { RouteComponentProps } from "react-router-dom";

export interface ViewModeProps extends RouteComponentProps {
  viewMode: string;
  handleFetchList: () => void;
  t: (title: string) => string;
}

export interface ViewModeState {}
