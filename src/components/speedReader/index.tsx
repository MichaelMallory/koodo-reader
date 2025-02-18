import { connect } from "react-redux";
import { withTranslation } from "react-i18next";
import SpeedReader from "./component";
import { stateType } from "../../store";

const mapStateToProps = (state: stateType) => ({
  htmlBook: state.reader.htmlBook,
  currentBook: state.book.currentBook
});

const mapDispatchToProps = {};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withTranslation()(SpeedReader as any) as any); 