import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

describe("Form", () => {
  it("renders labels correctly", () => {
    render(<TestForm onSubmit={() => {}} />);
    expect(screen.getByText("Username")).toBeInTheDocument();
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
});
