import * as React from "react";
import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  routerProps?: MemoryRouterProps;
}

const AllTheProviders = ({ children, routerProps }: { children: React.ReactNode; routerProps?: MemoryRouterProps }) => {
  const queryClient = createTestQueryClient();
  return (
    <MemoryRouter {...routerProps}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: ExtendedRenderOptions,
) => {
  const { routerProps, ...renderOptions } = options || {};
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders routerProps={routerProps}>{children}</AllTheProviders>,
    ...renderOptions,
  });
};

export * from "@testing-library/react";
export { customRender as render };
