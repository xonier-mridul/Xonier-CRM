"use client";

import { createContext, useContext, useState } from "react";

const LoaderContext = createContext({
  loading: false,
  setLoading: (val: boolean) => {},
});

export const LoaderProvider = ({ children }: any) => {
  const [loading, setLoading] = useState(false);

  return (
    <LoaderContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderContext);