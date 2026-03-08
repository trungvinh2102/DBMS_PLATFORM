import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import { useForm, FormProvider } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  username: z.string().min(2, "Too short"),
});

function TestForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>Help text</FormDescription>
              <FormMessage>Optional extra message</FormMessage>
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

describe("Form", () => {
  it("renders labels and descriptions correctly", () => {
    render(<TestForm onSubmit={() => {}} />);
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Help text")).toBeInTheDocument();
  });

  it("shows validation error", async () => {
    render(<TestForm onSubmit={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("shadcn"), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Too short")).toBeInTheDocument();
    });
  });

  it("renders custom message when no error", () => {
    render(<TestForm onSubmit={() => {}} />);
    expect(screen.getByText("Optional extra message")).toBeInTheDocument();
  });

  it("renders null for FormMessage with no error and no children", () => {
    // We need a proper form context for useFormField to work
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const form = useForm();
      return <FormProvider {...form}>{children}</FormProvider>;
    };

    const { container } = render(
      <Wrapper>
        <FormField
          name="test"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />
      </Wrapper>,
    );

    // The FormItem renders a div, but FormMessage should render null inside it.
    // We can check if any <p> exists (FormMessage renders a <p>)
    expect(
      container.querySelector("p.text-destructive"),
    ).not.toBeInTheDocument();
  });

  it("throws error when used outside FormField but inside FormProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const TestComponent = () => {
      const form = useForm();
      return (
        <FormProvider {...form}>
          <FormItem>
            <FormLabel>Test</FormLabel>
          </FormItem>
        </FormProvider>
      );
    };

    expect(() => render(<TestComponent />)).toThrow();

    spy.mockRestore();
  });
});
