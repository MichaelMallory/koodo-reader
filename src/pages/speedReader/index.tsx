import { connect } from "react-redux";
import { withTranslation } from "react-i18next";
import SpeedReaderPage from "./component";
import { stateType } from "../../store";
import { withRouter } from "react-router-dom";
import { compose } from "redux";
import { ComponentType } from "react";

// Add loading state to prevent navigation during text extraction
const mapStateToProps = (state: stateType) => {
  return {
    books: state.manager.books,
    isLoading: state.manager.isShowLoading
  };
};

const mapDispatchToProps = (dispatch: any) => ({
  setLoading: (isLoading: boolean) => 
    dispatch({ type: 'HANDLE_SHOW_LOADING', payload: isLoading })
});

// Use compose to properly type the HOCs
const ConnectedSpeedReader = compose(
  withRouter,
  withTranslation(),
  connect(mapStateToProps, mapDispatchToProps)
)(SpeedReaderPage) as ComponentType<any>;

export default ConnectedSpeedReader; 