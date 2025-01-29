import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface AddressSectionProps {
  address: Address | null;
  isEditing: boolean;
  onChange: (address: Address) => void;
}

export const AddressSection = ({ address, isEditing, onChange }: AddressSectionProps) => {
  const currentAddress = address || { street: "", postal_code: "", city: "" };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Adresse</h3>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="street">Rue</Label>
          <Input
            id="street"
            value={currentAddress.street}
            onChange={(e) =>
              onChange({ ...currentAddress, street: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            value={currentAddress.postal_code}
            onChange={(e) =>
              onChange({ ...currentAddress, postal_code: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            value={currentAddress.city}
            onChange={(e) =>
              onChange({ ...currentAddress, city: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );
};