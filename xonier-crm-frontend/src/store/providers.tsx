"use client";

import { Provider } from "react-redux";
import { store } from "./index";
import CheckAuth from "../components/common/CheckAuth";

export default function ReduxProvider({children}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}>
    <CheckAuth>
    {children}
    </CheckAuth>
    </Provider>;
}
