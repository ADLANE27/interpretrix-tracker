
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { InterpreterFormData } from "../InterpreterProfileForm";
import { employmentStatusLabels } from "@/types/employment";

interface ProfessionalSectionProps {
  form: UseFormReturn<InterpreterFormData>;
}

export const ProfessionalSection = ({ form }: ProfessionalSectionProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Informations professionnelles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="employment_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut professionnel</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(employmentStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tarif_15min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarif (15 minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tarif_5min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarif (5 minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="siret_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro SIRET</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vat_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de TVA</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
