
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { InterpreterFormData } from "../InterpreterProfileForm";

interface WorkHoursSectionProps {
  form: UseFormReturn<InterpreterFormData>;
}

export const WorkHoursSection = ({ form }: WorkHoursSectionProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Horaires de travail</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Matin</Label>
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="work_hours.start_morning"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span>à</span>
              <FormField
                control={form.control}
                name="work_hours.end_morning"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Après-midi</Label>
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="work_hours.start_afternoon"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span>à</span>
              <FormField
                control={form.control}
                name="work_hours.end_afternoon"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
