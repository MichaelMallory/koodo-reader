import BookList from "../containers/lists/bookList";
import DeletedBookList from "../containers/lists/deletedBookList";
import NoteList from "../containers/lists/noteList";
import DigestList from "../containers/lists/digestList";
import EmptyPage from "../containers/emptyPage";
import LoadingPage from "../containers/loadingPage";
import SpeedReaderPage from "../pages/speedReader";

interface RouteConfig {
  path: string;
  component: any; // Components are properly typed in their own files
}

export const routes: RouteConfig[] = [
  { path: "/manager/empty", component: EmptyPage },
  { path: "/manager/loading", component: LoadingPage },
  { path: "/manager/note", component: NoteList },
  { path: "/manager/digest", component: DigestList },
  { path: "/manager/home", component: BookList },
  { path: "/manager/shelf", component: BookList },
  { path: "/manager/favorite", component: BookList },
  { path: "/manager/trash", component: DeletedBookList },
  { path: "/manager/speed", component: SpeedReaderPage },
];
